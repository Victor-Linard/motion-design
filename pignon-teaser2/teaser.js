/*
 * Pignon — teaser 2, 14 s, 1080 x 1920 (9:16). « Chaque adresse a quelque chose à cacher. »
 * La ville et ses données sont floues. Le point se balade dans les rues (trace, deux arrêts),
 * entouré d'une loupe qui rend net ce qu'elle survole : population, parking, soleil, prix,
 * survie… Au local, son dossier se défloute ligne à ligne, puis la loupe s'ouvre sur la ville.
 */
(function () {
  'use strict';

  var DUREE = 14;
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

  // ---------- Données posées sur la ville (valeurs de sessions réelles, placement illustratif) ----------
  var IC = {
    gens: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    parking: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
    commerce: '<path d="M5 3h14l2 6H3z"/><path d="M4 9v12h16V9"/><path d="M10 21v-6h4v6"/>',
    soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    horloge: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    euro: '<path d="M18 7a7 7 0 1 0 0 10"/><line x1="4" y1="10" x2="13" y2="10"/><line x1="4" y1="14" x2="13" y2="14"/>',
    courbe: '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
    cle: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
    alerte: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
  };
  var P = '#00494a', T = '#a55535', A = '#c08a2e';
  var DONNEES = [
    ['11 330 habitants', 'gens', P], ['Parking à 47 m', 'parking', P], ['Terrasse au soleil 8 h – 19 h', 'soleil', A],
    ['Fonds cédé 225 k€', 'euro', T], ['45,5 % de 15-29 ans', 'gens', P], ['1 950 commerces', 'commerce', T],
    ['Survie à 3 ans : 75 %', 'courbe', P], ['10 min à pied : 10 790 hab.', 'horloge', P], ['Repris sur place · 2021', 'cle', P],
    ['Ventes : 3 800 €/m²', 'euro', T], ['Procédure collective · 2017', 'alerte', T], ['CA médian du secteur : 152 k€', 'euro', P],
    ['4× plus de concurrents', 'commerce', T], ['Commerces : 8,9 ans d’âge médian', 'horloge', P]
  ];
  var tmp = [0, 0], ancres = [];
  function distChemin(l) {
    var best = Infinity;
    for (var s = 0; s <= L_RUE; s += 8) { pointA(s, tmp); best = Math.min(best, Math.hypot(tmp[0] - l.cx, tmp[1] - l.cy)); }
    return best;
  }
  ville.lots.filter(function (l) { return l.bld && l !== cible && l.area > 1400; })
    .map(function (l) { return { l: l, d: distChemin(l), c: Math.hypot(l.cx - cible.cx, l.cy - cible.cy) }; })
    .filter(function (o) { return (o.d > 70 && o.d < 210) || (o.c > 170 && o.c < 480); })
    .sort(function (a, b) { return a.d - b.d; })
    .forEach(function (o) {
      if (ancres.length >= DONNEES.length) return;
      if (ancres.some(function (a) { return Math.abs(a.l.cx - o.l.cx) < 230 && Math.abs(a.l.cy - o.l.cy) < 70; })) return;
      if (ancres.some(function (a) { return Math.hypot(a.l.cx - o.l.cx, a.l.cy - o.l.cy) < 120; })) return;
      if (Math.hypot(o.l.cx - cible.cx, o.l.cy - cible.cy) < 120) return;
      ancres.push(o);
    });
  function etiquette(d) {
    var e = document.createElement('span');
    e.className = 'etiquette';
    e.innerHTML = '<svg viewBox="0 0 24 24" style="background:' + d[2] + '">' + IC[d[1]] + '</svg><span>' + d[0] + '</span>';
    return e;
  }
  ancres.forEach(function (a, k) {
    var d = DONNEES[k];
    a.couleur = d[2];
    a.flou = etiquette(d); a.nette = etiquette(d);
    $('flous').appendChild(a.flou);
    $('reveles').appendChild(a.nette);
    a.k = 0;
  });

  // ---------- Dessin : ville floue, ville nette sous la loupe, trace du point ----------
  var voyage = { s: 0 }, camVoyage = { s: 0 };
  var cam = { x: 0, y: 0, s: 1.7, ax: 540, ay: 1250 };
  var carte = { surbrillance: 0, recul: 0, trace: 1 };
  var loupe = { r: 0, bord: 1 };
  var vol = { u: 0 }, pointI = { x: 540, y: 620 };
  var ctxFlou = $('mapFlou').getContext('2d'), ctxNet = $('mapNet').getContext('2d'), ctxTrace = $('trace').getContext('2d');
  var pin = $('pin'), loupeEl = $('loupe'), net = [$('mapNet'), $('reveles')];
  var pDot = [0, 0], pCam = [0, 0];
  function ecran(x, y) { return [cam.ax + (x - cam.x) * cam.s, cam.ay + (y - cam.y) * cam.s]; }

  function maj(t) {
    pointA(camVoyage.s, pCam);
    cam.x = melanger(pCam[0], cible.cx, carte.recul);
    cam.y = melanger(pCam[1], cible.cy, carte.recul);
    pointA(voyage.s, pDot);
    O.dessinerVille(ctxFlou, ville, cam, t, {});
    O.dessinerVille(ctxNet, ville, cam, t, {
      cible: cible, surbrillance: carte.surbrillance,
      apresBati: function (c) {
        c.globalAlpha = 0.3;
        ancres.forEach(function (a) { c.fillStyle = a.couleur; c.beginPath(); ville.tracePoly(c, a.l.bld); c.fill(); });
        c.globalAlpha = 1;
      }
    });
    // Trace du point dans les rues
    ctxTrace.setTransform(1, 0, 0, 1, 0, 0);
    ctxTrace.clearRect(0, 0, 1080, 1920);
    var fin = Math.min(voyage.s, L_RUE);
    if (fin > 0 && carte.trace > 0) {
      ctxTrace.setTransform(cam.s, 0, 0, cam.s, cam.ax - cam.x * cam.s, cam.ay - cam.y * cam.s);
      ctxTrace.globalAlpha = carte.trace;
      ctxTrace.strokeStyle = '#4e9493';
      ctxTrace.lineWidth = 7 / cam.s;
      ctxTrace.lineJoin = ctxTrace.lineCap = 'round';
      ctxTrace.beginPath();
      ctxTrace.moveTo(pts[0][0], pts[0][1]);
      for (var j = 1; j < pts.length && cum[j] < fin; j++) ctxTrace.lineTo(pts[j][0], pts[j][1]);
      pointA(fin, tmp);
      ctxTrace.lineTo(tmp[0], tmp[1]);
      ctxTrace.stroke();
      ctxTrace.globalAlpha = 1;
    }
    ancres.forEach(function (a) {
      var e = ecran(a.l.cx, a.l.cy), tr = 'translate(' + e[0].toFixed(1) + 'px,' + e[1].toFixed(1) + 'px) translate(-50%,-50%) scale(' + a.k.toFixed(3) + ')';
      a.flou.style.transform = a.nette.style.transform = tr;
    });
    var p = ecran(pDot[0], pDot[1]);
    var clip = 'circle(' + loupe.r.toFixed(1) + 'px at ' + p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px)';
    net.forEach(function (el) { el.style.clipPath = clip; });
    loupeEl.style.left = p[0].toFixed(1) + 'px';
    loupeEl.style.top = p[1].toFixed(1) + 'px';
    loupeEl.style.width = loupeEl.style.height = (loupe.r * 2).toFixed(1) + 'px';
    loupeEl.style.opacity = loupe.r > 1 ? loupe.bord.toFixed(3) : '0';
    if (vol.u > 0) {
      var u = vol.u, v = 1 - u, kx = Math.min(p[0], pointI.x) - 150, ky = Math.min(p[1], pointI.y) - 120;
      p = [v * v * p[0] + 2 * v * u * kx + u * u * pointI.x, v * v * p[1] + 2 * v * u * ky + u * u * pointI.y];
    }
    pin.style.transform = 'translate(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px)';
  }

  // ---------- États initiaux ----------
  O.etatsInitiaux();
  var titre = $('titre0'), pinPoint = $('pinPoint'), dossier = $('dossier'), lignes = tous('.secret-l');
  gsap.set(pinPoint, { scale: 0 });
  gsap.set($('onde1'), { scale: 1, opacity: 0 });
  gsap.set(dossier, { autoAlpha: 0, y: 60 });
  gsap.set(lignes, { filter: 'blur(12px)', opacity: 0.55 });

  var tl = gsap.timeline({ paused: true, defaults: { ease: O.STANDARD, duration: 0.7 } });
  function onde(t, echelle) {
    tl.fromTo($('onde1'), { scale: 1, opacity: 0.75 }, { scale: echelle, opacity: 0, duration: 0.8, ease: 'power2.out', immediateRender: false }, t);
  }

  // Accroche (texte du site) : la ville et ses données, floues
  tl.set(titre, { autoAlpha: 1 }, 0.2);
  tl.to(tous('.mot-in', titre), { yPercent: 0, duration: 0.8, stagger: 0.07 }, 0.25);
  tl.to(ancres, { k: 1, duration: 0.45, stagger: 0.06, ease: RESSORT }, 0.5);
  tl.to(tous('.mot-in', titre), { yPercent: -118, duration: 0.32, stagger: 0.012, ease: SORTIE }, 3.9);
  tl.set(titre, { autoAlpha: 0 }, 4.35);
  tl.to($('fonduHaut'), { height: 0, duration: 0.6, ease: 'power1.inOut' }, 4.0);

  // Le point se balade dans les rues, sa loupe rend net ce qu'elle survole ; deux arrêts
  tl.to(pinPoint, { scale: 1, duration: 0.5, ease: RESSORT }, 1.4);
  tl.to(loupe, { r: 265, duration: 0.6, ease: RESSORT }, 1.7);
  var A1 = 0.36 * L_RUE, A2 = 0.7 * L_RUE;
  tl.to(voyage, { s: A1, duration: 1.3, ease: 'power1.inOut' }, 2.1);
  tl.to(voyage, { s: A2, duration: 1.1, ease: 'power1.inOut' }, 3.9);
  tl.to(voyage, { s: L, duration: 1.0, ease: 'power2.inOut' }, 5.5);
  tl.to(camVoyage, { s: A1, duration: 1.5, ease: 'sine.inOut' }, 2.25);
  tl.to(camVoyage, { s: A2, duration: 1.3, ease: 'sine.inOut' }, 4.05);
  tl.to(camVoyage, { s: L, duration: 1.2, ease: 'sine.inOut' }, 5.65);
  [3.4, 5.0].forEach(function (t) {
    onde(t, 2.4);
    tl.to(loupe, { r: 320, duration: 0.25, ease: 'power2.out' }, t);
    tl.to(loupe, { r: 265, duration: 0.3, ease: 'power2.in' }, t + 0.3);
  });

  // Le local : il s'allume, son dossier se défloute ligne à ligne
  tl.to(carte, { surbrillance: 1, duration: 0.35, ease: 'none' }, 6.45);
  onde(6.5, 3.4);
  tl.to(loupe, { r: 330, duration: 0.6, ease: RESSORT }, 6.5);
  tl.to(dossier, { autoAlpha: 1, y: 0, duration: 0.7 }, 6.7);
  lignes.forEach(function (l, k) {
    tl.to(l, { filter: 'blur(0px)', opacity: 1, duration: 0.5, ease: 'power2.out' }, 7.2 + k * 0.55);
  });

  // Tout est révélé : la loupe s'ouvre sur toute la ville
  tl.to(dossier, { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE }, 9.9);
  tl.to(loupe, { r: 2300, duration: 1.1, ease: CAMERA }, 10.0);
  tl.to(loupe, { bord: 0, duration: 0.6, ease: 'none' }, 10.4);
  tl.to(carte, { recul: 1, trace: 0.5, duration: 1.2, ease: CAMERA }, 10.0);
  tl.to(cam, { s: 1.25, ay: 1100, duration: 1.2, ease: CAMERA }, 10.0);

  // Appel à l'action : le point devient le point du i
  tl.to($('voile'), { opacity: 0.8, duration: 0.6, ease: 'power1.inOut' }, 11.15);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 11.25);
  tl.to(pinPoint, { width: 41.4, height: 41.4, left: -20.7, top: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px, rgba(0, 73, 74, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 11.25);
  tl.set(pin, { autoAlpha: 0 }, 11.85);
  O.finCta(tl, 11.85);
  tl.set({}, {}, DUREE);

  function allerA(t) {
    t = borner(t, 0, DUREE);
    tl.seek(t, true);
    maj(t);
    return t;
  }
  O.piloter({ duree: DUREE, allerA: allerA, preparer: function () { pointI = O.mesurerCta(); } });
})();
