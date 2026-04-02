---
date: 2026-04-02
topic: guide-workspace
status: completed
depth: standard
origin: docs/brainstorms/2026-04-02-guide-workspace-requirements.md
---

# Guide Workspace Implementation Plan

## 1. Problem Frame

Нужно превратить `docs/brainstorms/2026-04-02-guide-workspace-requirements.md` в реалистичный план для текущего репозитория, а не для более ранней архитектурной ветки. В текущем коде уже есть полезные кирпичики для живой экскурсии:

- `backend/routes/routePacks.js` уже умеет хранить published packs и вычислять их publishability;
- `backend/routes/routes.js` уже отдаёт маршрут вместе с ordered points, `guideText`, `guideAudioUrl`, `facts` и `description`;
- `site/index.html` уже содержит mobile-first runtime с картой, выбором маршрута, QR-сканом и point-level guide modal;
- но у продукта всё ещё нет отдельного операционного surface для экскурсовода, и access model по-прежнему жёстко крутится вокруг `User`/`Administrator`.

Планируемая версия должна:

- дать экскурсоводу отдельный вход `Кабинет экскурсовода`, а не заставлять его работать через админные или consumer-first сценарии;
- сделать flow pack-first: сначала готовый tour scenario, потом краткий briefing, потом переключение между variant routes внутри того же сценария;
- ввести реальную guide role без CRUD-прав;
- использовать уже существующие point materials (`guideText`, `guideAudioUrl`, `facts`, `description`) как layered fallback, а не придумывать новый content model;
- остаться пригодной для телефона во время живой прогулки.

## 2. Scope Boundaries

В рамках v1:

- guide workspace добавляется в текущий статический клиент `site/index.html` и текущий Express backend, без ожидания несуществующего в этом репозитории shared operations shell;
- вводится role model `User` / `Guide` / `Curator` / `Administrator`, но без полноценного capability framework и без отдельного user-management UI;
- guide workspace остаётся read-only surface для packs, routes и point materials;
- guide workspace показывает только published и сейчас валидные packs, пригодные к живому использованию;
- fallback narration строится на уже существующих полях точек, без нового authoring-пайплайна для гидов;
- мобильная пригодность решается через компактный list → brief pattern, а не через новый native app или сложный offline-first redesign.

В этой версии не делаем:

- booking, CRM, attendance tracking, payments, marketplace guides или freelancer discovery;
- guide-side authoring, publish, edit, delete для маршрутов, packs, rewards или user data;
- полный rename всех admin/editorial surface в продукте;
- полную переделку `site/index.html` на компонентную frontend-архитектуру;
- жёсткое изъятие уже существующего point-level guide modal из consumer runtime; это отдельный product/security follow-up, а не часть данного запуска.

## 3. Requirements Trace

- **R1-R3 Positioning and access** — закрываются отдельным route `#/guide`, distinct naming `Кабинет экскурсовода`, explicit role model и server-side read-only guards для `Guide`.
- **R4-R7 Pack-first tour execution** — закрываются guide-specific pack list/brief endpoints, compact pack summary и route variant switcher внутри одного brief context.
- **R8-R10 Guide materials and mobile practicality** — закрываются ordered fallback policy `guideText -> facts -> description`, `hasGuideGap` signaling и mobile-first list → brief layout в `site/index.html`.
- **R11-R12 Content eligibility** — закрываются reuse существующего `inspectPack()` и server-side filtering guide-visible packs до published + valid only.
- **R13 Preview/support for admins and curators** — закрывается доступом `Curator` и `Administrator` к guide workspace без превращения этого surface в editor: operational preview здесь, CRUD остаётся в editorial endpoints.

## 4. Context and Research

Локальные паттерны и ограничения:

