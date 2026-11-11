# LOOMIS

**Every portrait begins with structure.**

LOOMIS is a digital portrait construction assistant that converts photographic references into measured Loomis-style drawing guides. It runs entirely in the browser — portraits stay on your device.

## Features

- Interactive 3D wireframe head on the landing page
- Portrait upload with physical canvas configuration (cm / in / mm)
- Restrictive-axis image fitting (never distorts)
- MediaPipe Face Landmarker detection (local)
- Orientation-aware Loomis construction guides
- Draggable landmarks with live geometry + measurement updates
- Undo / redo, layer toggles, before/after compare
- High-resolution PNG and print-ready PDF export
- IndexedDB project persistence

## Stack

React · TypeScript · Vite · Tailwind CSS · Three.js / R3F · MediaPipe · Zustand · jsPDF · idb

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Test

```bash
npm test
```

## Build

```bash
npm run build
npm run preview
```

Deployable on Vercel (`vercel.json` included for SPA routing).

## Privacy

Face detection, construction, and export run locally. Saved projects are stored in IndexedDB on your device. No account or backend is required.
