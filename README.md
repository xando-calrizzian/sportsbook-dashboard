# Paper Trade Dashboard Placeholder

Static no-data placeholder for the sportsbook paper-trade dashboard.

The real dashboard has moved behind the private Cloudflare Worker in the sportsbook workspace. This public repo intentionally does not contain embedded ledger data, strategy rows, capper details, or real-money records.

## Live URL

https://xando-calrizzian.github.io/sportsbook-dashboard/

## PWA

The public service worker is a kill-switch surface. Its job is to clear stale public dashboard caches from previously installed clients.

## Layout

- `index.html` overwritten on every push by the upstream generator with a private-dashboard placeholder.
- `manifest.json` declares the app shell to the browser.
- `sw.js` kill-switch service worker. Cache version string is bumped on every push to invalidate stale caches.
- `icon-192.png`, `icon-512.png` app icons.

## Privacy

No paper ledger data, strategy rows, capper handles, slip paths, or real-money rows are committed here.
