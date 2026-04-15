---
date: 2026-04-04
topic: mobile-phone-ui
status: active
depth: standard
origin: docs/brainstorms/2026-04-04-mobile-phone-ui-requirements.md
branch: feat/mobile-design-exploration
---

# Mobile Phone UI Refresh Implementation Plan

## 1. Problem Frame

Нужно перевести текущий пользовательский web app на phone-first информационную архитектуру и визуальный язык без изменения продуктового ядра маршрутов, QR-сканирования, наград и профиля (see origin: `docs/brainstorms/2026-04-04-mobile-phone-ui-requirements.md`).

Сейчас основной публичный экран в `frontend/src/pages/Home.jsx` перегружен: подборки, маршрутная карта, QR-сканер, лидерборд, магазин, AI-блок и вспомогательные действия живут на одной длинной странице. Навигация в `frontend/src/App.js` построена как верхняя панель ссылок, а не как app-like mobile shell. В результате телефонный сценарий не ощущается как цельный продукт с понятными разделами.

Планируемая версия должна:

- ввести постоянную нижнюю навигацию `Маршруты / Награды / Профиль`;
- сделать `Маршруты` стартовой phone-витриной подборок и маршрутов;
- вынести reward-функции в отдельный хаб `Награды`;
- упростить `Профиль` до личного кабинета и role-based entry points;
- оставить карту как будущий UI-слой, но не привязывать план к технической реализации maps.

## 2. Scope Boundaries

В рамках этой версии:

- редизайн касается только phone-first пользовательского UI в `frontend/`;
- фокус на маршрутах, наградах, профиле и shell-навигации;
- desktop/admin/guide desktop surfaces не переосмысляются целиком, только сохраняют совместимость;
- реальная реализация map SDK, навигационной логики и пошаговой геомаршрутизации не входит в scope;
- backend contracts и данные маршрутов/наград не меняются, если этого не потребует минимальная поддержка нового UI;
- не строится новый design system с нуля: нужно переупаковать существующие поверхности в более чистую phone IA.

## 3. Requirements Traceability

| Requirement | Plan response |
| --- | --- |
| `R1`-`R3` | Ввести mobile shell с постоянной нижней навигацией и стартом на `Маршруты` |
| `R4`-`R7` | Разделить `Home` на phone-first routes surface: подборки → список маршрутов → план маршрута без акцента на наградах |
| `R8`-`R14` | Добавить отдельный pre-start route plan surface и active-route shell с главным CTA `Сканировать QR` и map placeholder/collapse pattern |
| `R15`-`R19` | Вынести shop/rewards/leaderboard в отдельный `Награды` hub с правильным порядком блоков |
| `R20`-`R22` | Перестроить `Профиль` вокруг личных данных и настроек, сохранив role-based guide/admin entry |
| `R23`-`R25` | Держать спокойный светлый визуальный тон и не превращать маршруты в reward-dashboard |

## 4. Current Context and Research

### 4.1 Repo patterns and existing surfaces

- `frontend/src/App.js` — текущий app shell с верхней навигацией и route wiring.
- `frontend/src/pages/Home.jsx` — огромный multi-purpose экран, где сейчас смешаны:
  - подборки и маршруты,
  - маршрутная карта,
  - QR scanner,
  - leaderboard,
  - shop,
  - профильные/подсказочные элементы.
- `frontend/src/components/RoutePackList.jsx` — уже даёт паттерн карточек подборок.
- `frontend/src/components/RouteList.jsx` — уже даёт паттерн карточек маршрутов, но сейчас делает сильный акцент на выборе/сохранении, а не на phone flow.
- `frontend/src/components/Shop.jsx` — уже содержит reward commerce surface, пригодный как база для вкладки `Награды`.
- `frontend/src/components/Leaderboard.jsx` — уже отдельный компонент, который можно встроить в новый rewards hub.
- `frontend/src/components/Profile.jsx` — уже содержит личные данные, verification, saved/completed routes, но пока не оптимизирован под mobile priorities.

### 4.2 Planning conclusions

- Основная работа — это не “добавить новый экран”, а переразложить существующие компоненты по новой phone IA.
- Лучший путь — выделить отдельный mobile shell и продуктовые секции, а не пытаться косметически причесать текущий `Home.jsx`.
- Карта в плановом active-route flow должна быть treated as placeholder-friendly surface: layout обязан поддерживать её появление/сокрытие, даже если map implementation будет отложена.

### 4.3 External research decision

Кодовая база уже содержит достаточно локальных паттернов для маршрутов, карточек, профиля и rewards-хаба. Внешнее исследование для этого плана не требуется: задача продуктово-композиционная, а не завязанная на новую технологию.

