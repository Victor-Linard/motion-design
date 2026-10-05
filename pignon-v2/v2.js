/*
 * Pignon — vue d'ensemble, 29 s, 1080 x 1920 (9:16).
 * La carte, autour du point, le métier, les simulations, le comparateur avec l'IA, les rapports.
 */
(function () {
  'use strict';

  var DUREE = 29;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var STANDARD = O.STANDARD, RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function formater(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-mots-flux]').forEach(function (el) { O.decouperMots(el, 'flux'); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });

  // ---------- Carte, isochrone, concurrents ----------
  var ville = PignonCity.build();
  var cible = O.choisirLocal(ville, [820, 1130]);
  var reseau = ville.networkFrom(cible.cx, cible.cy);
  var ISO = 420;
  var BANDES = [{ part: 1, bati: '#e4f0ef', rue: '#88bdbc' }, { part: 0.66, bati: '#cce5e4', rue: '#4e9493' }, { part: 0.33, bati: '#a9d2d1', rue: '#086b6c' }];
  var batiIso = [];
  ville.lots.forEach(function (l) {
    if (!l.bld || l === cible || Math.hypot(l.cx - cible.cx, l.cy - cible.cy) > ISO) return;
    var best = Infinity;
    ville.corridors.forEach(function (C, e) {
      for (var i = 0; i < C.np - 1; i++) {
        var ax = C.pts[i * 2], ay = C.pts[i * 2 + 1], dx = C.pts[i * 2 + 2] - ax, dy = C.pts[i * 2 + 3] - ay;
        var L2 = dx * dx + dy * dy, u = L2 > 0 ? borner(((l.cx - ax) * dx + (l.cy - ay) * dy) / L2, 0, 1) : 0;
        var perp = Math.hypot(l.cx - (ax + dx * u), l.cy - (ay + dy * u));
        if (perp > 140) continue;
        var t = C.cum[i] + (C.cum[i + 1] - C.cum[i]) * u;
        var d = Math.min(reseau.dist[C.a] + t, reseau.dist[C.b] + (C.len - t));
        if (e === reseau.start.e) d = Math.min(d, Math.abs(t - reseau.start.t));
        if (d + perp < best) best = d + perp;
      }
    });
    if (best <= ISO) batiIso.push({ poly: l.bld, d: best });
  });
  function tracerIso(ctx, D) {
    ville.corridors.forEach(function (C, e) {
      var ra = D - reseau.dist[C.a], rb = D - reseau.dist[C.b];
      if (e === reseau.start.e) ville.traceCorRange(ctx, C, Math.max(0, reseau.start.t - D), Math.min(C.len, reseau.start.t + D));
      if (ra <= 0 && rb <= 0) return;
      if (ra + rb >= C.len) { ville.traceCor(ctx, e); return; }
      if (ra > 0) ville.traceCorRange(ctx, C, 0, ra);
      if (rb > 0) ville.traceCorRange(ctx, C, C.len - rb, C.len);
    });
  }
  var concurrents = [];
  (function () {
    var rnd = PignonCity.mulberry32(0xC0FFEE);
    var c = ville.lots.filter(function (l) { var d = Math.hypot(l.cx - cible.cx, l.cy - cible.cy); return l.bld && l !== cible && d > 110 && d < 330; });
    for (var i = c.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = c[i]; c[i] = c[j]; c[j] = t; }
    c.forEach(function (l) { if (concurrents.length < 9 && concurrents.every(function (o) { return Math.hypot(o.x - l.cx, o.y - l.cy) > 95; })) concurrents.push({ x: l.cx, y: l.cy, p: 0 }); });
  })();
  var ancreIso = [cible.cx + 150, cible.cy - 150], ancreConc = [concurrents[0].x, concurrents[0].y];
  ville.nodes.forEach(function (n, i) {
    var d = reseau.dist[i];
    if (d > ISO * 0.55 && d < ISO * 0.7) { var w = ville.warp(n.x, n.y); if ((w[0] - cible.cx) - 1.4 * (w[1] - cible.cy) > (ancreIso[0] - cible.cx) - 1.4 * (ancreIso[1] - cible.cy)) ancreIso = w; }
  });
  concurrents.forEach(function (c) { if (-(c.x - cible.cx) + (c.y - cible.cy) > -(ancreConc[0] - cible.cx) + (ancreConc[1] - cible.cy)) ancreConc = [c.x, c.y]; });

  var cam = { x: cible.cx, y: cible.cy, s: 1.5, ax: 540, ay: 1250 };
  var carte = { surbrillance: 0, iso: 0, calques: 1, flou: 0 };
  var vol = { u: 0 }, pointI = { x: 540, y: 620 };
  function versEcran(x, y) { return [cam.ax + (x - cam.x) * cam.s, cam.ay + (y - cam.y) * cam.s]; }

  var canvas = $('map'), ctx = canvas.getContext('2d');
  function dessiner(t) {
    var D = carte.iso * ISO;
    O.dessinerVille(ctx, ville, cam, t, {
      cible: cible, surbrillance: carte.surbrillance,
      apresBati: function (c) {
        if (D <= 0 || carte.calques <= 0) return;
        batiIso.forEach(function (b) {
          if (b.d > D) return;
          var k = b.d <= BANDES[2].part * ISO ? 2 : b.d <= BANDES[1].part * ISO ? 1 : 0;
          c.globalAlpha = carte.calques * borner((D - b.d) / 45, 0, 1);
          c.fillStyle = BANDES[k].bati;
          c.beginPath(); ville.tracePoly(c, b.poly); c.fill();
        });
        c.globalAlpha = 1;
      }
    });
    var s = cam.s;
    if (D > 0 && carte.calques > 0) {
      ctx.globalAlpha = carte.calques;
      BANDES.forEach(function (B) {
        var Dh = Math.min(D, B.part * ISO);
        ctx.strokeStyle = B.rue; ctx.lineWidth = 6.5;
        ctx.beginPath(); tracerIso(ctx, Dh); ctx.stroke();
      });
      concurrents.forEach(function (co) {
        if (co.p <= 0.001) return;
        var r = 13 / s * co.p, b = 5 / s * co.p;
        ctx.fillStyle = '#fefbf9'; ctx.beginPath(); ctx.arc(co.x, co.y, r + b, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a55535'; ctx.beginPath(); ctx.arc(co.x, co.y, r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  }

  var pin = $('pin'), pIso = $('pastilleIso'), pConc = $('pastilleConcurrents');
  var compteurs = [{ el: $('nCession'), v: 0 }, { el: $('nCa'), v: 0 }, { el: $('nRes'), v: 0 }];
  function placer(el, m) {
    var p = versEcran(m[0], m[1]), demi = el.offsetWidth / 2;
    el.style.left = borner(p[0], 84 + demi, 996 - demi).toFixed(2) + 'px';
    el.style.top = p[1].toFixed(2) + 'px';
  }
  function maj(t) {
    dessiner(t);
    var p = versEcran(cible.cx, cible.cy);
    if (vol.u > 0) {
      var u = vol.u, v = 1 - u, kx = Math.min(p[0], pointI.x) - 150, ky = Math.min(p[1], pointI.y) - 120;
      p = [v * v * p[0] + 2 * v * u * kx + u * u * pointI.x, v * v * p[1] + 2 * v * u * ky + u * u * pointI.y];
    }
    pin.style.transform = 'translate(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px)';
    placer(pIso, ancreIso);
    placer(pConc, ancreConc);
    compteurs.forEach(function (k) { k.el.textContent = formater(k.v); });
    canvas.style.filter = carte.flou > 0.05 ? 'blur(' + carte.flou.toFixed(2) + 'px)' : 'none';
  }

  // ---------- États initiaux ----------
  O.etatsInitiaux();
  var titres = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return $('titre' + i); });
  var cartes = ['carteSurvie', 'carteCession', 'carteDevenir', 'carteSimu', 'carteComparer', 'carteRapport'].map($);
  var nav = $('nav'), items = [0, 1, 2, 3, 4].map(function (i) { return $('na' + i); });
  var pinPoint = $('pinPoint');
  gsap.set(cartes.concat([$('bulleIA')]), { autoAlpha: 0, y: 80 });
  gsap.set(nav, { autoAlpha: 0, y: -16 });
  gsap.set($('naCurseur'), { scale: 0 });
  gsap.set(pinPoint, { scale: 0 });
  gsap.set($('onde1'), { scale: 1, opacity: 0 });
  gsap.set([pIso, pConc], { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.6 });
  gsap.set($('outilsLigne'), { autoAlpha: 0, y: 40 });
  gsap.set(tous('#outilsLigne .ol-item'), { scale: 0.8, autoAlpha: 0 });
  gsap.set(tous('#carteSurvie .plein'), { scaleX: 0 });
  gsap.set(tous('#carteSurvie .val'), { opacity: 0 });
  gsap.set($('bandeCession'), { scaleX: 0 });
  gsap.set($('marqueCession'), { scaleY: 0 });
  gsap.set(tous('#barreDevenir span'), { scaleX: 0 });
  gsap.set(tous('#carteDevenir .devenir-legende p'), { autoAlpha: 0, x: -16 });
  gsap.set(tous('#carteSimu .facteur, #carteSimu .fois'), { autoAlpha: 0, scale: 0.7 });
  gsap.set([$('lCa'), $('lRes'), $('seuil')], { autoAlpha: 0, y: 16 });
  gsap.set(tous('#carteComparer .ci-ligne'), { autoAlpha: 0, x: -20, '--surligne': 0 });
  gsap.set(tous('#bulleIA .flux'), { opacity: 0 });
  gsap.set(tous('#carteRapport .rapport-sections p'), { autoAlpha: 0, x: -20 });
  gsap.set([$('lien'), $('sansCompte')], { autoAlpha: 0, y: 16 });

  // ---------- Timeline ----------
  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
  var T = O.titres(tl);
  function entrer(el, t) { tl.to(el, { autoAlpha: 1, y: 0, duration: 0.7 }, t); }
  function sortir(el, t) { tl.to(el, { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE }, t); }
  function navVers(i, t) {
    tl.to($('naCurseur'), { x: i * 72, scale: 1, duration: 0.5, ease: CAMERA }, t);
    items.forEach(function (it, k) { tl.to(it, { color: k === i ? '#fefbf9' : '#807973', duration: 0.25, ease: 'none' }, t + 0.15); });
  }

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);

  // 0 — Accroche
  T.entrer(titres[0], 0);
  tl.to(cam, { s: 1.85, duration: 2.6, ease: 'sine.inOut' }, 0);
  tl.to(nav, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.5);
  T.sortir(titres[0], 2.35);

  // 1 — La carte : cliquer une adresse, chances de survie du métier
  navVers(0, 2.4);
  tl.to(cam, { ay: 700, s: 2.25, duration: 0.85, ease: CAMERA }, 2.4);
  tl.to($('fonduHaut'), { height: 640, duration: 0.7, ease: CAMERA }, 2.45);
  T.entrer(titres[1], 2.65);
  tl.to(carte, { surbrillance: 1, duration: 0.3, ease: 'none' }, 3.1);
  tl.to(pinPoint, { scale: 1, duration: 0.55, ease: RESSORT }, 3.1);
  tl.fromTo($('onde1'), { scale: 1, opacity: 0.7 }, { scale: 3.2, opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 3.2);
  entrer(cartes[0], 3.3);
  tl.to(tous('#carteSurvie .plein'), { scaleX: 1, duration: 0.7, stagger: 0.15, ease: 'power2.out' }, 3.7);
  tl.to(tous('#carteSurvie .val'), { opacity: 1, duration: 0.3, stagger: 0.15, ease: 'none' }, 3.9);
  T.sortir(titres[1], 6.2);
  tl.to(cartes[0], { autoAlpha: 0, y: 60, duration: 0.4, ease: SORTIE }, 6.2);

  // 2 — Autour du point : isochrone, concurrents, outils
  tl.to(cam, { ay: 980, s: 1.3, duration: 1.0, ease: CAMERA }, 6.3);
  tl.to($('fonduHaut'), { height: 760, duration: 0.7, ease: CAMERA }, 6.3);
  T.entrer(titres[2], 6.5);
  tl.to(carte, { iso: 1, duration: 1.5, ease: 'power1.out' }, 6.75);
  tl.to(concurrents, { p: 1, duration: 0.5, stagger: 0.06, ease: RESSORT }, 7.2);
  tl.to(pIso, { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 7.5);
  tl.to(pConc, { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 7.7);
  tl.to($('outilsLigne'), { autoAlpha: 1, y: 0, duration: 0.5 }, 7.6);
  tl.to(tous('#outilsLigne .ol-item'), { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.08, ease: RESSORT }, 7.65);
  T.sortir(titres[2], 9.8);
  tl.to([pIso, pConc, $('outilsLigne')], { autoAlpha: 0, duration: 0.3, ease: 'none' }, 9.8);
  tl.to(pinPoint, { scale: 0, duration: 0.3, ease: SORTIE }, 9.8);

  // 3 — Votre métier : prix de cession, devenir des commerces fermés
  tl.to($('voile'), { opacity: 0.85, duration: 0.5, ease: 'power1.inOut' }, 9.85);
  tl.to(carte, { flou: 6, calques: 0, surbrillance: 0, duration: 0.5, ease: 'power1.inOut' }, 9.85);
  T.entrer(titres[3], 10.05);
  entrer(cartes[1], 10.2);
  tl.to(compteurs[0], { v: 225, duration: 0.9, ease: 'power2.out' }, 10.35);
  tl.to($('marqueCession'), { scaleY: 1, duration: 0.45, ease: RESSORT }, 10.6);
  tl.to($('bandeCession'), { scaleX: 1, duration: 0.6 }, 10.7);
  entrer(cartes[2], 10.55);
  tl.to(tous('#barreDevenir span'), { scaleX: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' }, 10.95);
  tl.to(tous('#carteDevenir .devenir-legende p'), { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.08 }, 11.3);
  T.sortir(titres[3], 13.85);
  sortir(cartes[1], 13.85);
  sortir(cartes[2], 13.9);

  // 4 — Simulations : clients × panier × jours, résultat, seuil
  navVers(2, 13.95);
  T.entrer(titres[4], 14.1);
  entrer(cartes[3], 14.2);
  tl.to(tous('#carteSimu .facteur, #carteSimu .fois'), { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.09, ease: RESSORT }, 14.5);
  tl.to($('lCa'), { autoAlpha: 1, y: 0, duration: 0.5 }, 15.15);
  tl.to(compteurs[1], { v: 296100, duration: 0.9, ease: 'power2.out' }, 15.2);
  tl.to($('lRes'), { autoAlpha: 1, y: 0, duration: 0.5 }, 15.6);
  tl.to(compteurs[2], { v: 96348, duration: 0.9, ease: 'power2.out' }, 15.65);
  tl.to($('seuil'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 16.2);
  T.sortir(titres[4], 18.3);
  sortir(cartes[3], 18.3);

  // 5 — Comparateur et Insights IA
  navVers(1, 18.35);
  T.entrer(titres[5], 18.5);
  entrer(cartes[4], 18.6);
  tl.to(tous('#carteComparer .ci-ligne'), { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.1 }, 18.85);
  tl.to($('cmpParking'), { '--surligne': 1, duration: 0.35 }, 19.6);
  entrer($('bulleIA'), 19.3);
  tl.to(tous('#bulleIA .flux'), { opacity: 1, duration: 0.1, stagger: 0.034, ease: 'none' }, 19.6);
  T.sortir(titres[5], 21.95);
  sortir(cartes[4], 21.95);
  sortir($('bulleIA'), 22.0);

  // 6 — Rapports : un dossier, un lien, lisible sans compte
  navVers(3, 22.05);
  T.entrer(titres[6], 22.2);
  entrer(cartes[5], 22.3);
  tl.to(tous('#carteRapport .rapport-sections p'), { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.16 }, 22.65);
  tl.to(tous('#carteRapport .coche'), { scale: 1.2, duration: 0.12, stagger: 0.16, yoyo: true, repeat: 1 }, 22.8);
  tl.to($('lien'), { autoAlpha: 1, y: 0, duration: 0.5 }, 23.45);
  tl.to($('sansCompte'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 23.85);
  T.sortir(titres[6], 25.5);
  sortir(cartes[5], 25.5);

  // 7 — Appel à l'action : le point de la carte devient le point du i
  tl.to([nav, $('logoPetit')], { autoAlpha: 0, duration: 0.3, ease: 'none' }, 25.5);
  tl.to($('voile'), { opacity: 0.78, duration: 0.6, ease: 'power1.inOut' }, 25.55);
  tl.to(carte, { flou: 0, duration: 0.6, ease: 'power1.inOut' }, 25.55);
  tl.to($('fonduHaut'), { height: 0, duration: 0.6, ease: 'power1.inOut' }, 25.55);
  tl.to(cam, { x: 760, y: 1150, ax: 540, ay: 960, s: 1.1, duration: 3.2, ease: 'sine.inOut' }, 25.6);
  tl.to(pinPoint, { scale: 1, duration: 0.4, ease: RESSORT }, 25.95);
  tl.fromTo($('onde1'), { scale: 1, opacity: 0.7 }, { scale: 3.2, opacity: 0, duration: 0.6, ease: 'power2.out', immediateRender: false }, 25.98);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 26.18);
  tl.to(pinPoint, { width: 41.4, height: 41.4, left: -20.7, top: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px, rgba(0, 73, 74, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 26.18);
  tl.set(pin, { autoAlpha: 0 }, 26.78);
  O.finCta(tl, 26.78);
  tl.set({}, {}, DUREE);

  function allerA(t) {
    t = borner(t, 0, DUREE);
    tl.seek(t, true);
    maj(t);
    return t;
  }
  O.piloter({ duree: DUREE, allerA: allerA, preparer: function () { pointI = O.mesurerCta(); } });
})();
