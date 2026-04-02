---
date: 2026-04-02
topic: qr-scan-experience
status: active
depth: standard
origin: docs/brainstorms/2026-04-02-guide-workspace-requirements.md
---

# QR Scan Experience Implementation Plan

## 1. Problem Frame

Нужно привести QR-flow в текущее рабочее состояние для живого использования на телефоне и одновременно убрать несколько системных шероховатостей вокруг сканирования.

Сейчас в `site/index.html` QR-механика формально существует, но пользовательский путь остаётся хрупким:

- основной UI предлагает только ручной ввод `qrValue`, а CTA `Открыть камеру` помечен как `soon`;
- `handleScanResult()` ждёт поле `freshScan`, которого `backend/routes/scan.js` сейчас не возвращает, поэтому успешный скан не получает внятного success-feedback;
- backend ищет точку только по точному совпадению `p.qrCodeValue === qrValue`, без нормализации регистра, пробелов, URL-представлений или pasted deep links;
- offline queue синхронизируется только по событию `online`, поэтому сохранённые офлайн-сканы могут зависнуть после перезагрузки страницы, если пользователь уже снова онлайн;
- scan flow не помогает пользователю удерживать маршрутный контекст: после скана не происходит осознанного route-focus, нет явного статуса `новый скан / уже засчитано / маршрут завершён`.

Планируемая версия должна:

- сделать реальное QR-сканирование камерой доступным в текущем `site/` runtime;
- сохранить ручной ввод как fallback, а не как основной сценарий;
- сделать lookup устойчивым к разным формам QR-payload, не ломая текущие `qrCodeValue`;
- встроить scan feedback в существующий route flow, а не создавать второй параллельный режим;
- поддержать мобильное live use из origin-requirements (`R10`, see origin: `docs/brainstorms/2026-04-02-guide-workspace-requirements.md`);
- сохранить constraint из `docs/brainstorms/2026-04-01-route-packs-requirements.md`: normal route flow stays authoritative, поэтому карта, прогресс по точкам, guide modal и completion должны по-прежнему жить в одном сценарии.

## 2. Scope Boundaries

В рамках этой версии:

- улучшается текущий runtime QR-flow в `site/index.html` и backend contract вокруг `/api/scan`;
- сохраняется совместимость с уже существующими raw `qrCodeValue`, которые генерируются и печатаются сегодня;
- ручной ввод остаётся как fallback для demo, low-connectivity и recovery scenarios;
- камера, загрузка фото и ручной ввод работают как три входа в один и тот же scan pipeline;
- route selection, guide modal, markers и completion остаются частью существующего `site/` route flow;
- React admin в `frontend/` не перепроектируется; достаточно сохранить совместимость с его current QR payload shape;
- не вводится отдельная QR CMS, массовый QR export pipeline, analytics dashboard или новый consumer routing layer;
- не делается полный рефактор `site/index.html` на модульную архитектуру; допускается только локальное выделение QR-scanner adapter слоя, если это materially улучшает поддержку.

## 3. Context and Research

Локальные паттерны и ограничения:

- `site/index.html` уже держит весь public/guide runtime: карту, route selection, guide modal, offline queue, scans, leaderboard и rewards. QR-work нужно встраивать сюда, а не распылять между несколькими frontend слоями.
- `backend/routes/scan.js` уже делает idempotent rewarding по `user.scannedPoints`, поэтому duplicate-safe replay для offline sync — существующий сильный паттерн, который нужно сохранить и сделать явным в ответе API.
- `backend/routes/routes.js` уже нормализует `waypointType`, гарантирует unique `qrCodeValue` и автогенерирует slug-like QR values. Значит QR canonicalization стоит вынести в shared helper, а не дублировать вручную в scan route.
- `backend/storage/fileDb.js` уже содержит `scans: []`, но runtime-flow им не пользуется. Это означает, что scan system можно расширять без миграции схемы базы, но в этой версии не обязательно строить поверх этого отдельную историю сканов.
- `frontend/src/pages/AdminRoutes.jsx` генерирует QR-изображения из raw `qrCodeValue`, поэтому runtime scanner обязан продолжать принимать raw payload как first-class input.
- `docs/solutions/` в репозитории сейчас нет, поэтому institutional learnings по QR-flow отсутствуют.

Внешнее исследование нужно: кодовая база не содержит существующего mobile camera scan pattern, а browser support здесь критичен для UX.

Ключевые внешние выводы:

