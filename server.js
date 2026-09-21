/**
 * server.js - Zero-Dependency Production & Development HTTP Server
 * NEON CLASH: OVERDRIVE
 *
 * Runs seamlessly on Render (as a Web Service listening on process.env.PORT)
 * or locally on any platform via: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = '0.0.0.0';
const ROOT = path.resolve(__dirname);

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.txt': 'text/plain; charset=utf-8'
};

// In-memory signaling store for LAN / direct P2P fallback (matches serve.ps1)
const signalStore = new Map();

function sendJson(res, statusCode, data) {
    const payload = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(payload);
}

function handleSignalApi(req, res, parsedUrl) {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1e6) req.destroy();
        });
        req.on('end', () => {
            try {
                const msg = JSON.parse(body);
                const room = String(msg.room || '');
                const target = String(msg.to || '');
                if (!room || !target) {
                    return sendJson(res, 400, { error: 'Missing room or to parameter' });
                }
                if (!signalStore.has(room)) signalStore.set(room, new Map());
                const roomStore = signalStore.get(room);
                if (!roomStore.has(target)) roomStore.set(target, []);
                roomStore.get(target).push(msg);
                return sendJson(res, 200, { status: 'ok' });
            } catch (e) {
                return sendJson(res, 400, { error: 'Invalid JSON' });
            }
        });
        return;
    }

    if (req.method === 'GET') {
        const query = parsedUrl.query || {};
        const room = query.room;
        const target = query.for;
        let messages = [];
        if (room && target && signalStore.has(room)) {
            const roomStore = signalStore.get(room);
            if (roomStore.has(target)) {
                messages = roomStore.get(target);
                roomStore.delete(target);
            }
        }
        return sendJson(res, 200, messages);
    }

    sendJson(res, 405, { error: 'Method not allowed' });
}

const server = http.createServer((req, res) => {
    // Standard CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers': 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    let pathname = decodeURIComponent(parsedUrl.pathname || '/');

    // Signaling API endpoint
    if (pathname === '/api/signal') {
        handleSignalApi(req, res, parsedUrl);
        return;
    }

    // Health check endpoint for Render / cloud monitoring
    if (pathname === '/healthz' || pathname === '/api/health') {
        return sendJson(res, 200, { status: 'healthy', uptime: process.uptime() });
    }

    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    let filePath = path.join(ROOT, pathname);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // SPA fallback: serve index.html for extensionless or deep-linked routes
            if (!path.extname(pathname)) {
                const indexPath = path.join(ROOT, 'index.html');
                fs.readFile(indexPath, (idxErr, content) => {
                    if (idxErr) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 Not Found');
                        return;
                    }
                    res.writeHead(200, {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cache-Control': 'no-cache'
                    });
                    res.end(content);
                });
                return;
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Caching strategy
        let cacheControl = 'public, max-age=3600';
        if (pathname === '/service-worker.js' || pathname === '/manifest.webmanifest') {
            cacheControl = 'no-cache, no-store, must-revalidate';
        } else if (pathname.startsWith('/js/') || pathname.startsWith('/css/')) {
            cacheControl = 'public, max-age=604800';
        } else if (pathname.startsWith('/icons/')) {
            cacheControl = 'public, max-age=2592000';
        }

        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stats.size,
            'Cache-Control': cacheControl
        });

        const stream = fs.createReadStream(filePath);
        stream.on('error', () => {
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
            }
            res.end('Internal Server Error');
        });
        stream.pipe(res);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`==========================================================`);
    console.log(`  NEON CLASH: OVERDRIVE - Server running`);
    console.log(`  Local URL:  http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`==========================================================`);
});
