/**
 * MASNA3 — Car Company Tycoon
 * Static hosting + cloud saves + global leaderboard (company value).
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SAVES_FILE = path.join(__dirname, 'saves.json');

let saves = {};
try { if (fs.existsSync(SAVES_FILE)) saves = JSON.parse(fs.readFileSync(SAVES_FILE, 'utf8')); } catch (e) { saves = {}; }
let persistTimer = null;
function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => fs.writeFile(SAVES_FILE, JSON.stringify(saves), () => {}), 500);
}

app.use(express.json({ limit: '3mb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime(), saves: Object.keys(saves).length }));

app.post('/api/save', (req, res) => {
    const { playerId, game, meta } = req.body || {};
    if (!playerId || typeof playerId !== 'string' || playerId.length > 64 || !game) return res.status(400).json({ ok: false, error: 'bad request' });
    saves[playerId] = { game, meta: meta || {}, savedAt: Date.now() };
    persist();
    res.json({ ok: true, savedAt: saves[playerId].savedAt });
});

app.get('/api/load/:playerId', (req, res) => {
    const s = saves[req.params.playerId];
    if (!s) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, game: s.game, meta: s.meta, savedAt: s.savedAt });
});

app.get('/api/leaderboard', (_req, res) => {
    const rows = Object.entries(saves)
        .map(([id, s]) => ({ id: id.slice(-4), company: (s.meta && s.meta.company) || '???', value: +(s.meta && s.meta.value) || 0, year: (s.meta && s.meta.year) || 0, sold: (s.meta && s.meta.sold) || 0, finished: !!(s.meta && s.meta.finished) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 25);
    res.json({ ok: true, rows });
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`MASNA3 running on http://0.0.0.0:${PORT}`));
