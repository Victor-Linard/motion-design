/*
 * Pignon — « Avant / après », 21 s, 1080 x 1920 (9:16).
 * Avant : onglets, tableurs et post-it s'empilent (sites et fichiers génériques, sans marque).
 * Tout est aspiré dans un point, qui devient le point de la carte. Avec Pignon : le voisinage,
 * le métier, le rapport (chiffres de sessions réelles), puis le récapitulatif.
 */
(function () {
  'use strict';

  var DUREE = 21;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE, STANDARD = O.STANDARD;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });
  tous('[data-pictos]').forEach(function (el) { O.pictos(el, el.getAttribute('data-pictos').split(',').map(Number)); });

  // ---------- Carte : invisible pendant « Avant », le local au centre du point ----------
  var ville = PignonCity.build();
  var cible = O.choisirLocal(ville, [820, 1130]);
  var cam = { x: cible.cx, y: cible.cy, s: 1.6, ax: 540, ay: 1180 };
  var carte = { surbrillance: 0, flou: 0, opacite: 0 };
  var canvas = $('map'), ctx = canvas.getContext('2d'), pin = $('pin');
  var pointVol = $('pointVol'), depart = { x: 540, y: 1300 }, pointI = { x: 540, y: 620 }, vol = { u: 0 };

  function maj(t) {
    if (carte.opacite > 0.001) O.dessinerVille(ctx, ville, cam, t, { cible: cible, surbrillance: carte.surbrillance });
    canvas.style.opacity = carte.opacite.toFixed(3);
    canvas.style.filter = carte.flou > 0.05 ? 'blur(' + carte.flou.toFixed(2) + 'px)' : 'none';
    pin.style.transform = 'translate(' + (cam.ax + (cible.cx - cam.x) * cam.s).toFixed(2) + 'px,' + (cam.ay + (cible.cy - cam.y) * cam.s).toFixed(2) + 'px)';
    var u = vol.u, w = 1 - u, kx = Math.min(depart.x, pointI.x) - 160, ky = Math.min(depart.y, pointI.y) - 140;
    pointVol.style.left = (w * w * depart.x + 2 * w * u * kx + u * u * pointI.x).toFixed(2) + 'px';
    pointVol.style.top = (w * w * depart.y + 2 * w * u * ky + u * u * pointI.y).toFixed(2) + 'px';
  }

  // ---------- États initiaux ----------
  O.etatsInitiaux();
  var titres = [0, 1, 2, 3, 4].map(function (i) { return $('titre' + i); });
  var fenetres = tous('.fenetre'), postits = tous('.postit'), onglets = tous('.onglet');
  var cartes = ['panneauStats', 'carteSurvie', 'carteRapport', 'carteDuel'].map($);
  var pinPoint = $('pinPoint');
  gsap.set($('logoPetit'), { autoAlpha: 0 });
  gsap.set(onglets, { flexBasis: 24, autoAlpha: 0 });
  fenetres.concat(postits).forEach(function (el) {
    gsap.set(el, { rotation: parseFloat(el.getAttribute('data-rot')) || 0, autoAlpha: 0, scale: 0.85, y: 40 });
  });
  gsap.set(pinPoint, { scale: 0 });
  gsap.set($('onde1'), { scale: 1, opacity: 0 });
  gsap.set(cartes, { autoAlpha: 0, y: 70 });
  gsap.set(tous('#panneauStats .ps-ligne'), { autoAlpha: 0, x: -16 });
  gsap.set(tous('#carteSurvie .picto-icones .picto'), { autoAlpha: 0, scale: 0.4 });
  gsap.set(tous('#carteSurvie .picto-chiffre'), { opacity: 0 });
  gsap.set(tous('#carteRapport .rapport-sections p'), { autoAlpha: 0, x: -20 });
  gsap.set([$('lien'), $('sansCompte')], { autoAlpha: 0, y: 16 });
  gsap.set(tous('.du-ligne'), { autoAlpha: 0, x: -20 });
  gsap.set(tous('.du-v--avant s'), { scaleX: 0 });
  gsap.set(tous('.du-v--apres'), { autoAlpha: 0, scale: 0.7 });
  gsap.set(pointVol, { scale: 0 });

  // ---------- Timeline ----------
  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
  var T = O.titres(tl);
  function entrer(el, t) { tl.to(el, { autoAlpha: 1, y: 0, duration: 0.7 }, t); }
  function sortir(el, t) { tl.to(el, { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE }, t); }

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);

  // 0 — Avant : les onglets s'ajoutent et rétrécissent, les fenêtres et les post-it s'empilent
  T.entrer(titres[0], 0);
  onglets.forEach(function (o, k) {
    var t = 0.35 + k * 0.27;
    tl.to(o, { autoAlpha: 1, duration: 0.1, ease: 'none' }, t);
    tl.to(o, { flexBasis: 220, duration: 0.4, ease: 'power2.out' }, t);
  });
  [0.55, 1.05, 1.55, 2.05, 2.5].forEach(function (t, k) {
    tl.to(fenetres[k], { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: RESSORT }, t);
  });
  postits.forEach(function (p, k) { tl.to(p, { autoAlpha: 1, scale: 1, y: 0, duration: 0.45, ease: RESSORT }, 2.95 + k * 0.3); });
  tl.to($('avant'), { x: 7, duration: 0.05, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 4.15);
  T.sortir(titres[0], 4.55);

  // Tout est aspiré dans un point
  tl.to(pinPoint, { scale: 1, duration: 0.45, ease: RESSORT }, 4.7);
  var aspires = [fenetres[1], postits[0], fenetres[3], $('onglets'), fenetres[0], postits[2], fenetres[4], postits[1], fenetres[2]];
  aspires.forEach(function (el, k) {
    tl.to(el, {
      x: function () { return 540 - el._centre.x; },
      y: function () { return 1180 - el._centre.y; },
      scale: 0.04, rotation: (parseFloat(el.getAttribute('data-rot')) || 0) + (k % 2 ? 28 : -28),
      autoAlpha: 0, duration: 0.6, ease: 'power3.in'
    }, 4.85 + k * 0.045);
  });
  tl.fromTo(pinPoint, { scale: 1 }, { scale: 1.3, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, 5.45);
  tl.fromTo($('onde1'), { scale: 1, opacity: 0.8 }, { scale: 4, opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 5.5);
  tl.to(carte, { opacite: 1, duration: 0.7, ease: 'power1.inOut' }, 5.5);

  // 1 — Avec Pignon : le point sur la carte, le voisinage
  tl.to($('logoPetit'), { autoAlpha: 1, duration: 0.5, ease: 'none' }, 5.9);
  T.entrer(titres[1], 5.95);
  tl.to(cam, { ax: 250, ay: 880, s: 2.1, duration: 0.9, ease: CAMERA }, 5.95);
  tl.to($('fonduHaut'), { height: 640, duration: 0.7, ease: CAMERA }, 5.95);
  tl.to(carte, { surbrillance: 1, duration: 0.3, ease: 'none' }, 6.4);
  entrer(cartes[0], 6.45);
  tl.to(tous('#panneauStats .ps-ligne'), { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.12 }, 6.7);
  T.sortir(titres[1], 8.7);
  tl.to(cartes[0], { autoAlpha: 0, y: 50, duration: 0.4, ease: SORTIE }, 8.7);
  tl.to(pinPoint, { scale: 0, duration: 0.3, ease: SORTIE }, 8.7);

  // 2 — Le métier : chances de survie en pictogrammes
  tl.to($('voile'), { opacity: 0.86, duration: 0.5, ease: 'power1.inOut' }, 8.75);
  tl.to(carte, { flou: 6, surbrillance: 0, duration: 0.5, ease: 'power1.inOut' }, 8.75);
  T.entrer(titres[2], 8.95);
  entrer(cartes[1], 9.05);
  tous('#carteSurvie .picto-ligne').forEach(function (l, k) {
    tl.to(tous('.picto', l), { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.03, ease: RESSORT }, 9.35 + k * 0.4);
    tl.to(l.querySelector('.picto-chiffre'), { opacity: 1, duration: 0.3, ease: 'none' }, 9.5 + k * 0.4);
  });
  T.sortir(titres[2], 11.6);
  sortir(cartes[1], 11.6);

  // 3 — Le dossier : un rapport, un lien
  T.entrer(titres[3], 11.8);
  entrer(cartes[2], 11.9);
  tl.to(tous('#carteRapport .rapport-sections p'), { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.14 }, 12.2);
  tl.to($('lien'), { autoAlpha: 1, y: 0, duration: 0.5 }, 12.8);
  tl.fromTo($('copier'), { scale: 1 }, { scale: 1.08, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, 13.2);
  tl.to($('sansCompte'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 13.35);
  T.sortir(titres[3], 14.4);
  sortir(cartes[2], 14.4);

  // 4 — Avant / après
  T.entrer(titres[4], 14.6);
  entrer(cartes[3], 14.7);
  tl.to(tous('.du-ligne'), { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.2 }, 15.0);
  tl.to(tous('.du-v--avant s'), { scaleX: 1, duration: 0.35, stagger: 0.2, ease: 'power2.inOut' }, 15.6);
  tl.to(tous('.du-v--avant span'), { opacity: 0.45, duration: 0.3, stagger: 0.2, ease: 'none' }, 15.7);
  tl.to(tous('.du-v--apres'), { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.2, ease: RESSORT }, 15.8);
  T.sortir(titres[4], 17.5);

  // 5 — Appel à l'action : le point « Avec Pignon » devient le point du i
  tl.to(pointVol, { scale: 1, duration: 0.35, ease: RESSORT }, 17.45);
  sortir(cartes[3], 17.55);
  tl.to($('logoPetit'), { autoAlpha: 0, duration: 0.3, ease: 'none' }, 17.5);
  tl.to($('voile'), { opacity: 0.78, duration: 0.6, ease: 'power1.inOut' }, 17.55);
  tl.to(carte, { flou: 0, duration: 0.6, ease: 'power1.inOut' }, 17.55);
  tl.to($('fonduHaut'), { height: 0, duration: 0.6, ease: 'power1.inOut' }, 17.55);
  tl.to(cam, { s: 1.2, ax: 540, ay: 960, duration: 3.2, ease: 'sine.inOut' }, 17.6);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 17.7);
  tl.to(pointVol, { width: 41.4, height: 41.4, marginLeft: -20.7, marginTop: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 17.7);
  tl.set(pointVol, { autoAlpha: 0 }, 18.3);
  O.finCta(tl, 18.3);
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
      var stage = $('stage');
      aspires.forEach(function (el) {
        var p = O.positionDans(el, stage);
        el._centre = { x: p.x + el.offsetWidth / 2, y: p.y + el.offsetHeight / 2 };
      });
      var d = $('duPoint'), q = O.positionDans(d, stage);
      depart = { x: q.x + d.offsetWidth / 2, y: q.y + d.offsetHeight / 2 };
    }
  });
})();
