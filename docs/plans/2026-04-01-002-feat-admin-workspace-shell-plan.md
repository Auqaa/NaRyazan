---
date: 2026-04-01
topic: admin-workspace-shell
status: completed
depth: standard
origin: docs/brainstorms/2026-04-01-admin-workspace-shell-requirements.md
---

# Admin Workspace Shell Implementation Plan

## 1. Problem Frame

Нужно превратить текущую админку из двух разрозненных editor pages в единый `Admin Workspace Shell` с отдельным входом через `Admin Home`, устойчивой навигацией, явным текущим контекстом и быстрым возвратом к частым задачам. Источник требований: `docs/brainstorms/2026-04-01-admin-workspace-shell-requirements.md`.

Планируемая версия должна:

- дать админке единый shell вместо прямого входа в `Маршруты` или `Подборки`;
- сохранить существующие editor flows для routes и packs, не превращая задачу в полный redesign;
- добавить быстрые действия и recent work без нового backend data layer;
- оставить shell видимым даже во время глубокой правки;
- обеспечить работоспособный компактный navigation pattern на меньших экранах.

Planning-вопросы из origin-документа закрываются в этом плане:

- mobile/tablet поведение shell решено в разделе 5.5;
- quick actions и recent-work signals решены в разделе 5.3;
- локальные улучшения внутри `AdminRoutes` и `AdminRoutePacks` решены в разделе 5.4.

## 2. Scope Boundaries

В рамках v1:

- shell остаётся frontend-only изменением и не требует новых backend endpoints;
- существующие страницы `frontend/src/pages/AdminRoutes.jsx` и `frontend/src/pages/AdminRoutePacks.jsx` сохраняют свои формы и основную логику CRUD;
- вводится новый landing route `/admin`, но прямые URLs `/admin/routes` и `/admin/packs` остаются валидными;
- shell не добавляет command palette, глобальный поиск, focus mode или новый publish-centric центр;
- quick actions опираются на локальный client-side recent-work слой, а не на серверную activity model;
- responsive behavior решается через деградацию existing IA, а не через отдельный mobile-only redesign;
- в этой версии не делается полная переработка form architecture, пошаговый composer или split-view overhaul.

## 3. Context and Research

Локальные паттерны и ограничения:

- `frontend/src/App.js` сейчас ведёт администратора сразу на `/admin/routes`; это естественная точка для перевода админки на nested route tree с новым `/admin` landing.
- `frontend/src/pages/AdminRoutes.jsx` и `frontend/src/pages/AdminRoutePacks.jsx` уже повторяют один и тот же page frame: крупный hero, summary cards, локальная tab-навигация и двухколоночный editor/list layout. Это сильный сигнал в пользу shared shell вместо дальнейшего копирования page chrome.
- `frontend/src/components/AdminSectionTabs.jsx` уже задаёт минимальный section switcher между admin-разделами. Его выгоднее эволюционно встроить в shell как compact section nav, чем выбрасывать и придумывать вторую навигационную систему.
- `frontend/src/pages/__tests__/AdminRoutePacks.test.jsx` показывает действующий frontend-test pattern: `MemoryRouter`, mocked `api`, page-level integration assertions. Новый shell и `Admin Home` лучше покрывать тем же уровнем тестов, а не только snapshot-ами.
- Во `frontend/src` localStorage пока используется только для auth token в `frontend/src/utils/api.js` и `frontend/src/contexts/AuthContext.jsx`. Это значит, что namespaced utility для `recent work` можно добавить изолированно, не влезая в existing auth flows.
- Готовых `docs/solutions/` для admin workflow в репозитории сейчас нет.

Внешнее исследование не требуется: задача хорошо опирается на текущие frontend patterns, не трогает нестабильные внешние API и не требует framework-specific нововведений вне уже используемого React Router/Tailwind-style UI слоя.

## 4. High-Level Technical Design

Планируемая структура admin routing и shell-а:

```text
App.js
  /admin
    -> <AdminRoute><AdminWorkspaceShell /></AdminRoute>
         index -> <AdminHome />
         routes -> <AdminRoutes />
         packs -> <AdminRoutePacks />

AdminWorkspaceShell
  - определяет активный раздел по location
  - рендерит rail / compact section switcher
  - рендерит top context bar
  - хранит page metadata для текущего child screen
  - даёт outlet для AdminHome / AdminRoutes / AdminRoutePacks

AdminHome
  - получает summary из existing admin/public data
  - показывает quick actions
  - показывает recent work, сохранённый в localStorage

AdminRoutes / AdminRoutePacks
  - сохраняют ownership над form state
  - читают query params для deep links
  - публикуют page metadata в shell
  - регистрируют recent work на edit/save/select
```

