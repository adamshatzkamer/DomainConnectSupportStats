# Developing

Code, writing and process conventions.

Related: [REQUIREMENTS.md](REQUIREMENTS.md), [TESTING.md](TESTING.md),
[DEPLOYMENT.md](DEPLOYMENT.md), [contract/export/EXPORT_FORMAT.md](contract/export/EXPORT_FORMAT.md).

---

## 1. Writing

Applies to all text: docs, code comments, commit messages, PR descriptions, issues, UI text.

- **Concise.** State facts in short words.
- **No rationale** unless it is far from obvious and needed to understand the fact.
- **No alternatives.** Never describe options not taken or justify by contrast to them.
- **Current state only.** No references to issues, requirement ids, dates or history in docs and
  comments. History goes in [CHANGELOG.md](CHANGELOG.md); issues are referenced from commits and
  PRs only.

---

## 2. Code conventions

### 2.1 Style

TypeScript (strict, `noUncheckedIndexedAccess`) and Svelte 5 with runes. Prettier (single quotes,
width 100) and ESLint (`typescript-eslint`, `eslint-plugin-svelte`): `npm run format`,
`npm run lint`. Reformatting goes in a separate commit.

### 2.2 Naming

| Kind      | Convention                                                | Example                                     |
| --------- | --------------------------------------------------------- | ------------------------------------------- |
| Module    | `camelCase` or `kebab-case` `.ts`, noun                   | `series.ts`, `export-release.ts`            |
| Component | `PascalCase.svelte`, noun                                 | `DataTable.svelte`                          |
| Page      | `kebab-case.html`, the contract's page name               | `service-provider.html`                     |
| Function  | `camelCase`, verb phrase                                  | `filePath`, `importTimeMs`                  |
| Predicate | `is` / `has` / `should`                                   | `isNumericKind`                             |
| Constant  | `UPPER_SNAKE`                                             | `SUPPORTED_FORMAT_VERSION`                  |
| Test      | `describe('<unit>')` + `it('<behaviour>')` in plain words | `it('sorts nulls last in both directions')` |

- **Name what it is.** "Domains" are always _attributed, scanned_ domains; a label saying
  "domains on the Internet" is a bug.
- **Provider ids.** `dns_provider_id` (number): one DNS provider deployment. `provider_id`: a
  **stack** in `dns-providers.json`, stack cards and template supporters, but the **service
  provider** in `templates.json`. `service_provider_id`: a template publisher. In code use
  `dnsProviderId`, `stackId`, `serviceProviderId`, never `providerId`; convert where a contract row
  is read.
- **Say what a count counts:** `supportedCount`, `knownDnsProviders`, not `count`, `total`, `n`.

### 2.3 Comments

Only where the code is not self-explanatory:

- contract rules the code enforces (`findTable`'s suffix match, `compareCells` putting `null`
  last, two-clock placement in `series.ts`), naming the EXPORT_FORMAT.md section;
- code that looks wrong but is right;
- what a broad `catch` is for.

No commented-out code, changelog comments, or comments restating the code. Every exported function
has a one-line docstring, plus details when the signature and types don't say it.

### 2.4 Types

No `any`. Contract data is typed in `src/lib/data/types.ts`: only what the site reads, unknown keys
allowed. Cast a cell where it is read (`num(row, key)`) and handle `null` there.

### 2.5 Error handling

- **Never a blank page.** Every page renders inside `Layout`; every load is an `{#await}` with a
  `{:catch}`: `NotFound` (missing param, 404) links back to the list, `LoadError` otherwise.
- **Not found ≠ failed.** A card 404 is a user-facing state; a 5xx or `ReleaseMismatchError` is a
  load failure.
- **Never swallow errors.** Handle or propagate to the page's `{:catch}`.
- An unsupported `format_version` fails with `UnsupportedFormatError`.

### 2.6 Third-party text

- Text interpolation (`{value}`) only. `{@html}` is a lint error (`svelte/no-at-html-tags`), no
  exceptions.
- URLs from the data (`logo_url`, `api_url`, ...) pass `safeUrl` (`https:`/`http:` only) before
  they become links or images.
- No `console.log` in shipped code.

### 2.7 Svelte

