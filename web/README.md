# Cruce landing page

Static marketing page for Cruce: plain HTML, CSS and JavaScript with no build step and no dependencies.

## Run locally

```bash
python3 -m http.server 4430 --directory web
```

Then open http://localhost:4430.

## What is here

| Path | Contents |
|---|---|
| `index.html` | Page structure and copy (Spanish, "tú") |
| `styles.css` | Design tokens copied from `ios/Cruce/DesignSystem` (colors, radii, borders, solid shadows, Archivo) |
| `app.js` | Launch intro (port of `LaunchSplash.swift`), sounds, scroll reveals, the interactive cruce, the parche graph and the screen gallery |
| `assets/fonts/` | Archivo as WOFF2, converted from `ios/Cruce/Resources/Fonts` (OFL) |
| `assets/sounds/` | The app's six sounds as MP3, converted from `ios/Cruce/Resources/Sounds` |
| `assets/img/ill/` | The app's illustrations as WebP |
| `assets/img/screens/` | Real app screenshots (iPhone 17) as WebP |

## Rules kept from the app

- Sounds only play on the app's key moments: saving an expense, recording a payment, settling up, deleting, an error and closing a parche. Copy, navigation and hover stay silent. A toggle turns them off and the choice is remembered.
- With "Reduce motion" the intro, confetti, counters and parallax are skipped.
- Market statistics cite their source on the page. App numbers (595 database tests, 25 illustrations) come from the repository and should be updated if they change.