Ключевой принцип: shell владеет только layout, navigation и page-level context. Сами editor pages сохраняют form state, API calls и domain-логику, чтобы не раздувать scope и не ломать уже работающий CRUD.

## 5. Technical Decisions

### 5.1 Admin Entry and Route Structure

Админка переводится на nested admin routing в `frontend/src/App.js`.

Решение:

- новый основной admin entry point становится `/admin` с `Admin Home` (see origin: `docs/brainstorms/2026-04-01-admin-workspace-shell-requirements.md`);
- `App.js` перестраивается так, чтобы `/admin`, `/admin/routes` и `/admin/packs` жили под одним `AdminRoute` guard и общим shell;
- top-level navbar link `Админка` должен вести на `/admin`, а не прямо в `/admin/routes`;
- старые direct links `/admin/routes` и `/admin/packs` остаются рабочими для совместимости и быстрых deep links.

Это даёт shell реальный статус entry point, а не декоративной обёртки вокруг старого URL.

### 5.2 Shell Composition and Page Metadata

Shell реализуется как shared layout-компонент, а не как набор локальных tabs внутри страниц.

Основные файлы:

- `frontend/src/components/AdminWorkspaceShell.jsx` (new)
- `frontend/src/contexts/AdminWorkspaceContext.jsx` (new)
- `frontend/src/components/AdminSectionTabs.jsx`

Решение:

- `AdminWorkspaceShell` владеет page frame, left rail / compact section switcher и top context bar;
- child pages получают доступ к lightweight context/hook, чтобы обновлять shell metadata: заголовок, описание, активный раздел, текущую сущность, summary chips и page-level actions;
- existing `AdminSectionTabs.jsx` не остаётся page-local навигацией, а становится shell-owned section switcher, особенно полезным на compact widths;
- shell не должен владеть form state ни маршрутов, ни packs; он отображает только page context.

Это сохраняет persistent shell без вынужденного переписывания editor logic.

### 5.3 Quick Actions, Deep Links, and Recent Work

В первой версии quick actions и recent work реализуются без отдельного backend слоя.

Основные файлы:

- `frontend/src/pages/AdminHome.jsx` (new)
- `frontend/src/utils/adminWorkspaceHistory.js` (new)
- `frontend/src/pages/AdminRoutes.jsx`
- `frontend/src/pages/AdminRoutePacks.jsx`

Решение:

- quick actions на `Admin Home` покрывают минимум четыре сценария: создать маршрут, создать подборку, продолжить последний маршрут, продолжить последнюю подборку;
- recent work хранится в localStorage под отдельным namespaced key и содержит компактные записи вида `type`, `entityId`, `label`, `href`, `touchedAt`;
- для быстрых переходов используется URL-based deep linking, а не только navigation state:
  - `/admin/routes?new=1`
  - `/admin/routes?routeId=<id>`
  - `/admin/packs?new=1`
  - `/admin/packs?packId=<id>`
- `AdminHome` валидирует recent-work записи против актуальных route/pack lists и скрывает stale entries, если сущность больше не существует.

Это закрывает R9-R11 без нового API и делает resume-flow устойчивым к reload и copy/paste URL.

### 5.4 Local Improvements Inside Existing Editor Pages

Локальные улучшения должны усиливать shell, а не превращать задачу в redesign editors.

Решение:

- page-level hero-блоки в `AdminRoutes.jsx` и `AdminRoutePacks.jsx` нужно ужать или перераспределить так, чтобы основная роль header и summary ушла в shell context bar;
- в самих страницах сохраняется текущий two-column editor/list layout, потому что он уже соответствует рабочему процессу куратора;
- selected entity state должен подниматься в shell metadata:
  - `Новый маршрут` / название маршрута
  - `Новая подборка` / название подборки
- локальные улучшения ограничиваются теми, что materially повышают согласованность shell experience:
  - более компактный page intro;
  - единый top action row;
  - синхронизация selection state с URL и recent-work layer.

В этой версии не делаем step-based composer, split view overhaul или form decomposition.

### 5.5 Responsive Behavior

