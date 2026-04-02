# Guide Workspace Regression Checklist

## Demo accounts

- `guide@local.test` / `guide123`
- `curator@local.test` / `curator123`
- default administrator is still seeded by backend runtime: `admin@local.test` / `admin123`

## Guide access

- Log in as `guide@local.test` and confirm top nav shows `Кабинет экскурсовода`.
- Open `#/guide` and confirm only published, valid pack scenarios appear.
- Open one pack and confirm mobile flow is `list -> briefing`, not an editor-style dashboard.
- Switch between `primary` and `alternative` variants and confirm notes, stats, map preview, and stop cards update without losing pack context.
- Confirm at least one stop shows `Готово для гида` and at least one stop shows `Нужен fallback`.

## Role guards

- Log in as a normal `User` and open `#/guide`; confirm access-denied state instead of working guide UI.
- Log in as `curator@local.test` and confirm `#/guide` opens successfully.
- Verify `Guide` can read guide workspace but cannot use editorial CRUD endpoints.
- Verify `Curator` can use editorial CRUD endpoints but cannot call user role assignment.

## Pack and material quality

- Confirm featured pack(s) sort ahead of non-featured pack(s).
- Confirm invalid or draft packs do not appear in guide list.
- Open a stop with dedicated `guideText` and verify the card renders guide narrative first.
- Open a stop without `guideText` but with `facts` and verify the card renders facts fallback with a gap marker.
- Open a stop without `guideText` or `facts` and verify the card renders description fallback with a gap marker.

## Regression smoke checks

- Return to `#/` and confirm the main consumer route flow still renders.
- Confirm profile page still loads and logout still works from any route.
- If 2GIS key is configured, confirm guide map preview renders numbered stops; otherwise confirm the fallback message is readable.
