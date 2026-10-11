# Deployment

GitHub Pages, built from a tagged site release, the current export release from the data repo and
the DNS provider registry.

---

## 1. Operating model

```
Scanner                         data repo (DATA_REPO)                     this repo
───────                         ─────────────────────                     ─────────
publish step ─────────push──▶   statsdata/providers/ (one release)
                                notify-site.yml (on push)
                                  ──workflow_dispatch (SITE_DEPLOY_TOKEN)──▶ deploy.yml
                                                                          ├ pick site version (tag)
                                                                          ├ checkout tag + data repo
                                                                          │   + registry repo
                                                                          ├ npm test, npm run build
                                                                          ├ validate release vs contract/export/
                                                                          ├ bundle into dist/data/
                                                                          ├ derive into dist/data/derived/
                                                                          ├ validate registry vs contract/registry/
                                                                          ├ bundle into dist/registry/
                                                                          └ publish dist/ to Pages
```

- Site, data and registry are published together as one Pages artifact.
- Only tagged site versions are published. The deployed version is the **latest GitHub Release**.
- A release that fails validation is not published; Pages keeps the last good deploy.
- Only files reachable from the release's manifest are published (`scripts/bundle-data.ts`).
- Derived data (`data/derived/`: `leaderboards.json`, `ecosystem.json`;
  `scripts/derive-data.ts`) is computed from the bundled release on every deploy.
- Only valid registry entries and their logos are published, at `registry/<a>/<b>/<encoded file
name>`, with `registry/registry.json` `{repository, commit}` (`scripts/bundle-registry.ts`). An
  invalid registry is not published.
- No secrets, no backend.

`.github/workflows/deploy.yml`:

| Trigger                                      | Site version       | Flow                                                                                  |
| -------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| `push` to `main`, new `package.json` version | `v<version>` (new) | tag + prerelease → approval in environment `release` → deploy → release marked latest |
| `push` to `main`, version already tagged     | —                  | nothing deployed                                                                      |
| `schedule` daily 07:30 UTC                   | latest release     | deploy (covers a lost dispatch)                                                       |
| `workflow_dispatch`                          | latest release     | deploy (the data repo's `notify-site` after each data push, or by hand)               |

Release notes are the version's [CHANGELOG.md](CHANGELOG.md) section. A rejected or failed approval
leaves the prerelease unpublished; data deploys keep using the previous latest release. Deploys run
one at a time (`concurrency: pages`).

---

## 2. One-time setup

### 2.1 This repo (pawel-kow/DomainConnectSupportStats)

1. **Settings → Pages → Source: GitHub Actions.**
2. **Settings → Environments → New environment `release`** → Required reviewers: the maintainer.
3. **Settings → Secrets and variables → Actions → Variables:**

   | Variable        | Required | Default | Meaning                                                                    |
   | --------------- | -------- | ------- | -------------------------------------------------------------------------- |
   | `DATA_REPO`     | yes      | —       | `owner/name` of the data repo                                              |
   | `DATA_REF`      | no       | `main`  | Branch or tag of the data repo                                             |
   | `DATA_PATH`     | no       | `.`     | Directory in the data repo holding `manifest.json` (`statsdata/providers`) |
   | `REGISTRY_REPO` | yes      | —       | `owner/name` of the DNS provider registry (public)                         |
   | `REGISTRY_REF`  | no       | `main`  | Branch or tag of the registry                                              |

4. **Secret `DATA_REPO_TOKEN`**, only for a private data repo: fine-grained token, _Contents:
   read_ on the data repo.
5. **Branch protection on `main`:** PRs required; required checks `test` and `no-plan-files`.
6. URL: `https://pawel-kow.github.io/DomainConnectSupportStats/`. A custom domain is set under
   Settings → Pages and DNS; the relative base needs no rebuild.

### 2.2 The data repo

Created by the maintainer, any name (`DATA_REPO`), public. One directory per dataset under
`statsdata/`; the site reads the Scanner export from `DATA_PATH=statsdata/providers`:

```
<data repo>/
  README.md                     never published
  .github/workflows/notify-site.yml
  statsdata/providers/
    manifest.json
    overview.json
    dns-providers.json
    dns-providers/{id}.json
    stacks.json, stacks/…
    service-providers.json, service-providers/…
    templates.json, templates/…/…
```

`statsdata/providers/` holds the contents of the Scanner's `OUT_DIR/current/` (one release,
symlink resolved), replaced in full on every push. No Pages.

`notify-site.yml` runs on every push to `main` that touches `statsdata/**` and dispatches this
repo's `deploy.yml` (`workflow_dispatch`, `ref: main`), which deploys the latest site release with
the current data. It has no permissions of its own and reads no event data.

- **Secret `SITE_DEPLOY_TOKEN`** in the data repo: fine-grained token, resource owner the owner
  of this repo, only this repo, _Actions: read and write_, with an expiry. It can trigger, rerun
  and cancel workflows here; it cannot change code, tags or releases.