Responsive pattern выбирается максимально простым и предсказуемым.

Решение:

- на desktop shell использует `hybrid` model: left rail плюс top context bar (see origin: `docs/brainstorms/2026-04-01-admin-workspace-shell-requirements.md`);
- на tablet/mobile rail не превращается в hidden drawer как единственный способ навигации;
- вместо этого shell деградирует в compact section switcher рядом или под context bar, сохраняя те же top-level sections: `Admin Home`, `Маршруты`, `Подборки`;
- quick actions на `Admin Home` на малых экранах должны стекаться вертикально, а не влезать в плотный multi-column dashboard;
- shell остаётся видимым даже при глубокой правке, но secondary summary chips и non-critical actions могут схлопываться раньше основного section switcher.

Это снижает риск перегрузки chrome и выполняет R8 без дополнительного mobile-only IA.

### 5.6 Testing Strategy

Тестирование остаётся frontend-integration oriented.

Решение:

- покрыть новый shell, `Admin Home` и updated editor pages на уровне `MemoryRouter` integration tests с mocked `api`;
- не проверять responsive CSS pixel-perfect в unit-тестах; вместо этого проверять:
  - наличие shell navigation structure;
  - корректные routes;
  - deep-link initialization;
  - recent-work behavior;
  - отсутствие регрессии в existing CRUD entry points;
- existing `frontend/src/pages/__tests__/AdminRoutePacks.test.jsx` расширить под shell-aware assertions вместо создания полностью параллельного test surface без нужды.

## 6. System-Wide Impact

- Меняется app-level admin entry point в `frontend/src/App.js`, поэтому затрагивается верхняя навигация приложения и direct admin URLs.
- Появляется новый namespaced localStorage слой для admin recent work; он не должен пересекаться с auth token storage.
- Existing admin pages начнут жить внутри общего shell, поэтому их page chrome и route expectations изменятся, но domain CRUD logic должен остаться прежним.
- Новых backend контрактов не добавляется, значит rollout-риск сосредоточен во frontend routing, selection state и UX consistency.

## 7. Implementation Units

### [x] Unit 1 — Shared admin shell foundation and nested routing

Primary files:

- `frontend/src/App.js`
- `frontend/src/components/AdminWorkspaceShell.jsx` (new)
- `frontend/src/contexts/AdminWorkspaceContext.jsx` (new)
- `frontend/src/components/AdminSectionTabs.jsx`

Test files:

- `frontend/src/components/__tests__/AdminWorkspaceShell.test.jsx` (new)

Work:

- перевести admin routes на nested structure с общим shell;
- добавить index route `/admin` под `Admin Home`;
- направить navbar link `Админка` на `/admin`;
- собрать shell layout с persistent navigation и context bar;
- дать child pages способ обновлять shell metadata без перехвата их form state;
- встроить `AdminSectionTabs.jsx` в shell как section switcher, а не держать его внутри страниц.

Test scenarios:

- admin user, открывая `/admin`, видит shell и landing screen вместо прямого провала в routes editor;
- direct open `/admin/routes` и `/admin/packs` рендерит те же страницы внутри shell;
- active section корректно подсвечивается при смене admin route;
- не-admin по-прежнему редиректится из admin space;
- shell сохраняет базовую navigation structure даже когда current page metadata обновляется.

Notes:

- Unit не должен тянуть за собой недоделанный `Admin Home` UI beyond minimal placeholder; полноценно он заполняется в следующем unit.

### [x] Unit 2 — Admin Home, quick actions, and recent-work data layer

Primary files:

- `frontend/src/pages/AdminHome.jsx` (new)
- `frontend/src/utils/adminWorkspaceHistory.js` (new)
- `frontend/src/App.js`

Test files:

- `frontend/src/pages/__tests__/AdminHome.test.jsx` (new)
- `frontend/src/utils/__tests__/adminWorkspaceHistory.test.js` (new)

Work:

- реализовать `Admin Home` как landing внутри shell;
- загрузить summary для routes и packs через существующие endpoints;
- показать quick actions для создания и продолжения работы;
- реализовать localStorage-backed recent-work helper с ограниченным списком и dedupe по сущности;
- валидировать stale recent-work items по актуальным данным перед рендером;
- использовать URL-based deep links для create/edit resume flows.

Test scenarios:

