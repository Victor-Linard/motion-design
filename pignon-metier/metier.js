/*
 * Pignon — « Analyse du métier », 20 s, 1080 x 1920 (9:16).
 * Chiffres d'une session réelle (débits de boissons), sans adresse : survie, devenir des
 * commerces fermés, évolution du métier, prix de cession des fonds, CA du secteur.
 */
(function () {
  'use strict';

  var DUREE = 20;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE, STANDARD = O.STANDARD;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });

  // Évolution du métier 2016-2025 (créations, fermetures), session réelle.
  var EVOL = [[2016, 1, 0], [2017, 5, 2], [2018, 6, 5], [2019, 3, 2], [2020, 1, 2], [2021, 0, 1], [2022, 5, 3], [2023, 2, 3], [2024, 0, 1], [2025, 2, 3]];
  var cre = [], fer = [];
  EVOL.forEach(function (e) {
    var a = document.createElement('div');
    a.className = 'evol-an';
    a.innerHTML = '<span class="evol-cre" style="height:' + (e[1] / 6 * 48) + '%"></span><span class="evol-fer" style="height:' + (e[2] / 6 * 48) + '%"></span><span class="evol-lib">' + String(e[0]).slice(2) + '</span>';
    $('evol').appendChild(a);
    cre.push(a.querySelector('.evol-cre'));
    fer.push(a.querySelector('.evol-fer'));
  });

  var ville = PignonCity.build();
  var cible = O.choisirLocal(ville, [820, 1130]);
  var cam = { x: cible.cx, y: cible.cy, s: 1.7, ax: 540, ay: 1020 };
  var carte = { surbrillance: 0, flou: 0 };
  var vol = { u: 0 }, pointI = { x: 540, y: 620 };
  var canvas = $('map'), ctx = canvas.getContext('2d'), pin = $('pin');
  var compteurs = [{ el: $('nCession'), v: 0 }, { el: $('nCa'), v: 0 }];
  function maj(t) {
    O.dessinerVille(ctx, ville, cam, t, { cible: cible, surbrillance: carte.surbrillance });
    var p = [cam.ax + (cible.cx - cam.x) * cam.s, cam.ay + (cible.cy - cam.y) * cam.s];
    if (vol.u > 0) {
      var u = vol.u, v = 1 - u, kx = Math.min(p[0], pointI.x) - 150, ky = Math.min(p[1], pointI.y) - 120;
      p = [v * v * p[0] + 2 * v * u * kx + u * u * pointI.x, v * v * p[1] + 2 * v * u * ky + u * u * pointI.y];
    }
    pin.style.transform = 'translate(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px)';
    compteurs.forEach(function (k) { k.el.textContent = Math.round(k.v); });
    canvas.style.filter = carte.flou > 0.05 ? 'blur(' + carte.flou.toFixed(2) + 'px)' : 'none';
  }

  O.etatsInitiaux();
  var titres = [0, 1, 2, 3, 4].map(function (i) { return $('titre' + i); });
  var cartes = ['carteSurvie', 'carteDevenir', 'carteEvolution', 'carteCession', 'carteCa'].map($);
  var pinPoint = $('pinPoint');
  gsap.set(cartes, { autoAlpha: 0, y: 80 });
  gsap.set(pinPoint, { scale: 0 });
  gsap.set($('onde1'), { scale: 1, opacity: 0 });
  gsap.set($('choixMetier'), { xPercent: -50, autoAlpha: 0, y: 30, scale: 0.9 });
  gsap.set(tous('#carteSurvie .plein'), { scaleX: 0 });
  gsap.set(tous('#carteSurvie .val'), { opacity: 0 });
  gsap.set(tous('#barreDevenir span'), { scaleX: 0 });
  gsap.set(tous('#carteDevenir .devenir-legende p'), { autoAlpha: 0, x: -16 });
  gsap.set(cre.concat(fer), { scaleY: 0 });
  gsap.set([$('bandeCession'), $('bandeCa')], { scaleX: 0 });
  gsap.set([$('marqueCession'), $('marqueCa')], { scaleY: 0 });

  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
  var T = O.titres(tl);
  function entrer(el, t) { tl.to(el, { autoAlpha: 1, y: 0, duration: 0.7 }, t); }
  function sortir(el, t) { tl.to(el, { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE }, t); }

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);

  // 0 — Accroche : un local, un métier
  T.entrer(titres[0], 0);
  tl.to(cam, { s: 2.0, duration: 2.3, ease: 'sine.inOut' }, 0);
  tl.to(carte, { surbrillance: 1, duration: 0.3, ease: 'none' }, 0.6);
  tl.to(pinPoint, { scale: 1, duration: 0.55, ease: RESSORT }, 0.6);
  tl.fromTo($('onde1'), { scale: 1, opacity: 0.7 }, { scale: 3.2, opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 0.7);
  tl.to($('choixMetier'), { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: RESSORT }, 1.0);
  T.sortir(titres[0], 2.2);

  // 1 — Chances de survie
  tl.to([$('choixMetier')], { autoAlpha: 0, y: 20, duration: 0.3, ease: SORTIE }, 2.2);
  tl.to(pinPoint, { scale: 0, duration: 0.3, ease: SORTIE }, 2.2);
  tl.to($('voile'), { opacity: 0.86, duration: 0.5, ease: 'power1.inOut' }, 2.25);
  tl.to(carte, { flou: 6, surbrillance: 0, duration: 0.5, ease: 'power1.inOut' }, 2.25);
  T.entrer(titres[1], 2.45);
  entrer(cartes[0], 2.5);
  tl.to(tous('#carteSurvie .plein'), { scaleX: 1, duration: 0.7, stagger: 0.18, ease: 'power2.out' }, 2.9);
  tl.to(tous('#carteSurvie .val'), { opacity: 1, duration: 0.3, stagger: 0.18, ease: 'none' }, 3.1);
  T.sortir(titres[1], 5.8);
  sortir(cartes[0], 5.8);

  // 2 — Ce que sont devenus les commerces fermés
  T.entrer(titres[2], 6.0);
  entrer(cartes[1], 6.05);
  tl.to(tous('#barreDevenir span'), { scaleX: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' }, 6.4);
  tl.to(tous('#carteDevenir .devenir-legende p'), { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.1 }, 6.75);
  T.sortir(titres[2], 9.6);
  sortir(cartes[1], 9.6);

  // 3 — Évolution du métier
  T.entrer(titres[3], 9.8);
  entrer(cartes[2], 9.85);
  tl.to(cre, { scaleY: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' }, 10.25);
  tl.to(fer, { scaleY: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' }, 10.45);
  T.sortir(titres[3], 13.0);
  sortir(cartes[2], 13.0);

  // 4 — Prix de cession et CA du secteur
  T.entrer(titres[4], 13.2);
  entrer(cartes[3], 13.25);
  tl.to(compteurs[0], { v: 225, duration: 0.9, ease: 'power2.out' }, 13.4);
  tl.to($('marqueCession'), { scaleY: 1, duration: 0.45, ease: RESSORT }, 13.65);
  tl.to($('bandeCession'), { scaleX: 1, duration: 0.6 }, 13.75);
  entrer(cartes[4], 13.7);
  tl.to(compteurs[1], { v: 152, duration: 0.9, ease: 'power2.out' }, 13.85);
  tl.to($('marqueCa'), { scaleY: 1, duration: 0.45, ease: RESSORT }, 14.1);
  tl.to($('bandeCa'), { scaleX: 1, duration: 0.6 }, 14.2);
  T.sortir(titres[4], 16.6);
  sortir(cartes[3], 16.6);
  sortir(cartes[4], 16.65);

  // 5 — Appel à l'action
  tl.to($('logoPetit'), { opacity: 0, duration: 0.3, ease: 'none' }, 16.6);
  tl.to($('voile'), { opacity: 0.78, duration: 0.6, ease: 'power1.inOut' }, 16.65);
  tl.to(carte, { flou: 0, duration: 0.6, ease: 'power1.inOut' }, 16.65);
  tl.to($('fonduHaut'), { height: 0, duration: 0.6, ease: 'power1.inOut' }, 16.65);
  tl.to(cam, { s: 1.2, ay: 960, duration: 3.2, ease: 'sine.inOut' }, 16.7);
  tl.to(pinPoint, { scale: 1, duration: 0.4, ease: RESSORT }, 17.0);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 17.2);
  tl.to(pinPoint, { width: 41.4, height: 41.4, left: -20.7, top: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px, rgba(0, 73, 74, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 17.2);
  tl.set(pin, { autoAlpha: 0 }, 17.8);
  O.finCta(tl, 17.8);
  tl.set({}, {}, DUREE);

  function allerA(t) {
    t = borner(t, 0, DUREE);
    tl.seek(t, true);
    maj(t);
    return t;
  }
  O.piloter({ duree: DUREE, allerA: allerA, preparer: function () { pointI = O.mesurerCta(); } });
})();