## 5. Technical Decisions

### 5.1 Bottom navigation should become the public mobile shell

Нижняя навигация не должна быть просто декоративной полосой внутри `Home`. Она должна стать основным shell для публичных пользовательских поверхностей:

- `Маршруты`
- `Награды`
- `Профиль`

При этом admin/guide routes остаются отдельными route surfaces и не должны ломаться.

### 5.2 Split current `Home` into explicit public sections instead of one mega-screen

Текущий `Home.jsx` смешивает слишком много задач. Планируемая структура должна разделить публичный UX на самостоятельные секции:

- routes home
- collection detail
- route plan
- active route
- rewards hub

Это можно сделать через stateful shell внутри `/` или через вложенные public routes — конкретный wiring решается в исполнении, но UI responsibilities должны быть явно разделены.

### 5.3 Route selection should optimize for calm, not gamification

Награды не должны исчезнуть, но они не должны доминировать в выборе прогулки. Поэтому:

- карточки маршрутов не акцентируют баллы;
- подборки и маршрутные карточки подают атмосферу и практическую информацию;
- rewards остаются доступными, но в отдельной вкладке.

### 5.4 Active route layout should be map-ready without map implementation dependency

Даже если карты пока не реализуются глубоко, active-route screen должен уже иметь:

- выделенную map zone;
- понятный control для `Открыть карту / Скрыть карту`;
- главный CTA `Сканировать QR`;
- контекст текущей точки / следующего шага.

Для планирования принимаем, что exact collapse pattern — implementation-time design refinement, а не blocker для общей IA.

### 5.5 Profile remains the permission gateway for guide/admin

Guide/admin entry не уходит в отдельную вкладку и не смешивается с маршрутной IA. Он остаётся role-based действием внутри `Профиль`, чтобы мобильная структура не распадалась на слишком много primary destinations.

## 6. High-Level Design

```text
App mobile shell
  -> Routes tab
      -> Collections list
      -> Routes inside selected collection
      -> Route plan
      -> Active route
  -> Rewards tab
      -> Shop / exchange
      -> Compact achievements
      -> Leaderboard
  -> Profile tab
      -> Personal data
      -> Visibility/settings
      -> Guide/Admin entry when allowed
```

Directional UI responsibilities:

```text
frontend/src/App.js
  owns public mobile shell + route-level composition

frontend/src/pages/Home.jsx
  narrows to routes-first public experience, not all public surfaces at once

frontend/src/components/Shop.jsx
frontend/src/components/Leaderboard.jsx
frontend/src/components/Profile.jsx
  become tab content surfaces instead of long-page sections
```

## 7. Implementation Units

### [ ] Unit 1 — Public mobile shell and bottom navigation

Primary files:

- `frontend/src/App.js`
- `frontend/src/index.css`
- `frontend/src/components/MobileTabBar.jsx` (new, recommended)

Test files:

- `frontend/src/__tests__/App.mobileShell.test.jsx` (new)

Work:

- заменить top-only public nav на phone-first shell с постоянной нижней навигацией;
- сохранить совместимость с `/guide`, `/admin`, `/login`, `/register`;
- сделать активную вкладку pill-like;
- оставить desktop fallback/compatibility без ломки admin shell.

Test scenarios:

- авторизованный пользователь по умолчанию попадает на `Маршруты`;
- нижняя навигация показывает три вкладки и корректно выделяет активную;
- переходы между `Маршруты`, `Награды`, `Профиль` не ломают auth routing;
- role-based entry в guide/admin остаётся доступным из корректной поверхности, а не из tab bar.

### [ ] Unit 2 — Routes-first home flow: collections, route list, route plan

Primary files:

- `frontend/src/pages/Home.jsx`
- `frontend/src/components/RoutePackList.jsx`
- `frontend/src/components/RouteList.jsx`
- `frontend/src/components/RoutePlanSheet.jsx` (new, recommended)

Test files:

- `frontend/src/pages/__tests__/Home.mobileFlow.test.jsx` (new or extend existing `Home.routePacks.test.jsx`)

Work:

- сделать routes tab стартовой витриной подборок;
- при выборе подборки показывать только список маршрутов этой подборки;
- убрать reward-heavy emphasis из route cards;
- добавить отдельный route plan surface с обзором маршрута, списком точек и CTA `Начать`.

Test scenarios:

- routes tab по умолчанию показывает подборки;
- выбор подборки переводит в список маршрутов этой подборки;
- возврат из подборки возвращает к витрине подборок;
- выбор маршрута открывает route plan, а не сразу active-route state;
- route plan показывает route summary и список точек/метаданных.

### [ ] Unit 3 — Active route shell with map-ready placeholder and QR priority

