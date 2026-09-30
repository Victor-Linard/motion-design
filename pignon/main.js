/*
 * Pignon — motion design 15 s, 1080 x 1920 (9:16).
 * Une timeline GSAP en pause porte toute l'animation ; window.__seek(t) la positionne
 * et redessine la carte, ce qui rend chaque image reproductible (rendu image par image).
 */
(function () {
  'use strict';

  var DUREE = 15;
  var L = 1080, H = 1920, MARGE = 84;
  var params = new URLSearchParams(location.search);
  var RENDU = params.has('render');
  if (RENDU) document.body.classList.add('render');

  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }

  var O = window.PignonOutils;
  var STANDARD = O.STANDARD, RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE;
  var decouperMots = O.decouperMots, decouperCaracteres = O.decouperCaracteres;
  tous('[data-mots]').forEach(function (el) { decouperMots(el); });
  tous('[data-mots-flux]').forEach(function (el) { decouperMots(el, 'flux'); });
  tous('[data-frappe]').forEach(function (el) { decouperCaracteres(el); });

  // ---------- Frise « Huit ouvertures depuis 1992 » ----------
  // Illustrative, cohérente avec les textes du site : 8 ouvertures depuis 1992, la plus durable
  // 12 ans, 4 fermées avant 2 ans, 7 depuis 2004 dont une de près de 10 ans.
  var FRISE = {
    debut: 1990, fin: 2026,
    periodes: [
      [1992.0, 2004.0, 'tenu'], [2004.3, 2005.8, 'court'], [2006.2, 2007.4, 'court'], [2007.9, 2017.4, 'tenu'],
      [2017.9, 2019.2, 'court'], [2019.6, 2021.1, 'court'], [2021.5, 2023.6, 'tenu'], [2024.0, 2026.0, 'actif']
    ],
    annees: [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025]
  };
  var frise = $('frise');
  function pctAnnee(a) { return ((a - FRISE.debut) / (FRISE.fin - FRISE.debut)) * 100; }
  var barresFrise = FRISE.periodes.map(function (p) {
    var b = document.createElement('span');
    b.className = 'frise-barre frise-barre--' + p[2];
    b.style.left = pctAnnee(p[0]) + '%';
    b.style.width = (pctAnnee(p[1]) - pctAnnee(p[0])) + '%';
    frise.appendChild(b);
    return b;
  });
  var reperesFrise = [];
  FRISE.annees.forEach(function (a) {
    var g = document.createElement('span');
    g.className = 'frise-graduation';
    g.style.left = pctAnnee(a) + '%';
    frise.appendChild(g);
    var l = document.createElement('span');
    l.className = 'frise-annee';
    l.style.left = pctAnnee(a) + '%';
    l.textContent = a;
    frise.appendChild(l);
    reperesFrise.push(g, l);
  });

  // ---------- Carte ----------
  var ville = PignonCity.build();
  var canvas = $('map');
  var ctx = canvas.getContext('2d');

  // Le local étudié : parcelle bâtie la plus proche d'un repère sur la grande avenue.
  var cible = null;
  (function choisirCible() {
    var repere = [820, 1130], meilleur = Infinity;
    ville.lots.forEach(function (l) {
      if (!l.bld || l.area < 1800 || l.area > 5200) return;
      var d = Math.hypot(l.cx - repere[0], l.cy - repere[1]);
      if (d < meilleur) { meilleur = d; cible = l; }
    });
  })();

  // Isochrone « à pied » calculée sur le réseau de rues (Dijkstra depuis le local).
  var reseau = ville.networkFrom(cible.cx, cible.cy);
  var ISO_MAX = 420;
  var BANDES = [
    { part: 1.00, bati: '#e4f0ef', rue: '#88bdbc' },
    { part: 0.66, bati: '#cce5e4', rue: '#4e9493' },
    { part: 0.33, bati: '#a9d2d1', rue: '#086b6c' }
  ];
  function distanceReseau(C, e, t) {
    var d = Math.min(reseau.dist[C.a] + t, reseau.dist[C.b] + (C.len - t));
    if (e === reseau.start.e) d = Math.min(d, Math.abs(t - reseau.start.t));
    return d;
  }
  // Chaque bâtiment prend la distance du point de rue le plus proche + le trajet jusqu'à lui.
  var batiIso = [];
  ville.lots.forEach(function (l) {
    if (!l.bld || l === cible || Math.hypot(l.cx - cible.cx, l.cy - cible.cy) > ISO_MAX) return;
    var meilleur = Infinity;
    for (var e = 0; e < ville.corridors.length; e++) {
      var C = ville.corridors[e];
      for (var i = 0; i < C.np - 1; i++) {
        var ax = C.pts[i * 2], ay = C.pts[i * 2 + 1], dx = C.pts[i * 2 + 2] - ax, dy = C.pts[i * 2 + 3] - ay;
        var L2 = dx * dx + dy * dy, u = L2 > 0 ? borner(((l.cx - ax) * dx + (l.cy - ay) * dy) / L2, 0, 1) : 0;
        var perp = Math.hypot(l.cx - (ax + dx * u), l.cy - (ay + dy * u));
        if (perp > 140) continue;
        var total = distanceReseau(C, e, C.cum[i] + (C.cum[i + 1] - C.cum[i]) * u) + perp;
        if (total < meilleur) meilleur = total;
      }
    }
    if (meilleur <= ISO_MAX) batiIso.push({ poly: l.bld, d: meilleur });
  });

  // Concurrents : parcelles bâties autour du point, tirage déterministe.
  var concurrents = [];
  (function choisirConcurrents() {
    var rnd = PignonCity.mulberry32(0xC0FFEE);
    var candidats = ville.lots.filter(function (l) {
      if (!l.bld || l === cible) return false;
      var d = Math.hypot(l.cx - cible.cx, l.cy - cible.cy);
      return d > 110 && d < 330;
    });
    for (var i = candidats.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var tmp = candidats[i]; candidats[i] = candidats[j]; candidats[j] = tmp; }
    for (var k = 0; k < candidats.length && concurrents.length < 9; k++) {
      var c = candidats[k];
      var libre = concurrents.every(function (o) { return Math.hypot(o.x - c.cx, o.y - c.cy) > 95; });
      if (libre) concurrents.push({ x: c.cx, y: c.cy, p: 0 });
    }
  })();

  // Ancres des pastilles posées sur la carte (coordonnées monde).
  var ancreIso = (function () {
    var meilleur = null, score = -Infinity;
    ville.nodes.forEach(function (n, i) {
      var d = reseau.dist[i];
      if (!(d > ISO_MAX * 0.55 && d < ISO_MAX * 0.7)) return;
      var w = ville.warp(n.x, n.y);
      var s = (w[0] - cible.cx) - 1.4 * (w[1] - cible.cy);
      if (s > score) { score = s; meilleur = w; }
    });
    return meilleur || [cible.cx + 160, cible.cy - 160];
  })();
  var ancreConcurrents = (function () {
    var meilleur = concurrents[0], score = -Infinity;
    concurrents.forEach(function (c) {
      var s = -(c.x - cible.cx) + (c.y - cible.cy);
      if (s > score) { score = s; meilleur = c; }
    });
    return [meilleur.x, meilleur.y];
  })();

  // Caméra : le point monde (x, y) est affiché au point écran (ax, ay), à l'échelle s.
  var cam = { x: cible.cx, y: cible.cy, s: 1.5, ax: 540, ay: 1250 };
  var carte = { surbrillance: 0, iso: 0, calques: 1, opacite: 1, flou: 0 };
  var vol = { u: 0 };

  function versEcran(x, y) { return [cam.ax + (x - cam.x) * cam.s, cam.ay + (y - cam.y) * cam.s]; }

  var COUL = {
    ilot: '#e7e1d9',
    rue: '#fcfaf7',
    ombre: 'rgba(23, 19, 16, 0.07)',
    bati: '#fefbf9',
    batiBord: 'rgba(69, 62, 58, 0.2)',
    cibleFond: '#fbe6de',
    cibleBord: '#a55535',
    passant: 'rgba(165, 85, 53, 0.6)'
  };

  function tracerIsochrone(D) {
    for (var e = 0; e < ville.corridors.length; e++) {
      var C = ville.corridors[e];
      var ra = D - reseau.dist[C.a], rb = D - reseau.dist[C.b];
      if (e === reseau.start.e) {
        ville.traceCorRange(ctx, C, Math.max(0, reseau.start.t - D), Math.min(C.len, reseau.start.t + D));
      }
      if (ra <= 0 && rb <= 0) continue;
      if (ra + rb >= C.len) { ville.traceCor(ctx, e); continue; }
      if (ra > 0) ville.traceCorRange(ctx, C, 0, ra);
      if (rb > 0) ville.traceCorRange(ctx, C, C.len - rb, C.len);
    }
  }
  function fronts(D) {
    var pts = [], p = [0, 0];
    for (var e = 0; e < ville.corridors.length; e++) {
      var C = ville.corridors[e];
      var ra = D - reseau.dist[C.a], rb = D - reseau.dist[C.b];
      if (ra + rb >= C.len) continue;
      if (ra > 0) { ville.corPoint(C, ra, p); pts.push(p[0], p[1]); }
      if (rb > 0) { ville.corPoint(C, C.len - rb, p); pts.push(p[0], p[1]); }
    }
    return pts;
  }

  function dessinerCarte(t) {
    var s = cam.s, i;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, L, H);
    ctx.setTransform(s, 0, 0, s, cam.ax - cam.x * s, cam.ay - cam.y * s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Îlots et rues
    ctx.fillStyle = COUL.ilot;
    ctx.beginPath();
    for (i = 0; i < ville.cells.length; i++) ville.tracePoly(ctx, ville.cells[i]);
    ctx.fill();
    ctx.strokeStyle = COUL.rue;
    for (var b = 0; b < ville.widthBuckets.length; b++) {
      var B = ville.widthBuckets[b];
      ctx.lineWidth = B.w;
      ctx.beginPath();
      for (var k = 0; k < B.list.length; k++) ville.traceCor(ctx, B.list[k]);
      ctx.stroke();
    }

    // Bâti : ombre portée légère puis emprises, comme les blocs de l'illustration du site
    ctx.save();
    ctx.translate(1.2 / s, 3.2 / s);
    ctx.fillStyle = COUL.ombre;
    ctx.beginPath();
    for (i = 0; i < ville.lots.length; i++) if (ville.lots[i].bld) ville.tracePoly(ctx, ville.lots[i].bld);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = COUL.bati;
    ctx.beginPath();
    for (i = 0; i < ville.lots.length; i++) if (ville.lots[i].bld) ville.tracePoly(ctx, ville.lots[i].bld);
    ctx.fill();

    // Isochrone : les bâtiments atteignables se teintent par bande de temps, les rues s'allument.
    var D = carte.iso * ISO_MAX;
    if (D > 0 && carte.calques > 0) {
      ctx.globalAlpha = carte.calques;
      for (i = 0; i < batiIso.length; i++) {
        var bi = batiIso[i];
        if (bi.d > D) continue;
        var bande = bi.d <= BANDES[2].part * ISO_MAX ? 2 : bi.d <= BANDES[1].part * ISO_MAX ? 1 : 0;
        ctx.globalAlpha = carte.calques * borner((D - bi.d) / 45, 0, 1);
        ctx.fillStyle = BANDES[bande].bati;
        ctx.beginPath();
        ville.tracePoly(ctx, bi.poly);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = COUL.batiBord;
    ctx.lineWidth = 1.3 / s;
    ctx.beginPath();
    for (i = 0; i < ville.lots.length; i++) if (ville.lots[i].bld) ville.tracePoly(ctx, ville.lots[i].bld);
    ctx.stroke();

    if (D > 0 && carte.calques > 0) {
      ctx.globalAlpha = carte.calques;
      for (var h = 0; h < BANDES.length; h++) {
        var Dh = Math.min(D, BANDES[h].part * ISO_MAX);
        if (Dh <= 0) continue;
        ctx.strokeStyle = BANDES[h].rue;
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        tracerIsochrone(Dh);
        ctx.stroke();
      }
      if (carte.iso < 1) {
        var f = fronts(D);
        ctx.fillStyle = '#00494a';
        ctx.beginPath();
        for (var q = 0; q < f.length; q += 2) { ctx.moveTo(f[q] + 6.5, f[q + 1]); ctx.arc(f[q], f[q + 1], 6.5, 0, Math.PI * 2); }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Le local étudié
    if (carte.surbrillance > 0) {
      ctx.globalAlpha = carte.surbrillance;
      ctx.fillStyle = COUL.cibleFond;
      ctx.strokeStyle = COUL.cibleBord;
      ctx.lineWidth = 4 / s;
      ctx.beginPath();
      ville.tracePoly(ctx, cible.bld);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Passants (motif du fond « rue » du site)
    var idx = t / ville.trackDt, i0 = Math.floor(idx), fr = idx - i0;
    var taille = 4.4;
    ctx.fillStyle = COUL.passant;
    ctx.beginPath();
    for (var a = 0; a < ville.tracks.length; a++) {
      var tr = ville.tracks[a], n = tr.length / 2 - 1;
      var j0 = Math.min(i0, n), j1 = Math.min(i0 + 1, n);
      var px = tr[j0 * 2] + (tr[j1 * 2] - tr[j0 * 2]) * fr;
      var py = tr[j0 * 2 + 1] + (tr[j1 * 2 + 1] - tr[j0 * 2 + 1]) * fr;
      ctx.rect(px - taille / 2, py - taille / 2, taille, taille);
    }
    ctx.fill();

    // Concurrents
    if (carte.calques > 0) {
      ctx.globalAlpha = carte.calques;
      for (var c = 0; c < concurrents.length; c++) {
        var co = concurrents[c];
        if (co.p <= 0.001) continue;
        var r = 13 / s * co.p, bord = 5 / s * co.p;
        ctx.fillStyle = 'rgba(23, 19, 16, 0.18)';
        ctx.beginPath(); ctx.arc(co.x, co.y + 3 / s, r + bord, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fefbf9';
        ctx.beginPath(); ctx.arc(co.x, co.y, r + bord, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a55535';
        ctx.beginPath(); ctx.arc(co.x, co.y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Éléments DOM suivis ----------
  var pin = $('pin');
  var pastilleIso = $('pastilleIso');
  var pastilleConcurrents = $('pastilleConcurrents');
  var pointI = { x: 540, y: 620 };
  var compteurs = [
    { el: $('compteur63'), v: 0 },
    { el: $('compteur10790'), v: 0 },
    { el: $('compteur3800'), v: 0 }
  ];
  function formater(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function placerPastille(el, monde) {
    var p = versEcran(monde[0], monde[1]);
    var demi = el.offsetWidth / 2;
    el.style.left = borner(p[0], MARGE + demi, L - MARGE - demi).toFixed(2) + 'px';
    el.style.top = p[1].toFixed(2) + 'px';
  }

  function maj(t) {
    dessinerCarte(t);
    var p = versEcran(cible.cx, cible.cy);
    if (vol.u > 0) {
      // Le point quitte la carte en arc et vient se poser sur le i du logo.
      var u = vol.u, v = 1 - u;
      var kx = Math.min(p[0], pointI.x) - 150, ky = Math.min(p[1], pointI.y) - 120;
      p = [v * v * p[0] + 2 * v * u * kx + u * u * pointI.x, v * v * p[1] + 2 * v * u * ky + u * u * pointI.y];
    }
    pin.style.transform = 'translate(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px)';
    placerPastille(pastilleIso, ancreIso);
    placerPastille(pastilleConcurrents, ancreConcurrents);
    compteurs.forEach(function (k) { k.el.textContent = formater(k.v); });
    canvas.style.opacity = carte.opacite.toFixed(3);
    canvas.style.filter = carte.flou > 0.05 ? 'blur(' + carte.flou.toFixed(2) + 'px)' : 'none';
  }

  // ---------- États initiaux ----------
  var titres = [0, 1, 2, 3, 4].map(function (i) { return $('titre' + i); });
  var cartes = ['carteSurvie', 'carteHisto', 'carteChiffres', 'carteComparer', 'carteChat'].map($);
  var pinPoint = $('pinPoint');
  gsap.set(titres, { autoAlpha: 0 });
  gsap.set(tous('.car'), { opacity: 0 });
  gsap.set(tous('.mot-in'), { yPercent: 118 });
  gsap.set(cartes, { autoAlpha: 0, y: 90 });
  gsap.set(pinPoint, { scale: 0 });
  gsap.set([$('onde1'), $('onde2')], { scale: 1, opacity: 0 });
  gsap.set($('pinTape'), { scale: 1.5, opacity: 0 });
  gsap.set($('pinEtiquette'), { xPercent: -50, autoAlpha: 0, y: 18 });
  gsap.set([pastilleIso, pastilleConcurrents], { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.6 });
  gsap.set($('bande63'), { scaleX: 0 });
  gsap.set($('marque63'), { scaleY: 0 });
  gsap.set($('badgeMarge'), { autoAlpha: 0, scale: 0.7 });
  gsap.set(barresFrise, { scaleX: 0 });
  gsap.set(reperesFrise, { opacity: 0 });
  gsap.set(tous('#carteComparer .cmp-barre, #carteComparer .cmp-bande'), { scaleX: 0 });
  gsap.set(tous('#carteComparer .cmp-marque'), { scaleY: 0 });
  gsap.set(tous('#carteComparer .cmp-valeur'), { opacity: 0 });
  gsap.set($('verdict'), { autoAlpha: 0, scale: 0.7, transformOrigin: '0% 50%' });
  gsap.set([$('quiMoi'), $('quiIA')], { opacity: 0 });
  gsap.set($('bulleMoi'), { autoAlpha: 0, scale: 0.8 });
  gsap.set($('bulleAttente'), { autoAlpha: 0, scale: 0.6 });
  gsap.set($('bulleIA'), { autoAlpha: 0, scale: 0.96 });
  gsap.set(tous('#bulleIA .flux'), { opacity: 0 });
  gsap.set($('logoPoint'), { scale: 0 });
  gsap.set($('logoTige'), { scaleY: 0 });
  gsap.set($('logoP'), { xPercent: 105 });
  gsap.set($('logoGnon'), { xPercent: -105 });
  gsap.set($('ctaBouton'), { xPercent: -50, autoAlpha: 0, scale: 0.85 });
  gsap.set($('ctaOnde'), { xPercent: -50, opacity: 0 });
  gsap.set([$('ctaSous'), $('ctaUrl')], { autoAlpha: 0, y: 22 });

  // ---------- Timeline ----------
  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });

  // Un titre sort en 0,4 s ; le suivant entre 0,3 s plus tard, sans chevauchement.
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
  function entrerCarte(el, t) { tl.to(el, { autoAlpha: 1, y: 0, duration: 0.75 }, t); }
  function sortirCarte(el, t, versLeHaut) { tl.to(el, { autoAlpha: 0, y: versLeHaut ? -70 : 70, duration: 0.4, ease: SORTIE }, t); }
  function ondes(t) {
    tl.fromTo($('onde1'), { scale: 1, opacity: 0.7 }, { scale: 3.4, opacity: 0, duration: 1.0, ease: 'power2.out', immediateRender: false }, t);
    tl.fromTo($('onde2'), { scale: 1, opacity: 0.6 }, { scale: 3.4, opacity: 0, duration: 1.0, ease: 'power2.out', immediateRender: false }, t + 0.28);
  }

  // Fond : halos qui dérivent lentement
  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);

  // 0 — Accroche : « Chaque adresse a quelque chose à cacher. »
  tl.to(cam, { s: 1.82, duration: 2.2, ease: 'sine.inOut' }, 0);
  entrerTitre(titres[0], 0);
  tl.to($('pinTape'), { scale: 1, opacity: 0.9, duration: 0.25, ease: 'power2.out' }, 1.05);
  tl.to($('pinTape'), { scale: 0.8, opacity: 0, duration: 0.35, ease: 'power1.in' }, 1.32);
  tl.to(carte, { surbrillance: 1, duration: 0.4, ease: 'none' }, 1.3);
  tl.to(pinPoint, { scale: 1, duration: 0.6, ease: RESSORT }, 1.3);
  ondes(1.42);
  tl.to($('pinEtiquette'), { autoAlpha: 1, y: 0, duration: 0.55 }, 1.55);
  sortirTitre(titres[0], 2.1);

  // 1 — L'adresse : survie du métier + historique du local
  tl.to(cam, { ay: 610, s: 2.35, duration: 0.85, ease: CAMERA }, 2.1);
  tl.to($('fonduHaut'), { height: 600, duration: 0.7, ease: CAMERA }, 2.15);
  entrerTitre(titres[1], 2.4);
  entrerCarte(cartes[0], 2.7);
  tl.to(compteurs[0], { v: 63, duration: 0.85, ease: 'power2.out' }, 2.8);
  tl.to($('marque63'), { scaleY: 1, duration: 0.5, ease: RESSORT }, 2.95);
  tl.to($('bande63'), { scaleX: 1, duration: 0.6 }, 3.05);
  tl.to($('badgeMarge'), { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 3.5);
  entrerCarte(cartes[1], 2.9);
  tl.to(reperesFrise, { opacity: 1, duration: 0.3, stagger: 0.02, ease: 'none' }, 3.1);
  tl.to(barresFrise, { scaleX: 1, duration: 0.35, stagger: 0.085, ease: 'power2.out' }, 3.2);
  tl.to($('pinEtiquette'), { autoAlpha: 0, y: -12, duration: 0.3, ease: SORTIE }, 4.5);
  sortirCarte(cartes[0], 4.55);
  sortirCarte(cartes[1], 4.6);
  sortirTitre(titres[1], 4.55);

  // 2 — Autour du point : isochrone, concurrents, chiffres du quartier
  tl.to(cam, { ay: 1010, s: 1.3, duration: 1.1, ease: CAMERA }, 4.6);
  tl.to(cam, { s: 1.25, duration: 1.3, ease: 'sine.inOut' }, 5.7);
  tl.to($('fonduHaut'), { height: 790, duration: 0.7, ease: CAMERA }, 4.7);
  entrerTitre(titres[2], 4.85);
  ondes(5.1);
  tl.to(carte, { iso: 1, duration: 1.5, ease: 'power1.out' }, 5.1);
  tl.to(concurrents, { p: 1, duration: 0.5, stagger: 0.07, ease: RESSORT }, 5.6);
  tl.to(pastilleIso, { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 5.9);
  tl.to(pastilleConcurrents, { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 6.1);
  entrerCarte(cartes[2], 5.55);
  tl.to(compteurs[1], { v: 10790, duration: 0.8, ease: 'power2.out' }, 5.65);
  tl.to(compteurs[2], { v: 3800, duration: 0.8, ease: 'power2.out' }, 5.72);
  tl.to([pastilleIso, pastilleConcurrents], { autoAlpha: 0, scale: 0.8, duration: 0.3, ease: SORTIE }, 7.0);
  sortirCarte(cartes[2], 7.0);
  sortirTitre(titres[2], 7.0);

  // 3 — Comparateur (la carte passe sous un voile)
  tl.to(pinPoint, { scale: 0, duration: 0.3, ease: SORTIE }, 7.0);
  tl.to($('voile'), { opacity: 0.8, duration: 0.5, ease: 'power1.inOut' }, 7.0);
  tl.to(carte, { flou: 7, duration: 0.5, ease: 'power1.inOut' }, 7.0);
  tl.to(carte, { calques: 0, duration: 0.5, ease: 'none' }, 7.3);
  tl.to(cam, { s: 1.12, duration: 4.8, ease: 'sine.inOut' }, 7.0);
  entrerTitre(titres[3], 7.3);
  entrerCarte(cartes[3], 7.45);
  tous('#carteComparer .cmp-ligne').forEach(function (ligne, i) {
    var t0 = 7.7 + i * 0.2;
    tl.to(tous('.cmp-marque', ligne), { scaleY: 1, duration: 0.45, stagger: 0.08, ease: RESSORT }, t0);
    tl.to(tous('.cmp-bande, .cmp-barre', ligne), { scaleX: 1, duration: 0.6, stagger: 0.08 }, t0 + 0.05);
    tl.to(tous('.cmp-valeur', ligne), { opacity: 1, duration: 0.3, stagger: 0.08, ease: 'none' }, t0 + 0.2);
  });
  tl.to($('verdict'), { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 8.45);
  sortirCarte(cartes[3], 9.3, true);
  sortirTitre(titres[3], 9.3);

  // 4 — Assistant
  entrerTitre(titres[4], 9.6);
  entrerCarte(cartes[4], 9.68);
  tl.to($('quiMoi'), { opacity: 1, duration: 0.3, ease: 'none' }, 9.8);
  tl.to($('bulleMoi'), { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 9.8);
  tl.to($('quiIA'), { opacity: 1, duration: 0.3, ease: 'none' }, 10.12);
  tl.to($('bulleAttente'), { autoAlpha: 1, scale: 1, duration: 0.35, ease: RESSORT }, 10.12);
  tl.fromTo(tous('#bulleAttente i'), { y: 0 }, { y: -9, duration: 0.13, stagger: 0.06, yoyo: true, repeat: 1, ease: 'sine.inOut', immediateRender: false }, 10.18);
  tl.to($('bulleAttente'), { autoAlpha: 0, scale: 0.6, duration: 0.15, ease: SORTIE }, 10.46);
  tl.to($('bulleIA'), { autoAlpha: 1, scale: 1, duration: 0.4 }, 10.48);
  tl.to(tous('#bulleIA .flux'), { opacity: 1, duration: 0.1, stagger: 0.03, ease: 'none' }, 10.5);
  sortirCarte(cartes[4], 11.62, true);
  sortirTitre(titres[4], 11.62);

  // 5 — Appel à l'action : le point de la carte devient le point du i de Pignon
  tl.to($('logoPetit'), { opacity: 0, duration: 0.3, ease: 'none' }, 11.7);
  tl.to($('voile'), { opacity: 0.78, duration: 0.8, ease: 'power1.inOut' }, 11.75);
  tl.to(carte, { flou: 0, surbrillance: 0, duration: 0.8, ease: 'power1.inOut' }, 11.75);
  tl.to($('fonduHaut'), { height: 0, duration: 0.8, ease: 'power1.inOut' }, 11.75);
  tl.to(cam, { x: 760, y: 1150, ax: 540, ay: 960, s: 1.1, duration: 3.2, ease: 'sine.inOut' }, 11.8);
  tl.to(pinPoint, { scale: 1, duration: 0.4, ease: RESSORT }, 11.95);
  tl.fromTo($('onde1'), { scale: 1, opacity: 0.7 }, { scale: 3.2, opacity: 0, duration: 0.7, ease: 'power2.out', immediateRender: false }, 11.98);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 12.18);
  tl.to(pinPoint, { width: 41.4, height: 41.4, left: -20.7, top: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px, rgba(0, 73, 74, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 12.18);
  tl.set(pin, { autoAlpha: 0 }, 12.78);
  tl.set($('logoPoint'), { scale: 1 }, 12.78);
  tl.to($('logoTige'), { scaleY: 1, duration: 0.5, ease: RESSORT }, 12.7);
  tl.to($('logoP'), { xPercent: 0, duration: 0.75 }, 12.8);
  tl.to($('logoGnon'), { xPercent: 0, duration: 0.75 }, 12.8);
  tl.to(tous('.cta-ligne .mot-in'), { yPercent: 0, duration: 0.8, stagger: 0.05 }, 13.1);
  tl.to($('ctaBouton'), { autoAlpha: 1, scale: 1, duration: 0.6, ease: RESSORT }, 13.5);
  tl.to([$('ctaSous'), $('ctaUrl')], { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 13.68);
  tl.fromTo($('ctaOnde'), { scale: 1, opacity: 0.75 }, { scale: 1.2, opacity: 0, duration: 0.65, ease: 'power2.out', immediateRender: false }, 14.1);
  tl.fromTo($('ctaOnde'), { scale: 1, opacity: 0.75 }, { scale: 1.2, opacity: 0, duration: 0.65, ease: 'power2.out', immediateRender: false }, 14.42);
  tl.fromTo($('ctaFleche'), { x: 0 }, { x: 10, duration: 0.2, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, 14.1);
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
    pointI = { x: pos.x + point.offsetWidth / 2, y: pos.y + point.offsetHeight / 2 };
  }

  O.piloter({ duree: DUREE, allerA: allerA, preparer: preparer });
})();