- `site/index.html` — это фактический основной frontend runtime текущего репозитория: hash-router, карта, QR, profile, route selection, guide modal и весь mobile flow уже живут здесь. Значит guide workspace выгоднее добавлять как отдельный route внутри этого runtime, а не строить второй frontend слой.
- `backend/routes/routePacks.js` уже содержит сильный серверный pattern для eligibility: `inspectPack()` умеет вычислять `isPublishable`, issues и valid routes. Guide workspace должен опираться на этот же источник истины, а не дублировать publishability на клиенте.
- `backend/routes/routes.js` уже возвращает точку с `guideText`, `guideAudioUrl`, `facts` и `description`, поэтому минимальный tour brief можно собрать без новой схемы данных.
- `backend/middleware/auth.js`, `backend/routes/auth.js` и `backend/storage/fileDb.js` пока знают только `User` и `Administrator`. Это главный архитектурный пробел для guide role.
- `backend/routes/users.js` уже является естественным местом для безопасного role-aware profile contract и для минимального admin-only role assignment API.
- В `docs/ideation/2026-04-02-admin-operations-l10n-guides-ideation.md` guide role обсуждается как часть role-based workspace, но этот ideation-документ опирается на shell, которого в текущем repo нет. Поэтому план привязывается к реальному состоянию кода, а не к отсутствующей UI-архитектуре.
- `docs/solutions/` в репозитории сейчас отсутствует, значит institutional learnings по guide workspace здесь нет.

Внешнее исследование не требуется: задача полностью опирается на локальные data/API patterns, не вводит новую нестабильную внешнюю интеграцию и не зависит от меняющихся vendor contracts.

## 5. High-Level Technical Design

Планируемая структура guide flow:

```text
site/index.html
  route()
    -> #/guide
       -> renderGuideWorkspace()
          -> fetchUser()
          -> guard by role: Guide / Curator / Administrator
          -> GET /api/route-packs/guide
          -> compact pack cards
          -> open selected pack
             -> GET /api/route-packs/guide/:id
             -> selected variant defaults to primary
             -> render:
                - pack promise + notes
                - route switcher
                - compact map/context preview
                - ordered stop cards
                - fallback narration blocks
```

Планируемый backend flow:

```text
auth middleware
  -> requireGuideWorkspaceAccess()
  -> routePacks guide endpoints
      -> reuse inspectPack()
      -> resolve pack routes against db.routes + db.points
      -> compute guide-friendly route summaries
      -> compute stop material payload:
           guideText -> facts -> description
      -> return list payload and brief payload
```

Ключевой принцип: pack eligibility и route validity остаются server-side. Клиент отвечает за presentation state, route switching и mobile ergonomics, но не решает сам, какие packs guide может видеть и какой fallback narration считать canonical.

## 6. Technical Decisions

### 5.1 Separate Guide Entry in the Current Runtime

Guide workspace живёт под отдельным top-level hash route `#/guide` внутри `site/index.html`, а не под shared operations shell.

Решение:

- в текущем repo guide workspace добавляется как отдельный маршрут `#/guide`;
- верхняя навигация получает отдельную ссылку `Кабинет экскурсовода`;
- route guard допускает туда только `Guide`, `Curator` и `Administrator`;
- `User` не получает этот вход и при прямом открытии `#/guide` видит access-denied state или redirect.

Почему так:

- это соответствует реальной текущей архитектуре репозитория;
- не блокирует guide role ожиданием будущего shell refactor;
- сохраняет distinct naming из origin-документа без ложной привязки к admin language.

### 5.2 Roles Become Explicit and Operational

Guide role нельзя реализовать как UI-галочку поверх текущего `Administrator`.

Решение:

- backend normalizes users к четырём ролям: `User`, `Guide`, `Curator`, `Administrator`;
- `register` по-прежнему создаёт только `User`;
- `backend/middleware/auth.js` получает generic helper `requireRoles(allowedRoles)` и производные guards:
  - `requireGuideWorkspaceAccess()` для `Guide`, `Curator`, `Administrator`;
  - `requireEditorialRole()` для `Curator`, `Administrator`;
  - `requireAdmin()` остаётся для самых чувствительных admin-only операций;
- route и route-pack CRUD endpoints переводятся с чисто admin guard на editorial guard, чтобы `Curator` был реальным editorial role, а не декоративным значением;
- `backend/routes/users.js` получает минимальный admin-only role assignment endpoint, чтобы guide/curator доступ можно было назначать без ручного редактирования JSON DB.

Почему так:

- это делает feature реально запускаемой, а не завязанной на ручные правки `db.json`;
- соблюдает boundary `guide as operator, not editor`;
- не раздувает scope до полноценной permission matrix.

### 5.3 Guide Uses Dedicated Auth-Protected Pack Endpoints

Guide workspace не должен собираться только из публичных `/api/routes` и `/api/route-packs`.

Решение:

- в `backend/routes/routePacks.js` добавляются guide-specific read endpoints:
  - `GET /api/route-packs/guide`
  - `GET /api/route-packs/guide/:id`