Primary files:

- `frontend/src/pages/Home.jsx`
- `frontend/src/components/QRScanner.jsx`
- `frontend/src/components/ActiveRoutePanel.jsx` (new, recommended)

Test files:

- `frontend/src/pages/__tests__/Home.mobileFlow.test.jsx`
- `frontend/src/components/__tests__/QRScanner.test.jsx` (existing, extend only if behavior changes)

Work:

- выделить active-route state отдельно от выбора маршрута;
- дать экрану map zone + collapse/open control без зависимости от полноценной карты;
- поставить `Сканировать QR` в число главных CTA;
- сохранить совместимость с текущим QR flow и будущей картой.

Test scenarios:

- после `Начать` пользователь попадает в active-route shell;
- active-route shell показывает current-route context и CTA `Сканировать QR`;
- map zone можно скрыть/показать без потери route context;
- QR flow остаётся доступным после перехода в active-route shell.

### [ ] Unit 4 — Rewards hub tab

Primary files:

- `frontend/src/components/Shop.jsx`
- `frontend/src/components/Leaderboard.jsx`
- `frontend/src/components/RewardsHub.jsx` (new, recommended)

Test files:

- `frontend/src/components/__tests__/RewardsHub.test.jsx` (new)

Work:

- собрать отдельную вкладку `Награды` из существующих commerce/reward surfaces;
- выстроить порядок: shop/exchange → compact achievements → leaderboard;
- не превращать achievements в тяжёлую витрину;
- сохранить доступность существующих purchase/payment flows.

Test scenarios:

- rewards tab показывает shop/exchange первым блоком;
- compact achievements рендерятся как краткий personal-progress блок;
- leaderboard остаётся частью главного rewards screen;
- purchase/payment interactions продолжают работать в новой композиции.

### [ ] Unit 5 — Mobile profile as settings-first personal cabinet

Primary files:

- `frontend/src/components/Profile.jsx`

Test files:

- `frontend/src/components/__tests__/Profile.mobile.test.jsx` (new, recommended)

Work:

- перестроить mobile profile hierarchy вокруг личных данных и настроек;
- сохранить edit-name, avatar, leaderboard visibility и verification;
- сделать role-based guide/admin entry отдельным, но вторичным action;
- упростить визуальный шум от secondary blocks.

Test scenarios:

- profile screen prioritizes personal settings above saved/completed history;
- toggle visibility in leaderboard remains editable;
- guide/admin entry appears only for users with the relevant role;
- unaffiliated users do not see unauthorized admin/guide actions.

## 8. Sequence

1. Сначала ввести новый public mobile shell и нижнюю навигацию.
2. Затем переразложить routes flow: подборки → маршруты → план.
3. После этого собрать active-route shell вокруг QR-first behavior и map-ready layout.
4. Затем вынести rewards в отдельный hub и упростить profile.
5. В конце пройти regression tests по public flows и role-based entry points.

## 9. Risks and Mitigations

### Risk: `Home.jsx` слишком крупный и редизайн превратится в хаотичную правку одного файла

Mitigation:

- заранее разнести новые responsibilities по small surface components;
- не пытаться сохранить всё внутри текущего monolithic layout;
- использовать новые container components для route plan / active route / rewards hub.

### Risk: bottom navigation поломает guide/admin and auth routing

Mitigation:

- держать public shell и privileged routes разделёнными;
- тестировать routing explicitly;
- не смешивать tab state с admin nested routes.

### Risk: rewards tab получится слишком “магазинной” или слишком “соревновательной”

Mitigation:

- зафиксировать порядок блоков из brainstorm;
- держать achievements компактными;
- leaderboard оставить видимым, но не первым.

### Risk: map placeholder decisions затянут план в техническую реализацию карт

Mitigation:

- относиться к map zone как к UI container с open/close behavior;
- не принимать решений о provider, routing engine или location orchestration в этом плане;
- оставить actual map implementation follow-up задачей.

## 10. Verification Matrix

- Public mobile shell показывает `Маршруты / Награды / Профиль` с корректным active state.
- Routes flow читается как: подборки → маршруты → план маршрута → active route.
- Награды не доминируют в route cards и route plan.
- Rewards tab содержит shop/exchange, compact achievements и leaderboard в правильном порядке.
- Profile prioritizes personal settings and preserves role-based guide/admin access.
- Existing guide/admin routes continue to open and remain permission-gated.

## 11. Deferred Follow-Ups

- реальная реализация карт и route-to-point navigation;
- возможный отдельный экран полного лидерборда, если компактного блока станет недостаточно;
- refinement pass для desktop adaptation, если phone-first shell начнёт заметно расходиться с текущим desktop UX.
