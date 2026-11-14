# STUDY_AI CSS architecture

## Rules

- `tokens.css` owns shared semantic values; keep existing legacy tokens during migration.
- `index.css` and legacy `layout.css`/`components.css` remain until each consuming feature has been migrated and visually verified.
- New component styles use `Component.module.css` and imported `styles` bindings.
- Global selectors must be limited to reset, base typography, tokens and third-party styles.
- Learner and management shells must not use global selectors to style each other's descendants.
- Do not introduce Tailwind-style class strings without a configured CSS processor; the repository currently has no Tailwind dependency.
- Avoid mixing CSS Modules and uncompiled utility class strings in one feature.
- Verify desktop, tablet, mobile and modal/dialog states with screenshot comparisons.
- No production database writes or changes to learner business logic.

## Migration sequence

1. Establish tokens and document CSS ownership.
2. Repair Question Bank as a complete feature (table, filters, preview, forms and dialogs), replacing uncompiled utility class strings with scoped styles.
3. Migrate management shared components and shells.
4. Migrate Admin, Content, Teacher and Support routes by usage.
5. Migrate learner styles in isolated, visually regression-tested batches.
6. Remove obsolete legacy styles only after usage search and visual QA.