Runes (`$props`, `$state`, `$derived`, `$effect`); no `export let` or stores. Components take data
as props; views fetch. Pure logic lives in `src/lib/*.ts`, not in a component's `<script>`.

A promise shown by an `{#await}` nested in another one may reject before it is rendered: give it
its own `.catch(() => undefined)` where it is created, or the rejection is an uncaught page error.

### 2.8 Module layout

```
src/pages/*.html → src/entries/*.ts → src/views/*.svelte → src/lib/components/*.svelte
                                                         ↘ src/lib/*.ts → src/lib/data/*.ts
```

Imports go in this direction only. `src/lib/data/` and `src/lib/*.ts` never import Svelte or touch
the DOM (except `config.ts` reading `window`). Views compose components. Functions: ≤ 40 lines,
one level of abstraction.

---

## 3. Process

### 3.1 Agent branch mutex

`.agent-sync.yml` in the repo root marks the checkout as in use by an agent session.

1. Before any other action, check for it. If present: stop, poll every 15 minutes until gone.
   Its content is irrelevant.
2. Create it atomically (`set -o noclobber; { > .agent-sync.yml; } 2>/dev/null`, or Node
   `fs.openSync(path, 'wx')`). If creation fails, go back to 1.
3. Content:
   ```yaml
   timestamp: 2026-10-04T14:03:00Z
   branch: feat/<topic>
   issue: <GH issue number(s)>
   ```
4. Sync `main`: `git checkout main && git pull --ff-only origin main`, then branch.
5. Never commit it (it is in `.gitignore`).
6. Remove it when the iteration is finished and the checkout is back on `main`. A leftover file
   from a crashed session is removed by hand after confirming no agent is active.

### 3.2 Test-driven development

Red → green → refactor wherever there is a testable seam. Mandatory for:

- `src/lib/data/`;
- `src/lib/format.ts`, `cells.ts`, `series.ts`;
- `scripts/`;
- sorting and filtering in `DataTable`;
- every bug fix: a failing test reproducing the observed behaviour first.

Page layout, styling and chart cosmetics: Playwright assertions on what the page shows
([TESTING.md](TESTING.md) §6), screenshots accepted by the maintainer (§3.6).

### 3.3 Branches

```
main                    protected; no direct pushes
  feat/<topic>          new page or capability
  fix/<topic>           defect
  refactor/<topic>      behaviour-preserving restructuring
  docs/<topic>          documentation only
  chore/<topic>         deps, tooling, hygiene
  chore/contract-<topic>  new copy of the export contract
```

Branch from `main`, rebase to stay current, merge via PR. One concern per branch, usually one page.

### 3.4 Commits

```
<type>(<scope>): <imperative summary>

<what changed, if the summary doesn't say it; why, only if not obvious>

Refs: #<issue>
```

Types: `feat` `fix` `refactor` `perf` `test` `docs` `chore` `ci`. Atomic, revertable commits.

### 3.5 Review

- Every change goes through a PR. `main` is protected.
- `gh` is used only to open issues and PRs, edit PR descriptions, and flip draft ⟷ ready. Merging,
  closing, commenting, triggering workflows and settings are done by hand in the GitHub UI.
- PR descriptions: intent and main changes; the accepted screenshots of affected pages (§3.6).

**Tier 1** (merge when CI is green): docs, tests, formatting, styling, single-file refactors under
~100 lines.

**Tier 2** (self-review, re-read the diff the next day, then merge): changes to `src/lib/data/`;
what a number means on screen (denominators, null handling, rounding, count labels, ranking
order); rendering of third-party text or URLs; workflows; `scripts/`; a new contract copy; a new
runtime dependency or third-party request. **AI-assisted changes are always Tier 2**, and the PR
says so.

Tier 2 checklist, in the PR's diff view:

- [ ] Tests written first and failed first
- [ ] `npm run verify` green
- [ ] No debug output, no commented-out code
- [ ] Every changed number states its denominator; `null` shown as unknown; shares of scanned
      domains say so
- [ ] Third-party text escaped, URLs through `safeUrl`, no new third-party request
- [ ] [REQUIREMENTS.md](REQUIREMENTS.md) still accurate
- [ ] Checked against a real release, screenshots accepted (§3.6)
- [ ] Version and [CHANGELOG.md](CHANGELOG.md) updated (§3.10)
- [ ] Agentic work: plan findings promoted, `.plan/` removed (§3.11)

