// Runtime configuration, loaded before the page scripts. Leave dataBaseUrl and registryBaseUrl
// unset to read the release and the registry bundled next to the site (./data/, ./registry/).
// scannerStartDate ('YYYY-MM-DD', UTC): the day scanning began; "first seen" and "supported since"
// dates before it show "First scan". Unset: nothing is marked.
// shareBaseUrl: site URL that shared links are built on instead of the browser's (e.g. the public
// site while testing on localhost). Unset: the browser's URL.
// goatCounter: GoatCounter endpoint (https) that page views are counted at. Unset: nothing is counted.
// See DEPLOYMENT.md "Runtime configuration".
window.DC_STATS_CONFIG = window.DC_STATS_CONFIG || {};
window.DC_STATS_CONFIG.scannerStartDate = '2026-09-22';
window.DC_STATS_CONFIG.goatCounter = 'https://dcssp.dc.paulonet.eu/c';