- MDN: `getUserMedia()` широко доступен, но работает только в secure context (`HTTPS` / `localhost`); это operational constraint, а не edge case.
- MDN: `facingMode: "environment"` — корректный способ предпочесть заднюю камеру на мобильных устройствах.
- MDN: `BarcodeDetector` остаётся limited / experimental и не является Baseline; опираться на него как на primary production scanner рискованно.
- `mebjas/html5-qrcode` даёт camera scan, local-file scan, remember-last-camera и torch/zoom support, что хорошо подходит для текущего статического `site/` клиента без bundler. Но проект в maintenance mode, поэтому интеграцию нужно изолировать через небольшой adapter слой и не размазывать library-specific calls по всему runtime.

Источники:

- MDN `BarcodeDetector`: https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
- MDN `MediaDevices.getUserMedia()`: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN `MediaTrackConstraints.facingMode`: https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/facingMode
- `mebjas/html5-qrcode` README: https://github.com/mebjas/html5-qrcode
- `mebjas/html5-qrcode` releases: https://github.com/mebjas/html5-qrcode/releases

## 4. High-Level Technical Design

Планируемый QR pipeline:

```text
Scan entry surface in site/index.html
  - Camera
  - Photo / screenshot fallback
  - Manual code fallback
  - Offline queue status

Each entry path -> handleQrCapture(rawText, source)
  -> POST /api/scan { qrValue: rawText, source }
  -> backend normalizeQrScanInput(rawText)
      -> resolve point by canonical candidate values
      -> return scanStatus + reward delta + point + completion signals
  -> client updates:
      - queued state
      - user progress
      - selected route / map markers
      - guide modal for scanned point
      - toast / route completion feedback
```

Scanner integration boundary:

```text
site/vendor/html5-qrcode.min.js   (vendored library)
site/scripts/qrScanner.js         (thin adapter over library lifecycle)
site/index.html                   (app-specific UI, queue, route-state wiring)
```

Ключевой принцип: decoding library отвечает только за camera/file decoding и lifecycle камеры. Product behavior — какой toast показать, когда переключить маршрут, как синхронизировать queue, когда открыть guide modal — остаётся в текущем app runtime, а не прячется внутри library UI.

## 5. Technical Decisions

### 5.1 Canonical QR Matching Must Be Server-Side and Shared

Нормализация QR input должна жить на backend, потому что один и тот же QR payload может прийти:

- из ручного ввода;
- из camera scanner;
- из file/photo scan;
- из offline replay;
- из будущих клиентов, кроме текущего `site/`.

Решение:

- вынести shared helper, например `backend/services/qrCodes.js`, с функциями:
  - `normalizeQrValueForMatch(value)`
  - `extractQrCandidates(rawInput)`
  - `valuesMatch(left, right)`
- использовать этот helper и в `backend/routes/scan.js`, и в `backend/routes/routes.js` для uniqueness / validation consistency;
- scan lookup должен принимать как минимум:
  - raw slug-like value (`rq_museum_kremlin_01`);
  - trimmed / differently cased value;
  - URL payload c query/hash/path candidate, если физический QR когда-либо кодирует ссылку, а не только slug.

Это убирает хрупкость exact-match only и делает backend единственным источником правды о том, что считать валидным QR input.

### 5.2 Existing Raw `qrCodeValue` Remains the Authoring Canonical

Текущая editorial модель уже построена вокруг raw `qrCodeValue`, а React admin генерирует QR image именно из него.

Решение:

- не менять v1 authoring contract для маршрутов и waypoints;
- не требовать миграции всех существующих QR-картинок на URL-формат;
- позволить backend принимать и raw payload, и richer URL payload как input forms, но canonical stored value оставить прежним;
- если позднее понадобится deep link QR, это станет additive enhancement, а не breaking migration.

Это даёт надёжность без ненужного каскадного перепроектирования editorial tooling.

### 5.3 Scanner Strategy: Low-Level Library Adapter, Not Native-Only API

Нативный `BarcodeDetector` нельзя брать как primary path из-за limited availability. Для рабочего mobile UX нужен более устойчивый decoding слой.

Решение:

- использовать `html5-qrcode` как decoding library;
- подключать library не через default end-to-end UI, а через low-level adapter слой (`site/scripts/qrScanner.js`), чтобы сохранить визуальный язык текущего `site/` интерфейса;
- vendoring предпочтительнее CDN runtime dependency для production path:
  - `site/vendor/html5-qrcode.min.js` (new)
  - `site/scripts/qrScanner.js` (new)