### 3.6 Real-release check and screenshots before review

Applies to changes to a page, a shared component, `src/lib/` or styles.

1. Push the branch and open the PR as a draft.
2. With the data repo checked out next to this one:
   `npm run validate:export -- ../<data-repo>/<DATA_PATH>`,
   `DATA_DIR=../<data-repo>/<DATA_PATH> npm run test:e2e`, and look at every changed page in
   `DATA_DIR=... npm run preview` after `DATA_DIR=... npm run derive` (large tables, long names,
   nulls, phone width).
3. Screenshot every affected page, desktop and phone width, against the preview:
   `npx playwright screenshot --full-page <url> <file>.png` and again with `--device="Pixel 7"`.
   Show them to the maintainer in the chat and wait for acceptance. Change and repeat until
   accepted.
4. When clean and accepted: `gh pr ready`, and add the release's `generated_at`, what was checked
   and the accepted screenshots to the PR description (`gh pr edit --body`).

E2E assertions on example values fail against a real release; page errors, blank pages and broken
links must not.

### 3.7 GitHub issues

1. A defect or follow-up not yet on GitHub gets an issue before work starts.
2. An issue being worked on is moved to "In Progress".
3. The PR says `Closes #NN`.

Labels: `bug`, `refactoring`, `enhancement`, `documentation`; bugs also get a severity:
`severity: correctness bug` (🔴 wrong number or broken page), `severity: operational hazard or
significant gap` (🟠), `severity: quality/maintainability` (🟡), `severity: known/accepted` (🔵).
An issue stands alone: quote code inline, name paths and lines, state the fix.

### 3.8 Docs in the same iteration

Before opening the PR:

| Change                                           | Update                                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Page built, added, or its URL parameters changed | [CLAUDE.md](CLAUDE.md) page table, [REQUIREMENTS.md](REQUIREMENTS.md)                               |
| New module, script, component or test directory  | [CLAUDE.md](CLAUDE.md) File Reference                                                               |
| New or changed npm script, env var or config key | [README.md](README.md), [CLAUDE.md](CLAUDE.md) Development Commands                                 |
| Deploy, workflow, variable or secret changed     | [DEPLOYMENT.md](DEPLOYMENT.md)                                                                      |
| Test layers, fixtures or tooling changed         | [TESTING.md](TESTING.md)                                                                            |
| Behaviour or constraint established or changed   | [REQUIREMENTS.md](REQUIREMENTS.md)                                                                  |
| Defect found but not fixed, or follow-up work    | GitHub issue (§3.7)                                                                                 |
| Site change released                             | [CHANGELOG.md](CHANGELOG.md), version (§3.10)                                                       |
| New copy of the contract                         | [contract/README.md](contract/README.md) (format version), `SUPPORTED_FORMAT_VERSION` if it changed |

When code and docs disagree, fix both.

### 3.9 The contracts

1. Build only from `contract/export/` (EXPORT_FORMAT.md, schemas, example export) and
   `contract/registry/` (REGISTRY_FORMAT.md, schema, examples). **Never read
   DomainConnectScanner source code.** Missing information is a question for the maintainer or an
   issue on the Scanner.
2. **Never edit `contract/` by hand.** A new copy arrives verbatim in a `chore/contract-<topic>` PR
   ([contract/README.md](contract/README.md)) with `npm test` and `npm run test:e2e` green.
3. Additive contract changes need no code change; a test or page that breaks on one is a bug.
4. A `format_version` bump updates `SUPPORTED_FORMAT_VERSION` and every affected page in the same
   PR. Until merged, new releases fail validation and the site keeps the last good one.
5. Test fixtures come from the example export (`tests/fixtures.ts`), never hand-written.

### 3.10 Versions and releases

