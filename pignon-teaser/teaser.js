/*
 * Pignon — teaser, 10 s, 1080 x 1920 (9:16). Sans interface : la ville, le point qui cherche
 * son local dans les rues, s'arrête deux fois, le trouve, puis devient le point du i.
 * Accroche et phrase finale reprises du site.
 */
(function () {
  'use strict';

  var DUREE = 10;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function melanger(a, b, k) { return a + (b - a) * k; }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });

  // ---------- Ville, local, itinéraire dans les rues ----------
  var ville = PignonCity.build();
  var cible = O.choisirLocal(ville, [820, 1130]);
  var reseau = ville.networkFrom(cible.cx, cible.cy);
  var C0 = ville.corridors[reseau.start.e];
  var CENTRE = [760, 1200];

  // Départ : un carrefour à 850-1100 de rues du local, loin de lui à vol d'oiseau mais pas au bord de la ville.
  var depart = -1, meilleurScore = -Infinity;
  ville.nodes.forEach(function (n, i) {
    var d = reseau.dist[i];
    if (d < 850 || d > 1100) return;
    var w = ville.warp(n.x, n.y);
    if (Math.hypot(w[0] - CENTRE[0], w[1] - CENTRE[1]) > 560) return;
    var score = Math.hypot(w[0] - cible.cx, w[1] - cible.cy);
    if (score > meilleurScore) { meilleurScore = score; depart = i; }
  });

  // Plus court chemin (descente des distances réseau), puis le bout de rue devant le local, puis le local.
  var pts = [];
  function pousser(x, y) {
    var n = pts.length;
    if (n && Math.hypot(pts[n - 1][0] - x, pts[n - 1][1] - y) < 0.5) return;
    pts.push([x, y]);
  }
  (function () {
    var u = depart, garde = 0, k;
    while (u !== C0.a && u !== C0.b && garde++ < 400) {
      var choix = null;
      ville.nodes[u].adj.forEach(function (a) {
        var d = reseau.dist[a.n] + ville.corridors[a.e].len;
        if (!choix || d < choix.d) choix = { d: d, n: a.n, e: a.e };
      });
      var C = ville.corridors[choix.e];
      if (C.a === u) for (k = 0; k < C.np; k++) pousser(C.pts[k * 2], C.pts[k * 2 + 1]);
      else for (k = C.np - 1; k >= 0; k--) pousser(C.pts[k * 2], C.pts[k * 2 + 1]);
      u = choix.n;
    }
    var t = reseau.start.t, p = [0, 0];
    if (u === C0.a) { for (k = 0; k < C0.np && C0.cum[k] < t; k++) pousser(C0.pts[k * 2], C0.pts[k * 2 + 1]); }
    else { for (k = C0.np - 1; k >= 0 && C0.cum[k] > t; k--) pousser(C0.pts[k * 2], C0.pts[k * 2 + 1]); }
    ville.corPoint(C0, t, p);
    pousser(p[0], p[1]);
  })();
  var cum = [0], i;
  for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  var L_RUE = cum[cum.length - 1];
  pts.push([cible.cx, cible.cy]);
  cum.push(L_RUE + Math.hypot(cible.cx - pts[pts.length - 2][0], cible.cy - pts[pts.length - 2][1]));
  var L = cum[cum.length - 1];
  function pointA(s, out) {
    s = borner(s, 0, L);
    var lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    var f = cum[hi] > cum[lo] ? (s - cum[lo]) / (cum[hi] - cum[lo]) : 0;
    out[0] = pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f;
    out[1] = pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f;
    return out;
  }

  // Bâtiments balayés au passage du point : plus ils sont proches, plus ils s'éclairent.
  var BALAYAGE = 140, tmp = [0, 0], eclaires = [];
  ville.lots.forEach(function (l) {
    if (!l.bld || l === cible) return;
    var best = Infinity, sBest = 0;
    for (var s = 0; s <= L_RUE; s += 6) {
      pointA(s, tmp);
      var d = Math.hypot(tmp[0] - l.cx, tmp[1] - l.cy);
      if (d < best) { best = d; sBest = s; }
    }
    if (best < BALAYAGE) eclaires.push({ poly: l.bld, k: 1 - best / BALAYAGE, s: sBest });
  });
  // Deux arrêts : le point examine un local voisin, puis repart.
  var ARRETS = [0.36, 0.7].map(function (f) { return f * L_RUE; });
  var candidats = ARRETS.map(function (s) {
    pointA(s, tmp);
    var lot = null, best = Infinity;
    ville.lots.forEach(function (l) {
      if (!l.bld || l === cible || l.area < 1500 || l.area > 6000) return;
      var d = Math.hypot(l.cx - tmp[0], l.cy - tmp[1]);
      if (d < best) { best = d; lot = l; }
    });
    return { lot: lot, p: 0 };
  });

  // ---------- Dessin ----------
  var voyage = { s: 0 }, camVoyage = { s: 0 };
  var cam = { x: 0, y: 0, s: 2.0, ax: 540, ay: 1240 };
  var carte = { surbrillance: 0, recul: 0, trace: 1 };
  var vol = { u: 0 }, pointI = { x: 540, y: 620 };
  var canvas = $('map'), ctx = canvas.getContext('2d'), pin = $('pin');
  var pDot = [0, 0], pCam = [0, 0];

  function maj(t) {
    pointA(camVoyage.s, pCam);
    cam.x = melanger(pCam[0], CENTRE[0], carte.recul);
    cam.y = melanger(pCam[1], CENTRE[1], carte.recul);
    pointA(voyage.s, pDot);
    O.dessinerVille(ctx, ville, cam, t, {
      cible: cible, surbrillance: carte.surbrillance,
      apresBati: function (c) {
        var attenue = 1 - carte.recul;
        c.fillStyle = '#cce5e4';
        eclaires.forEach(function (e) {
          if (voyage.s < e.s) return;
          var a = e.k * Math.exp(-(voyage.s - e.s) / 320) * borner((voyage.s - e.s) / 40, 0, 1) * attenue;
          if (a < 0.01) return;
          c.globalAlpha = a;
          c.beginPath(); ville.tracePoly(c, e.poly); c.fill();
        });
        candidats.forEach(function (k) {
          if (k.p <= 0.01) return;
          c.globalAlpha = k.p;
          c.fillStyle = '#b4dad9'; c.strokeStyle = '#086b6c'; c.lineWidth = 3 / cam.s;
          c.beginPath(); ville.tracePoly(c, k.lot.bld); c.fill(); c.stroke();
        });
        c.globalAlpha = 1;
      }
    });
    // Trace de l'itinéraire dans les rues
    var fin = Math.min(voyage.s, L_RUE);
    if (fin > 0 && carte.trace > 0) {
      ctx.globalAlpha = carte.trace;
      ctx.strokeStyle = '#4e9493';
      ctx.lineWidth = 7 / cam.s;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var j = 1; j < pts.length && cum[j] < fin; j++) ctx.lineTo(pts[j][0], pts[j][1]);
      pointA(fin, tmp);
      ctx.lineTo(tmp[0], tmp[1]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var p = [cam.ax + (pDot[0] - cam.x) * cam.s, cam.ay + (pDot[1] - cam.y) * cam.s];
    if (vol.u > 0) {
      var u = vol.u, v = 1 - u, kx = Math.min(p[0], pointI.x) - 150, ky = Math.min(p[1], pointI.y) - 120;
      p = [v * v * p[0] + 2 * v * u * kx + u * u * pointI.x, v * v * p[1] + 2 * v * u * ky + u * u * pointI.y];
    }
    pin.style.transform = 'translate(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px)';
  }

  // ---------- États initiaux ----------
  O.etatsInitiaux();
  var titre = $('titre0'), pinPoint = $('pinPoint'), ondes = [$('onde1'), $('onde2')];
  gsap.set(pinPoint, { scale: 0 });
  gsap.set(ondes, { scale: 1, opacity: 0 });

  // ---------- Timeline ----------
  var tl = gsap.timeline({ paused: true, defaults: { ease: O.STANDARD, duration: 0.7 } });
  function onde(el, t, echelle, duree) {
    tl.fromTo(el, { scale: 1, opacity: 0.75 }, { scale: echelle, opacity: 0, duration: duree, ease: 'power2.out', immediateRender: false }, t);
  }

  // Accroche (texte du site), sans surtitre
  tl.set(titre, { autoAlpha: 1 }, 0.2);
  tl.to(tous('.mot-in', titre), { yPercent: 0, duration: 0.8, stagger: 0.07 }, 0.25);
  tl.to(tous('.mot-in', titre), { yPercent: -118, duration: 0.32, stagger: 0.012, ease: SORTIE }, 4.0);
  tl.set(titre, { autoAlpha: 0 }, 4.45);

  // Le point part, s'arrête deux fois devant un local, repart, puis trouve le sien
  tl.to(pinPoint, { scale: 1, duration: 0.5, ease: RESSORT }, 0.1);
  tl.to(voyage, { s: ARRETS[0], duration: 1.4, ease: 'power1.inOut' }, 0.45);
  tl.to(voyage, { s: ARRETS[1], duration: 1.05, ease: 'power1.inOut' }, 2.25);
  tl.to(voyage, { s: L, duration: 1.05, ease: 'power2.inOut' }, 3.65);
  tl.to(camVoyage, { s: ARRETS[0], duration: 1.6, ease: 'sine.inOut' }, 0.55);
  tl.to(camVoyage, { s: ARRETS[1], duration: 1.25, ease: 'sine.inOut' }, 2.35);
  tl.to(camVoyage, { s: L, duration: 1.25, ease: 'sine.inOut' }, 3.75);
  [1.85, 3.3].forEach(function (t, k) {
    tl.to(candidats[k], { p: 1, duration: 0.18, ease: 'power1.out' }, t);
    tl.to(candidats[k], { p: 0, duration: 0.45, ease: 'power1.in' }, t + 0.32);
    onde(ondes[0], t + 0.02, 2.2, 0.5);
  });

  // Trouvé : le local s'allume
  tl.to(carte, { surbrillance: 1, duration: 0.35, ease: 'none' }, 4.62);
  tl.fromTo(pinPoint, { scale: 1 }, { scale: 1.25, duration: 0.16, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, 4.62);
  onde(ondes[0], 4.66, 3.4, 0.9);
  onde(ondes[1], 4.9, 3.4, 0.9);

  // Recul : toute la ville, un seul local allumé
  tl.to(cam, { s: 1.0, ay: 960, duration: 1.4, ease: CAMERA }, 5.2);
  tl.to(carte, { recul: 1, duration: 1.4, ease: CAMERA }, 5.2);
  tl.to(carte, { trace: 0.55, duration: 1.0, ease: 'none' }, 5.2);
  tl.to($('fonduHaut'), { height: 0, duration: 0.6, ease: 'power1.inOut' }, 5.2);

  // Appel à l'action : le point devient le point du i
  tl.to($('voile'), { opacity: 0.78, duration: 0.6, ease: 'power1.inOut' }, 6.45);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 6.55);
  tl.to(pinPoint, { width: 41.4, height: 41.4, left: -20.7, top: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px, rgba(0, 73, 74, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 6.55);
  tl.set(pin, { autoAlpha: 0 }, 7.15);
  O.finCta(tl, 7.15);
  tl.set({}, {}, DUREE);

  function allerA(t) {
    t = borner(t, 0, DUREE);
    tl.seek(t, true);
    maj(t);
    return t;
  }
  O.piloter({ duree: DUREE, allerA: allerA, preparer: function () { pointI = O.mesurerCta(); } });
})();
