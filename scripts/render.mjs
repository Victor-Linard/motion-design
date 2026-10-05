// Rendu image par image d'une composition (<nom>/index.html) en MP4 H.264 1080 x 1920.
// Chaque image est positionnée par window.__seek(t) puis capturée : le rendu ne dépend pas
// de la vitesse de la machine. Plusieurs onglets capturent en parallèle, ffmpeg reçoit les
// images dans l'ordre.
//
//   node scripts/render.mjs pignon                     -> renders/pignon-15s-9x16.mp4
//   node scripts/render.mjs pignon --fps 60 --crf 14
//   node scripts/render.mjs pignon --stills 1.2,4.5    -> renders/stills/*.png + planche contact
//   node scripts/render.mjs pignon-chiffre --param ep=2 -> renders/pignon-chiffre-ep2-…s-9x16.mp4 (?ep=2)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { servir, RACINE } from './serve.mjs';

const require = createRequire(import.meta.url);

function lireArgs(argv) {
  const args = { composition: 'pignon', fps: 30, crf: 16, onglets: Math.max(1, Math.min(4, os.cpus().length)), sortie: null, stills: null, params: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fps') args.fps = Number(argv[++i]);
    else if (a === '--crf') args.crf = Number(argv[++i]);
    else if (a === '--onglets') args.onglets = Number(argv[++i]);
    else if (a === '--out') args.sortie = path.resolve(argv[++i]);
    else if (a === '--stills') args.stills = argv[++i].split(',').map(Number);
    else if (a === '--param') args.params.push(argv[++i].split('='));
    else if (!a.startsWith('--')) args.composition = a;
  }
  // Nom des fichiers produits : la composition, suivie des paramètres (ep=2 -> -ep2).
  args.nom = args.composition + args.params.map(([k, v]) => `-${k}${v}`).join('');
  return args;
}

function cheminFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return require('@ffmpeg-installer/ffmpeg').path; } catch { return 'ffmpeg'; }
}

function lancerFfmpeg(argsFfmpeg) {
  const ff = spawn(cheminFfmpeg(), ['-y', '-hide_banner', '-loglevel', 'error', ...argsFfmpeg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const fin = new Promise((ok, ko) => ff.on('close', (code) => (code === 0 ? ok() : ko(new Error('ffmpeg a échoué (code ' + code + ')')))));
  return { ff, fin };
}

async function ouvrirPage(navigateur, url) {
  const page = await navigateur.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('requestfailed', (r) => erreurs.push('requête échouée : ' + r.url()));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => window.__pret);
  if (erreurs.length) throw new Error('Erreurs dans la page :\n' + erreurs.join('\n'));
  return page;
}

async function capturer(page, t) {
  await page.evaluate((t) => window.__seek(t), t);
  return page.screenshot({ type: 'png' });
}

async function rendreStills(navigateur, url, args) {
  const dossier = path.join(RACINE, 'renders', 'stills');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'stills-'));
  fs.mkdirSync(dossier, { recursive: true });
  const page = await ouvrirPage(navigateur, url);
  const temps = [...args.stills].sort((a, b) => a - b);
  for (let i = 0; i < temps.length; i++) {
    const buf = await capturer(page, temps[i]);
    fs.writeFileSync(path.join(dossier, `${args.nom}-${temps[i].toFixed(2)}s.png`), buf);
    fs.writeFileSync(path.join(temp, String(i).padStart(3, '0') + '.png'), buf);
  }
  const colonnes = Math.min(7, temps.length), lignes = Math.ceil(temps.length / colonnes);
  const planche = path.join(dossier, `${args.nom}-planche.png`);
  const { fin } = lancerFfmpeg(['-framerate', '1', '-i', path.join(temp, '%03d.png'),
    '-vf', `scale=324:-1,tile=${colonnes}x${lignes}:padding=12:margin=12:color=0x171310`, '-frames:v', '1', planche]);
  await fin;
  fs.rmSync(temp, { recursive: true, force: true });
  console.log(`${temps.length} images -> ${path.relative(RACINE, dossier)}/ (planche : ${path.relative(RACINE, planche)})`);
}

async function rendreVideo(navigateur, url, args) {
  const pages = await Promise.all(Array.from({ length: args.onglets }, () => ouvrirPage(navigateur, url)));
  const duree = await pages[0].evaluate(() => window.__duree);
  const total = Math.round(duree * args.fps);
  const sortie = args.sortie || path.join(RACINE, 'renders', `${args.nom}-${duree}s-9x16.mp4`);
  fs.mkdirSync(path.dirname(sortie), { recursive: true });

  const { ff, fin } = lancerFfmpeg([
    '-f', 'image2pipe', '-framerate', String(args.fps), '-c:v', 'png', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf), '-profile:v', 'high',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(args.fps), '-movflags', '+faststart', sortie
  ]);

  const tampons = new Map();
  const enAttenteDePlace = [];
  let prochain = 0, reveil = null, faites = 0;
  const debut = Date.now();

  const ecrivain = (async () => {
    while (prochain < total) {
      if (!tampons.has(prochain)) { await new Promise((ok) => { reveil = ok; }); continue; }
      const buf = tampons.get(prochain);
      tampons.delete(prochain);
      prochain++;
      enAttenteDePlace.splice(0).forEach((ok) => ok());
      if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    }
    ff.stdin.end();
  })();

  async function onglet(page, k) {
    for (let i = k; i < total; i += args.onglets) {
      while (i - prochain > 32) await new Promise((ok) => enAttenteDePlace.push(ok));
      tampons.set(i, await capturer(page, i / args.fps));
      if (reveil) { const r = reveil; reveil = null; r(); }
      faites++;
      if (faites % 30 === 0 || faites === total) {
        const s = (Date.now() - debut) / 1000;
        process.stdout.write(`\r${faites}/${total} images · ${(faites / s).toFixed(1)} img/s   `);
      }
    }
  }
  await Promise.all(pages.map((p, k) => onglet(p, k)));
  await ecrivain;
  await fin;
  process.stdout.write('\n');
  const taille = fs.statSync(sortie).size / 1e6;
  console.log(`${path.relative(RACINE, sortie)} · ${total} images à ${args.fps} i/s · ${taille.toFixed(1)} Mo · ${((Date.now() - debut) / 1000).toFixed(0)} s`);
}

const args = lireArgs(process.argv.slice(2));
if (!fs.existsSync(path.join(RACINE, args.composition, 'index.html'))) {
  console.error(`Composition introuvable : ${args.composition}/index.html`);
  process.exit(1);
}
const serveur = await servir();
const navigateur = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] });
try {
  const url = `${serveur.url}/${args.composition}/index.html?render` + args.params.map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('');
  if (args.stills) await rendreStills(navigateur, url, args);
  else await rendreVideo(navigateur, url, args);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
