/*
 * Pignon — « Parcours », 28,5 s, 1080 x 1920 (9:16).
 * Un projet de café, de l'idée au rapport : le quartier, le métier, les chiffres, l'avis de l'IA,
 * le dossier pour la banque. Voisinage, survie et CA du secteur : sessions réelles, sans adresse.
 * Simulation : exemple cohérent (90 clients × 5,50 € × 300 j ; achats 30 % ; charges fixes 70 k€).
 */
(function () {
  'use strict';

  var DUREE = 28.5;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE, STANDARD = O.STANDARD;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function formater(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-mots-flux]').forEach(function (el) { O.decouperMots(el, 'flux'); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });
  tous('[data-pictos]').forEach(function (el) { O.pictos(el, el.getAttribute('data-pictos').split(',').map(Number)); });

  // ---------- Exemple de simulation ----------
  var CLIENTS = 90, PANIER = 5.5, JOURS = 300, ACHATS = 0.30, FIXES = 70000;
  var CA = CLIENTS * PANIER * JOURS;                        // 148 500 €
  var RESULTAT = CA * (1 - ACHATS) - FIXES;                 // 33 950 €
  var SEUIL = Math.ceil(FIXES / (PANIER * JOURS * (1 - ACHATS)));   // 61 clients / jour
  $('nCa').textContent = formater(CA);
  $('nRes').textContent = formater(RESULTAT);
  $('seuil').querySelector('b').textContent = SEUIL + ' clients / jour';

  // ---------- Carte ----------
  var ville = PignonCity.build();
  var cible = O.choisirLocal(ville, [820, 1130]);
  var cam = { x: cible.cx, y: cible.cy, s: 1.5, ax: 540, ay: 1150 };
  var carte = { surbrillance: 0, flou: 0 };
  var canvas = $('map'), ctx = canvas.getContext('2d'), pin = $('pin');
  var pointVol = $('pointVol'), depart = { x: 900, y: 158 }, pointI = { x: 540, y: 620 }, vol = { u: 0 };
  var compteurs = [{ el: $('nCaSecteur'), v: 0 }, { el: $('nCa'), v: 0 }, { el: $('nRes'), v: 0 }];

  function maj(t) {
    O.dessinerVille(ctx, ville, cam, t, { cible: cible, surbrillance: carte.surbrillance });
    canvas.style.filter = carte.flou > 0.05 ? 'blur(' + carte.flou.toFixed(2) + 'px)' : 'none';
    pin.style.transform = 'translate(' + (cam.ax + (cible.cx - cam.x) * cam.s).toFixed(2) + 'px,' + (cam.ay + (cible.cy - cam.y) * cam.s).toFixed(2) + 'px)';
    compteurs.forEach(function (k) { k.el.textContent = formater(k.v); });
    var u = vol.u, w = 1 - u, kx = Math.max(depart.x, pointI.x) + 40, ky = Math.min(depart.y, pointI.y) + 60;
    pointVol.style.left = (w * w * depart.x + 2 * w * u * kx + u * u * pointI.x).toFixed(2) + 'px';
    pointVol.style.top = (w * w * depart.y + 2 * w * u * ky + u * u * pointI.y).toFixed(2) + 'px';
  }

  // ---------- États initiaux ----------
  O.etatsInitiaux();
  var titres = [0, 1, 2, 3, 4, 5].map(function (i) { return $('titre' + i); });
  var etapes = [1, 2, 3, 4, 5].map(function (i) { return $('etape' + i); });
  var cartes = ['panneauStats', 'carteSurvie', 'carteCa', 'carteSimu', 'carteRapport'].map($);
  var chat = $('chat'), pinPoint = $('pinPoint'), attente = $('attente');
  gsap.set(etapes, { scale: 0 });
  gsap.set($('railPlein'), { scaleX: 0 });
  gsap.set(pinPoint, { scale: 0 });
  gsap.set($('onde1'), { scale: 1, opacity: 0 });
  gsap.set(cartes, { autoAlpha: 0, y: 70 });
  gsap.set(tous('#panneauStats .ps-ligne'), { autoAlpha: 0, x: -16, '--surligne': 0 });
  gsap.set(tous('#carteSurvie .picto-icones .picto'), { autoAlpha: 0, scale: 0.4 });
  gsap.set(tous('#carteSurvie .picto-chiffre'), { opacity: 0 });
  gsap.set($('bandeCa'), { scaleX: 0 });
  gsap.set($('marqueCa'), { scaleY: 0 });
  gsap.set(tous('#carteSimu .facteur, #carteSimu .fois'), { autoAlpha: 0, scale: 0.7 });
  gsap.set([$('lCa'), $('lRes'), $('hypotheses'), $('seuil')], { autoAlpha: 0, y: 16 });
  gsap.set(chat, { autoAlpha: 0, y: 40, scale: 0.96 });
  gsap.set([$('pointJoint'), $('question'), $('reponse')], { autoAlpha: 0, scale: 0.9 });
  gsap.set(tous('#reponse .flux'), { opacity: 0 });
  gsap.set(attente, { autoAlpha: 0, scale: 0.6 });
  gsap.set(tous('#carteRapport .rapport-sections p'), { autoAlpha: 0, x: -20 });
  gsap.set([$('lien'), $('sansCompte')], { autoAlpha: 0, y: 16 });
  gsap.set(pointVol, { scale: 0 });

  // ---------- Timeline ----------
  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
  var T = O.titres(tl);
  function entrer(el, t) { tl.to(el, { autoAlpha: 1, y: 0, duration: 0.7 }, t); }
  function sortir(el, t) { tl.to(el, { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE }, t); }
  // Étape n du rail : la précédente est validée, le rail avance, l'étape n devient active.
  function etape(n, t) {
    if (n > 1) {
      var prec = etapes[n - 2];
      tl.to(prec, { backgroundColor: '#00494a', borderColor: '#00494a', scale: 1, duration: 0.25, ease: 'none' }, t);
      tl.to(prec.querySelector('.pc-icone'), { opacity: 0, duration: 0.15 }, t);
      tl.to(prec.querySelector('.pc-ok'), { opacity: 1, duration: 0.2 }, t + 0.1);
      tl.to($('railPlein'), { scaleX: Math.min(1, (n - 1) / 4), duration: 0.45, ease: 'power2.inOut' }, t);
    }
    if (n <= 5) tl.to(etapes[n - 1], { borderColor: '#00494a', color: '#00494a', scale: 1.12, duration: 0.3, ease: RESSORT }, t + 0.2);
  }
  function surligner(el, t) { tl.to(el, { '--surligne': 1, duration: 0.35, ease: 'power1.out' }, t); }

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);

  // 0 — Accroche : un projet, cinq étapes
  T.entrer(titres[0], 0);
  tl.to(cam, { s: 1.85, duration: 2.6, ease: 'sine.inOut' }, 0);
  tl.to(etapes, { scale: 1, duration: 0.45, stagger: 0.08, ease: RESSORT }, 0.6);
  T.sortir(titres[0], 2.3);

  // 1 — Le quartier : un clic, le panneau du point
  etape(1, 2.4);
  tl.to(cam, { ax: 250, ay: 880, s: 2.1, duration: 0.9, ease: CAMERA }, 2.4);
  tl.to($('fonduHaut'), { height: 640, duration: 0.7, ease: CAMERA }, 2.45);
  T.entrer(titres[1], 2.6);
  tl.to(carte, { surbrillance: 1, duration: 0.3, ease: 'none' }, 3.0);
  tl.to(pinPoint, { scale: 1, duration: 0.55, ease: RESSORT }, 3.0);
  tl.fromTo($('onde1'), { scale: 1, opacity: 0.7 }, { scale: 3.2, opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 3.1);
  entrer(cartes[0], 3.2);
  tl.to(tous('#panneauStats .ps-ligne'), { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.12 }, 3.45);
  surligner($('ligneJeunes'), 4.6);
  surligner($('ligneCommerces'), 5.0);
  T.sortir(titres[1], 6.6);
  tl.to(cartes[0], { autoAlpha: 0, y: 50, duration: 0.4, ease: SORTIE }, 6.6);
  tl.to(pinPoint, { scale: 0, duration: 0.3, ease: SORTIE }, 6.6);

  // 2 — Le métier : survie en pictogrammes, CA du secteur
  etape(2, 6.75);
  tl.to($('voile'), { opacity: 0.86, duration: 0.5, ease: 'power1.inOut' }, 6.7);
  tl.to(carte, { flou: 6, surbrillance: 0, duration: 0.5, ease: 'power1.inOut' }, 6.7);
  T.entrer(titres[2], 6.9);
  entrer(cartes[1], 7.0);
  tous('#carteSurvie .picto-ligne').forEach(function (l, k) {
    tl.to(tous('.picto', l), { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.03, ease: RESSORT }, 7.3 + k * 0.4);
    tl.to(l.querySelector('.picto-chiffre'), { opacity: 1, duration: 0.3, ease: 'none' }, 7.45 + k * 0.4);
  });
  tl.to($('ligneDix').querySelector('.picto-chiffre'), { color: '#a55535', duration: 0.3, ease: 'none' }, 8.6);
  tl.fromTo($('ligneDix').querySelector('.picto-chiffre'), { scale: 1 }, { scale: 1.18, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut', transformOrigin: '100% 60%', immediateRender: false }, 8.6);
  entrer(cartes[2], 8.75);
  tl.to(compteurs[0], { v: 152, duration: 0.9, ease: 'power2.out' }, 8.9);
  tl.to($('marqueCa'), { scaleY: 1, duration: 0.45, ease: RESSORT }, 9.1);
  tl.to($('bandeCa'), { scaleX: 1, duration: 0.6 }, 9.2);
  T.sortir(titres[2], 11.3);
  sortir(cartes[1], 11.3);
  sortir(cartes[2], 11.35);

  // 3 — Les chiffres : la simulation du café
  etape(3, 11.45);
  T.entrer(titres[3], 11.6);
  entrer(cartes[3], 11.7);
  tl.to(tous('#carteSimu .facteur, #carteSimu .fois'), { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.09, ease: RESSORT }, 12.0);
  tl.to($('lCa'), { autoAlpha: 1, y: 0, duration: 0.5 }, 12.6);
  tl.to(compteurs[1], { v: CA, duration: 0.9, ease: 'power2.out' }, 12.65);
  tl.to($('lRes'), { autoAlpha: 1, y: 0, duration: 0.5 }, 13.15);
  tl.to(compteurs[2], { v: RESULTAT, duration: 0.9, ease: 'power2.out' }, 13.2);
  tl.to($('hypotheses'), { autoAlpha: 1, y: 0, duration: 0.5 }, 13.6);
  tl.to($('seuil'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 13.95);
  T.sortir(titres[3], 15.9);
  sortir(cartes[3], 15.9);

  // 4 — L'avis de l'IA : une question, une réponse qui relie les chiffres
  etape(4, 16.05);
  T.entrer(titres[4], 16.2);
  tl.to(chat, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6 }, 16.3);
  tl.to($('pointJoint'), { autoAlpha: 1, scale: 1, duration: 0.4 }, 16.6);
  tl.to($('question'), { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 16.85);
  tl.to(attente, { autoAlpha: 1, scale: 1, duration: 0.3, ease: RESSORT }, 17.3);
  tl.fromTo(tous('i', attente), { y: 0 }, { y: -9, duration: 0.12, stagger: 0.05, yoyo: true, repeat: 1, ease: 'sine.inOut', immediateRender: false }, 17.34);
  tl.to(attente, { autoAlpha: 0, scale: 0.6, duration: 0.14, ease: SORTIE }, 17.62);
  tl.to($('reponse'), { autoAlpha: 1, scale: 1, duration: 0.35 }, 17.64);
  tl.to(tous('#reponse .flux'), { opacity: 1, duration: 0.1, stagger: 0.032, ease: 'none' }, 17.68);
  T.sortir(titres[4], 20.9);
  tl.to(chat, { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE }, 20.9);

  // 5 — Le rapport : tout le dossier, un lien
  etape(5, 21.05);
  T.entrer(titres[5], 21.2);
  entrer(cartes[4], 21.3);
  tl.to(tous('#carteRapport .rapport-sections p'), { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.14 }, 21.6);
  tl.to($('lien'), { autoAlpha: 1, y: 0, duration: 0.5 }, 22.3);
  tl.fromTo($('copier'), { scale: 1 }, { scale: 1.08, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, 22.7);
  tl.to($('sansCompte'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 22.85);
  etape(6, 23.7);
  T.sortir(titres[5], 24.5);
  sortir(cartes[4], 24.5);

  // 6 — Appel à l'action : la dernière étape devient le point du i
  tl.to($('logoPetit'), { autoAlpha: 0, duration: 0.3, ease: 'none' }, 24.5);
  tl.to(pointVol, { scale: 1, duration: 0.35, ease: RESSORT }, 24.55);
  tl.to([$('parcours')], { autoAlpha: 0, duration: 0.3, ease: 'none' }, 24.7);
  tl.to($('voile'), { opacity: 0.78, duration: 0.6, ease: 'power1.inOut' }, 24.6);
  tl.to(carte, { flou: 0, duration: 0.6, ease: 'power1.inOut' }, 24.6);
  tl.to($('fonduHaut'), { height: 0, duration: 0.6, ease: 'power1.inOut' }, 24.6);
  tl.to(cam, { s: 1.2, ax: 540, ay: 960, duration: 3.2, ease: 'sine.inOut' }, 24.65);
  tl.to(vol, { u: 1, duration: 0.65, ease: CAMERA }, 24.8);
  tl.to(pointVol, { width: 41.4, height: 41.4, marginLeft: -20.7, marginTop: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px', duration: 0.65, ease: CAMERA }, 24.8);
  tl.set(pointVol, { autoAlpha: 0 }, 25.45);
  O.finCta(tl, 25.45);
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
      var e = etapes[4], p = O.positionDans(e, $('stage'));
      depart = { x: p.x + e.offsetWidth / 2, y: p.y + e.offsetHeight / 2 };
      attente.style.top = $('reponse').offsetTop + 'px';
    }
  });
})();