[SemVer](https://semver.org/). The version lives in `package.json` and is shown in the footer.

| Bump  | When                                                                    |
| ----- | ----------------------------------------------------------------------- |
| Major | A page or URL parameter removed or changed incompatibly                 |
| Minor | New page, feature or visible content                                    |
| Patch | Fixes, styling, dependency updates                                      |
| None  | Docs, tests, CI only: no version change, no CHANGELOG entry, no release |

- The PR that changes the site bumps the version (`npm version <level> --no-git-tag-version`) and
  adds its section to [CHANGELOG.md](CHANGELOG.md). Agents ask the maintainer when the level is not
  obvious.
- **Long tables.** A table that can grow long gets a filter and pages (F-2.10).
- Merging a new version to `main` tags `v<version>`, creates a prerelease and waits for manual
  approval; after deploy it becomes the latest release ([DEPLOYMENT.md](DEPLOYMENT.md)).
- Rollback: revert via PR with a patch bump, or mark the previous release as latest and run the
  deploy by hand.

### 3.11 Agentic workflows

Agents follow every rule above and keep a plan file per iteration.

1. Write `.plan/<branch-or-topic>.md` after investigating, before the first edit.
2. Commit and push it, first commit on the branch, and again on material changes.
3. Task list with state: `[ ]` pending, `[x]` done, `[~]` in progress (exactly one).
4. Record findings with evidence as they are established ("3,412 DNS providers, list renders in
   180 ms", not "seems fast").
5. Keep it updated during the iteration.
6. Record course corrections, including own errors.
7. Before merge, promote what is worth keeping, then `git rm -r .plan` in its own commit.

| Content                             | Promote to                         |
| ----------------------------------- | ---------------------------------- |
| Defect not fixed, follow-up work    | GitHub issue (§3.7)                |
| Behavioural decision or constraint  | [REQUIREMENTS.md](REQUIREMENTS.md) |
| Why the change looks like it does   | Commit message, PR description     |
| Something surprising about the data | Code comment where it surprises    |
| Question about the contract         | Scanner issue or the maintainer    |

On ambiguity: record it under "Open questions" and ask the maintainer.

Template:

```markdown
# <topic> — iteration plan

**Branch:** feat/<topic> **Started:** YYYY-MM-DD **Issue:** #NN
**Goal:** <one sentence: what "done" means>

## Tasks

- [x] Investigate how X works
- [~] Add failing test for Y
- [ ] Implement Y
- [ ] Real-release check, docs, version
- [ ] Promote findings, delete this file

## Findings

- <fact> — <evidence: file:line, command output, measurement>

## Decisions

- <choice>

## Corrections

- <what was wrong, what changed>

## Open questions

- <needs a human answer>
```

CI job `no-plan-files` fails a PR that still tracks `.plan/` files; it skips draft PRs.

---

## 4. Data

- Releases never enter this repo; the data repo holds them. Here only the contract's example
  export exists.
- A number on a card is a public statement about a named company's product. When unsure, show
  less, label precisely, and footnote the caveat (EXPORT_FORMAT.md "Caveats").
- Check pages against a real release (§3.6).

---

## 5. Tooling

### 5.1 CI

Every PR and push to `main`: lint, format, types, Vitest, example-export validation, version
check, build, Playwright (desktop + mobile), `.plan/` gate. Draft PRs skip Playwright and the `.plan/`
gate; both run once the PR is ready for review. Never merge red.

### 5.2 Dependencies

- `dependencies`: only what ships to the browser (`chart.js`). Everything else is a
  `devDependency`. `package-lock.json` is committed; CI uses `npm ci`.
- No runtime requests to third-party hosts: libraries bundled, no CDN, fonts or embeds. Exception:
  the cookieless analytics endpoint (GoatCounter, F-2.22). Footer links are links, not loads.
- Updates: one PR, `npm run verify`.

---

## 6. Project conventions

- **Phone columns.** Every table chooses the columns it keeps at phone width
  ([REQUIREMENTS.md](REQUIREMENTS.md) F-2.9). Agents ask the maintainer when the choice is not
  obvious.
- **Presentation integrity first.** Every number states what it counts and of what (attributed
  domains of the _scanned_ domains, supporting providers of the _known_ ones). `null` is "not
  measured": `–`, a gap, sorted last, never 0. History and current state are labelled as such.
- **The contract is binding** (§3.9): manifest-first paths, tables by id, unknown keys ignored,
  notes verbatim, correct under every additive change.
- **Static and stateless.** No backend, no write path, no state between pages beyond the URL.
  Every view is a shareable link carrying only raw ids and filters.
- **Aligned with stats.domainconnect.org**: brand tokens, header, cards, tables and footer
  (`src/lib/styles.css`). Divergence is recorded in the PR.
