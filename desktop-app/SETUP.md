# How to assemble the Rotex WorkForce Desktop repo

The source files (src/, public/) are identical to `Rotex-WorkForce/jobwork-app/`.
The Electron-specific files (electron/, package.json, vite.config.ts, etc.) are in this directory.

## Steps for the assembling session:

1. Clone `Rotex-WorkForce` and checkout the `desktop-app` branch
2. Copy everything from `desktop-app/` EXCEPT `src/` and `public/` to the desktop repo root
3. Copy `jobwork-app/src/` to the desktop repo as `src/`
4. Copy `jobwork-app/public/` to the desktop repo as `public/`
5. Run `npm install` and `npm run build` to verify
6. Push to `Rotex-workforce-desktop` main branch

## File mapping:
```
Rotex-WorkForce/desktop-app/.gitignore         -> .gitignore
Rotex-WorkForce/desktop-app/.github/            -> .github/
Rotex-WorkForce/desktop-app/build/              -> build/
Rotex-WorkForce/desktop-app/electron/           -> electron/
Rotex-WorkForce/desktop-app/index.html          -> index.html
Rotex-WorkForce/desktop-app/package.json        -> package.json
Rotex-WorkForce/desktop-app/tsconfig.json       -> tsconfig.json
Rotex-WorkForce/desktop-app/tsconfig.app.json   -> tsconfig.app.json
Rotex-WorkForce/desktop-app/tsconfig.node.json  -> tsconfig.node.json
Rotex-WorkForce/desktop-app/vite.config.ts      -> vite.config.ts
Rotex-WorkForce/jobwork-app/src/                -> src/
Rotex-WorkForce/jobwork-app/public/             -> public/
```
