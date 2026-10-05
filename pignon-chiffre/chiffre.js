/*
 * Pignon — série « Le chiffre », 11,5 s par épisode, 1080 x 1920 (9:16). Épisode : ?ep=1|2|3.
 * Un chiffre réel d'une session de l'app (débits de boissons, un quartier, sans adresse),
 * son contexte en image et sa source : survie à 10 ans, devenir des fermetures, prix de cession.
 */
(function () {
  'use strict';

  var DUREE = 11.5;
  var params = new URLSearchParams(location.search);
  if (params.has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE, STANDARD = O.STANDARD;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // ---------- Épisodes (chiffres repris de l'app) ----------
  var EPISODES = {
    1: {
      valeur: 33, unite: '%', phrase: 'encore ouverts<br><em>au bout de 10 ans.</em>',
      source: 'Pignon, analyse du métier · codes NAF 55.4A-C et 56.30Z · 94 établissements observés, 73 fermetures'
    },
    2: {
      valeur: 64, unite: '%', phrase: 'des fermetures ont trouvé<br><em>un repreneur sur place.</em>',
      source: 'annonces légales (BODACC) · 47 fermetures, janv. 2008 – sept. 2026'
    },
    3: {
      valeur: 225, unite: 'k€', phrase: 'le prix médian<br><em>d’un fonds de commerce.</em>',
      source: 'annonces légales (BODACC) · 17 ventes annoncées, 2017 – 2026'
    }
  };
  var N = EPISODES[params.get('ep')] ? Number(params.get('ep')) : 1, EP = EPISODES[N];
  $('tagNum').textContent = N;
  $('surtitre').textContent = 'Débits de boissons · un quartier';
  $('unite').textContent = EP.unite;
  $('phrase').innerHTML = EP.phrase;
  $('sourceTexte').textContent = EP.source;
  [1, 2, 3].forEach(function (k) { if (k !== N) $('visuel' + k).remove(); });
  var visuel = $('visuel' + N);

  // Épisode 2 : un point par commerce fermé, dans l'ordre des catégories de l'app.
  var CATEGORIES = [
    { classe: 'dv-repris', n: 30, couleur: '#086b6c' },
    { classe: 'dv-demenage', n: 2, couleur: '#88bdbc' },
    { classe: 'dv-successeur', n: 1, couleur: '#b4dad9' },
    { classe: 'dv-procedure', n: 3, couleur: '#a55535' },
    { classe: 'dv-radie', n: 1, couleur: '#e5b099' },
    { classe: 'dv-info', n: 10, couleur: '#ccc6c0' }
  ];
  if (N === 2) CATEGORIES.forEach(function (c) {
    c.points = [];
    for (var k = 0; k < c.n; k++) { var p = document.createElement('span'); $('v2Points').appendChild(p); c.points.push(p); }
  });
  // Épisode 3 : ventes annoncées par an, 2017-2025 (2026 partiel, aucune vente).
  var VENTES = [[2017, 0], [2018, 3], [2019, 2], [2020, 2], [2021, 0], [2022, 3], [2023, 2], [2024, 1], [2025, 4]];
  var barres = [];
  if (N === 3) VENTES.forEach(function (v) {
    var a = document.createElement('div'), h = v[1] / 4 * 120;
    a.className = 'v3-an';
    a.innerHTML = '<span style="height:' + h + 'px"></span>' + (v[1] ? '<em style="bottom:' + (h + 42) + 'px">' + v[1] + '</em>' : '') + '<b>' + String(v[0]).slice(2) + '</b>';
    $('v3Annees').appendChild(a);
    barres.push(a);
  });

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  O.decouperMots($('phrase'));
  O.decouperCaracteres($('surtitre'));
  tous('[data-pictos]').forEach(function (el) { O.pictos(el, el.getAttribute('data-pictos').split(',').map(Number)); });

  // ---------- Fond : la carte, floutée sous un voile ----------
  var ville = PignonCity.build();
  var cible = O.choisirLocal(ville, [820, 1130]);
  var cam = { x: cible.cx - 80, y: cible.cy, s: 1.3, ax: 540, ay: 960 };
  var carte = { flou: 3 };
  var canvas = $('map'), ctx = canvas.getContext('2d');
  var pointVol = $('pointVol'), depart = { x: 900, y: 160 }, pointI = { x: 540, y: 620 }, vol = { u: 0 };
  var compteur = { v: 0 };
  function maj(t) {
    O.dessinerVille(ctx, ville, cam, t, {});
    canvas.style.filter = carte.flou > 0.05 ? 'blur(' + carte.flou.toFixed(2) + 'px)' : 'none';
    $('nombre').textContent = Math.round(compteur.v);
    var u = vol.u, w = 1 - u, kx = Math.max(depart.x, pointI.x) + 40, ky = Math.min(depart.y, pointI.y) + 60;
    pointVol.style.left = (w * w * depart.x + 2 * w * u * kx + u * u * pointI.x).toFixed(2) + 'px';
    pointVol.style.top = (w * w * depart.y + 2 * w * u * ky + u * u * pointI.y).toFixed(2) + 'px';
  }

  // ---------- États initiaux ----------
  O.etatsInitiaux();
  gsap.set($('tag'), { scale: 0.6, autoAlpha: 0 });
  gsap.set($('grosNombre'), { autoAlpha: 0, y: 60 });
  gsap.set([visuel], { autoAlpha: 0, y: 70 });
  gsap.set($('source'), { autoAlpha: 0, y: 16 });
  gsap.set(pointVol, { scale: 0 });

  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to(cam, { x: cible.cx + 80, duration: DUREE, ease: 'none' }, 0);

  // ---------- Le chiffre ----------
  tl.to($('tag'), { scale: 1, autoAlpha: 1, duration: 0.5, ease: RESSORT }, 0.15);
  tl.to(tous('#surtitre .car'), { opacity: 1, duration: 0.01, stagger: 0.022, ease: 'none' }, 0.25);
  tl.to($('grosNombre'), { autoAlpha: 1, y: 0, duration: 0.8 }, 0.35);
  tl.to(compteur, { v: EP.valeur, duration: 1.4, ease: 'power2.out' }, 0.4);
  tl.to(tous('#phrase .mot-in'), { yPercent: 0, duration: 0.8, stagger: 0.05 }, 0.95);
  tl.to(visuel, { autoAlpha: 1, y: 0, duration: 0.7 }, 2.0);
  tl.to($('source'), { autoAlpha: 1, y: 0, duration: 0.6 }, 5.6);

  // ---------- Le contexte, selon l'épisode ----------
  if (N === 1) {
    // De l'ouverture à 10 ans : le curseur avance, les commerces ferment (couleurs de l'app).
    var icones = tous('#v1Pictos .picto'), etats = icones.map(function () { return 'ouvert'; });
    var COULEURS = { ouvert: '#00494a', incertain: '#88bdbc', ferme: '#a39d97' };
    var ETAPES = [{ x: 0.3, c: [6, 2, 2], t: 2.8 }, { x: 0.5, c: [5, 2, 3], t: 4.0 }, { x: 1, c: [2, 2, 6], t: 5.0 }];
    var libelles = tous('.v1-etat');
    gsap.set(icones, { autoAlpha: 0, scale: 0.4 });
    gsap.set($('v1Plein'), { scaleX: 0 });
    gsap.set(libelles, { autoAlpha: 0, y: 14 });
    tl.to(icones, { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.04, ease: RESSORT }, 2.25);
    ETAPES.forEach(function (e, h) {
      var d = h === 2 ? 0.8 : 0.55, arrivee = e.t + d * 0.85;
      tl.to($('v1Curseur'), { left: e.x * 100 + '%', duration: d, ease: CAMERA }, e.t);
      tl.to($('v1Plein'), { scaleX: e.x, duration: d, ease: CAMERA }, e.t);
      icones.forEach(function (ic, i) {
        var etat = i < e.c[0] ? 'ouvert' : i < e.c[0] + e.c[1] ? 'incertain' : 'ferme';
        if (etat === etats[i]) return;
        etats[i] = etat;
        tl.to(ic, { color: COULEURS[etat], duration: 0.3, ease: 'none' }, arrivee + (9 - i) * 0.03);
      });
      if (h > 0) tl.to(libelles[h - 1], { autoAlpha: 0, y: -14, duration: 0.25, ease: SORTIE }, arrivee - 0.1);
      tl.to(libelles[h], { autoAlpha: 1, y: 0, duration: 0.4 }, arrivee + 0.05);
    });
  } else if (N === 2) {
    // 47 points gris, puis chaque catégorie prend sa couleur ; on finit sur les 30 repris.
    var lignes = tous('#v2Legende p'), tous47 = [];
    CATEGORIES.forEach(function (c) { tous47 = tous47.concat(c.points); });
    gsap.set(tous47, { scale: 0 });
    gsap.set(lignes, { autoAlpha: 0, x: -16 });
    tl.to(tous47, { scale: 1, duration: 0.3, stagger: 0.012, ease: RESSORT }, 2.25);
    var t = 3.0;
    CATEGORIES.forEach(function (c, k) {
      if (c.classe !== 'dv-info') tl.to(c.points, { backgroundColor: c.couleur, duration: 0.25, stagger: k ? 0.05 : 0.022, ease: 'none' }, t);
      else tl.to(c.points, { backgroundColor: c.couleur, duration: 0.25, stagger: 0.02, ease: 'none' }, t);
      tl.to(lignes.filter(function (l) { return l.querySelector('.' + c.classe); }), { autoAlpha: 1, x: 0, duration: 0.4 }, t);
      t += k ? 0.2 : 0.8;
    });
    var autres = tous47.filter(function (p) { return CATEGORIES[0].points.indexOf(p) < 0; });
    tl.to(autres, { opacity: 0.3, duration: 0.4, ease: 'none' }, 5.2);
    tl.to(lignes.filter(function (l) { return !l.querySelector('.dv-repris'); }), { opacity: 0.45, duration: 0.4, ease: 'none' }, 5.2);
    tl.fromTo(CATEGORIES[0].points, { scale: 1 }, { scale: 1.12, duration: 0.18, stagger: 0.01, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, 5.25);
  } else {
    // Fourchette sur échelle log : la médiane, une vente sur deux, les ventes isolées, puis les ventes par an.
    var isoles = tous('.v3-isole');
    gsap.set($('v3Marque'), { scaleY: 0 });
    gsap.set($('v3Bande'), { scaleX: 0 });
    gsap.set(isoles, { scale: 0 });
    gsap.set([tous('.v3-label')[0], tous('.v3-isoles')[0], tous('.v3-graduations')[0], tous('.v3-titre-an')[0]], { autoAlpha: 0, y: 12 });
    gsap.set(tous('.v3-an span'), { scaleY: 0 });
    gsap.set(tous('.v3-an em'), { autoAlpha: 0 });
    tl.to(tous('.v3-graduations')[0], { autoAlpha: 1, y: 0, duration: 0.5 }, 2.5);
    tl.to($('v3Marque'), { scaleY: 1, duration: 0.5, ease: RESSORT }, 2.7);
    tl.to($('v3Bande'), { scaleX: 1, duration: 0.7 }, 3.1);
    tl.to(tous('.v3-label')[0], { autoAlpha: 1, y: 0, duration: 0.5 }, 3.3);
    tl.to(isoles, { scale: 1, duration: 0.45, stagger: 0.12, ease: RESSORT }, 3.9);
    tl.to(tous('.v3-isoles')[0], { autoAlpha: 1, y: 0, duration: 0.5 }, 4.0);
    tl.to(tous('.v3-titre-an')[0], { autoAlpha: 1, y: 0, duration: 0.5 }, 4.45);
    tl.to(tous('.v3-an span'), { scaleY: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out' }, 4.6);
    tl.to(tous('.v3-an em'), { autoAlpha: 1, duration: 0.3, stagger: 0.07, ease: 'none' }, 4.9);
  }

  // ---------- Sortie et appel à l'action : le point de l'étiquette devient le point du i ----------
  tl.to([$('surtitre'), $('grosNombre'), $('phrase'), visuel, $('source')], { autoAlpha: 0, y: -50, duration: 0.4, stagger: 0.04, ease: SORTIE }, 7.95);
  tl.to(pointVol, { scale: 1, duration: 0.35, ease: RESSORT }, 8.0);
  tl.to($('tag'), { autoAlpha: 0, duration: 0.25, ease: 'none' }, 8.1);
  tl.to($('logoPetit'), { autoAlpha: 0, duration: 0.3, ease: 'none' }, 8.0);
  tl.to($('voile'), { opacity: 0.78, duration: 0.6, ease: 'power1.inOut' }, 8.05);
  tl.to(carte, { flou: 0, duration: 0.6, ease: 'power1.inOut' }, 8.05);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 8.15);
  tl.to(pointVol, { width: 41.4, height: 41.4, marginLeft: -20.7, marginTop: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 8.15);
  tl.set(pointVol, { autoAlpha: 0 }, 8.75);
  O.finCta(tl, 8.75);
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
      var p = $('tagPoint'), q = O.positionDans(p, $('stage'));
      depart = { x: q.x + p.offsetWidth / 2, y: q.y + p.offsetHeight / 2 };
    }
  });
})();