- adapter обязан инкапсулировать:
  - start / stop lifecycle;
  - preferred camera request (`facingMode: "environment"`);
  - file/photo scan path;
  - cleanup при закрытии модалки, смене view и navigation.

Дополнительное решение:

- не строить plan на experimental `useBarCodeDetectorIfSupported` как обязательной части runtime;
- torch/zoom считать opportunistic enhancement, доступной только при capability support.

### 5.4 QR UX Must Be Route-Aware, Not Just Decode-Aware

Сейчас пользователь может theoretically “отправить код”, но продукт почти не объясняет, что произошло дальше.

Решение:

- scan surface в `site/index.html` перестраивается в priority order:
  - primary action: `Открыть камеру`
  - secondary action: `Загрузить фото QR`
  - tertiary fallback: manual code entry inside collapsible/manual section
- рядом со scan entry показывается current status:
  - `онлайн / офлайн`
  - количество pending scans
  - next expected checkpoint для `state.selectedRoute`, если маршрут выбран
- после успешного скана runtime должен:
  - обновить `state.user`;
  - при необходимости сфокусироваться на маршруте scanned point, если маршрут ещё не выбран или выбран другой;
  - перерисовать markers / pedestrian route;
  - открыть guide material для точки;
  - показать явный toast по типу результата.

Toast contract:

- `fresh` -> точка засчитана, показан reward delta;
- `duplicate` -> точка уже была засчитана, без ощущения “ничего не произошло”;
- `route-completed` -> отдельный completion feedback, если этот скан закрыл маршрут.

Это делает scan частью маршрута, а не isolated technical action.

### 5.5 Offline Queue Needs Versioning, Dedupe, and Startup Sync

Текущая queue хранится под `offline_scan_queue`, но:

- не синхронизируется автоматически при следующем online page load;
- допускает бесконечные дубли;
- не даёт пользователю понятного статуса.

Решение:

- перевести queue на versioned key, например `offline_scan_queue_v2`;
- хранить более явную shape:
  - `id`
  - `rawValue`
  - `normalizedHint`
  - `source`
  - `createdAt`
- dedupe queue по canonical normalized value, чтобы один и тот же QR не копился многократно;
- запускать sync:
  - на `renderHome()` / initial runtime bootstrap, если пользователь уже онлайн;
  - на событии `online`;
  - после успешного login/session restore, если queue не пуста;
- сохранять idempotency через backend `duplicate` status, а не через client-side guesswork;
- показывать пользователю pending counter и результат синхронизации.

Это убирает ситуацию “офлайн-скан сохранился, но никогда не отправился”.

### 5.6 Secure-Context and Permission States Must Be First-Class UX States

Camera path не должен выглядеть “сломавшимся” в HTTP, denied-permission или unsupported browser scenarios.

Решение:

- до старта camera flow проверять:
  - secure context;
  - наличие нужных browser APIs;
  - поддержку/результат permission request;
- у каждого failure mode должен быть product-friendly fallback:
  - `HTTP / insecure context` -> объяснить, что камера доступна только по HTTPS или localhost, и предложить photo/manual fallback;
  - `permission denied` -> объяснить, как вернуться к manual/photo path;
  - `no camera found` -> photo/manual fallback;
  - `scanner init failed` -> restart action + manual fallback.

Это особенно важно для origin requirement про live phone use: пользователю нужен выход, а не тупик.

### 5.7 Testing Stays Contract-Heavy; Browser Verification Gets a Durable Checklist

В текущем `site/` runtime нет существующего browser automation harness, и добавлять полноценный новый test framework только ради QR-flow — спорное расширение scope.

Решение:

- backend contract покрывается автоматизированным node test file;
- browser-facing `site/` changes получают durable manual regression checklist в репозитории;
- это оставляет проверку реальных mobile/browser combinations явной частью delivery, но не раздувает задачу в “сначала построим новый QA framework”.

## 6. System-Wide Impact

- `/api/scan` меняет shape response и становится richer contract surface для текущего `site/` runtime и потенциально будущих клиентов.
- `backend/routes/routes.js` начнёт пользоваться shared QR helper, что влияет на route validation и duplicate detection semantics.
- `site/` получает локальный scanner adapter и vendor asset; это новый, но узко ограниченный integration seam.
- localStorage queue key меняется на versioned variant, чтобы старый формат не мешал новой синхронизации.
- QR authoring в React admin остаётся совместимым, потому что runtime продолжает принимать raw `qrCodeValue`.
- deployment получает явную operational dependency: camera scanning требует `HTTPS` или `localhost`.