- list endpoint возвращает только compact pack summary, пригодный для быстрого выбора на телефоне:
  - `name`
  - `promise`
  - короткое `description`
  - краткий `practicalNotes` teaser
  - variant summary c `primary`/`alternative`, editorial reason, stop count, duration и route name
- brief endpoint возвращает полный pack brief с resolved routes и ordered stops;
- invalid published packs в v1 исчезают из guide list целиком, а не остаются disabled item внутри guide workspace;
- diagnostics по invalid pack остаются задачей editorial surface, который уже использует server-side validation.

Почему так:

- distinct role должен опираться на server-side access control, а не только на client-side hiding;
- компактный список и полный brief — разные payload shapes с разной ценностью для mobile UX;
- скрытие invalid packs для guide уменьшает operational noise и напрямую соответствует R11-R12.

### 5.4 Fallback Narration Is Ordered and Explicitly Labeled

Guide workspace должен показывать не просто “какой-то текст точки”, а понятный source order.

Решение:

- source order для stop cards:
  1. `guideText` как основной script block;
  2. `guideAudioUrl` как optional media block рядом с guide text;
  3. `facts` как следующий fallback;
  4. `description` как последний fallback;
- API brief для каждой точки возвращает:
  - `materialSource`
  - `hasGuideGap`
  - нормализованный набор display blocks для UI;
- если dedicated guide text отсутствует, UI показывает мягкий gap marker вида `Нет отдельного текста экскурсовода — используем fallback`.

Почему так:

- это закрывает origin question про ordering and labeling;
- guide видит, где сценарий хорошо подготовлен, а где он опирается на backup material;
- fallback остаётся operationally useful и не блокирует тур.

### 5.5 Mobile Brief Uses List → Brief Instead of Dense Split View

Guide workspace ориентируется на телефон, а не на desktop dashboard.

Решение:

- landing screen — компактный pack list;
- после открытия pack guide попадает в single-column brief с:
  - названием и promise;
  - practical notes;
  - route variant switcher;
  - компактным map/context preview;
  - ordered stop cards;
- brief хранит pack context при переключении вариантов, а не выбрасывает guide обратно в список;
- existing point-level helper patterns (`openGuideForPoint`, route focus, map preview) переиспользуются там, где это не ломает distinct guide flow.

Почему так:

- это самый дешёвый и надёжный способ сделать screen practical on phone;
- split view и heavy workspace chrome противоречат R10;
- route switching внутри одного brief напрямую закрывает R6-R7.

### 5.6 Existing Consumer Guide Modal Stays Out of Scope

Текущий consumer runtime уже умеет открывать guide materials внутри общего route flow.

Решение:

- v1 guide workspace не пытается одновременно решить весь вопрос content secrecy между consumer и guide experiences;
- distinct value guide workspace создаётся через role-gated pack-first operational flow, а не через срочный демонтаж текущего consumer guide modal;
- если позже продукт захочет скрывать point-level guide materials от обычных пользователей, это нужно делать как отдельный contract change для `/api/routes` и `site/index.html`.

Почему так:

- иначе задача неконтролируемо расширится с “добавить guide workspace” до “пересобрать весь consumer contract”;
- requirements не требуют такого product change прямо сейчас.

### 5.7 Testing Strategy

Тестирование делится по слоям:

- backend получает automated coverage на role access и guide endpoints;
- `site/index.html` покрывается manual regression checklist, потому что в текущем repo нет полноценного frontend test harness для статического runtime;
- проверка mobile ergonomics входит в обязательную manual verification, а не маскируется weak unit assertions.

## 7. System-Wide Impact

- Role model перестаёт быть binary. Любой клиент, читающий `users/me`, должен корректно переживать новые значения `role`.
- Existing route/pack editorial endpoints меняют access semantics: вместо чисто admin-only они становятся editorial-role aware.
- `inspectPack()` становится shared eligibility source не только для public packs, но и для guide workspace.
- `site/index.html` получает второй authenticated surface, поэтому route handling и shared state нужно держать аккуратно, чтобы guide flow не ломал consumer home.
- Product terminology расширяется: рядом с обычным home появляется отдельный `Кабинет экскурсовода`, но без немедленного глобального rename всех “админных” терминов в repo.

## 8. Implementation Units

### [ ] Unit 1 — Role model, access guards, and minimal role assignment

Primary files:

- `backend/middleware/auth.js`
- `backend/routes/auth.js`
- `backend/routes/users.js`
- `backend/routes/routes.js`
- `backend/routes/routePacks.js`
- `backend/storage/fileDb.js`
- `backend/data/db.template.json`

Test files:

- `backend/tests/roleAccess.test.js` (new)

Work:

- ввести explicit role normalization для `User`, `Guide`, `Curator`, `Administrator`;
- обобщить auth guards через `requireRoles()` и derived helpers;
- перевести route/pack editorial CRUD на editorial-role access;
- добавить admin-only endpoint для смены роли пользователя;
- сохранить registration flow, который по умолчанию создаёт только `User`;
- при необходимости добавить seed fixtures для хотя бы одного guide и одного curator пользователя в demo template data.

Test scenarios:

- `User` получает `403` на guide endpoints и editorial CRUD endpoints;
- `Guide` может открыть guide endpoints, но не может создавать, редактировать или удалять routes/packs;
- `Curator` может пользоваться guide workspace и editorial CRUD, но не role-management endpoint;
- `Administrator` сохраняет полный доступ, включая role assignment;
- legacy user без корректного `role` normalizes to `User`, а не получает расширенные права.

Notes:

- Unit не должен вводить self-serve role switching;
- если в ходе реализации окажется, что часть existing admin endpoints слишком чувствительна для `Curator`, это нужно явно сузить по endpoint-уровню, а не тихо оставить binary guard model.

### [ ] Unit 2 — Guide pack summaries and full tour brief API

Primary files:

- `backend/routes/routePacks.js`
- `backend/services/guideMaterials.js` (new)

Test files:

- `backend/tests/guideWorkspaceRoutes.test.js` (new)

Work:

- добавить auth-protected `GET /api/route-packs/guide`;
- добавить auth-protected `GET /api/route-packs/guide/:id`;
- переиспользовать `inspectPack()` для eligibility и route validation;
- собирать compact summary payload для списка и richer brief payload для выбранного pack;
- вычислять stop-level fallback materials и source labels server-side;
- возвращать ordered variant list с `primary`/`alternative`, editorial reason, point count, distance/duration и route preview;
- скрывать invalid published packs из guide experience.

Test scenarios:

- guide list возвращает только published и сейчас валидные packs;
- featured/sort ordering сохраняется в guide list так же, как в current route-pack logic;
- brief по умолчанию опирается на primary variant, а alternatives приходят в стабильном порядке;
- stop с `guideText` маркируется как guide-ready и не падает в fallback;
- stop без `guideText`, но с `facts`, возвращает facts block и `hasGuideGap: true`;
- stop без `guideText` и `facts`, но с `description`, возвращает description fallback и gap marker;
- invalid или неразрешённый pack не открывается по прямому URL даже для авторизованного обычного пользователя;
- guide-access guard работает server-side, а не только через client navigation.

Notes:

- Unit не должен денормализовать pack brief обратно в persistent DB;
- если для distance/duration выгоднее reuse existing route decoration logic, это надо делать через локальный helper, а не копипастой вычислений.

### [ ] Unit 3 — Guide workspace route and mobile UI in the static client

Primary files:

- `site/index.html`

Test files:

- `docs/manual-tests/guide-workspace-regression-checklist.md` (new)

Work:

- добавить route `#/guide` в текущий hash-router;
- показать link `Кабинет экскурсовода` только для `Guide`, `Curator`, `Administrator`;
- реализовать guide landing с compact pack cards;
- реализовать brief screen с route variant switcher, practical notes, map/context preview и ordered stop cards;
- использовать normalized brief payload вместо самостоятельного client-side reassembly;
- дать guide понятные empty, loading, access-denied и unavailable states;
- удержать distinct product language без admin wording;
- при необходимости переиспользовать existing modal helpers для просмотра материалов точки, но не сводить весь guide workspace к старому consumer route flow.

Test scenarios:

- `Guide` видит navigation entry и открывает pack list;
- `User` при прямом переходе в `#/guide` не получает рабочий guide screen;
- pack list позволяет быстро отличить сценарии по promise, краткому описанию и variant summary;
- открытие pack сохраняет контекст и не выбрасывает пользователя обратно в список;
- переключение primary/alternative route обновляет reason, карту и список stops без потери pack context;
- stop с missing dedicated guide text явно показывает fallback state, но остаётся usable;
- на телефонной ширине guide может быстро просканировать upcoming stops и practical notes без dense editor-like layout.

