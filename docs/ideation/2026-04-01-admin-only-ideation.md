---
date: 2026-04-01
topic: admin-only
focus: admin UX and curator workflow
---

# Ideation: Admin Experience for NaRyazan

## Codebase Context

Текущая админка уже сильнее обычного CRUD, но пока работает скорее как набор длинных редакторских форм, чем как полноценный рабочий инструмент куратора.

- `frontend/src/pages/AdminRoutes.jsx` уже умеет много: редактирование маршрута, точек, изображений, QR-кодов, геокодирование и карту-превью.
- `frontend/src/pages/AdminRoutePacks.jsx` добавляет второй редакторский контур для сценариев и уже получает server-side `validation.issues`.
- Оба экрана построены по паттерну `форма слева + список справа`, что даёт понятную базу, но приводит к длинным монолитным страницам.
- В админке уже есть зачатки quality layer: для packs сервер вычисляет publishability, но этот подход ещё не стал общим editorial standard.
- Между маршрутами и packs уже есть зависимости, но они почти не видны редактору в момент изменений.
- Публичный опыт пользователя и редакторский опыт администратора пока слабо связаны: контент можно редактировать, но трудно понять, как он будет восприниматься в `Home`.

## Grounding Summary

### What already works

- Inline preview через карту и route geometry.
- QR workflow прямо в редакторе маршрутов.
- Разделение `Маршруты` и `Подборки`, которое не смешивает два разных сценария редактирования.
- Server-side validation для route packs.

### Main Pain Points

- Формы слишком длинные и cognitively heavy.
- Слабая видимость последствий изменений: что сломается, что исчезнет из public, что уже используется в packs.
- Почти нет workflow вокруг статусов, review и publish decision.
- Нет отдельного слоя для скорости редактора: duplicate, templates, массовые действия, быстрый переход между связанными сущностями.
- Нет ясного preview публичного опыта до публикации.

### Past Learnings

- В свежем общем ideation-доке уже была отмечена линия `Curator Content Studio`, но она пока не раскрыта на уровне конкретных admin improvements.
- Релевантных `docs/solutions/` по admin workflow в репозитории сейчас не найдено.

## Ranked Ideas

### 1. Editorial Control Center [Archived]
**Status:** Archived on 2026-04-01; kept only as ideation history and no longer active direction.
**Description:** Добавить отдельную входную страницу админки как редакторский центр управления: drafts, invalid content, recent edits, packs с issues, маршруты без обложки, QR-точки без готового изображения, быстрые действия “исправить”, “дополнить”, “опубликовать”.
**Rationale:** Сейчас админка хорошо умеет редактировать конкретную сущность, но плохо помогает понять общее состояние контента. У проекта уже есть ingredients для такого центра: `validation.issues`, public/private статусы, список routes, список packs и явные quality gaps.
**Downsides:** Сам по себе dashboard не создаёт ценность, если под ним нет хороших health signals и редакторских действий.
**Confidence:** 94%
**Complexity:** Medium

### 2. Preview Before Publish
**Description:** Дать администратору явное публичное preview перед публикацией: как маршрут выглядит в карточке, как pack выглядит на главной, как выбранный маршрут читается в detail state, как выглядит mobile-first версия.
**Rationale:** В проекте уже есть богатый consumer UI, но редактор работает почти вслепую. Для контентного продукта это лишний риск: можно сохранить technically valid сущность, которая выглядит слабо в реальном пользовательском сценарии.
**Downsides:** Нужно поддерживать синхронность между admin preview и реальным public rendering, иначе preview быстро станет “ложным”.
**Confidence:** 92%
**Complexity:** Medium

### 3. Composer Instead of Long Forms
**Description:** Превратить длинные формы в guided composer: `Basics`, `Media`, `Waypoints`, `QR`, `Preview`, `Publish` для маршрутов и `Basics`, `Narrative`, `Route Choices`, `Preview`, `Publish` для packs.
**Rationale:** Сейчас обе страницы перегружены, особенно `AdminRoutes.jsx`, где один экран держит почти весь lifecycle маршрута. Step-based editor уменьшит cognitive load, упростит onboarding и даст место для встроенных рекомендаций.
**Downsides:** Есть риск добавить лишнюю “wizard-ность”, если разбиение будет искусственным и замедлит быстрые правки.
**Confidence:** 90%
**Complexity:** High

