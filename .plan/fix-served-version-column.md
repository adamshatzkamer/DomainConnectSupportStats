# Served column → Version (#82)

## Tasks

- [x] `servedLabel()`: version as is, badge only for outdated/morphed; tests
- [x] `Served.svelte`: badge hidden at phone width; header `VERSION` on both cards
- [x] e2e, REQUIREMENTS F-2.22, CHANGELOG, version 0.22.1
- [~] verify, draft PR, screenshots

## Decisions

- `null` version shows `–`; "Not recorded yet" stays in the hover text.
- Response kind and `matches` dropped from the cell; raw values stay in the hover text.
- Patch bump (readability fix).
