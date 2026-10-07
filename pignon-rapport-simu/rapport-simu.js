/*
 * Pignon — « Rapport + simulation », 25 s, 1080 x 1920 (9:16).
 * Un rapport réunit l'analyse d'un emplacement et une simulation de CA, essentielle ou détaillée ;
 * puis le fonctionnement du simulateur (recettes, charges et statut, verdict) et l'aide à la saisie.
 * Chiffres : exemple de contrôle de la spécification du simulateur (docs/17) et appels URSSAF documentés.
 */
(function () {
  'use strict';

  var DUREE = 25;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE, STANDARD = O.STANDARD;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function formater(n, dec) {
    var s = dec ? n.toFixed(dec) : String(Math.round(n));
    var p = s.split('.');
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (p[1] ? ',' + p[1] : '');
  }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-mots-flux]').forEach(function (el) { O.decouperMots(el, 'flux'); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });

  // ---------- Fond : la carte, floutée sous un voile ----------
  var ville = PignonCity.build();
  var cam = { x: 700, y: 1150, s: 1.3, ax: 540, ay: 960 };
  var canvas = $('map'), ctx = canvas.getContext('2d');
  canvas.style.filter = 'blur(4px)';
  var compteurs = [
    { el: $('nSalle'), v: 0 }, { el: $('nEmporter'), v: 0 }, { el: $('nCa'), v: 0 },
    { el: $('nCout'), v: 0, dec: 2 }, { el: $('nNet'), v: 0 }
  ];
  var pointVol = $('pointVol'), depart = { x: 130, y: 640 }, pointI = { x: 540, y: 620 }, vol = { u: 0 };
  function maj(t) {
    O.dessinerVille(ctx, ville, cam, t, {});
    compteurs.forEach(function (k) { k.el.textContent = formater(k.v, k.dec); });
    var u = vol.u, w = 1 - u, kx = Math.max(depart.x, pointI.x) + 120, ky = Math.min(depart.y, pointI.y) - 120;
    pointVol.style.left = (w * w * depart.x + 2 * w * u * kx + u * u * pointI.x).toFixed(2) + 'px';
    pointVol.style.top = (w * w * depart.y + 2 * w * u * ky + u * u * pointI.y).toFixed(2) + 'px';
  }

  // ---------- États initiaux ----------
  O.etatsInitiaux();
  var titres = [0, 1, 2, 3, 4, 5].map(function (i) { return $('titre' + i); });
  var cartes = ['carteForm', 'carteModes', 'carteRecettes', 'carteCharges', 'carteVerdict'].map($);
  var chat = $('chat'), attente = $('attente');
  gsap.set(cartes, { autoAlpha: 0, y: 70 });
  gsap.set($('champSimu'), { autoAlpha: 0, y: 24, scale: 0.96 });
  gsap.set(tous('#sections span'), { autoAlpha: 0, scale: 0.85 });
  gsap.set($('optEss'), { color: '#fefbf9' });
  gsap.set($('notesModes'), { autoAlpha: 0, y: 12 });
  gsap.set(tous('#outils .outil'), { autoAlpha: 0, y: 20 });
  gsap.set([$('recette1'), $('recette2'), $('lCaTotal'), $('principe')], { autoAlpha: 0, y: 18 });
  gsap.set(tous('#carteCharges .ch-l'), { autoAlpha: 0, x: -18 });
  gsap.set(tous('#perso > *'), { autoAlpha: 0, x: -18 });
  gsap.set([$('sourceUrssaf'), $('noteIs')], { autoAlpha: 0, y: 12 });
  gsap.set([$('jaugeSeuil'), $('jaugeMarge')], { scaleX: 0 });
  gsap.set([$('marge'), $('fragile')], { autoAlpha: 0, y: 14 });
  gsap.set($('aide'), { autoAlpha: 0, y: 20 });
  gsap.set(chat, { autoAlpha: 0, scale: 0.92, y: 14 });
  gsap.set([$('question'), $('reponse')], { autoAlpha: 0, scale: 0.9 });
  gsap.set(tous('#reponse .flux'), { opacity: 0 });
  gsap.set(attente, { autoAlpha: 0, scale: 0.6 });
  gsap.set(pointVol, { scale: 0 });

  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
  var T = O.titres(tl);
  function entrer(el, t) { tl.to(el, { autoAlpha: 1, y: 0, duration: 0.7 }, t); }
  function sortir(el, t) { tl.to(el, { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE }, t); }
  function pulse(el, t, k) { tl.fromTo(el, { scale: 1 }, { scale: k || 1.06, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, t); }
  function surligner(el, t) { tl.to(el, { borderColor: '#00494a', backgroundColor: '#ecf8f7', color: '#00494a', duration: 0.25, ease: 'none' }, t); pulse(el, t, 1.08); }

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to(cam, { x: 820, duration: DUREE, ease: 'none' }, 0);

  // 0 — Un rapport : l'analyse avec le métier, puis la simulation de CA
  T.entrer(titres[0], 0);
  entrer(cartes[0], 0.3);
  pulse($('caseMetier'), 1.0, 1.05);
  tl.to($('champSimu'), { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: RESSORT }, 1.5);
  pulse($('btnCreer'), 2.55);
  T.sortir(titres[0], 3.2);
  sortir(cartes[0], 3.2);

  // 1 — Essentiel ou Détaillé : la pastille glisse, les réglages détaillés apparaissent
  T.entrer(titres[1], 3.4);
  entrer(cartes[1], 3.5);
  tl.to(tous('#sections span:not(.det)'), { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: RESSORT }, 3.8);
  tl.to($('segPastille'), { x: 210, duration: 0.45, ease: CAMERA }, 5.0);
  tl.to($('optEss'), { color: '#605955', duration: 0.2, ease: 'none' }, 5.1);
  tl.to($('optDet'), { color: '#fefbf9', duration: 0.2, ease: 'none' }, 5.15);
  tl.to(tous('#sections span.det'), { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.08, ease: RESSORT }, 5.3);
  tl.to($('notesModes'), { autoAlpha: 1, y: 0, duration: 0.5 }, 6.1);
  T.sortir(titres[1], 7.0);
  sortir(cartes[1], 7.0);

  // 2 — Recettes : un outil par prestation, sa formule avec vos valeurs
  T.entrer(titres[2], 7.2);
  entrer(cartes[2], 7.3);
  tl.to(tous('#outils .outil'), { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.06 }, 7.55);
  surligner($('outilCouverts'), 8.0);
  tl.to($('recette1'), { autoAlpha: 1, y: 0, duration: 0.5 }, 8.15);
  tl.to(compteurs[0], { v: 203040, duration: 0.8, ease: 'power2.out' }, 8.35);
  surligner($('outilFreq'), 8.85);
  tl.to($('recette2'), { autoAlpha: 1, y: 0, duration: 0.5 }, 9.0);
  tl.to(compteurs[1], { v: 50760, duration: 0.7, ease: 'power2.out' }, 9.15);
  tl.to($('lCaTotal'), { autoAlpha: 1, y: 0, duration: 0.5 }, 9.55);
  tl.to(compteurs[2], { v: 253800, duration: 0.8, ease: 'power2.out' }, 9.6);
  tl.to($('principe'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 10.05);
  T.sortir(titres[2], 10.9);
  sortir(cartes[2], 10.9);

  // 3 — Charges et statut : le brut devient un coût employeur, paramètres URSSAF
  T.entrer(titres[3], 11.1);
  entrer(cartes[3], 11.2);
  tl.to(tous('#carteCharges .ch-l'), { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.12 }, 11.55);
  tl.to(tous('#perso > *'), { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.15 }, 12.1);
  tl.to(compteurs[3], { v: 2248.52, duration: 0.8, ease: 'power2.out' }, 12.4);
  tl.to($('sourceUrssaf'), { autoAlpha: 1, y: 0, duration: 0.45, ease: RESSORT }, 12.95);
  tl.to($('noteIs'), { autoAlpha: 1, y: 0, duration: 0.5 }, 13.35);
  T.sortir(titres[3], 14.7);
  sortir(cartes[3], 14.7);

  // 4 — Le verdict : résultat, seuil de rentabilité, marge de sécurité, fragilité
  T.entrer(titres[4], 14.9);
  entrer(cartes[4], 15.0);
  tl.to(compteurs[4], { v: 18928, duration: 0.9, ease: 'power2.out' }, 15.3);
  tl.to($('jaugeSeuil'), { scaleX: 1, duration: 0.7, ease: 'power2.out' }, 15.8);
  tl.to($('jaugeMarge'), { scaleX: 1, duration: 0.4, ease: 'power2.out' }, 16.4);
  tl.to($('marge'), { autoAlpha: 1, y: 0, duration: 0.5 }, 16.55);
  tl.to($('fragile'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 17.05);
  T.sortir(titres[4], 18.5);
  sortir(cartes[4], 18.5);

  // 5 — Aide à la saisie : l'assistant pose les questions et dit où saisir, sans proposer de chiffres
  T.entrer(titres[5], 18.7);
  tl.to($('aide'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 18.8);
  pulse($('aide'), 19.2, 0.94);
  tl.to(chat, { autoAlpha: 1, scale: 1, y: 0, duration: 0.5 }, 19.4);
  tl.to($('question'), { autoAlpha: 1, scale: 1, duration: 0.45, ease: RESSORT }, 19.65);
  tl.to(attente, { autoAlpha: 1, scale: 1, duration: 0.3, ease: RESSORT }, 19.95);
  tl.fromTo(tous('i', attente), { y: 0 }, { y: -9, duration: 0.12, stagger: 0.05, yoyo: true, repeat: 1, ease: 'sine.inOut', immediateRender: false }, 19.99);
  tl.to(attente, { autoAlpha: 0, scale: 0.6, duration: 0.14, ease: SORTIE }, 20.27);
  tl.to($('reponse'), { autoAlpha: 1, scale: 1, duration: 0.35 }, 20.29);
  tl.to(tous('#reponse .flux'), { opacity: 1, duration: 0.1, stagger: 0.03, ease: 'none' }, 20.33);
  T.sortir(titres[5], 21.95);
  tl.to(chat, { autoAlpha: 0, y: -40, duration: 0.4, ease: SORTIE }, 21.95);

  // 6 — Appel à l'action : le point de l'aide devient le point du i
  tl.to(pointVol, { scale: 1, duration: 0.35, ease: RESSORT }, 21.95);
  tl.to($('aide'), { autoAlpha: 0, duration: 0.25, ease: 'none' }, 22.05);
  tl.to($('logoPetit'), { autoAlpha: 0, duration: 0.3, ease: 'none' }, 22.0);
  tl.to($('voile'), { opacity: 0.78, duration: 0.6, ease: 'power1.inOut' }, 22.0);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 22.15);
  tl.to(pointVol, { width: 41.4, height: 41.4, marginLeft: -20.7, marginTop: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 22.15);
  tl.set(pointVol, { autoAlpha: 0 }, 22.75);
  O.finCta(tl, 22.75);
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
      var a = $('aide'), p = O.positionDans(a, $('stage'));
      depart = { x: p.x + 42, y: p.y + a.offsetHeight / 2 };
      attente.style.top = $('reponse').offsetTop + 'px';
    }
  });
})();
