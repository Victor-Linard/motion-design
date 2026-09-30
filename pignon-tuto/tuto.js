/*
 * Pignon — tuto « De la carte à la décision », 20 s, 1080 x 1920 (9:16).
 * Parcours réel de l'app : cliquer une adresse, la verrouiller (ce qui l'enregistre),
 * en parler à Insights IA (possible seulement une fois le point enregistré),
 * puis comparer et partager depuis Mes analyses.
 */
(function () {
  'use strict';

  var DUREE = 20;
  var L = 1080, H = 1920;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var STANDARD = O.STANDARD, RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-mots-flux]').forEach(function (el) { O.decouperMots(el, 'flux'); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });

  // ---------- Carte ----------
  var ville = PignonCity.build();
  var cible = null;
  (function () {
    var repere = [760, 1150], meilleur = Infinity;
    ville.lots.forEach(function (l) {
      if (!l.bld || l.area < 1800 || l.area > 5200) return;
      var d = Math.hypot(l.cx - repere[0], l.cy - repere[1]);
      if (d < meilleur) { meilleur = d; cible = l; }
    });
  })();
  var cam = { x: cible.cx, y: cible.cy, s: 1.7, ax: 540, ay: 1000 };
  var carte = { surbrillance: 0, flou: 0 };
  function versEcran(x, y) { return [cam.ax + (x - cam.x) * cam.s, cam.ay + (y - cam.y) * cam.s]; }

  var canvas = $('map'), ctx = canvas.getContext('2d');
  function dessinerCarte(t) {
    var s = cam.s, i;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, L, H);
    ctx.setTransform(s, 0, 0, s, cam.ax - cam.x * s, cam.ay - cam.y * s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fillStyle = '#e7e1d9';
    ctx.beginPath();
    for (i = 0; i < ville.cells.length; i++) ville.tracePoly(ctx, ville.cells[i]);
    ctx.fill();
    ctx.strokeStyle = '#fcfaf7';
    ville.widthBuckets.forEach(function (B) {
      ctx.lineWidth = B.w;
      ctx.beginPath();
      B.list.forEach(function (e) { ville.traceCor(ctx, e); });
      ctx.stroke();
    });
    ctx.save();
    ctx.translate(1.2 / s, 3.2 / s);
    ctx.fillStyle = 'rgba(23, 19, 16, 0.07)';
    ctx.beginPath();
    for (i = 0; i < ville.lots.length; i++) if (ville.lots[i].bld) ville.tracePoly(ctx, ville.lots[i].bld);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fefbf9';
    ctx.strokeStyle = 'rgba(69, 62, 58, 0.2)';
    ctx.lineWidth = 1.3 / s;
    ctx.beginPath();
    for (i = 0; i < ville.lots.length; i++) if (ville.lots[i].bld) ville.tracePoly(ctx, ville.lots[i].bld);
    ctx.fill();
    ctx.stroke();
    if (carte.surbrillance > 0) {
      ctx.globalAlpha = carte.surbrillance;
      ctx.fillStyle = '#fbe6de';
      ctx.strokeStyle = '#a55535';
      ctx.lineWidth = 4 / s;
      ctx.beginPath(); ville.tracePoly(ctx, cible.bld); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var idx = t / ville.trackDt, i0 = Math.floor(idx), fr = idx - i0;
    ctx.fillStyle = 'rgba(165, 85, 53, 0.55)';
    ctx.beginPath();
    for (var a = 0; a < ville.tracks.length; a++) {
      var tr = ville.tracks[a], n = tr.length / 2 - 1, j0 = Math.min(i0, n), j1 = Math.min(i0 + 1, n);
      ctx.rect(tr[j0 * 2] + (tr[j1 * 2] - tr[j0 * 2]) * fr - 2.2, tr[j0 * 2 + 1] + (tr[j1 * 2 + 1] - tr[j0 * 2 + 1]) * fr - 2.2, 4.4, 4.4);
    }
    ctx.fill();
  }

  var pin = $('pin');
  function maj(t) {
    dessinerCarte(t);
    var p = versEcran(cible.cx, cible.cy);
    pin.style.transform = 'translate(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px)';
    canvas.style.filter = carte.flou > 0.05 ? 'blur(' + carte.flou.toFixed(2) + 'px)' : 'none';
  }

  // ---------- États initiaux ----------
  var titres = [0, 1, 2, 3, 4].map(function (i) { return $('titre' + i); });
  var etapes = [1, 2, 3, 4].map(function (i) { return $('etape' + i); });
  var souris = $('souris'), clicEl = $('clic'), sourisSvg = souris.querySelector('svg');
  var pinPoint = $('pinPoint'), chat = $('chat'), attente = $('attente'), groupe = $('groupe1');
  gsap.set(titres, { autoAlpha: 0 });
  gsap.set(tous('.car'), { opacity: 0 });
  gsap.set(tous('.mot-in'), { yPercent: 118 });
  gsap.set(etapes, { scale: 0 });
  gsap.set($('railPlein'), { scaleX: 0 });
  gsap.set(souris, { x: 980, y: 1780, autoAlpha: 0 });
  gsap.set(clicEl, { scale: 0.4, opacity: 0 });
  gsap.set(pinPoint, { scale: 0 });
  gsap.set($('onde1'), { scale: 1, opacity: 0 });
  gsap.set([$('panneauPoint'), $('mesAnalyses'), $('carteComparer'), $('partage')], { autoAlpha: 0, y: 70 });
  gsap.set($('infoBulle'), { autoAlpha: 0, y: -14, scale: 0.96, transformOrigin: '80% 0%' });
  gsap.set($('toast'), { xPercent: -50, autoAlpha: 0, y: 30 });
  gsap.set($('anse'), { y: -4.5 });
  gsap.set(chat, { autoAlpha: 0, scale: 0.92, y: 14 });
  gsap.set(tous('.point-joint, .bulle-u', groupe), { autoAlpha: 0, scale: 0.9 });
  gsap.set(groupe.querySelector('.bulle-a'), { autoAlpha: 0, scale: 0.96 });
  gsap.set(tous('.flux', groupe), { opacity: 0 });
  gsap.set(attente, { autoAlpha: 0, scale: 0.6 });
  gsap.set($('lienCopie'), { autoAlpha: 0, scale: 0.7, transformOrigin: '0% 50%' });
  var OMBRE_OPTION = 'rgba(23, 19, 16, 0.12) 0px 2px 8px 0px', SANS_OMBRE = 'rgba(23, 19, 16, 0) 0px 2px 8px 0px';
  gsap.set($('optLecture'), { backgroundColor: '#fefbf9', color: '#171310', boxShadow: OMBRE_OPTION });
  gsap.set($('optModif'), { backgroundColor: 'rgba(254, 251, 249, 0)', color: '#605955', boxShadow: SANS_OMBRE });
  gsap.set($('logoPoint'), { scale: 0 });
  gsap.set($('logoTige'), { scaleY: 0 });
  gsap.set($('logoP'), { xPercent: 105 });
  gsap.set($('logoGnon'), { xPercent: -105 });
  gsap.set($('ctaBouton'), { xPercent: -50, autoAlpha: 0, scale: 0.85 });
  gsap.set($('ctaOnde'), { xPercent: -50, opacity: 0 });
  gsap.set([$('ctaSous'), $('ctaUrl')], { autoAlpha: 0, y: 22 });

  // Centres écran des éléments que le curseur vise (calculés après chargement des polices).
  var vise = {};

  // ---------- Timeline ----------
  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
  function entrerTitre(sec, t) {
    tl.set(sec, { autoAlpha: 1 }, t);
    tl.to(tous('.surtitre .car', sec), { opacity: 1, duration: 0.01, stagger: 0.022, ease: 'none' }, t);
    tl.to(tous('.gros-titre .mot-in', sec), { yPercent: 0, duration: 0.8, stagger: 0.06 }, t + 0.08);
  }
  function sortirTitre(sec, t) {
    tl.to(tous('.gros-titre .mot-in', sec), { yPercent: -118, duration: 0.32, stagger: 0.012, ease: SORTIE }, t);
    tl.to(sec.querySelector('.surtitre'), { opacity: 0, duration: 0.2, ease: 'none' }, t);
    tl.set(sec, { autoAlpha: 0 }, t + 0.45);
  }
  function allerVers(cle, t, duree) {
    tl.to(souris, { x: function () { return vise[cle].x; }, y: function () { return vise[cle].y; }, duration: duree || 0.5, ease: 'power2.inOut' }, t);
  }
  function cliquer(t) {
    tl.to(sourisSvg, { scale: 0.86, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.inOut', transformOrigin: '22% 11%' }, t);
    tl.fromTo(clicEl, { scale: 0.4, opacity: 0.9 }, { scale: 1.5, opacity: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, t + 0.05);
  }
  // Étape n : la précédente est validée, le rail avance, la pastille n devient active.
  function etape(n, t) {
    if (n > 1) {
      var prec = etapes[n - 2];
      tl.to(prec, { backgroundColor: '#00494a', borderColor: '#00494a', duration: 0.25, ease: 'none' }, t);
      tl.to(prec.querySelector('b'), { opacity: 0, duration: 0.15 }, t);
      tl.to(prec.querySelector('svg'), { opacity: 1, duration: 0.2 }, t + 0.1);
      tl.to($('railPlein'), { scaleX: Math.min(1, (n - 1) / 3), duration: 0.45, ease: 'power2.inOut' }, t);
    }
    if (n <= 4) {
      tl.to(etapes[n - 1], { borderColor: '#00494a', color: '#00494a', scale: 1.12, duration: 0.3, ease: RESSORT }, t + 0.2);
      if (n > 1) tl.to(etapes[n - 2], { scale: 1, duration: 0.25 }, t);
    }
  }

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);

  // 0 — Accroche
  entrerTitre(titres[0], 0);
  tl.to(etapes, { scale: 1, duration: 0.45, stagger: 0.08, ease: RESSORT }, 0.5);
  tl.to(cam, { s: 1.95, duration: 2.2, ease: 'sine.inOut' }, 0);
  tl.to(souris, { autoAlpha: 1, duration: 0.3, ease: 'none' }, 1.1);
  sortirTitre(titres[0], 1.95);

  // 1 — Cliquez sur une adresse
  etape(1, 2.0);
  tl.to(cam, { ax: 300, ay: 880, s: 2.25, duration: 0.8, ease: CAMERA }, 2.0);
  tl.to($('fonduHaut'), { height: 700, duration: 0.7, ease: CAMERA }, 2.0);
  entrerTitre(titres[1], 2.25);
  tl.to(souris, { x: 300, y: 880, duration: 0.75, ease: 'power2.inOut' }, 2.35);
  cliquer(3.12);
  tl.to(carte, { surbrillance: 1, duration: 0.3, ease: 'none' }, 3.18);
  tl.to(pinPoint, { scale: 1, duration: 0.55, ease: RESSORT }, 3.18);
  tl.fromTo($('onde1'), { scale: 1, opacity: 0.7 }, { scale: 3.2, opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 3.25);
  tl.to($('panneauPoint'), { autoAlpha: 1, y: 0, duration: 0.7 }, 3.4);
  sortirTitre(titres[1], 4.85);

  // 2 — Verrouillez : sans enregistrement, pas d'IA
  etape(2, 4.9);
  entrerTitre(titres[2], 5.1);
  allerVers('ia', 5.15, 0.55);
  tl.to($('infoBulle'), { autoAlpha: 1, y: 0, scale: 1, duration: 0.45 }, 5.75);
  allerVers('cadenas', 7.0, 0.4);
  tl.to($('infoBulle'), { autoAlpha: 0, y: -10, duration: 0.25, ease: SORTIE }, 7.15);
  cliquer(7.42);
  tl.to($('anse'), { y: 0, duration: 0.35, ease: RESSORT }, 7.46);
  tl.to($('btnCadenas'), { backgroundColor: '#00494a', borderColor: '#00494a', color: '#fefbf9', duration: 0.25, ease: 'none' }, 7.46);
  tl.to($('toast'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 7.6);
  tl.to($('btnIA'), { backgroundColor: '#d6eded', borderColor: '#88bdbc', color: '#00494a', duration: 0.3, ease: 'none' }, 7.85);
  tl.fromTo($('btnIA'), { scale: 1 }, { scale: 1.14, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, 7.9);
  sortirTitre(titres[2], 8.85);

  // 3 — Parlez-en à l'IA
  etape(3, 8.9);
  tl.to($('toast'), { autoAlpha: 0, y: 20, duration: 0.3, ease: SORTIE }, 8.9);
  entrerTitre(titres[3], 9.1);
  allerVers('ia', 9.0, 0.45);
  cliquer(9.5);
  tl.to(chat, { autoAlpha: 1, scale: 1, y: 0, duration: 0.5 }, 9.6);
  tl.to(groupe.querySelector('.point-joint'), { autoAlpha: 1, scale: 1, duration: 0.4 }, 9.8);
  tl.to(souris, { x: 960, y: 1500, duration: 0.6, ease: 'power2.inOut' }, 9.75);
  tl.to(groupe.querySelector('.bulle-u'), { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 10.0);
  tl.set(attente, { y: function () { return vise.attente; } }, 10.3);
  tl.to(attente, { autoAlpha: 1, scale: 1, duration: 0.3, ease: RESSORT }, 10.35);
  tl.fromTo(tous('i', attente), { y: 0 }, { y: -9, duration: 0.12, stagger: 0.05, yoyo: true, repeat: 1, ease: 'sine.inOut', immediateRender: false }, 10.38);
  tl.to(attente, { autoAlpha: 0, scale: 0.6, duration: 0.14, ease: SORTIE }, 10.64);
  tl.to(groupe.querySelector('.bulle-a'), { autoAlpha: 1, scale: 1, duration: 0.35 }, 10.66);
  tl.to(tous('.flux', groupe), { opacity: 1, duration: 0.1, stagger: 0.034, ease: 'none' }, 10.68);
  sortirTitre(titres[3], 12.75);

  // 4 — Comparez, puis partagez (Mes analyses)
  etape(4, 12.8);
  tl.to([$('panneauPoint'), chat], { autoAlpha: 0, y: 50, duration: 0.4, ease: SORTIE }, 12.8);
  tl.to(pinPoint, { scale: 0, duration: 0.3, ease: SORTIE }, 12.8);
  tl.to($('voile'), { opacity: 0.85, duration: 0.5, ease: 'power1.inOut' }, 12.8);
  tl.to(carte, { flou: 6, surbrillance: 0, duration: 0.5, ease: 'power1.inOut' }, 12.8);
  entrerTitre(titres[4], 13.0);
  tl.to($('mesAnalyses'), { autoAlpha: 1, y: 0, duration: 0.6 }, 13.0);
  allerVers('caseA', 13.15, 0.45);
  cliquer(13.62);
  tl.to($('caseA'), { backgroundColor: '#00494a', borderColor: '#00494a', duration: 0.15, ease: 'none' }, 13.66);
  tl.to($('caseA').querySelector('svg'), { opacity: 1, duration: 0.15 }, 13.66);
  allerVers('caseB', 13.78, 0.3);
  cliquer(14.1);
  tl.to($('caseB'), { backgroundColor: '#00494a', borderColor: '#00494a', duration: 0.15, ease: 'none' }, 14.14);
  tl.to($('caseB').querySelector('svg'), { opacity: 1, duration: 0.15 }, 14.14);
  allerVers('comparer', 14.25, 0.4);
  cliquer(14.68);
  tl.to($('mesAnalyses'), { autoAlpha: 0, y: -40, duration: 0.3, ease: SORTIE }, 14.78);
  tl.to($('carteComparer'), { autoAlpha: 1, y: 0, duration: 0.6 }, 14.85);
  allerVers('partager', 15.15, 0.45);
  cliquer(15.65);
  tl.to($('partage'), { autoAlpha: 1, y: 0, duration: 0.55 }, 15.75);
  allerVers('modif', 16.0, 0.4);
  cliquer(16.42);
  tl.to($('optLecture'), { backgroundColor: 'rgba(254, 251, 249, 0)', color: '#605955', boxShadow: SANS_OMBRE, duration: 0.2, ease: 'none' }, 16.47);
  tl.to($('optModif'), { backgroundColor: '#fefbf9', color: '#171310', boxShadow: OMBRE_OPTION, duration: 0.2, ease: 'none' }, 16.47);
  tl.to($('lienCopie'), { autoAlpha: 1, scale: 1, duration: 0.45, ease: RESSORT }, 16.6);

  // 5 — Appel à l'action : la dernière pastille validée devient le point du i
  sortirTitre(titres[4], 17.3);
  etape(5, 17.3);
  tl.to([$('carteComparer'), $('partage')], { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE, stagger: 0.05 }, 17.3);
  tl.to(souris, { autoAlpha: 0, duration: 0.25, ease: 'none' }, 17.3);
  tl.to($('logoPetit'), { opacity: 0, duration: 0.3, ease: 'none' }, 17.3);
  tl.to($('voile'), { opacity: 0.78, duration: 0.6, ease: 'power1.inOut' }, 17.35);
  tl.to(carte, { flou: 0, duration: 0.6, ease: 'power1.inOut' }, 17.35);
  tl.to($('fonduHaut'), { height: 0, duration: 0.6, ease: 'power1.inOut' }, 17.35);
  tl.to(cam, { s: 1.2, ax: 540, ay: 960, duration: 2.6, ease: 'sine.inOut' }, 17.4);
  tl.to([etapes[0], etapes[1], etapes[2], $('railPlein').parentNode], { opacity: 0, duration: 0.3, ease: 'none' }, 17.5);
  var e4 = etapes[3];
  tl.to(e4.querySelector('svg'), { opacity: 0, duration: 0.15 }, 17.6);
  tl.to(e4, { borderWidth: 0, boxShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.2 }, 17.6);
  tl.to(e4, { x: function () { return vise.volX; }, duration: 0.65, ease: 'power2.in' }, 17.65);
  tl.to(e4, { y: function () { return vise.volY; }, duration: 0.65, ease: 'power2.out' }, 17.65);
  tl.to(e4, { scale: 41.4 / 56, duration: 0.65, ease: CAMERA }, 17.65);
  tl.set(e4, { autoAlpha: 0 }, 18.3);
  tl.set($('logoPoint'), { scale: 1 }, 18.3);
  tl.to($('logoTige'), { scaleY: 1, duration: 0.5, ease: RESSORT }, 18.22);
  tl.to($('logoP'), { xPercent: 0, duration: 0.75 }, 18.32);
  tl.to($('logoGnon'), { xPercent: 0, duration: 0.75 }, 18.32);
  tl.to(tous('.cta-ligne .mot-in'), { yPercent: 0, duration: 0.8, stagger: 0.05 }, 18.5);
  tl.to($('ctaBouton'), { autoAlpha: 1, scale: 1, duration: 0.6, ease: RESSORT }, 18.85);
  tl.to([$('ctaSous'), $('ctaUrl')], { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 19.0);
  tl.fromTo($('ctaOnde'), { scale: 1, opacity: 0.75 }, { scale: 1.2, opacity: 0, duration: 0.55, ease: 'power2.out', immediateRender: false }, 19.35);
  tl.fromTo($('ctaFleche'), { x: 0 }, { x: 10, duration: 0.15, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, 19.35);
  tl.set({}, {}, DUREE);

  // ---------- Pilotage ----------
  function allerA(t) {
    t = borner(t, 0, DUREE);
    tl.seek(t, true);
    maj(t);
    return t;
  }
  function centre(el) {
    var p = O.positionDans(el, $('stage'));
    return { x: p.x + el.offsetWidth / 2, y: p.y + el.offsetHeight / 2 };
  }
  function preparer() {
    var b = $('ctaBouton'), onde = $('ctaOnde');
    onde.style.width = b.offsetWidth + 'px';
    onde.style.height = b.offsetHeight + 'px';
    vise.ia = centre($('btnIA'));
    vise.cadenas = centre($('btnCadenas'));
    vise.caseA = centre($('caseA'));
    vise.caseB = centre($('caseB'));
    vise.comparer = centre($('btnComparer'));
    vise.partager = centre($('btnPartager'));
    vise.modif = centre($('optModif'));
    vise.attente = groupe.querySelector('.bulle-u').offsetTop + groupe.querySelector('.bulle-u').offsetHeight + 52;
    var pt = centre($('logoPoint')), e = centre(e4);
    vise.volX = pt.x - e.x;
    vise.volY = pt.y - e.y;
  }
  O.piloter({ duree: DUREE, allerA: allerA, preparer: preparer });
})();