### 4. Impact-Aware Editing
**Description:** Показывать редактору последствия изменения или удаления сущности: какие packs используют маршрут, какой pack исчезнет из public, какие QR-точки и точки завязаны на текущий сценарий, какие поля критичны для публикации.
**Rationale:** После появления `route packs` админка стала зависимой системой, а не набором изолированных записей. Сейчас эта зависимость в основном скрыта, а значит ошибки редактора легко становятся public regressions.
**Downsides:** Потребует аккуратной модели dependency summary и может слегка усложнить интерфейс, если перегрузить его предупреждениями.
**Confidence:** 91%
**Complexity:** Medium

### 5. Content Health Layer
**Description:** Расширить validation из точечной server-side проверки packs в общий слой качества контента: missing image, weak description, empty promise, invalid coordinates, route without enough points, duplicated editorial metadata, QR conflict risk, publish blockers vs soft warnings.
**Rationale:** Сейчас quality feedback появляется поздно и неравномерно. У проекта уже есть хорошие hooks в backend (`validation.issues`, route normalization, QR uniqueness checks), значит можно вырастить единый content health standard.
**Downsides:** Нужно очень тщательно разделить blockers и warnings, иначе админка станет ощущаться как система штрафов, а не как помощник.
**Confidence:** 95%
**Complexity:** Medium

### 6. Reuse and Speed Toolkit
**Description:** Добавить инструменты ускорения редактора: duplicate route, duplicate pack, clone from existing route, draft from published entity, quick reorder for waypoints, batch QR generation/export, быстрые шаблоны для типовых сценариев.
**Rationale:** В текущем repo много повторяемой редакторской работы. Это особенно заметно по длинным ручным формам и по сценариям, где curator likely делает похожие сущности с небольшими отличиями.
**Downsides:** Если делать toolkit без чётких ограничений, можно быстро вырастить сложный набор “полускрытых” power features, которые трудны для поддержки.
**Confidence:** 88%
**Complexity:** Medium

### 7. Publish Workflow for Routes and Packs
**Description:** Уравнять lifecycle обеих сущностей через редакторский workflow `draft -> ready for review -> published`, с publish checklist и понятным reason, почему сущность ещё не готова.
**Rationale:** Сейчас packs уже имеют статусный слой, а routes по факту ближе к “save and live”. Для curator продукта это слабое место: публичный каталог оказывается слишком напрямую связан с сырой формой.
**Downsides:** Это полезнее всего, когда контент редактируется регулярно; для совсем маленького пилота workflow может показаться тяжеловесным.
**Confidence:** 87%
**Complexity:** Medium

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Полноценная ролевая система с несколькими admin roles | Слишком рано для текущего масштаба проекта и file-based backend; добавит много process complexity раньше времени. |
| 2 | Медиа-менеджер как отдельный DAM | Интересно, но пока слабее по ценности, чем preview, quality и speed tools; media pain здесь ещё не главная проблема. |
| 3 | WYSIWYG page builder для маршрутов | Слишком дорого и абстрактно для текущего контентного ядра; рискует заменить ясную модель сущностей на тяжёлый конструктор. |
| 4 | Отдельная аналитическая BI-панель для администрации | Пока нет достаточного product signal и event model, чтобы это было сильнее editor workflow improvements. |
| 5 | Совместное realtime-редактирование | Не заземлено в текущем масштабе команды и архитектуре; complexity сильно выше ожидаемой пользы. |
| 6 | Полная миграция админки в low-code CMS | Сломает repo-native workflow и плохо соответствует текущему кастомному маршруту, QR и map logic. |

## Recommended Next Step

Лучший следующий кандидат для `ce:brainstorm`:

`Preview Before Publish`, если цель — сильнее связать работу редактора с реальным публичным опытом без полной перестройки админской архитектуры.

Альтернативный сильный кандидат:

`Content Health Layer`, если цель — сделать качество и publish readiness системными, а не точечными сигналами внутри отдельных экранов.

## Session Log

- 2026-04-01: Admin-only ideation session created from current `AdminRoutes` and `AdminRoutePacks` implementation.
- 2026-04-01: 13 candidate directions considered, 7 survived after filtering and overlap reduction.
- 2026-04-01: `Editorial Control Center` selected for brainstorming; requirements captured in `docs/brainstorms/2026-04-01-editorial-control-center-requirements.md`.
- 2026-04-01: `Editorial Control Center` later dropped from the active direction; the document keeps it only as archived ideation history.
