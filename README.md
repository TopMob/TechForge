# TechForge

## Stack

- Vite
- Vanilla JavaScript modules
- Firebase Web SDK
- Vercel

## Structure

- `src/main.js` - Vite entrypoint
- `src/lib/` - application modules
- `src/styles/` - styles
- `assets/` - static project assets used by the app

## Development

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from `.env.example` and fill Firebase values.

Example:

```bash
copy .env.example .env.local
```

3. Start the dev server:

```bash
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Vercel

Vercel should auto-detect the project as a Vite app.

- Build command: `vite build`
- Output directory: `dist`

Add the `VITE_FIREBASE_*` variables in Vercel Project Settings for Preview and Production.

## Notes

- The project now uses the npm Firebase SDK instead of local files in `vendor/firebase`.
- Production assets are emitted by Vite into `dist`.
