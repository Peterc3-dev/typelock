# TypeLock

A browser-based "kinesthetic memory encoder": paste a block of text, type it back sentence by sentence, and the app uses your typing speed and accuracy to surface the parts you struggled with so you can drill them again.

## What it does

- Paste any source text on the input screen. It is split into chunks on sentence boundaries (`.`, `?`, `!`).
- Type each chunk character by character. The current character is highlighted; mistakes are marked in red. Each chunk auto-advances once you reach its length.
- Live WPM is shown while typing; per-chunk WPM, error count, and accuracy are recorded.
- On completion, a results screen shows overall WPM and accuracy, plus a list of "weak spots" — chunks where accuracy fell below 90% or WPM dropped below 80% of your average.
- If weak spots exist, the app automatically runs a review pass over just those chunks. You can also re-run weak spots manually or start over with new text.
- Optional synthesized typing sounds (key/error/advance) generated on the fly with the Web Audio API — no audio files, toggleable on the input screen.

There is no backend, no accounts, and no persistence. Everything runs in the browser and state resets on reload.

## Status

Working single-page app. It is a small personal/portfolio project — the entire app logic lives in one component file (`src/App.jsx`). No tests. Styling uses Tailwind with a phosphor-green terminal theme.

## Tech

- React 19 + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Web Audio API for procedurally generated typing sounds

## Run locally

```bash
npm install
npm run dev      # start the Vite dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run lint     # run ESLint
```

Then open the local URL Vite prints (default http://localhost:5173).

## Limitations / notes

- Sentence chunking is a simple regex split, so abbreviations or unusual punctuation can produce odd chunk boundaries.
- WPM is computed from character count (chars / 5) and elapsed time per chunk; it is a rough estimate, not a calibrated typing-test metric.
- No data is saved between sessions.

## License

MIT — see [LICENSE](LICENSE).
