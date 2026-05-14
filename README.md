# Paper Trade Dashboard

Static HTML mirror of the paper-trade dashboard for the sportsbook strategy tracking project.

This repo holds only the rendered output. The dashboard generator and source data live in a separate private workspace. Each day the generator pushes a fresh `index.html` here and GitHub Pages publishes it at the URL below.

## Live URL

https://xando-calrizzian.github.io/sportsbook-dashboard/

## PWA

The page is installable as a Progressive Web App. On iPhone Safari, tap Share, then Add to Home Screen. The icon lands on the home screen and opens fullscreen. The service worker caches the last-pushed dashboard so it still renders offline.

## Layout

- `index.html` overwritten on every push by the upstream generator.
- `manifest.json` declares the app shell to the browser.
- `sw.js` service worker. Cache version string is bumped on every push to invalidate stale caches.
- `icon-192.png`, `icon-512.png` app icons.

## Privacy

No real money figures, ledger rows, or capper handles are committed here. All figures are paper money where 1 unit equals 1 dollar.