## 7. Implementation Units

### [ ] Unit 1 — Shared QR canonicalization and richer scan API contract

Primary files:

- `backend/services/qrCodes.js` (new)
- `backend/routes/scan.js`
- `backend/routes/routes.js`

Test files:

- `backend/tests/scanRoutes.test.js` (new)

Work:

- вынести QR normalization / candidate extraction в shared backend helper;
- перевести route-side QR uniqueness checks на canonical comparison, а не на raw string equality only;
- обновить `/api/scan`, чтобы он возвращал явный результат скана:
  - `scanStatus`
  - `freshScan`
  - `alreadyScanned`
  - `rewardDelta`
  - `newBalance`
  - `point`
  - `newlyCompletedRoutes` или equivalent completion signal
  - optional `normalizedQrValue`
- сохранить idempotent replay semantics для offline sync;
- сделать error surface различимым: invalid QR vs auth/user problems vs server failure.

Test scenarios:

- raw `qrCodeValue` корректно матчится и отдаёт `scanStatus: fresh` при первом скане;
- повторный скан того же payload отдаёт `scanStatus: duplicate` и `rewardDelta: 0`, не начисляя баллы повторно;
- input с пробелами и отличием в регистре всё ещё матчится в ту же точку;
- URL-like payload, содержащий QR value в query/hash/path, резолвится в правильную точку;
- invalid QR получает domain-specific 404/validation response, а не generic success;
- скан последней недостающей точки отдаёт completion signal для маршрута;
- route save/update не допускает canonical duplicates, даже если raw строки различаются только регистром/обёрткой.

Notes:

- Unit не должен навязывать миграцию существующих `qrCodeValue` в базе;
- пока `site/index.html` не переведён на новый response contract, backend должен сохранить backward-compatible поля (`reward` как alias для нового reward delta и новый `freshScan` flag), чтобы промежуточное состояние ветки не ломало текущий runtime;
- если потребуется журналировать scans в `db.scans`, это можно сделать только как thin append-only enhancement, без вывода в отдельный пользовательский UI в этой версии.

### [ ] Unit 2 — Camera/file/manual scanner surface in the static `site/` client

Primary files:

- `site/index.html`
- `site/scripts/qrScanner.js` (new)
- `site/vendor/html5-qrcode.min.js` (new)

Test files:

- `docs/manual-tests/qr-scan-regression-checklist.md` (new)

Work:

- заменить stubbed camera CTA на рабочий scanner entry;
- собрать единый app-owned QR UI с тремя входами:
  - camera
  - photo/file
  - manual fallback
- изолировать lifecycle third-party scanner inside adapter file, а не размазывать его по общему runtime state;
- предпочитать rear camera (`environment`) на mobile;
- обеспечить clean stop/teardown камеры при закрытии модалки и навигации;
- добавить capability-aware UX для secure-context, permission denied, unsupported browser и scanner init failure.

Test scenarios:

- на мобильном/desktop в secure context открытие scanner UI запрашивает камеру и запускает decode flow;
- если камера недоступна, пользователь видит объяснимый fallback path, а не мёртвую кнопку;
- photo/file scan принимает скриншот или фото QR и приводит к тому же decode handler, что и камера;
- manual input остаётся доступным как recovery path;
- закрытие scanner UI освобождает камеру и не оставляет hanging stream;
- при повторном открытии scanner UI предыдущий session state не ломает повторный запуск.

Notes:

- Unit сознательно не вводит library-default scanner UI, чтобы не ломать визуальную цельность `site/`;
- vendored library file должен считаться внешним артефактом, а кастомная логика должна жить только в adapter/runtime слоях.

### [ ] Unit 3 — Route-aware feedback, offline sync resilience, and progress cues

Primary files:

- `site/index.html`
- `backend/routes/scan.js`

Test files:

- `backend/tests/scanRoutes.test.js` (extended)
- `docs/manual-tests/qr-scan-regression-checklist.md` (new)

Work:

- обновить client handling response from `/api/scan`, чтобы он корректно различал `fresh` и `duplicate`;
- убрать зависимость от отсутствующего сейчас `freshScan`-флага как implicit contract bug;
- добавить route-aware success behavior:
  - route focus при скане точки вне текущего route context;
  - marker refresh;
  - guide modal для точки;
  - completion toast / next step prompt;
