/*
 * Pignon — « Insights IA », 15 s, 1080 x 1920 (9:16).
 * Trois usages de l'assistant, d'après des sessions réelles (sans adresse) :
 * expliquer les stats d'un lieu, arbitrer une comparaison, expliquer un outil.
 */
(function () {
  'use strict';

  var DUREE = 15;
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
  // Commerces trouvés par l'outil Concurrence : parcelles dans le rayon, tirage déterministe.
  var RAYON = 100;
  var concurrents = [];
  (function () {
    var rnd = PignonCity.mulberry32(0xB0DAC);
    var candidats = ville.lots.filter(function (l) {
      var d = Math.hypot(l.cx - cible.cx, l.cy - cible.cy);
      return l.bld && l !== cible && d > 28 && d < RAYON - 10;
    });
    for (var i = candidats.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = candidats[i]; candidats[i] = candidats[j]; candidats[j] = t; }
    candidats.forEach(function (c) {
      if (concurrents.length < 7 && concurrents.every(function (o) { return Math.hypot(o.x - c.cx, o.y - c.cy) > 34; })) concurrents.push({ x: c.cx, y: c.cy, p: 0 });
    });
  })();

  var cam = { x: cible.cx, y: cible.cy, s: 1.7, ax: 540, ay: 860 };
  var carte = { surbrillance: 0, cercle: 0, calques: 1, flou: 0 };
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

    // Rayon de recherche de l'outil Concurrence
    if (carte.cercle > 0 && carte.calques > 0) {
      ctx.globalAlpha = carte.calques;
      ctx.fillStyle = 'rgba(165, 85, 53, 0.08)';
      ctx.beginPath(); ctx.arc(cible.cx, cible.cy, RAYON * carte.cercle, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a55535';
      ctx.lineWidth = 3 / s;
      ctx.setLineDash([10 / s, 7 / s]);
      ctx.beginPath(); ctx.arc(cible.cx, cible.cy, RAYON, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * carte.cercle); ctx.stroke();
      ctx.setLineDash([]);
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

    if (carte.calques > 0) {
      ctx.globalAlpha = carte.calques;
      concurrents.forEach(function (co) {
        if (co.p <= 0.001) return;
        var r = 12 / s * co.p, bord = 5 / s * co.p;
        ctx.fillStyle = 'rgba(23, 19, 16, 0.18)';
        ctx.beginPath(); ctx.arc(co.x, co.y + 3 / s, r + bord, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fefbf9';
        ctx.beginPath(); ctx.arc(co.x, co.y, r + bord, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a55535';
        ctx.beginPath(); ctx.arc(co.x, co.y, r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  }

  var pin = $('pin');
  function maj(t) {
    dessinerCarte(t);
    var p = versEcran(cible.cx, cible.cy);
    pin.style.transform = 'translate(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px)';
    canvas.style.filter = carte.flou > 0.05 ? 'blur(' + carte.flou.toFixed(2) + 'px)' : 'none';
  }

  // ---------- États initiaux ----------
  var titres = [0, 1, 2, 3].map(function (i) { return $('titre' + i); });
  var groupes = [1, 2, 3].map(function (i) { return $('groupe' + i); });
  var pinPoint = $('pinPoint'), lanceur = $('lanceur'), chat = $('chat'), attente = $('attente');
  gsap.set(titres, { autoAlpha: 0 });
  gsap.set(tous('.car'), { opacity: 0 });
  gsap.set(tous('.mot-in'), { yPercent: 118 });
  gsap.set([$('panneauStats'), $('carteComparer')], { autoAlpha: 0, y: 70 });
  gsap.set($('barreOutils'), { autoAlpha: 0, y: -30 });
  gsap.set(pinPoint, { scale: 0 });
  gsap.set($('onde1'), { scale: 1, opacity: 0 });
  gsap.set(lanceur, { scale: 0 });
  gsap.set(chat, { autoAlpha: 0, scale: 0.92, y: 14 });
  gsap.set(groupes, { autoAlpha: 0 });
  gsap.set(tous('.bulle-u'), { autoAlpha: 0, scale: 0.85 });
  gsap.set(tous('.bulle-a'), { autoAlpha: 0, scale: 0.96 });
  gsap.set(tous('.bulle-a .flux'), { opacity: 0 });
  gsap.set(attente, { autoAlpha: 0, scale: 0.6 });
  gsap.set(tous('.ps-ligne, .ci-ligne'), { '--surligne': 0 });
  gsap.set($('logoPoint'), { scale: 0 });
  gsap.set($('logoTige'), { scaleY: 0 });
  gsap.set($('logoP'), { xPercent: 105 });
  gsap.set($('logoGnon'), { xPercent: -105 });
  gsap.set($('ctaBouton'), { xPercent: -50, autoAlpha: 0, scale: 0.85 });
  gsap.set($('ctaOnde'), { xPercent: -50, opacity: 0 });
  gsap.set([$('ctaSous'), $('ctaUrl')], { autoAlpha: 0, y: 22 });

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
  // Une question, l'attente, puis la réponse qui s'écrit mot à mot.
  var hauteurQuestion = [];
  function echange(k, t) {
    var g = groupes[k];
    tl.set(g, { autoAlpha: 1 }, t);
    tl.to(g.querySelector('.bulle-u'), { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, t);
    tl.set(attente, { y: function () { return hauteurQuestion[k]; } }, t + 0.3);
    tl.to(attente, { autoAlpha: 1, scale: 1, duration: 0.3, ease: RESSORT }, t + 0.32);
    tl.fromTo(tous('i', attente), { y: 0 }, { y: -9, duration: 0.12, stagger: 0.05, yoyo: true, repeat: 1, ease: 'sine.inOut', immediateRender: false }, t + 0.36);
    tl.to(attente, { autoAlpha: 0, scale: 0.6, duration: 0.14, ease: SORTIE }, t + 0.62);
    tl.to(g.querySelector('.bulle-a'), { autoAlpha: 1, scale: 1, duration: 0.35 }, t + 0.64);
    tl.to(tous('.flux', g), { opacity: 1, duration: 0.1, stagger: 0.034, ease: 'none' }, t + 0.66);
  }
  function surligner(el, t) {
    tl.to(el, { '--surligne': 1, duration: 0.35, ease: 'power1.out' }, t);
  }

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);

  // 0 — Accroche : le bouton de l'assistant s'ouvre en panneau
  entrerTitre(titres[0], 0);
  tl.to(cam, { s: 1.95, duration: 2.0, ease: 'sine.inOut' }, 0);
  tl.to(lanceur, { scale: 1, duration: 0.55, ease: RESSORT }, 0.45);
  tl.to(lanceur, { scale: 0.9, duration: 0.12, ease: 'power1.in', yoyo: true, repeat: 1 }, 1.15);
  tl.to(chat, { autoAlpha: 1, scale: 1, y: 0, duration: 0.5 }, 1.3);
  tl.fromTo($('chatVide'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 1.55);
  sortirTitre(titres[0], 1.95);

  // 1 — Les stats d'un lieu : on clique, le panneau s'ouvre, l'IA l'explique
  tl.to(cam, { ax: 250, ay: 780, s: 2.2, duration: 0.8, ease: CAMERA }, 2.0);
  tl.to($('fonduHaut'), { height: 700, duration: 0.7, ease: CAMERA }, 2.0);
  entrerTitre(titres[1], 2.25);
  tl.to(carte, { surbrillance: 1, duration: 0.35, ease: 'none' }, 2.3);
  tl.to(pinPoint, { scale: 1, duration: 0.55, ease: RESSORT }, 2.3);
  tl.fromTo($('onde1'), { scale: 1, opacity: 0.7 }, { scale: 3.2, opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 2.4);
  tl.to($('panneauStats'), { autoAlpha: 1, y: 0, duration: 0.7 }, 2.45);
  tl.to($('chatVide'), { autoAlpha: 0, y: -20, duration: 0.3, ease: SORTIE }, 2.6);
  echange(0, 2.7);
  surligner($('ligneJeunes'), 3.5);
  surligner($('ligneCommerces'), 3.85);
  surligner($('ligneAge'), 4.1);
  sortirTitre(titres[1], 5.55);
  tl.to($('panneauStats'), { autoAlpha: 0, y: 60, duration: 0.4, ease: SORTIE }, 5.55);
  tl.to(groupes[0], { autoAlpha: 0, y: -40, duration: 0.35, ease: SORTIE }, 5.55);
  tl.to(pinPoint, { scale: 0, duration: 0.3, ease: SORTIE }, 5.55);

  // 2 — Le comparateur : l'IA tranche sur le critère de l'utilisateur
  tl.to($('voile'), { opacity: 0.85, duration: 0.5, ease: 'power1.inOut' }, 5.6);
  tl.to(carte, { flou: 6, surbrillance: 0, duration: 0.5, ease: 'power1.inOut' }, 5.6);
  entrerTitre(titres[2], 5.85);
  tl.to($('carteComparer'), { autoAlpha: 1, y: 0, duration: 0.7 }, 5.95);
  echange(1, 6.3);
  surligner($('cmpParking'), 7.2);
  surligner($('cmpCommerces'), 7.75);
  sortirTitre(titres[2], 9.15);
  tl.to($('carteComparer'), { autoAlpha: 0, y: -60, duration: 0.4, ease: SORTIE }, 9.15);
  tl.to(groupes[1], { autoAlpha: 0, y: -40, duration: 0.35, ease: SORTIE }, 9.15);

  // 3 — Les outils : l'IA explique l'outil Concurrence, la carte le montre
  tl.to($('voile'), { opacity: 0, duration: 0.5, ease: 'power1.inOut' }, 9.2);
  tl.to(carte, { flou: 0, duration: 0.5, ease: 'power1.inOut' }, 9.2);
  tl.to(cam, { ax: 540, ay: 850, s: 1.9, duration: 0.8, ease: CAMERA }, 9.2);
  entrerTitre(titres[3], 9.45);
  tl.to($('barreOutils'), { autoAlpha: 1, y: 0, duration: 0.6 }, 9.4);
  tl.to(pinPoint, { scale: 1, duration: 0.5, ease: RESSORT }, 9.55);
  echange(2, 9.7);
  tl.to($('outilConcurrence'), { backgroundColor: '#00494a', borderColor: '#00494a', color: '#fefbf9', duration: 0.3, ease: 'power1.out' }, 10.5);
  tl.to(carte, { cercle: 1, duration: 0.6, ease: 'power2.inOut' }, 10.7);
  tl.to(concurrents, { p: 1, duration: 0.45, stagger: 0.08, ease: RESSORT }, 10.95);
  sortirTitre(titres[3], 12.05);
  tl.to($('barreOutils'), { autoAlpha: 0, y: -30, duration: 0.35, ease: SORTIE }, 12.05);
  tl.to(chat, { autoAlpha: 0, scale: 0.92, y: 14, duration: 0.35, ease: SORTIE }, 12.05);
  tl.to(pinPoint, { scale: 0, duration: 0.3, ease: SORTIE }, 12.05);

  // 4 — Appel à l'action : le bouton de l'assistant devient le point du i
  tl.to($('logoPetit'), { opacity: 0, duration: 0.3, ease: 'none' }, 12.05);
  tl.to($('voile'), { opacity: 0.78, duration: 0.7, ease: 'power1.inOut' }, 12.1);
  tl.to(carte, { calques: 0, duration: 0.5, ease: 'none' }, 12.1);
  tl.to($('fonduHaut'), { height: 0, duration: 0.7, ease: 'power1.inOut' }, 12.1);
  tl.to(cam, { s: 1.2, ay: 960, duration: 2.8, ease: 'sine.inOut' }, 12.2);
  tl.to(lanceur.querySelector('svg'), { opacity: 0, duration: 0.2, ease: 'none' }, 12.3);
  var vol = { x: 0, y: 0 };
  tl.to(lanceur, { x: function () { return vol.x; }, duration: 0.65, ease: 'power2.in' }, 12.3);
  tl.to(lanceur, { y: function () { return vol.y; }, duration: 0.65, ease: 'power2.out' }, 12.3);
  tl.to(lanceur, { scale: 41.4 / 116, boxShadow: '0 0 0 rgba(11, 8, 7, 0)', duration: 0.65, ease: CAMERA }, 12.3);
  tl.set(lanceur, { autoAlpha: 0 }, 12.95);
  tl.set($('logoPoint'), { scale: 1 }, 12.95);
  tl.to($('logoTige'), { scaleY: 1, duration: 0.5, ease: RESSORT }, 12.87);
  tl.to($('logoP'), { xPercent: 0, duration: 0.75 }, 12.97);
  tl.to($('logoGnon'), { xPercent: 0, duration: 0.75 }, 12.97);
  tl.to(tous('.cta-ligne .mot-in'), { yPercent: 0, duration: 0.8, stagger: 0.045 }, 13.2);
  tl.to($('ctaBouton'), { autoAlpha: 1, scale: 1, duration: 0.6, ease: RESSORT }, 13.6);
  tl.to([$('ctaSous'), $('ctaUrl')], { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 13.75);
  tl.fromTo($('ctaOnde'), { scale: 1, opacity: 0.75 }, { scale: 1.2, opacity: 0, duration: 0.6, ease: 'power2.out', immediateRender: false }, 14.15);
  tl.fromTo($('ctaOnde'), { scale: 1, opacity: 0.75 }, { scale: 1.2, opacity: 0, duration: 0.6, ease: 'power2.out', immediateRender: false }, 14.45);
  tl.fromTo($('ctaFleche'), { x: 0 }, { x: 10, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, 14.15);
  tl.set({}, {}, DUREE);

  // ---------- Pilotage ----------
  function allerA(t) {
    t = borner(t, 0, DUREE);
    tl.seek(t, true);
    maj(t);
    return t;
  }
  function preparer() {
    var b = $('ctaBouton'), onde = $('ctaOnde');
    onde.style.width = b.offsetWidth + 'px';
    onde.style.height = b.offsetHeight + 'px';
    var point = $('logoPoint'), pos = O.positionDans(point, $('stage'));
    var cible = O.positionDans(lanceur, $('stage'));
    vol.x = pos.x + point.offsetWidth / 2 - (cible.x + lanceur.offsetWidth / 2);
    vol.y = pos.y + point.offsetHeight / 2 - (cible.y + lanceur.offsetHeight / 2);
    groupes.forEach(function (g, k) { hauteurQuestion[k] = 30 + g.querySelector('.bulle-u').offsetHeight + 22; });
    tl.invalidate();
  }
  O.piloter({ duree: DUREE, allerA: allerA, preparer: preparer });
})();
