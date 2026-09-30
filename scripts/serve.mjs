// Petit serveur statique : sert le dépôt pour l'aperçu et pour le rendu.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4'
};

export function servir(port = 0) {
  const serveur = http.createServer((req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fichier = path.join(RACINE, path.normalize(chemin).replace(/^([/\\])+/, ''));
    if (chemin.endsWith('/')) fichier = path.join(fichier, 'index.html');
    if (!fichier.startsWith(RACINE)) { res.writeHead(403).end(); return; }
    fs.stat(fichier, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404).end('404'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream' });
      fs.createReadStream(fichier).pipe(res);
    });
  });
  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => ok({
    url: `http://127.0.0.1:${serveur.address().port}`,
    fermer: () => new Promise((f) => serveur.close(f))
  })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const { url } = await servir(port);
  console.log(`Aperçu : ${url}/pignon/  (espace = pause, flèches = image par image, ?t=7.5 pour figer)`);
}
