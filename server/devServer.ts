// This file is for LOCAL DEVELOPMENT ONLY.
// It is never imported by api/index.ts, so `vite` (a devDependency)
// never ends up in the bundled Vercel function.

import { createServer as createViteServer } from 'vite';
import app, { ensureFirestoreLoaded } from './app.ts';

const PORT = 3000;

async function startServer() {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
    },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Attendance Tracker] Server listening on http://localhost:${PORT}`
    );
  });
}

ensureFirestoreLoaded()
  .then(() => startServer())
  .catch((err) => {
    console.error('[Firestore] Failed to initialize:', err);
    process.exit(1);
  });