Notes:

- Unit сознательно остаётся внутри `site/index.html`; это не повод начинать framework migration;
- если код guide route начинает раздувать shared runtime state, допускается локальное выделение небольших helper sections внутри того же файла, но не новый frontend stack.

### [ ] Unit 4 — Launch fixtures and verification pass

Primary files:

- `backend/data/db.template.json`
- `backend/data/db.json` only if demo data intentionally refreshed during implementation
- `docs/manual-tests/guide-workspace-regression-checklist.md`

Verification:

- убедиться, что в demo/template данных есть хотя бы 2-4 published packs, пригодные к guide use;
- убедиться, что хотя бы один pack содержит alternative route, а хотя бы одна точка внутри brief не имеет dedicated `guideText`, чтобы fallback path был проверяемым;
- если feature relies on seeded accounts в local demo, добавить и проверить хотя бы один `Guide` user;
- пройти полный mobile сценарий: вход guide → выбор pack → открытие brief → переключение варианта → чтение stop materials.

## 9. Sequence

1. Сначала ввести role model и guards, иначе guide workspace останется UI without contract.
2. Затем поднять guide pack endpoints, чтобы фронтенд работал с устойчивым read-only payload вместо client-side data assembly.
3. После этого добавить `#/guide` surface в `site/index.html` и связать его с new backend contract.
4. В конце выровнять demo fixtures и пройти manual mobile verification.

## 10. Risks and Mitigations

### Risk: New roles break existing string-based assumptions

Mitigation:

- держать backend guards централизованными в `backend/middleware/auth.js`;
- default unknown/missing role to `User`;
- не размазывать role checks по разным router-файлам вручную, если можно reuse helper.

### Risk: Guide brief silently drifts from current route/point truth

Mitigation:

- собирать brief из live `routePacks` + `routes` + `points`, а не из отдельной guide-specific persisted copy;
- reuse current publishability logic вместо второго eligibility механизма.

### Risk: Mobile UI becomes another dense admin-like screen

Mitigation:

- держать IA в формате list → brief;
- не тянуть в guide workspace CRUD affordances, bulky filters и editor chrome;
- compact notes и stop cards важнее широких desktop layouts.

### Risk: The static `site/index.html` becomes harder to maintain

Mitigation:

- изолировать guide-specific rendering and state names;
- не смешивать guide route с consumer home больше, чем нужно;
- использовать normalized API payload, чтобы не тащить тяжёлую client-side assembly logic.

### Risk: Existing consumer guide modal weakens role separation story

Mitigation:

- явно зафиксировать, что v1 ценность guide workspace — pack-first operational flow и role-gated entry;
- stricter public gating of guide materials вынести в отдельный follow-up вместо смешения двух больших инициатив.

### Risk: Seed/demo setup drifts and makes the feature hard to verify

Mitigation:

- держать guide/curator demo fixtures в `backend/data/db.template.json`, если они нужны для локального запуска;
- избегать тихих одноразовых правок только в tracked `db.json`, если feature действительно требует воспроизводимого demo state.

## 11. Verification Matrix

Product-level checks после реализации:

- guide account может открыть `Кабинет экскурсовода` без доступа к route/pack CRUD;
- обычный `User` не может использовать guide workspace как рабочий surface;
- guide landing показывает только published и валидные packs;
- pack card даёт достаточно контекста для быстрого выбора на телефоне;
- opening a pack даёт один цельный brief со selected route, practical notes, map/context preview и ordered stops;
- alternative route можно переключить внутри того же pack context без потери briefing state;
- stop cards корректно различают `guideText`, `facts` и `description` как разные уровни материала;
- gaps в guide materials видны, но не блокируют тур, если fallback content существует;
- invalid published pack исчезает из guide list после поломки linked route;
- guide workspace не показывает create/edit/publish/delete affordances для routes, packs, rewards и users.

## 12. Deferred Follow-Ups

- assigned packs, расписания и guide-specific availability;
- offline cached pack brief и home-screen shortcut для `#/guide`;
- stricter removal or narrowing of guide materials inside general consumer flow;
- multilingual guide content consumption;
- meeting-point notes, timing cues, tourist-facing share links и tour support tooling поверх базового brief;
- полноценный editorial/operations shell rename в текущем runtime, если эта архитектура останется основной.
