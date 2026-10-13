# goatcounter-proxy — iteration plan

**Branch:** fix/goatcounter-proxy **Started:** 2026-10-13 **Issue:** #73
**Goal:** page views go to the operator's nginx proxy `https://dcssp.dc.paulonet.eu/c`.

## Tasks

- [x] Proxy reachable: `/c` answered by GoatCounter through nginx
- [~] Endpoint in `public/config.js`, e2e, DEPLOYMENT.md, privacy page, version 0.21.2
- [ ] Privacy page screenshots accepted; Brave test with the maintainer
- [ ] `git rm -r .plan` in its own commit

## Findings

- Brave blocked `dcss.dc.paulonet.eu`: CNAME to `domain-connect.goatcounter.com` (CNAME
  uncloaking). `dcssp.dc.paulonet.eu`: A 116.203.183.30, AAAA 2a01:4f8:c0c:6050::, no CNAME.
- `curl 'https://dcssp.dc.paulonet.eu/c?p=%2Fprobe&b=1'`: 400 `x-goatcounter: wrong value: b=1`
  from GoatCounter via nginx; `/`, `/count`: 404; PUT `/c`: 403.
- GoatCounter (zhttp `RealIP`) takes the client from `X-Real-Ip`, then `X-Forwarded-For`.

## Decisions

- nginx proxy on the operator's server, path `/c`, no access log.

## Corrections

## Open questions
