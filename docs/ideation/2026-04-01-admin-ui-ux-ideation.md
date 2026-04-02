---
date: 2026-04-01
topic: admin-ui-ux
focus: admin UI/UX design
---

# Ideation: Admin UI/UX Design for NaRyazan

## Codebase Context

Текущая админка уже выглядит лучше типового внутреннего CRUD, но визуально и UX-структурно она всё ещё работает как набор больших editor pages, а не как цельная рабочая среда.

- `frontend/src/pages/AdminRoutes.jsx` объединяет на одном экране hero, stats, длинную форму маршрута, точки, QR, геокодирование, карту-превью и список всех маршрутов.
- `frontend/src/pages/AdminRoutePacks.jsx` повторяет тот же паттерн: hero, summary cards, большая форма и список всех packs на той же странице.
- `frontend/src/components/AdminSectionTabs.jsx` даёт минимальную навигацию между двумя editor pages, но не создаёт полноценный admin shell.
- Верхняя навигация приложения содержит только один вход `Админка`, а уже внутри пользователь попадает прямо в один из editor screens, а не в curated workspace.
- Визуальная иерархия сейчас строится в основном через крупные hero-блоки, rounded cards и длинный вертикальный flow, а не через рабочие приоритеты редактора.
- В админке уже есть сильные UX-hooks: карта, QR-preview, route validation, pack validation issues и статус `draft/published`, но они пока не собраны в единый визуальный язык.

## Grounding Summary

### Что уже хорошо

- Интерфейс не выглядит устаревшим: есть выразительные hero blocks, крупные cards и современный Tailwind-style surface design.
- Есть реальные preview-элементы, а не только форма: карта маршрута, QR preview, image preview.
- Есть разделение `Маршруты` и `Подборки`, что уже задаёт основу для более зрелой admin IA.

### Где UI/UX проседает

- Экран слишком быстро превращается в “бесконечную форму”.
- Сканировать состояние контента трудно: visual hierarchy помогает эмоции, но не помогает decision-making.
- Нет чёткого различия между режимом “смотреть и выбирать” и режимом “глубоко редактировать”.
- Основные действия не всегда остаются рядом с контекстом: нужно много скроллить между содержимым, preview и save/publish intent.
- Для статусов и quality issues нет полноценного визуального языка, только локальные текстовые сигналы.

## Ranked Ideas

### 1. Admin Workspace Shell
**Description:** Превратить админку из набора отдельных “героических страниц” в цельный workspace shell: persistent header, левый rail или section switcher, явный current context, быстрый переход между `Admin Home`, `Маршрутами`, `Подборками` и активной задачей.
**Rationale:** Сейчас вход в админку слишком резко бросает пользователя в конкретный editor page. Это усиливает ощущение, что админка состоит из изолированных страниц, а не из единой рабочей среды. Такой shell даст основу не только для текущих экранов, но и для будущих admin surfaces без расползания навигации.
**Downsides:** Требует layout refactor и аккуратного переосмысления admin navigation, а не только косметической полировки.
**Confidence:** 95%
**Complexity:** Medium

### 2. Issue-First Split View
**Description:** Перестроить главные admin surfaces в split view: слева queue/list/structure, справа sticky detail, preview, blockers, publish summary и next actions. Не просто “форма слева, список справа”, а decision-first рабочее разделение.
**Rationale:** В текущем UI список и редактор сосуществуют, но визуально не образуют рабочий поток. Split view лучше подходит для curator work: сканировать много сущностей, быстро выбирать одну, видеть последствия и действовать без потери контекста.
**Downsides:** Нужно очень аккуратно решить responsive behavior, иначе на средних экранах layout станет тесным и нервным.
**Confidence:** 93%
**Complexity:** Medium

### 3. Progressive Disclosure Composer
**Description:** Разбить длинные editor forms на секции с явной прогрессией: `Basics`, `Media`, `Waypoints`, `QR`, `Preview`, `Publish` для маршрутов и аналогичный composer для packs, с collapse/expand и sticky action bar.
**Rationale:** Сейчас `AdminRoutes` особенно тяжёл по cognitive load: все важные решения живут в одном длинном потоке. Progressive disclosure сделает интерфейс менее шумным и поможет редактору оставаться в текущем типе задачи, а не прыгать между unrelated controls.
**Downsides:** Легко случайно превратить UX в overdesigned wizard, который замедлит быстрые правки.
**Confidence:** 91%
**Complexity:** High

