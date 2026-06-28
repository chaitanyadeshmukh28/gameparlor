// Parlor portal — a tiny static server. No WebSockets, no rooms: the dashboard
// is a single-page React site that links out to each game's own service.
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
const dist = path.join(__dirname, '..', 'dist');

app.use(express.static(dist));
app.get('/healthz', (_req, res) => res.send('ok'));

// SPA fallback — every route returns the portal.
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(PORT, () => console.log(`Parlor portal running on :${PORT}`));
