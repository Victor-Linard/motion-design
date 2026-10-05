/*
 * Pignon — teaser, 13,6 s, 1080 x 1920 (9:16). « Chaque adresse a quelque chose à cacher. »
 * La ville est floue et ses secrets caviardés ; le point devient une loupe qui rend tout net
 * et décaviarde les étiquettes sur son passage. Au local, son dossier se décaviarde ligne à
 * ligne (exemple publié sur le site), puis la loupe s'ouvre sur toute la ville.
 */
(function () {
  'use strict';

  var DUREE = 13.6;
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

  // ---------- Secrets : étiquettes posées sur des bâtiments (illustratives) ----------
  var SECRETS = [
    ['Fermé · 2019', '#a39d97'], ['Repris · 2021', '#086b6c'], ['Procédure · 2017', '#a55535'],
    ['Ouvert · 2014', '#00958f'], ['A déménagé · 2022', '#88bdbc'], ['Radié · 2016', '#d08b6c'],
    ['Repris · 2012', '#086b6c'], ['Fermé · 2023', '#a39d97'], ['Ouvert · 2020', '#00958f'],
    ['Procédure · 2009', '#a55535'], ['Repris · 2018', '#086b6c'], ['Fermé · 2015', '#a39d97']
  ];
  var tmp = [0, 0], ancres = [];
  function distChemin(l) {
    var best = Infinity;
    for (var s = 0; s <= L_RUE; s += 8) { pointA(s, tmp); best = Math.min(best, Math.hypot(tmp[0] - l.cx, tmp[1] - l.cy)); }
    return best;
  }
  ville.lots.filter(function (l) { return l.bld && l !== cible && l.area > 1400; })
    .map(function (l) { return { l: l, d: distChemin(l), c: Math.hypot(l.cx - cible.cx, l.cy - cible.cy) }; })
    .filter(function (o) { return (o.d > 60 && o.d < 230) || (o.c > 150 && o.c < 520); })
    .sort(function (a, b) { return a.d - b.d; })
    .forEach(function (o) {
      if (ancres.length >= SECRETS.length * 2) return;
      if (ancres.some(function (a) { return Math.hypot(a.l.cx - o.l.cx, a.l.cy - o.l.cy) < 165; })) return;
      if (Math.hypot(o.l.cx - cible.cx, o.l.cy - cible.cy) < 120) return;
      ancres.push(o);
    });
  ancres.forEach(function (a, k) {
    var sec = SECRETS[k % SECRETS.length];
    a.couleur = sec[1];
    a.caviar = document.createElement('span');
    a.caviar.className = 'etiquette etiquette--caviar';
    a.caviar.innerHTML = '<i></i>' + sec[0];
    a.nette = document.createElement('span');
    a.nette.className = 'etiquette etiquette--nette';
    a.nette.innerHTML = '<i style="background:' + sec[1] + '"></i>' + sec[0];
    $('caviars').appendChild(a.caviar);
    $('reveles').appendChild(a.nette);
  });

  // ---------- Dessin : ville floue, ville nette sous la loupe ----------
  var voyage = { s: 0 }, camVoyage = { s: 0 };
  var cam = { x: 0, y: 0, s: 1.7, ax: 540, ay: 1250 };
  var carte = { surbrillance: 0, recul: 0 };
  var loupe = { r: 0, bord: 1 };
  var vol = { u: 0 }, pointI = { x: 540, y: 620 };
  var ctxFlou = $('mapFlou').getContext('2d'), ctxNet = $('mapNet').getContext('2d');
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
        c.globalAlpha = 0.4;
        ancres.forEach(function (a) { c.fillStyle = a.couleur; c.beginPath(); ville.tracePoly(c, a.l.bld); c.fill(); });
        c.globalAlpha = 1;
      }
    });
    ancres.forEach(function (a) {
      var e = ecran(a.l.cx, a.l.cy), tr = 'translate(' + e[0].toFixed(1) + 'px,' + e[1].toFixed(1) + 'px) translate(-50%,-50%)';
      a.caviar.style.transform = tr + ' scale(' + a.caviar._k + ')';
      a.nette.style.transform = tr + ' scale(' + a.caviar._k + ')';
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
  var titre = $('titre0'), pinPoint = $('pinPoint'), dossier = $('dossier');
  ancres.forEach(function (a) { a.caviar._k = 0; });
  gsap.set(pinPoint, { scale: 0 });
  gsap.set($('onde1'), { scale: 1, opacity: 0 });
  gsap.set(dossier, { autoAlpha: 0, y: 60 });
  gsap.set(tous('.caviar'), { scaleX: 1 });
  gsap.set(tous('.secret-l span'), { opacity: 0 });

  var tl = gsap.timeline({ paused: true, defaults: { ease: O.STANDARD, duration: 0.7 } });

  // Accroche (texte du site) : la ville floue, les secrets caviardés
  tl.set(titre, { autoAlpha: 1 }, 0.2);
  tl.to(tous('.mot-in', titre), { yPercent: 0, duration: 0.8, stagger: 0.07 }, 0.25);
  tl.to(ancres.map(function (a) { return a.caviar; }), { _k: 1, duration: 0.4, stagger: 0.05, ease: RESSORT }, 0.5);
  tl.to(tous('.mot-in', titre), { yPercent: -118, duration: 0.32, stagger: 0.012, ease: SORTIE }, 3.9);
  tl.set(titre, { autoAlpha: 0 }, 4.35);
  tl.to($('fonduHaut'), { height: 0, duration: 0.6, ease: 'power1.inOut' }, 4.0);

  // Le point devient une loupe et parcourt les rues : sous elle, tout est net et lisible
  tl.to(pinPoint, { scale: 1, duration: 0.5, ease: RESSORT }, 1.4);
  tl.to(loupe, { r: 265, duration: 0.6, ease: RESSORT }, 1.7);
  var ARRET = 0.5 * L_RUE;
  tl.to(voyage, { s: ARRET, duration: 1.8, ease: 'power1.inOut' }, 2.2);
  tl.to(voyage, { s: L, duration: 1.6, ease: 'power2.inOut' }, 4.4);
  tl.to(camVoyage, { s: ARRET, duration: 2.0, ease: 'sine.inOut' }, 2.35);
  tl.to(camVoyage, { s: L, duration: 1.8, ease: 'sine.inOut' }, 4.55);

  // Le local : il s'allume, son dossier se décaviarde ligne à ligne
  tl.to(carte, { surbrillance: 1, duration: 0.35, ease: 'none' }, 5.9);
  tl.fromTo($('onde1'), { scale: 1, opacity: 0.75 }, { scale: 3.4, opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 5.95);
  tl.to(loupe, { r: 320, duration: 0.6, ease: RESSORT }, 6.0);
  tl.to(dossier, { autoAlpha: 1, y: 0, duration: 0.7 }, 6.2);
  tous('.secret-l').forEach(function (l, k) {
    var t = 6.8 + k * 0.6;
    tl.set(l.querySelector('span'), { opacity: 1 }, t);
    tl.to(l.querySelector('.caviar'), { scaleX: 0, duration: 0.45, ease: 'power2.inOut' }, t);
  });

  // Tout est révélé : la loupe s'ouvre sur toute la ville
  tl.to(dossier, { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE }, 9.5);
  tl.to(loupe, { r: 2300, duration: 1.1, ease: CAMERA }, 9.6);
  tl.to(loupe, { bord: 0, duration: 0.6, ease: 'none' }, 10.0);
  tl.to(carte, { recul: 1, duration: 1.2, ease: CAMERA }, 9.6);
  tl.to(cam, { s: 1.25, ay: 1100, duration: 1.2, ease: CAMERA }, 9.6);

  // Appel à l'action : le point devient le point du i
  tl.to($('voile'), { opacity: 0.8, duration: 0.6, ease: 'power1.inOut' }, 10.75);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 10.85);
  tl.to(pinPoint, { width: 41.4, height: 41.4, left: -20.7, top: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px, rgba(0, 73, 74, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 10.85);
  tl.set(pin, { autoAlpha: 0 }, 11.45);
  O.finCta(tl, 11.45);
  tl.set({}, {}, DUREE);

  function allerA(t) {
    t = borner(t, 0, DUREE);
    tl.seek(t, true);
    maj(t);
    return t;
  }
  O.piloter({ duree: DUREE, allerA: allerA, preparer: function () { pointI = O.mesurerCta(); } });
})();
