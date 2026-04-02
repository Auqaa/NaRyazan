---
date: 2026-04-01
topic: route-packs
status: active
depth: standard
origin: docs/brainstorms/2026-04-01-route-packs-requirements.md
---

# Route Packs Implementation Plan

## 1. Problem Frame

Нужно добавить в продукт editorial-first слой `Route Packs`, который помогает выбирать не "сырой маршрут из каталога", а готовый сценарий прогулки под ситуацию пользователя. Источник требований: `docs/brainstorms/2026-04-01-route-packs-requirements.md`.

Планируемая версия должна:

- сохранить маршрут как основную единицу прохождения;
- показать packs как first-class discovery-слой на главной;
- дать куратору отдельный контур управления packs без дублирования route content;
- скрывать сломанные или неполные packs из публичной выдачи.

Planning blockers из origin-документа сняты в этом плане:

- вопрос про посадку packs на `Home` решён в разделе 4.4;
- вопрос про admin-контур решён в разделе 4.5;
- вопрос про минимальную stale-pack защиту решён в разделе 4.3.

## 2. Scope Boundaries

В рамках v1:

- packs являются надстройкой над существующими маршрутами, а не новым видом прохождения;
- пользователь сохраняет и проходит маршруты, а не сами packs;
- recommendation внутри pack остаётся редакторским, без алгоритмического ранжирования;
- публичный опыт остаётся на существующем `Home`, без нового consumer route-level URL;
- offline cache для packs не добавляется в этой версии;
- multi-route orchestration, bundle checkout, UGC и pack-specific loyalty остаются вне scope.

## 3. Research Summary

Локальные паттерны и ограничения:

- `frontend/src/pages/Home.jsx` уже держит основной discovery-flow, локальное состояние выбранного маршрута, фильтры, поиск, saved routes и route detail. Packs нужно встраивать сюда, а не строить второй consumer экран.
- `frontend/src/components/RouteList.jsx` уже решает карточный рендер маршрутов. Для packs лучше добавить отдельные компоненты, а не раздувать existing route card API.
- `frontend/src/pages/AdminRoutes.jsx` показывает паттерн "список слева + форма редактора справа" и работает через публичный `GET /routes` плюс admin CRUD endpoints. Для packs выгодно повторить этот подход в отдельной странице.
- `frontend/src/App.js` уже выделяет admin route (`/admin/routes`) и условную навигацию по `isAdmin`; добавление второго admin route выглядит естественным.
- `backend/routes/routes.js` содержит route decoration, validation и file-db CRUD в одном модуле. Для packs можно следовать тому же уровню локальности и не выносить абстракции раньше времени.
- `backend/storage/fileDb.js` нормализует shape JSON БД и подходит для добавления новой коллекции `routePacks`.
- `backend/server.js` сразу вызывает `listen()`, поэтому backend-тесты для нового API удобнее поддержать через выделение `app` в отдельный модуль.

Институциональных learnings в `docs/solutions/` нет. Готовых plan-шаблонов в `docs/plans/` до этой задачи не было.

Внешнее исследование не требуется: фича опирается на устойчивые локальные паттерны и не затрагивает нестабильные внешние контракты.

## 4. Technical Decisions

### 4.1 Data Model

Добавляем в file DB коллекцию `routePacks`.

Минимальная shape модели:

```js
{
  _id: string,
  name: string,
  description: string,
  promise: string,
  badges: string[],
  practicalNotes: string,
  image: string,
  featured: boolean,
  sortOrder: number,
  status: 'draft' | 'published',
  routes: [
    {
      routeId: string,
      role: 'primary' | 'alternative',
      reason: string,
      order: number
    }
  ],
  createdAt: string,
  updatedAt: string
}
```

Решения:

- Используем relation `routes[]`, а не набор отдельных полей `recommendedRouteId` и `alternativeRouteIds`: это упрощает validation и даёт место для editorial reason на каждый вариант.
- Ограничиваем pack одним `primary` и максимум двумя `alternative`, чтобы соблюсти R8 и не превратить detail-view в второй каталог.
- Храним `status` и `featured` отдельно: `status` отвечает за готовность к публикации, `featured` только за приоритет в discovery.
- `badges` остаются редакторскими строками, а не нормализованными enum: это быстрее для v1 и достаточно для сравнения сценариев на карточке.

### 4.2 Public API Contract

Добавляем новый router `backend/routes/routePacks.js` и монтируем его под `/api/route-packs`.

Форма ответа для v1:

- API возвращает editorial fields pack-а и raw `routes[]` references;
- full route payload не дублируется внутрь pack response;
- `Home.jsx` и admin UI резолвят route IDs через уже загруженный `GET /api/routes` response;
- admin list дополнительно получает `validation` summary, вычисленный сервером.

Публичные endpoints:

- `GET /api/route-packs`
  Возвращает только `published` packs, которые проходят server-side publishability check.
- `GET /api/route-packs/:id`
  Опционален для v1. Не нужен, если весь public UX остаётся внутри `Home`. В первой реализации можно не добавлять.

Admin endpoints:

