/*
 * Pignon — « Rapports et partage », 19 s, 1080 x 1920 (9:16).
 * Créer un rapport (analyse + simulation), copier son lien (lisible sans compte, données
 * figées), puis inviter un associé sur la session en lecture ou en écriture.
 */
(function () {
  'use strict';

  var DUREE = 19;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE, STANDARD = O.STANDARD;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });

  var ville = PignonCity.build();
  var cam = { x: 760, y: 1150, s: 1.35, ax: 540, ay: 960 };
  var canvas = $('map'), ctx = canvas.getContext('2d');
  canvas.style.filter = 'blur(3px)';
  var pointVol = $('pointVol'), depart = { x: 120, y: 1200 }, pointI = { x: 540, y: 620 }, vol = { u: 0 };
  function maj(t) {
    O.dessinerVille(ctx, ville, cam, t, {});
    var u = vol.u, w = 1 - u, kx = Math.min(depart.x, pointI.x) - 120, ky = Math.min(depart.y, pointI.y) - 140;
    pointVol.style.left = (w * w * depart.x + 2 * w * u * kx + u * u * pointI.x).toFixed(2) + 'px';
    pointVol.style.top = (w * w * depart.y + 2 * w * u * ky + u * u * pointI.y).toFixed(2) + 'px';
  }

  O.etatsInitiaux();
  var titres = [0, 1, 2, 3].map(function (i) { return $('titre' + i); });
  var cartes = ['carteForm', 'carteRapport', 'cartePartage'].map($);
  gsap.set(cartes, { autoAlpha: 0, y: 80 });
  gsap.set($('accrocheLien'), { autoAlpha: 0, y: 40 });
  gsap.set(tous('#accrocheLien > *'), { autoAlpha: 0, x: -20 });
  gsap.set(tous('#cases p'), { autoAlpha: 0, x: -14 });
  gsap.set(tous('#apercu > *'), { autoAlpha: 0, scale: 0.92 });
  gsap.set([$('lien'), $('lienCopie'), $('noteFige')], { autoAlpha: 0, y: 16 });
  gsap.set($('optLecture'), { color: '#171310' });
  gsap.set($('accesNouveau'), { autoAlpha: 0, x: -20 });
  gsap.set($('caret'), { opacity: 1 });
  gsap.set(pointVol, { scale: 0 });

  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
  var T = O.titres(tl);
  function entrer(el, t) { tl.to(el, { autoAlpha: 1, y: 0, duration: 0.7 }, t); }
  function sortir(el, t) { tl.to(el, { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE }, t); }
  function presser(el, t) { tl.fromTo(el, { scale: 1 }, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, t); }

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to(cam, { s: 1.2, x: 700, duration: DUREE, ease: 'none' }, 0);

  // 0 — Accroche
  T.entrer(titres[0], 0);
  tl.to($('accrocheLien'), { autoAlpha: 1, y: 0, duration: 0.6 }, 0.6);
  tl.to(tous('#accrocheLien > *'), { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.15 }, 0.8);
  tl.to($('accrocheLien'), { autoAlpha: 0, y: -30, duration: 0.35, ease: SORTIE }, 2.2);
  T.sortir(titres[0], 2.25);

  // 1 — Créer un rapport : l'analyse, la simulation, le contenu
  T.entrer(titres[1], 2.45);
  entrer(cartes[0], 2.5);
  tl.to(tous('#cases p'), { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.07 }, 3.0);
  tous('#cases .coche-f').forEach(function (c, i) {
    var t = 3.5 + i * 0.15;
    tl.to(c, { backgroundColor: '#00494a', borderColor: '#00494a', duration: 0.12, ease: 'none' }, t);
    tl.to(c.querySelector('svg'), { opacity: 1, duration: 0.12 }, t);
  });
  presser($('btnCreer'), 4.85);
  T.sortir(titres[1], 6.3);
  sortir(cartes[0], 6.3);

  // 2 — Le rapport et son lien
  T.entrer(titres[2], 6.5);
  entrer(cartes[1], 6.55);
  tl.to(tous('#apercu > *'), { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.12, ease: RESSORT }, 6.9);
  tl.to($('lien'), { autoAlpha: 1, y: 0, duration: 0.5 }, 7.4);
  presser($('btnCopier'), 7.95);
  tl.to($('lienCopie'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 8.1);
  tl.to($('noteFige'), { autoAlpha: 1, y: 0, duration: 0.5 }, 8.45);
  T.sortir(titres[2], 10.6);
  sortir(cartes[1], 10.6);

  // 3 — Inviter un associé sur la session
  T.entrer(titres[3], 10.8);
  entrer(cartes[2], 10.85);
  tl.to(tous('#email .car'), { opacity: 1, duration: 0.01, stagger: 0.045, ease: 'none' }, 11.3);
  tl.to($('basculeFond'), { x: 150, duration: 0.35, ease: CAMERA }, 12.45);
  tl.to($('optLecture'), { color: '#605955', duration: 0.2, ease: 'none' }, 12.5);
  tl.to($('optEcriture'), { color: '#171310', duration: 0.2, ease: 'none' }, 12.5);
  presser($('btnInviter'), 12.95);
  tl.to($('caret'), { opacity: 0, duration: 0.1, ease: 'none' }, 12.95);
  tl.to($('accesNouveau'), { autoAlpha: 1, x: 0, duration: 0.5 }, 13.2);
  tl.fromTo($('avatarNouveau'), { scale: 0.4 }, { scale: 1, duration: 0.5, ease: RESSORT, immediateRender: false }, 13.2);
  T.sortir(titres[3], 15.4);
  sortir(cartes[2], 15.4);

  // 4 — Appel à l'action : l'avatar de l'associé devient le point du i
  tl.to($('logoPetit'), { opacity: 0, duration: 0.3, ease: 'none' }, 15.4);
  tl.to($('voile'), { opacity: 0.78, duration: 0.6, ease: 'power1.inOut' }, 15.45);
  tl.to(pointVol, { scale: 1, duration: 0.4, ease: RESSORT }, 15.8);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 16.0);
  tl.to(pointVol, { width: 41.4, height: 41.4, marginLeft: -20.7, marginTop: -20.7, duration: 0.6, ease: CAMERA }, 16.0);
  tl.set(pointVol, { autoAlpha: 0 }, 16.6);
  O.finCta(tl, 16.6);
  tl.set({}, {}, DUREE);

  function allerA(t) {
    t = borner(t, 0, DUREE);
    tl.seek(t, true);
    maj(t);
    return t;
  }
  O.piloter({
    duree: DUREE, allerA: allerA,
    preparer: function () {
      pointI = O.mesurerCta();
      var a = $('avatarNouveau'), p = O.positionDans(a, $('stage'));
      depart = { x: p.x + a.offsetWidth / 2, y: p.y + a.offsetHeight / 2 };
    }
  });
})();
