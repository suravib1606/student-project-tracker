# Student Project Tracker - Setup smoke test

Workshop learning checkpoint. Local demo; no login or multi-user isolation.

## Run
Use Node.js 22.23.3 (tested baseline) and a PowerShell terminal in this folder.

```powershell
npm.cmd install
npm.cmd start
```

Open http://localhost:3000. Keep the server terminal running. Stop with Ctrl+C.
The pinned versions and lockfile are supplied in the released kit. After the first install, use `npm.cmd ci` when restoring dependencies.

## Files
`public/index.html`: structure; `public/style.css`: presentation; `public/script.js`: browser behaviour.
`server.js`: local startup. When present, `app.js`: HTTP API; `database.js`: persistence.

## Evidence
Explain the current storage location and what survives browser refresh and server restart.
For the final checkpoint, run `npm.cmd test` to verify CRUD, validation and persistence.
Local browser data is not automatically migrated to SQLite. Recreate test records after switching.

## GitHub
Commit source code and package-lock.json. Exclude node_modules, data and credentials.
Describe your own project and add evidence of testing to this README before the final push.