- `GET /api/route-packs/admin`
  Возвращает все packs, включая draft и invalid, плюс validation summary для редактора.
- `POST /api/route-packs/admin`
- `PUT /api/route-packs/admin/:id`
- `DELETE /api/route-packs/admin/:id`

Validation rules:

- `name`, `description`, `promise` обязательны и trimmed;
- `badges` ограничены небольшим массивом коротких строк;
- `routes.length` от 1 до 3;
- внутри pack route IDs уникальны;
- ровно один `primary`;
- не более двух `alternative`;
- все referenced routes должны существовать на момент сохранения;
- pack считается `publishable`, только если `status === 'published'` и после разрешения ссылок остаётся валидный `primary`.

### 4.3 Stale-Pack Guard

Минимальная operational защита для R14:

- public endpoint сам фильтрует packs, у которых больше нет валидного `primary` или вообще не осталось валидных route references;
- admin endpoint вычисляет `validation` объект вида `{ isPublishable, issues[] }`;
- route deletion не переписывает packs автоматически, а оставляет их в invalid state до редакторского исправления.

Это проще и безопаснее, чем скрытое каскадное редактирование editorial content при удалении маршрута.

Это закрывает origin question про "минимальную operational защиту" без расширения scope в сторону фоновых джобов или автоматических миграций content state (see origin: `docs/brainstorms/2026-04-01-route-packs-requirements.md`).

### 4.4 Home Information Architecture

Packs встраиваются в правую discovery-колонку `Home`, над existing route filters.

Решение по UX:

- отдельный блок `Сценарии прогулки` рендерится выше фильтров и `RouteList`;
- в блоке показываются все publishable packs, отсортированные как `featured first`, затем по `sortOrder`;
- клик по карточке открывает inline detail panel на том же экране;
- detail panel показывает `primary` route и до двух alternatives с краткой editorial reason;
- CTA из pack detail просто вызывает existing route-selection flow через `setSelectedRoute`, не создавая новый режим прохождения.

Почему не segmented mode:

- `Home.jsx` уже перегружен состоянием карты, QR, остановок и route detail;
- мягкое встраивание над текущим каталогом соответствует origin decision "overlay, not replacement";
- пользователь в любой момент видит и packs, и обычный route browsing, без переключения режима приложения.

Это и есть ответ на origin question по R6: выбираем отдельный верхний блок над маршрутами, а не отдельный режим экрана (see origin: `docs/brainstorms/2026-04-01-route-packs-requirements.md`).

### 4.5 Admin Information Architecture

Packs выносятся в отдельную страницу `frontend/src/pages/AdminRoutePacks.jsx` с route `/admin/packs`.

Решение:

- не встраивать packs внутрь `AdminRoutes.jsx`, чтобы не смешивать два разных редакторских процесса и не превращать один файл в мегакомпонент;
- добавить лёгкий shared admin-nav компонент для переключения между `Маршруты` и `Подборки`;
- reuse route-fetching pattern из `AdminRoutes.jsx`, но form model packs держать отдельно.

Это решает origin question по R11 в пользу отдельного curator section внутри существующего admin-контура, но без смешивания форм в одном файле (see origin: `docs/brainstorms/2026-04-01-route-packs-requirements.md`).

### 4.6 Testing Strategy

Frontend:

- использовать существующий `react-scripts test`;
- тестировать consumer flow на уровне page/component integration, а не только мелких helpers.

Backend:

- добавить тестовый контур через новый `backend/app.js`, который экспортирует Express app без `listen()`;
- оставить `backend/server.js` тонкой обёрткой запуска;
- для HTTP coverage добавить `supertest` как dev dependency и тестировать route-packs endpoints через node runtime.

## 5. Implementation Units

### [ ] Unit 1 — Backend route-pack model, validation, and API

Primary files:

- `backend/app.js` (new)
- `backend/package.json`
- `backend/server.js`
- `backend/routes/routePacks.js` (new)
- `backend/storage/fileDb.js`
- `backend/data/db.template.json`

Test file:

- `backend/tests/routePacksRoutes.test.js` (new)

Work:

- выделить app factory/module из `server.js`;
- добавить backend test script и `supertest` в dev dependencies;
- добавить mount для `/api/route-packs`;
- расширить `normalizeDbShape()` новой коллекцией `routePacks`;
- реализовать create/update/delete/list handlers для admin;
- реализовать public list с publishability filtering;
- добавить helper-функции разрешения pack routes и вычисления validation issues;
- подготовить небольшой curated starter set packs в `db.template.json`.

Test scenarios:

- public list не возвращает `draft` packs;
- public list скрывает pack без валидного `primary` route;
- admin create отклоняет payload без `primary`;
- admin create отклоняет duplicate route IDs внутри одного pack;
- admin update пересчитывает validation после изменения linked routes;
- featured packs сортируются раньше non-featured;
- delete удаляет pack и не ломает public list response.

Notes:

- Не добавлять отдельный data-access слой под packs, пока логика используется только этим router.
- Если во время исполнения понадобится поддержать уже tracked `backend/data/db.json`, это должно быть отдельным осознанным шагом, а не побочным эффектом plan-level seed logic.

