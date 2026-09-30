/*
 * Pignon — « Ombres portées », 15 s, 1080 x 1920 (9:16).
 * Les ombres sont calculées à chaque image : position réelle du soleil à Rouen (soleil.js),
 * hauteur de chaque bâtiment, projection au sol. L'état « au soleil / à l'ombre » de la
 * terrasse et le bilan annuel viennent du même calcul.
 */
(function () {
  'use strict';

  var DUREE = 15;
  var L = 1080, H = 1920, MARGE = 84;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils, S = window.PignonSoleil;
  var STANDARD = O.STANDARD, RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lisser(x) { x = borner(x, 0, 1); return x * x * (3 - 2 * x); }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });

  // ---------- Ville, hauteurs, géométrie des ombres ----------
  var ville = PignonCity.build();
  var METRE = 1 / 0.45;          // 1 unité de carte = 0,45 m
  var PERSPECTIVE = 0.15;        // décalage vertical du toit (vue légèrement plongeante)
  var batis = [];
  (function () {
    var rnd = PignonCity.mulberry32(0x0B5E);
    ville.lots.forEach(function (l) {
      if (!l.bld) return;
      var ymax = -Infinity;
      l.bld.forEach(function (p) { if (p[1] > ymax) ymax = p[1]; });
      batis.push({ lot: l, poly: l.bld, h: (9 + rnd() * 15) * METRE, ymax: ymax });
    });
    batis.sort(function (a, b) { return a.ymax - b.ymax; });   // ordre du peintre : du nord au sud
  })();

  function enveloppe(pts) {
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var bas = [], haut = [], i;
    for (i = 0; i < pts.length; i++) { while (bas.length >= 2 && cross(bas[bas.length - 2], bas[bas.length - 1], pts[i]) <= 0) bas.pop(); bas.push(pts[i]); }
    for (i = pts.length - 1; i >= 0; i--) { while (haut.length >= 2 && cross(haut[haut.length - 2], haut[haut.length - 1], pts[i]) <= 0) haut.pop(); haut.push(pts[i]); }
    return bas.slice(0, -1).concat(haut.slice(0, -1));
  }
  function decaler(P, dx, dy) { return P.map(function (p) { return [p[0] + dx, p[1] + dy]; }); }
  function dedans(x, y, P) {
    var c = false;
    for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
      if (((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c;
    }
    return c;
  }
  // Direction et allongement de l'ombre : unités de sol par unité de hauteur.
  function projection(soleil) {
    var el = Math.max(soleil.elevation, 1.2) * Math.PI / 180, az = soleil.azimut * Math.PI / 180;
    var k = 1 / Math.tan(el);
    return { x: -Math.sin(az) * k, y: Math.cos(az) * k, jour: soleil.elevation > 0 };
  }
  function ombreDe(b, pr) { return enveloppe(b.poly.concat(decaler(b.poly, pr.x * b.h, pr.y * b.h))); }

  // ---------- La terrasse : choisie pour que le soleil et l'ombre s'y relaient ----------
  function terrassePour(l) {
    var ct = [l.cx, l.cy], res = [];
    for (var i = 0; i < l.poly.length; i++) {
      var a = l.poly[i], b = l.poly[(i + 1) % l.poly.length];
      var ex = b[0] - a[0], ey = b[1] - a[1], len = Math.hypot(ex, ey);
      if (len < 52) continue;
      var nx = -ey / len, ny = ex / len, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (nx * (mx - ct[0]) + ny * (my - ct[1]) < 0) { nx = -nx; ny = -ny; }
      if (ny < -0.2) continue;   // pas de terrasse au nord : le toit la masquerait
      var libre = [8, 16, 24, 30].every(function (d) {
        return ville.lots.every(function (o) { return !dedans(mx + nx * d, my + ny * d, o.poly); });
      });
      if (!libre) continue;
      var u0 = 0.1, u1 = 0.9, d0 = 2.5, d1 = 22;
      var P = [
        [a[0] + ex * u0 + nx * d0, a[1] + ey * u0 + ny * d0], [a[0] + ex * u1 + nx * d0, a[1] + ey * u1 + ny * d0],
        [a[0] + ex * u1 + nx * d1, a[1] + ey * u1 + ny * d1], [a[0] + ex * u0 + nx * d1, a[1] + ey * u0 + ny * d1]
      ];
      var ech = [];
      for (var su = 0; su < 5; su++) for (var sd = 0; sd < 3; sd++) {
        var u = u0 + (u1 - u0) * (su + 0.5) / 5, d = d0 + (d1 - d0) * (sd + 0.5) / 3;
        ech.push([a[0] + ex * u + nx * d, a[1] + ey * u + ny * d]);
      }
      var tables = [0.2, 0.4, 0.6, 0.8].map(function (u) {
        var uu = u0 + (u1 - u0) * u, dd = (d0 + d1) / 2;
        return [a[0] + ex * uu + nx * dd, a[1] + ey * uu + ny * dd];
      });
      res.push({ lot: l, poly: P, echantillons: ech, tables: tables, cx: mx + nx * 12, cy: my + ny * 12, nx: nx, ny: ny });
    }
    return res;
  }
  function voisins(x, y, r) { return batis.filter(function (b) { return Math.hypot(b.lot.cx - x, b.lot.cy - y) < r; }); }
  function partAuSoleil(ter, proches, jour, heure) {
    var sol = S.position(jour, heure);
    if (sol.elevation <= 0) return -1;
    var pr = projection(sol);
    var ombres = proches.map(function (b) { return ombreDe(b, pr); });
    var n = 0;
    ter.echantillons.forEach(function (p) {
      if (!ombres.some(function (o) { return dedans(p[0], p[1], o); })) n++;
    });
    return n / ter.echantillons.length;
  }

  var terrasse = null, proches = null;
  (function choisir() {
    var meilleur = -Infinity;
    ville.lots.forEach(function (l) {
      if (!l.bld || l.area < 1800 || l.area > 6500 || Math.hypot(l.cx - 760, l.cy - 1150) > 320) return;
      terrassePour(l).forEach(function (ter) {
        var pr = voisins(ter.cx, ter.cy, 360);
        var s = partAuSoleil(ter, pr, 171, 13) + partAuSoleil(ter, pr, 171, 15)
          + (1 - partAuSoleil(ter, pr, 171, 18.5)) + (1 - partAuSoleil(ter, pr, 354, 15));
        if (s > meilleur) { meilleur = s; terrasse = ter; proches = pr; }
      });
    });
  })();
  var local = batis.filter(function (b) { return b.lot === terrasse.lot; })[0];
  local.h = 15 * METRE;

  // ---------- Bilan : 4 dates, 8 h - 19 h, pas de 5 minutes ----------
  var DATES = [
    { jour: 78, nom: '20 mars', icone: 'repere0' }, { jour: 171, nom: '21 juin', icone: 'repere1' },
    { jour: 265, nom: '23 sept.', icone: 'repere2' }, { jour: 354, nom: '21 déc.', icone: 'repere3' }
  ];
  var COUL_SOLEIL = [217, 179, 106], COUL_OMBRE = [136, 189, 188], COUL_NUIT = '#ccc6c0';
  var rubans = [];
  (function bilan() {
    var lignes = $('bilanLignes');
    DATES.forEach(function (d) {
      var ligne = document.createElement('div');
      ligne.className = 'bilan-ligne';
      var icone = $(d.icone).querySelector('svg').cloneNode(true);
      var date = document.createElement('p');
      date.className = 'bilan-date';
      date.appendChild(icone);
      date.appendChild(document.createTextNode(d.nom));
      var ruban = document.createElement('div');
      ruban.className = 'bilan-ruban';
      var cv = document.createElement('canvas');
      cv.width = 560; cv.height = 46;
      ruban.appendChild(cv);
      var c = cv.getContext('2d'), pas = 1 / 12, n = Math.round(11 / pas), heures = 0;
      for (var i = 0; i < n; i++) {
        var f = partAuSoleil(terrasse, proches, d.jour, 8 + (i + 0.5) * pas);
        if (f < 0) c.fillStyle = COUL_NUIT;
        else {
          heures += f * pas;
          var m = COUL_OMBRE.map(function (v, k) { return Math.round(v + (COUL_SOLEIL[k] - v) * f); });
          c.fillStyle = 'rgb(' + m.join(',') + ')';
        }
        c.fillRect(Math.floor(i * cv.width / n), 0, Math.ceil(cv.width / n) + 1, cv.height);
      }
      var total = document.createElement('p');
      total.className = 'bilan-total';
      var hh = Math.floor(heures + 1e-6), mm = Math.round((heures - hh) * 60 / 5) * 5;
      if (mm === 60) { hh++; mm = 0; }
      total.innerHTML = hh + '<small>&nbsp;h</small>' + (mm ? '&nbsp;' + String(mm).padStart(2, '0') : '');
      ligne.appendChild(date); ligne.appendChild(ruban); ligne.appendChild(total);
      lignes.appendChild(ligne);
      rubans.push({ canvas: cv, total: total, date: date });
    });
    var axe = $('bilanAxe');
    [8, 11, 14, 17, 19].forEach(function (h) {
      var s = document.createElement('span');
      s.style.left = ((h - 8) / 11 * 100) + '%';
      s.textContent = h + ' h';
      axe.appendChild(s);
    });
  })();

  // ---------- État animé ----------
  var cam = { x: terrasse.cx, y: terrasse.cy, s: 1.8, ax: 540, ay: 930 };
  var temps = { jour: 171, heure: 13.4 };
  var carte = { terrasse: 0, opacite: 1, flou: 0 };
  var vol = { u: 0 };
  var pointI = { x: 540, y: 620 };
  function versEcran(x, y) { return [cam.ax + (x - cam.x) * cam.s, cam.ay + (y - cam.y) * cam.s]; }

  // Curseur Heure : pas d'une heure comme sur la carte (tenue puis glissé vers l'heure suivante).
  function escalier(nb) {
    return function (p) {
      var x = p * nb, n = Math.min(Math.floor(x), nb - 1), f = x - n;
      return (n + lisser((f - 0.45) / 0.55)) / nb;
    };
  }

  // ---------- Dessin de la carte ----------
  var canvas = $('map'), ctx = canvas.getContext('2d');
  var COUL = {
    ilot: '#e7e1d9', rue: '#fcfaf7', ombre: 'rgba(30, 26, 24, 0.36)',
    mur: '#e6dfd7', toit: '#fefbf9', toitBord: 'rgba(69, 62, 58, 0.22)',
    localToit: '#fbe6de', localBord: '#a55535',
    terrasse: '#f2cfc0', terrasseBord: '#a55535', passant: 'rgba(165, 85, 53, 0.55)'
  };
  function tracer(P) { ctx.moveTo(P[0][0], P[0][1]); for (var i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }

  function dessinerCarte(t) {
    var s = cam.s, i;
    var sol = S.position(temps.jour, temps.heure), pr = projection(sol);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, L, H);
    ctx.setTransform(s, 0, 0, s, cam.ax - cam.x * s, cam.ay - cam.y * s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.fillStyle = COUL.ilot;
    ctx.beginPath();
    for (i = 0; i < ville.cells.length; i++) tracer(ville.cells[i]);
    ctx.fill();
    ctx.strokeStyle = COUL.rue;
    ville.widthBuckets.forEach(function (B) {
      ctx.lineWidth = B.w;
      ctx.beginPath();
      B.list.forEach(function (e) { ville.traceCor(ctx, e); });
      ctx.stroke();
    });

    // Terrasse (sol) et ses tables, avant les ombres pour qu'elles la recouvrent
    var p = carte.terrasse;
    if (p > 0) {
      ctx.globalAlpha = p;
      ctx.fillStyle = COUL.terrasse;
      ctx.beginPath(); tracer(terrasse.poly); ctx.fill();
      ctx.fillStyle = '#fefbf9';
      ctx.strokeStyle = COUL.terrasseBord;
      ctx.lineWidth = 1.6 / s;
      terrasse.tables.forEach(function (tb, k) {
        var r = 4.2 * lisser(p * 3 - k * 0.5);
        if (r <= 0) return;
        ctx.beginPath(); ctx.arc(tb[0], tb[1], r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    // Passants
    var idx = t / ville.trackDt, i0 = Math.floor(idx), fr = idx - i0;
    ctx.fillStyle = COUL.passant;
    ctx.beginPath();
    for (var a = 0; a < ville.tracks.length; a++) {
      var tr = ville.tracks[a], n = tr.length / 2 - 1, j0 = Math.min(i0, n), j1 = Math.min(i0 + 1, n);
      var px = tr[j0 * 2] + (tr[j1 * 2] - tr[j0 * 2]) * fr, py = tr[j0 * 2 + 1] + (tr[j1 * 2 + 1] - tr[j0 * 2 + 1]) * fr;
      ctx.rect(px - 2.2, py - 2.2, 4.4, 4.4);
    }
    ctx.fill();

    // Ombres portées : union des projections de chaque bâtiment (un seul remplissage)
    ctx.fillStyle = COUL.ombre;
    ctx.beginPath();
    for (i = 0; i < batis.length; i++) tracer(ombreDe(batis[i], pr));
    ctx.fill();

    // Contour de la terrasse, toujours lisible, au soleil comme à l'ombre
    if (p > 0) {
      ctx.globalAlpha = p;
      ctx.strokeStyle = COUL.terrasseBord;
      ctx.lineWidth = 3 / s;
      ctx.setLineDash([9 / s, 6 / s]);
      ctx.beginPath(); tracer(terrasse.poly); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Bâti en léger relief : murs puis toits, du nord au sud
    for (i = 0; i < batis.length; i++) {
      var b = batis[i], dz = b.h * PERSPECTIVE, toit = decaler(b.poly, 0, -dz);
      ctx.fillStyle = COUL.mur;
      ctx.beginPath(); tracer(enveloppe(b.poly.concat(toit))); ctx.fill();
      ctx.fillStyle = b === local && p > 0 ? COUL.localToit : COUL.toit;
      ctx.strokeStyle = b === local && p > 0 ? COUL.localBord : COUL.toitBord;
      ctx.lineWidth = (b === local && p > 0 ? 3 : 1.2) / s;
      ctx.beginPath(); tracer(toit); ctx.fill(); ctx.stroke();
    }

    // Lumière rasante : la scène se réchauffe quand le soleil est bas
    var chaleur = borner((28 - sol.elevation) / 28, 0, 1) * 0.16;
    if (chaleur > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(242, 207, 192,' + chaleur.toFixed(3) + ')';
      ctx.fillRect(0, 0, L, H);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ---------- Mise à jour des éléments suivis ----------
  var pin = $('pin'), etiquette = $('terrasseEtiquette'), etat = $('terrasseEtat');
  var etatSoleil = $('etatSoleil'), etatOmbre = $('etatOmbre');
  var curseurSaison = $('curseurSaison'), curseurHeure = $('curseurHeure'), valeur = $('valeur');
  var reperes = [0, 1, 2, 3].map(function (k) { return $('repere' + k); });
  function placerCentre(el, x, y) {
    var demi = el.offsetWidth / 2;
    el.style.left = borner(x, MARGE + demi, L - MARGE - demi).toFixed(2) + 'px';
    el.style.top = y.toFixed(2) + 'px';
  }

  function maj(t) {
    dessinerCarte(t);
    var c = versEcran(terrasse.cx, terrasse.cy);
    placerCentre(etiquette, c[0], c[1] - 150 * Math.max(0.6, cam.s / 2));
    etat.style.left = c[0].toFixed(2) + 'px';
    etat.style.top = (c[1] + 40 + 42 * cam.s).toFixed(2) + 'px';
    var f = partAuSoleil(terrasse, proches, temps.jour, temps.heure);
    var soleil = f >= 0.5 ? 1 : 0;
    etatSoleil.style.opacity = soleil.toFixed(3);
    etatOmbre.style.opacity = (1 - soleil).toFixed(3);

    var pp = c;
    if (vol.u > 0) {
      var u = vol.u, v = 1 - u, kx = Math.min(pp[0], pointI.x) - 150, ky = Math.min(pp[1], pointI.y) - 120;
      pp = [v * v * pp[0] + 2 * v * u * kx + u * u * pointI.x, v * v * pp[1] + 2 * v * u * ky + u * u * pointI.y];
    }
    pin.style.transform = 'translate(' + pp[0].toFixed(2) + 'px,' + pp[1].toFixed(2) + 'px)';

    curseurSaison.style.left = (temps.jour / 364 * 100).toFixed(3) + '%';
    curseurHeure.style.left = ((temps.heure - 8) / 11 * 100).toFixed(3) + '%';
    valeur.textContent = S.date(temps.jour) + ' à ' + Math.round(temps.heure) + 'h';
    reperes.forEach(function (r, k) { r.classList.toggle('actif', Math.abs(temps.jour - DATES[k].jour) < 30); });

    canvas.style.opacity = carte.opacite.toFixed(3);
    canvas.style.filter = carte.flou > 0.05 ? 'blur(' + carte.flou.toFixed(2) + 'px)' : 'none';
  }

  // ---------- États initiaux ----------
  var titres = [0, 1, 2, 3].map(function (i) { return $('titre' + i); });
  var pinPoint = $('pinPoint');
  gsap.set(titres, { autoAlpha: 0 });
  gsap.set(tous('.car'), { opacity: 0 });
  gsap.set(tous('.mot-in'), { yPercent: 118 });
  gsap.set([$('panneau'), $('carteBilan')], { autoAlpha: 0, y: 90 });
  gsap.set(pinPoint, { scale: 0 });
  gsap.set($('onde1'), { scale: 1, opacity: 0 });
  gsap.set(etiquette, { xPercent: -50, yPercent: -50, autoAlpha: 0, y: 16 });
  gsap.set(etat, { autoAlpha: 0, scale: 0.7 });
  gsap.set(rubans.map(function (r) { return r.canvas; }), { clipPath: 'inset(0% 100% 0% 0%)' });
  gsap.set(rubans.map(function (r) { return r.total; }), { opacity: 0 });
  gsap.set($('logoPoint'), { scale: 0 });
  gsap.set($('logoTige'), { scaleY: 0 });
  gsap.set($('logoP'), { xPercent: 105 });
  gsap.set($('logoGnon'), { xPercent: -105 });
  gsap.set($('ctaBouton'), { xPercent: -50, autoAlpha: 0, scale: 0.85 });
  gsap.set($('ctaOnde'), { xPercent: -50, opacity: 0 });
  gsap.set([$('ctaSous'), $('ctaUrl')], { autoAlpha: 0, y: 22 });

  // ---------- Timeline ----------
  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
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

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);

  // 0 — Accroche : la terrasse apparaît, le soleil avance doucement
  entrerTitre(titres[0], 0);
  tl.to(cam, { s: 2.2, duration: 2.2, ease: 'sine.inOut' }, 0);
  tl.to(temps, { heure: 14.1, duration: 2.6, ease: 'none' }, 0);
  tl.to(carte, { terrasse: 1, duration: 0.7, ease: 'power1.out' }, 0.85);
  tl.to(etiquette, { autoAlpha: 1, y: 0, duration: 0.55 }, 1.05);
  tl.to(etat, { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 1.45);
  sortirTitre(titres[0], 2.05);

  // 1 — L'heure : 8 h → 19 h le 21 juin, par pas d'une heure
  tl.to(cam, { ay: 800, s: 2.7, duration: 0.8, ease: CAMERA }, 2.1);
  tl.to($('fonduHaut'), { height: 720, duration: 0.7, ease: CAMERA }, 2.1);
  entrerTitre(titres[1], 2.35);
  tl.to($('panneau'), { autoAlpha: 1, y: 0, duration: 0.75 }, 2.3);
  tl.to(temps, { heure: 8, duration: 0.5, ease: CAMERA }, 2.65);
  tl.to(temps, { heure: 19, duration: 3.2, ease: escalier(11) }, 3.15);
  sortirTitre(titres[1], 6.3);

  // 2 — La saison : même heure (15 h), du 21 juin au 21 décembre
  tl.to(temps, { heure: 15, duration: 0.45, ease: CAMERA }, 6.4);
  tl.to(cam, { s: 1.9, ay: 760, duration: 1.4, ease: CAMERA }, 6.55);
  entrerTitre(titres[2], 6.6);
  tl.to(temps, { jour: 354, duration: 2.3, ease: 'power2.inOut' }, 6.95);
  sortirTitre(titres[2], 9.6);

  // 3 — Toute l'année : le bilan calculé pour la terrasse
  tl.to([$('panneau')], { autoAlpha: 0, y: 70, duration: 0.4, ease: SORTIE }, 9.6);
  tl.to([etiquette, etat], { autoAlpha: 0, duration: 0.3, ease: 'none' }, 9.6);
  tl.to($('voile'), { opacity: 0.82, duration: 0.5, ease: 'power1.inOut' }, 9.6);
  tl.to(carte, { flou: 7, duration: 0.5, ease: 'power1.inOut' }, 9.6);
  entrerTitre(titres[3], 9.9);
  tl.to($('carteBilan'), { autoAlpha: 1, y: 0, duration: 0.75 }, 10.0);
  tl.to(rubans.map(function (r) { return r.canvas; }), { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, stagger: 0.12, ease: 'power2.inOut' }, 10.25);
  tl.to(rubans.map(function (r) { return r.total; }), { opacity: 1, duration: 0.3, stagger: 0.12, ease: 'none' }, 10.75);
  tl.to($('carteBilan'), { autoAlpha: 0, y: -70, duration: 0.4, ease: SORTIE }, 11.62);
  sortirTitre(titres[3], 11.62);

  // 4 — Appel à l'action : le point de la terrasse devient le point du i
  tl.to($('logoPetit'), { opacity: 0, duration: 0.3, ease: 'none' }, 11.7);
  tl.to($('voile'), { opacity: 0.78, duration: 0.8, ease: 'power1.inOut' }, 11.75);
  tl.to(carte, { flou: 0, terrasse: 0, duration: 0.8, ease: 'power1.inOut' }, 11.75);
  tl.to($('fonduHaut'), { height: 0, duration: 0.8, ease: 'power1.inOut' }, 11.75);
  tl.to(temps, { jour: 171, heure: 14, duration: 3.2, ease: 'sine.inOut' }, 11.8);
  tl.to(cam, { s: 1.15, ay: 960, duration: 3.2, ease: 'sine.inOut' }, 11.8);
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