### 4. Public Preview Mirror
**Description:** Добавить режим “как это увидит пользователь”: live preview карточки маршрута, карточки pack, mobile-frame preview и контекстное отображение публичного состояния рядом с editor intent.
**Rationale:** В проекте уже есть сильный consumer UI, но редактору трудно держать его в голове во время правок. Дизайнерски это один из самых ценных слоёв: он связывает admin-интерфейс с настоящим продуктовым результатом.
**Downsides:** Preview должен оставаться честным отражением public UI; если он начнёт жить своей жизнью, доверие быстро исчезнет.
**Confidence:** 92%
**Complexity:** Medium

### 5. Visual Readiness Language
**Description:** Создать единый визуальный язык для admin state: статусы `draft`, `ready`, `blocked`, `published with issues`, dependency badges, severity colors, issue chips, safe-action buttons, warning summaries и “what changed” callouts.
**Rationale:** Сейчас readiness и quality mostly существуют как текст и локальные warning boxes. Для publish-centric admin это слабая иерархия. Нужен слой визуальных правил, который сразу говорит редактору “это можно выпускать”, “это проблемно”, “это требует внимания”.
**Downsides:** Если readiness model не будет достаточно точной, красивый визуальный язык просто замаскирует смысловую неясность.
**Confidence:** 96%
**Complexity:** Medium

### 6. Scan Mode vs Focus Mode
**Description:** Разделить UX на два осознанных режима: `scan mode` для обзора большого количества маршрутов и packs, и `focus mode` для глубокой правки одной сущности с убранным лишним chrome.
**Rationale:** Сейчас страницы одновременно пытаются быть и каталогом, и редактором. Это ведёт к компромиссам в обоих сценариях. Отдельные режимы лучше соответствуют реальной работе редактора: сначала найти и выбрать, потом погрузиться и исправить.
**Downsides:** Режимы добавляют концептуальную сложность, если переход между ними будет неочевидным.
**Confidence:** 89%
**Complexity:** Medium

### 7. Speed Ergonomics Layer
**Description:** Улучшить ощущение скорости через UX-эргономику: sticky save/publish bar, unsaved-change cues, quick jump между проблемными сущностями, keyboard-friendly actions, compact quick actions на карточках и быстрый возврат в предыдущий контекст.
**Rationale:** Даже без архитектурной перестройки админка может ощущаться заметно лучше, если сократить потери на скролле, повторных переходах и “а где теперь сохранить?”. Это high-leverage UI/UX polish с реальной редакторской ценностью.
**Downsides:** Такие улучшения легко расползаются в набор мелочей без единой концепции, если не привязать их к конкретным workflows.
**Confidence:** 90%
**Complexity:** Medium

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Полный dark enterprise redesign | Слишком декоративно относительно реальных UX-проблем; не решает навигацию, иерархию и editor overload. |
| 2 | Kanban-first админка для всего | Интересно для publishing workflows, но преждевременно и слишком жёстко диктует процесс для текущего масштаба проекта. |
| 3 | Drag-and-drop builder для маршрутов и packs | Визуально соблазнительно, но дорого, хрупко и не даёт лучшего leverage, чем shell, preview и readiness language. |
| 4 | Mobile-first parity для всей админки | Для этого контура важнее desktop-first productivity; mobile support полезен, но не должен быть главным дизайн-драйвером. |
| 5 | Heavy motion and animated admin storytelling | Риск декоративности без пользы; в admin-среде скорость понимания важнее эффектности. |
| 6 | Полная визуальная унификация с consumer-home | Админке нужен свой рабочий характер; слишком буквальное копирование публичного интерфейса снизит editor clarity. |

## Recommended Next Step

Лучший следующий кандидат для `ce:brainstorm`:

`Admin Workspace Shell`, если цель — радикально улучшить ощущение цельной рабочей среды и создать устойчивую основу для роста админки.

Очень сильный альтернативный кандидат:

`Visual Readiness Language`, если цель — быстро и заметно усилить admin UI без тотальной перестройки layout architecture.

## Session Log

- 2026-04-01: Fresh UI/UX-only admin ideation session created from current `AdminRoutes`, `AdminRoutePacks`, `AdminSectionTabs` и наблюдаемых проблем admin IA.
- 2026-04-01: 12 design directions considered, 7 survived after filtering for groundedness, leverage, and UI/UX-specific value.
- 2026-04-01: `Admin Workspace Shell` selected for brainstorming; requirements captured in `docs/brainstorms/2026-04-01-admin-workspace-shell-requirements.md`.
- 2026-04-01: `Editorial Control Center` removed from active UI/UX direction; `Admin Workspace Shell` reframed around neutral `Admin Home` and unified workspace navigation.