- пересобрать offline queue на versioned key, dedupe и startup sync;
- показать pending queue count и результат синхронизации в scan UI;
- добавить lightweight “следующая QR-точка” hint для выбранного маршрута, чтобы scan flow помогал ориентироваться по прогулке.

Test scenarios:

- fresh scan показывает явный success state, обновляет баланс и прогресс по точкам;
- duplicate scan показывает informative status вместо silent no-op;
- если точка относится к другому маршруту, runtime переключает контекст предсказуемо и не ломает карту;
- offline-added item синхронизируется после page reload, если сеть уже восстановилась;
- queue dedupe не сохраняет по несколько одинаковых QR подряд;
- после закрытия последней точки пользователь получает feedback о завершении маршрута;
- next checkpoint hint сдвигается после успешного свежего скана.

Notes:

- auto-switch route context должен быть бережным: если продуктовая реальность покажет, что гиды часто сознательно держат открыт другой маршрут, это поведение можно потом смягчить до banner-confirmation;
- в этой версии не строится полноценная scan history timeline.

## 8. Sequence

1. Сначала ввести shared QR canonicalization и новый `/api/scan` contract, чтобы frontend работал с устойчивой и выразительной серверной моделью.
2. Затем внедрить camera/file/manual scanner surface в `site/`, не трогая пока deeper route feedback.
3. После этого связать scanner result с route context, offline queue v2 и progress cues.
4. В конце оформить manual regression checklist и пройти продуктовую проверку на реальном mobile flow.

## 9. Risks and Mitigations

### Risk: Camera scanning still “doesn’t work” in production because the app is served over HTTP

Mitigation:

- сделать secure-context requirement явной частью UX и operational notes;
- не скрывать кнопку без объяснения;
- всегда оставлять photo/manual fallback.

### Risk: Third-party scanner library becomes a maintenance liability

Mitigation:

- зафиксировать vendored version;
- изолировать library за `site/scripts/qrScanner.js`;
- не смешивать library DOM/UI c product UI;
- сохранять manual/photo fallback, чтобы scanner dependency не была single point of failure.

### Risk: Dual frontend structure (`site/` и `frontend/`) размоет scope

Mitigation:

- зафиксировать, что v1 runtime work идёт в `site/`;
- оставить React admin только как compatibility constraint для current QR payload shape;
- любые editor UX improvements для QR вынести в follow-up, если они понадобятся.

### Risk: Offline queue v2 breaks or silently drops existing queued items

Mitigation:

- использовать versioned localStorage key вместо in-place mutation старого формата;
- обрабатывать legacy queue отдельно только как best-effort migration, если это действительно нужно во время реализации;
- делать sync idempotent через backend duplicate-safe contract.

### Risk: Route auto-focus after scan feels jarring

Mitigation:

- auto-focus применять только когда текущий маршрут отсутствует или scanned point не принадлежит ему;
- сопровождать переключение явным message с именем маршрута;
- оставить дальнейшее смягчение поведения как product follow-up, если появится реальный friction.

## 10. Verification Matrix

Product-level checks после реализации:

- на телефоне в `HTTPS`-окружении пользователь может открыть камеру и реально засчитать QR-точку без ручного ввода slug;
- QR, закодированный как raw value, продолжает работать;
- QR, закодированный как URL c query/hash/path payload, тоже резолвится в ту же точку;
- после нового скана пользователь получает понятный success feedback, видит обновлённые markers и guide material;
- повторный скан не начисляет баллы повторно, но даёт понятное `already scanned` feedback;
- если связь пропала, scan request не теряется и синхронизируется после восстановления сети даже после перезагрузки страницы;
- scan card показывает pending queue state и не оставляет пользователя в неопределённости;
- после закрытия последней QR-точки маршрута пользователь получает completion cue;
- при denied permission, insecure context или отсутствии камеры пользователь всё равно может пройти QR-step через photo/manual fallback;
- существующие QR, сгенерированные из `frontend/src/pages/AdminRoutes.jsx`, остаются валидными для runtime scanner.

## 11. Deferred Follow-Ups

- выравнивание React admin QR-copy и help text с новым runtime contract;
- optional scan history / “последние сканы” UI поверх `db.scans`;
- shareable deep-link QR rollout как primary authoring format;
- browser automation harness для `site/` QR-flow, если manual checklist начнёт тормозить delivery;
- richer guide-mode hints: “следующая точка”, distance-to-next, badge progress и final-test readiness в одном scan/status panel.
