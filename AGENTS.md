# Hackathon 15

## Architecture

This repository hosts three independent static entry points under one GitLab Pages project prefix:

- `/`: original React + TypeScript + Vite itinerary app in `src/`.
- `/presentation/`: manually advanced presentation chat in `src/presentation/`.
- `/walk/`: RealTrip scenes in `realtrip/`, using SuperSplat Viewer and PlayCanvas.

`realtrip/models/` contains canonical model files. Preparation scripts verify SHA-256 and assemble ignored model copies under `realtrip/public/`. The build copies these assets and bundles the viewers into `dist/walk/`. Presentation sources are bundled separately into `dist/presentation/`.

## Commands

Use `npx --yes pnpm@10.11.0 install --frozen-lockfile` for reproducible dependencies. `npm run build` builds all three entry points. Run `npm run test:walk` and `npm run test:migration` after relevant changes. `npm run preview` serves the complete output; `npm run dev` only serves the itinerary app.

## Deployment

The main-branch Pages pipeline publishes the checked-in `dist/` without a frontend rebuild. Include fresh artifacts when shipping source changes. Keep local resources relative so the site works under `/haojiaxu/hackathon-15/`. The presentation QR has an absolute Pages URL in `src/presentation/config.js` and must be regenerated when its destination changes. Preserve original itinerary variants and existing scene aliases.