### [ ] Unit 2 — Home discovery integration for public packs

Primary files:

- `frontend/src/pages/Home.jsx`
- `frontend/src/components/RoutePackList.jsx` (new)
- `frontend/src/components/RoutePackDetail.jsx` (new)

Test file:

- `frontend/src/pages/__tests__/Home.routePacks.test.jsx` (new)

Work:

- загрузить packs рядом с existing `/routes` запросом;
- завести local state для `routePacks`, `selectedPack`, `loadingRoutePacks`;
- встроить packs block над текущими фильтрами и route list;
- при выборе pack раскрывать detail panel с editorial copy и route options;
- при выборе route из pack использовать тот же selection path, что и обычный route card;
- обеспечить graceful fallback: если packs не загрузились, route discovery остаётся рабочим.

Test scenarios:

- published packs рендерятся перед route filters;
- клик по pack card открывает detail panel с `primary` и alternatives;
- CTA из pack detail выбирает маршрут и отображает существующий route summary block;
- при пустом списке packs главная остаётся работоспособной и route list по-прежнему показывается;
- invalid/missing linked route в client-side join не приводит к crash.

Notes:

- V1 не кэширует packs в IndexedDB и не меняет `frontend/src/utils/offlineStorage.js`.
- Не добавлять public deep links для packs, пока UX живёт на одном `Home`.

### [ ] Unit 3 — Admin curation UI for packs

Primary files:

- `frontend/src/App.js`
- `frontend/src/components/AdminSectionTabs.jsx` (new)
- `frontend/src/pages/AdminRoutes.jsx`
- `frontend/src/pages/AdminRoutePacks.jsx` (new)

Test file:

- `frontend/src/pages/__tests__/AdminRoutePacks.test.jsx` (new)

Work:

- добавить route `/admin/packs`;
- добавить shared admin tabs/navigation между маршрутами и packs;
- реализовать list + editor layout по образцу `AdminRoutes.jsx`;
- дать редактору возможность:
  - создавать draft/published pack;
  - отмечать `featured`;
  - управлять `sortOrder`;
  - выбирать один primary route и до двух alternatives;
  - редактировать `reason` для каждого linked route;
  - видеть validation issues до публикации.

Test scenarios:

- admin page загружает routes и packs параллельно и показывает список packs;
- форма не даёт сохранить pack без mandatory fields;
- форма показывает validation issue, если выбран только alternative без primary;
- успешное сохранение обновляет list и оставляет выбранный pack в editor state;
- переход между `Маршруты` и `Подборки` сохраняет понятную admin navigation.

Notes:

- Не переносить route form и pack form в общий abstraction layer: поля и жизненный цикл у них уже отличаются.

### [ ] Unit 4 — Launch content and verification pass

Primary files:

- `backend/data/db.template.json`
- `README.md` only if launch/demo instructions need pack mention

Verification:

- вручную проверить 4-6 packs, покрывающих разные сценарии, а не косметические вариации одного маршрута;
- убедиться, что хотя бы один pack использует shared route повторно, подтверждая R4;
- проверить, что удаление или деактивация связанного маршрута убирает pack из public list, но оставляет его видимым в admin с issue.

## 6. Sequence

1. Сначала поднять backend contract и test harness, чтобы UI работал с устойчивой shape ответа.
2. Затем встроить public discovery в `Home`, не трогая admin.
3. После этого добавить curator workflow в отдельном admin route.
4. В конце заполнить стартовые packs и провести end-to-end regression по discovery flow.

## 7. Risks and Mitigations

### Risk: Home becomes even harder to maintain

Mitigation:

- вынести packs в отдельные UI-компоненты;
- не смешивать pack rendering с existing `RouteList` props и условностями.

### Risk: Editorial data silently drifts after route edits

Mitigation:

- central server-side publishability check;
- invalid packs скрываются публично, но остаются видимыми в admin с issue list.

### Risk: No backend test harness exists today

Mitigation:

- выделить `backend/app.js` до добавления packs API;
- не пытаться тестировать server process через реальный `listen()` lifecycle.

### Risk: Demo data and tracked JSON DB drift apart

Mitigation:

- использовать `db.template.json` как плановый источник стартовых pack fixtures;
- любые изменения в tracked `db.json` во время реализации выполнять осознанно и отдельно от model normalization.

## 8. Verification Matrix

Product-level checks после реализации:

- новый пользователь может начать выбор прогулки с pack и дойти до выбора маршрута без работы с filters;
- route browsing по-прежнему доступен без выбора pack;
- featured ordering соответствует curator settings;
- pack с удалённым `primary` route не попадает в public выдачу;
- admin может восстановить invalid pack без редактирования route content;
- сохранение маршрутов в избранное и existing route detail UX не регрессируют.

## 9. Deferred Follow-Ups

- offline cache для packs в `frontend/src/utils/offlineStorage.js`;
- shareable public URL for a pack;
- pack analytics/events;
- automated curator suggestions;
- сохранение самого pack в профиль пользователя.