- **Ruleset on `main`:** blocks force pushes and deletion; no PR required (the publish step pushes
  directly).

### 2.3 The registry repo

Public; one file per DNS provider stack, `providers/<a>/<b>/<providerId>.json`, valid against
`contract/registry/schema/provider.schema.json`, logos next to the entries (layout and folder rule:
`contract/registry/REGISTRY_FORMAT.md`, `src/lib/registry/path.ts`). Deploy checks it out into
`registry/`, the path of the dev registry submodule. A registry change is published by the next
deploy (daily, or Deploy by hand).

### 2.4 The Scanner side (publish step)

The Scanner's publish step pushes each export release to `statsdata/providers/` of the data repo
(no commit when `generated_at` is already published). Setup: the Scanner's documentation.

- It needs a fine-grained token on the data repo only: _Contents: read and write_, no _Workflows_
  permission, with an expiry. Without _Workflows_ it cannot change `notify-site.yml` or read
  `SITE_DEPLOY_TOKEN`.
- It needs no credential for this repo; the deploy trigger is `SITE_DEPLOY_TOKEN` in the data repo
  (§2.2).

A lost dispatch is picked up by the daily deploy.

---

## 3. Runtime configuration

Pages read the release from `./data/`. A different data host, without rebuilding, in `config.js`:

```js
window.DC_STATS_CONFIG = { dataBaseUrl: 'https://data.example.org/current/' };
```

Build time: `VITE_DATA_BASE_URL=… npm run build`. Precedence: runtime → build time → `./data/`. The
registry likewise: `registryBaseUrl`, `VITE_REGISTRY_BASE_URL`, `./registry/`. A cross-origin host
must send CORS headers.

The day scanning began, before which "first seen" and "supported since" dates show the badge
"First scan": `scannerStartDate: '2026-09-22'` (`YYYY-MM-DD`, UTC). The shipped `public/config.js`
sets it; unset or invalid, no date is marked.

Shared links (share menu) and the link-preview image are built on the URL the browser shows. A
different site URL, e.g. the public site while testing on localhost (share targets reject localhost
links): `shareBaseUrl: 'https://stats.example.org/'`, build time `VITE_SHARE_BASE_URL`. The page
name, its query and the panel anchor are kept. Unset or not an absolute http(s) URL: the browser's
URL.

---

## 4. Operations

### 4.1 Checking a deploy

The run summary lists the site version, site commit, data repo commit, registry commit, the
release's `generated_at` and the trigger. The page header shows `generated_at`; the footer shows the
site version and the registry commit.

### 4.2 Releasing a site version

Merge a PR with a new version (DEVELOPING.md §3.10), then approve the `release` deployment in the
Deploy run (Actions → Deploy → Review deployments).

### 4.3 When a deploy fails

| Failure                                          | Meaning                                                             | Action                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Require the data repo variable`                 | `DATA_REPO` unset                                                   | Set it (§2.1)                                                                                           |
| `Require the registry repo variable`             | `REGISTRY_REPO` unset                                               | Set it (§2.1)                                                                                           |
| `No site release yet`                            | Data deploy before the first approved site release                  | Release a site version (§4.2)                                                                           |
| `Release notes`                                  | No CHANGELOG section for the version                                | Add it via PR with a patch bump                                                                         |
| Data repo checkout                               | Wrong `DATA_REPO`/`DATA_REF`, or private without `DATA_REPO_TOKEN`  | Fix variable/secret                                                                                     |
| `notify-site` fails in the data repo's Actions   | `SITE_DEPLOY_TOKEN` unset, expired or revoked                       | Renew the secret (§2.2); the daily deploy covers meanwhile                                              |
| `npm test`                                       | The tagged version is broken                                        | Fix via PR with a patch bump                                                                            |
| `Validate and bundle the release`, schema errors | Format changed beyond the vendored contract, or a corrupt release   | Compare with `contract/export/`: new contract copy (contract/README.md), or re-publish from the Scanner |
| … `missing` / `generated_at` errors              | Partial or mixed release pushed                                     | Re-run the Scanner's publish step                                                                       |
| `Validate and bundle the registry`               | An entry fails the schema, sits at the wrong path or lacks its logo | Fix the entry in the registry repo, then run Deploy by hand                                             |

The site keeps serving the last good deploy.

### 4.4 Rollback

- **Site:** revert via PR with a patch bump; or mark the previous release as latest
  (`gh release edit v<previous> --latest`) and run Deploy by hand.
- **Registry:** `git revert` the commit in the registry repo, or set `REGISTRY_REF` to a good tag,
  then run Deploy by hand.
- **Data:** `git revert` the release commit in the data repo (or push an older release), then run
  Deploy by hand.

### 4.5 Data repo growth

Each release replaces several thousand small JSON files; history grows with each one. History can
be dropped (lift the ruleset's force-push block, force-push a single-commit branch) after
agreement with the maintainer; deploys use only the tip.