- `Admin Home` показывает переходы в `Маршруты` и `Подборки` даже без recent work;
- recent-work helper сохраняет последнюю правку, обновляет `touchedAt` и не дублирует одну и ту же сущность;
- stale route/pack entry не рендерится в recent work, если сущность больше не существует;
- quick action `Создать маршрут` ведёт в `/admin/routes?new=1`;
- quick action `Продолжить подборку` ведёт в `/admin/packs?packId=<id>`.

Notes:

- Unit остаётся frontend-only и не требует activity API.

### [x] Unit 3 — Adopt the shell in existing admin editors

Primary files:

- `frontend/src/pages/AdminRoutes.jsx`
- `frontend/src/pages/AdminRoutePacks.jsx`
- `frontend/src/components/AdminSectionTabs.jsx`

Test files:

- `frontend/src/pages/__tests__/AdminRoutes.test.jsx` (new)
- `frontend/src/pages/__tests__/AdminRoutePacks.test.jsx`

Work:

- убрать page-local dependence на старую tab placement и подключить обе страницы к shell metadata context;
- научить страницы читать `routeId`, `packId` и `new=1` из query params;
- синхронизировать selected entity и reset/create flows с URL;
- регистрировать recent-work entries при edit/select/save;
- ужать duplicated hero/page chrome так, чтобы route/packs editors ощущались частями одного workspace;
- сохранить existing list/editor layout и CRUD behavior без изменения API contract.

Test scenarios:

- open `/admin/routes?routeId=<id>` поднимает нужный маршрут в editor state и отражает его в shell context;
- open `/admin/routes?new=1` сбрасывает editor в режим создания нового маршрута;
- open `/admin/packs?packId=<id>` поднимает нужную подборку и не ломает existing validation rendering;
- сохранение маршрута или подборки обновляет recent work и оставляет editor в согласованном состоянии;
- существующие create/edit/delete flows на routes и packs по-прежнему вызывают те же API endpoints;
- после внедрения shell `AdminRoutePacks.test.jsx` продолжает покрывать validation issue rendering и save flow.

Notes:

- Не выносить route и pack forms в общий abstraction layer в рамках этого плана.

## 8. Sequence

1. Сначала построить shared shell foundation и nested admin routing, чтобы дальнейшие изменения шли на правильной IA.
2. Затем реализовать `Admin Home` и recent-work layer, потому что они определяют ценность нового entry point.
3. После этого встроить существующие editors в shell и добавить deep-link/resume behavior.

## 9. Risks and Mitigations

### Risk: Shell refactor ломает существующие admin URLs или auth guard

Mitigation:

- сохранить `/admin/routes` и `/admin/packs` как first-class child routes;
- менять только route tree и admin link target, не логику `AdminRoute`.

### Risk: Recent work ведёт в невалидные или удалённые сущности

Mitigation:

- recent-work helper хранит только компактные ссылки;
- `Admin Home` валидирует их against current data и скрывает stale entries.

### Risk: Query-param deep links создают неочевидные state loops

Mitigation:

- трактовать query params как явный source of truth только для selection/create intent;
- обновлять URL только в ответ на осознанные user actions: edit, create, reset, save.

### Risk: Shell станет ещё одним слоем chrome поверх и без того тяжёлых страниц

Mitigation:

- сократить duplicated hero/page intro внутри editor pages;
- оставить only-one navigation owner: shell.

### Risk: Изменение page frame усложнит existing frontend tests

Mitigation:

- расширять текущие integration tests, а не заменять их новыми тестовыми абстракциями;
- добавить целевые shell-aware tests на routing и deep links.

## 10. Verification Matrix

Product-level checks после реализации:

- клик по верхнему пункту `Админка` приводит на `/admin`, а не в конкретный editor;
- из `Admin Home` можно начать создание маршрута и подборки без ручного поиска нужной страницы;
- после редактирования маршрута или подборки администратор видит сущность в recent work и может вернуться к ней после reload;
- direct URLs `/admin/routes` и `/admin/packs` остаются рабочими;
- existing route CRUD и pack CRUD продолжают работать без изменения backend API;
- shell остаётся заметным во время глубокой правки и не исчезает при смене current entity;
- на компактной ширине остаётся доступ ко всем top-level admin sections.

## 11. Deferred Follow-Ups

- command palette и глобальный admin search;
- focus mode для глубокой редакторской работы;
- richer activity feed и shared recent work с backend sync;
- preview-driven admin surfaces поверх нового shell;
- issue-first dashboards и extended readiness language.
