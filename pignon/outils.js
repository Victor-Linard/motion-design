/*
 * Outils partagés des compositions Pignon : courbes de la charte et découpage du texte.
 */
(function () {
  'use strict';

  // ---------- Courbes de la charte (--pgn-easing-standard / --pgn-easing-ressort) ----------
  function cubicBezier(p1x, p1y, p2x, p2y) {
    var cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
    var cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    function sx(t) { return ((ax * t + bx) * t + cx) * t; }
    function sy(t) { return ((ay * t + by) * t + cy) * t; }
    function dsx(t) { return (3 * ax * t + 2 * bx) * t + cx; }
    function resoudre(x) {
      var t = x, i, d, e;
      for (i = 0; i < 8; i++) {
        e = sx(t) - x;
        if (Math.abs(e) < 1e-7) return t;
        d = dsx(t);
        if (Math.abs(d) < 1e-7) break;
        t -= e / d;
      }
      var t0 = 0, t1 = 1; t = x;
      while (t1 - t0 > 1e-7) {
        e = sx(t);
        if (Math.abs(e - x) < 1e-7) return t;
        if (x > e) t0 = t; else t1 = t;
        t = (t0 + t1) / 2;
      }
      return t;
    }
    return function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : sy(resoudre(x)); };
  }

  var STANDARD = cubicBezier(0.16, 1, 0.3, 1);
  var RESSORT = cubicBezier(0.34, 1.56, 0.64, 1);
  var CAMERA = cubicBezier(0.65, 0, 0.35, 1);
  var SORTIE = 'power2.in';

  // ---------- Découpage du texte ----------
  function decouperMots(el, classe) {
    var mots = [];
    var noeuds = Array.prototype.slice.call(el.childNodes);
    el.innerHTML = '';
    noeuds.forEach(function (n) { ajouter(n, el); });
    function ajouter(n, cible) {
      if (n.nodeType === 3) {
        n.textContent.split(/([ \t\r\n]+)/).forEach(function (morceau) {
          if (!morceau) return;
          if (/^[ \t\r\n]+$/.test(morceau)) { cible.appendChild(document.createTextNode(' ')); return; }
          var interieur = document.createElement('span');
          interieur.textContent = morceau;
          if (classe === 'flux') {
            interieur.className = 'flux';
            cible.appendChild(interieur);
          } else {
            var masque = document.createElement('span');
            masque.className = 'mot';
            interieur.className = 'mot-in';
            masque.appendChild(interieur);
            cible.appendChild(masque);
          }
          mots.push(interieur);
        });
      } else if (n.nodeName === 'BR') {
        cible.appendChild(document.createElement('br'));
      } else if (n.nodeType === 1) {
        var copie = n.cloneNode(false);
        cible.appendChild(copie);
        Array.prototype.slice.call(n.childNodes).forEach(function (c) { ajouter(c, copie); });
      }
    }
    return mots;
  }
  function decouperCaracteres(el) {
    var texte = el.textContent;
    el.innerHTML = '';
    return Array.prototype.map.call(texte, function (c) {
      var s = document.createElement('span');
      s.className = 'car';
      s.textContent = c;
      el.appendChild(s);
      return s;
    });
  }
  // Position d'un élément dans la scène, sans tenir compte des transformations.
  function positionDans(el, racine) {
    var x = 0, y = 0;
    while (el && el !== racine) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x: x, y: y };
  }

  var POLICES = [
    '400 106px Newsreader', 'italic 400 106px Newsreader', '500 28px "IBM Plex Mono"', '400 20px "IBM Plex Mono"',
    '400 30px "IBM Plex Sans"', '600 30px "IBM Plex Sans"', '700 50px "Bricolage Grotesque"'
  ];

  // Expose window.__seek / __duree / __pret au script de rendu et, hors rendu,
  // lance l'aperçu : lecture en boucle, espace = pause, flèches = image par image, ?t= pour figer.
  function piloter(o) {
    var L = 1080, H = 1920;
    var params = new URLSearchParams(location.search);
    window.__duree = o.duree;
    window.__seek = o.allerA;
    window.__pret = Promise.all(POLICES.map(function (p) { return document.fonts.load(p); }))
      .then(function () { return document.fonts.ready; })
      .then(function () { if (o.preparer) o.preparer(); o.allerA(0); return true; });
    if (params.has('render')) return;

    var stage = document.getElementById('stage');
    var curseur = document.getElementById('curseur'), affichage = document.getElementById('temps'), bouton = document.getElementById('btnLecture');
    function ajuster() {
      var k = Math.min(window.innerWidth / L, (window.innerHeight - 48) / H);
      stage.style.transform = 'scale(' + k + ')';
      stage.style.marginLeft = Math.max(0, (window.innerWidth - L * k) / 2) + 'px';
    }
    ajuster();
    window.addEventListener('resize', ajuster);

    var enLecture = !params.has('t'), debut = 0, tCourant = parseFloat(params.get('t')) || 0;
    bouton.textContent = enLecture ? '❚❚' : '▶';
    function afficher(t) { curseur.value = t; affichage.textContent = t.toFixed(2) + ' s'; }
    function boucle(now) {
      if (enLecture) {
        if (!debut) debut = now - tCourant * 1000;
        tCourant = ((now - debut) / 1000) % o.duree;
        o.allerA(tCourant);
        afficher(tCourant);
      }
      requestAnimationFrame(boucle);
    }
    window.__pret.then(function () { o.allerA(tCourant); afficher(tCourant); requestAnimationFrame(boucle); });
    function basculer() { enLecture = !enLecture; debut = 0; bouton.textContent = enLecture ? '❚❚' : '▶'; }
    bouton.addEventListener('click', basculer);
    curseur.addEventListener('input', function () { enLecture = false; bouton.textContent = '▶'; tCourant = parseFloat(curseur.value); o.allerA(tCourant); afficher(tCourant); });
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Space') { e.preventDefault(); basculer(); }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        enLecture = false; bouton.textContent = '▶';
        tCourant = o.allerA(tCourant + (e.code === 'ArrowRight' ? 1 : -1) / 30);
        afficher(tCourant);
      }
    });
  }

  // ---------- Briques communes des compositions ----------
  function tousDans(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function par(id) { return document.getElementById(id); }

  // Entrée / sortie des titres de scène (surtitre tapé, mots qui montent dans leur masque).
  function titres(tl) {
    return {
      entrer: function (sec, t) {
        tl.set(sec, { autoAlpha: 1 }, t);
        tl.to(tousDans('.surtitre .car', sec), { opacity: 1, duration: 0.01, stagger: 0.022, ease: 'none' }, t);
        tl.to(tousDans('.gros-titre .mot-in', sec), { yPercent: 0, duration: 0.8, stagger: 0.06, ease: STANDARD }, t + 0.08);
      },
      sortir: function (sec, t) {
        tl.to(tousDans('.gros-titre .mot-in', sec), { yPercent: -118, duration: 0.32, stagger: 0.012, ease: SORTIE }, t);
        tl.to(sec.querySelector('.surtitre'), { opacity: 0, duration: 0.2, ease: 'none' }, t);
        tl.set(sec, { autoAlpha: 0 }, t + 0.45);
      }
    };
  }

  // États de départ communs : titres masqués, logo du CTA démonté.
  function etatsInitiaux() {
    gsap.set(tousDans('.titre'), { autoAlpha: 0 });
    gsap.set(tousDans('.car'), { opacity: 0 });
    gsap.set(tousDans('.mot-in'), { yPercent: 118 });
    gsap.set(par('logoPoint'), { scale: 0 });
    gsap.set(par('logoTige'), { scaleY: 0 });
    gsap.set(par('logoP'), { xPercent: 105 });
    gsap.set(par('logoGnon'), { xPercent: -105 });
    gsap.set(par('ctaBouton'), { xPercent: -50, autoAlpha: 0, scale: 0.85 });
    gsap.set(par('ctaOnde'), { xPercent: -50, opacity: 0 });
    gsap.set([par('ctaSous'), par('ctaUrl')], { autoAlpha: 0, y: 22 });
  }

  // Fin commune : t = instant où le point se pose sur le i ; le logo se monte, puis la phrase et le bouton.
  function finCta(tl, t) {
    tl.set(par('logoPoint'), { scale: 1 }, t);
    tl.to(par('logoTige'), { scaleY: 1, duration: 0.5, ease: RESSORT }, t - 0.08);
    tl.to(par('logoP'), { xPercent: 0, duration: 0.75, ease: STANDARD }, t + 0.02);
    tl.to(par('logoGnon'), { xPercent: 0, duration: 0.75, ease: STANDARD }, t + 0.02);
    tl.to(tousDans('.cta-ligne .mot-in'), { yPercent: 0, duration: 0.8, stagger: 0.05, ease: STANDARD }, t + 0.3);
    tl.to(par('ctaBouton'), { autoAlpha: 1, scale: 1, duration: 0.6, ease: RESSORT }, t + 0.7);
    tl.to([par('ctaSous'), par('ctaUrl')], { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: STANDARD }, t + 0.88);
    [1.3, 1.65].forEach(function (d) {
      tl.fromTo(par('ctaOnde'), { scale: 1, opacity: 0.75 }, { scale: 1.2, opacity: 0, duration: 0.6, ease: 'power2.out', immediateRender: false }, t + d);
    });
    tl.fromTo(par('ctaFleche'), { x: 0 }, { x: 10, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, t + 1.3);
  }
  // Mesures du CTA (après chargement des polices) : taille de l'onde, centre du point du i.
  function mesurerCta() {
    var b = par('ctaBouton'), onde = par('ctaOnde');
    onde.style.width = b.offsetWidth + 'px';
    onde.style.height = b.offsetHeight + 'px';
    var point = par('logoPoint'), pos = positionDans(point, par('stage'));
    return { x: pos.x + point.offsetWidth / 2, y: pos.y + point.offsetHeight / 2 };
  }

  // Fond de carte commun : îlots, rues, bâti, local surligné, passants.
  function dessinerVille(ctx, ville, cam, t, o) {
    var s = cam.s, i;
    o = o || {};
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 1080, 1920);
    ctx.setTransform(s, 0, 0, s, cam.ax - cam.x * s, cam.ay - cam.y * s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fillStyle = '#e7e1d9';
    ctx.beginPath();
    for (i = 0; i < ville.cells.length; i++) ville.tracePoly(ctx, ville.cells[i]);
    ctx.fill();
    ctx.strokeStyle = '#fcfaf7';
    ville.widthBuckets.forEach(function (B) {
      ctx.lineWidth = B.w;
      ctx.beginPath();
      B.list.forEach(function (e) { ville.traceCor(ctx, e); });
      ctx.stroke();
    });
    ctx.save();
    ctx.translate(1.2 / s, 3.2 / s);
    ctx.fillStyle = 'rgba(23, 19, 16, 0.07)';
    ctx.beginPath();
    for (i = 0; i < ville.lots.length; i++) if (ville.lots[i].bld) ville.tracePoly(ctx, ville.lots[i].bld);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fefbf9';
    ctx.beginPath();
    for (i = 0; i < ville.lots.length; i++) if (ville.lots[i].bld) ville.tracePoly(ctx, ville.lots[i].bld);
    ctx.fill();
    if (o.apresBati) o.apresBati(ctx, s);
    ctx.strokeStyle = 'rgba(69, 62, 58, 0.2)';
    ctx.lineWidth = 1.3 / s;
    ctx.beginPath();
    for (i = 0; i < ville.lots.length; i++) if (ville.lots[i].bld) ville.tracePoly(ctx, ville.lots[i].bld);
    ctx.stroke();
    if (o.surbrillance > 0 && o.cible) {
      ctx.globalAlpha = o.surbrillance;
      ctx.fillStyle = '#fbe6de';
      ctx.strokeStyle = '#a55535';
      ctx.lineWidth = 4 / s;
      ctx.beginPath(); ville.tracePoly(ctx, o.cible.bld); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var idx = t / ville.trackDt, i0 = Math.floor(idx), fr = idx - i0;
    ctx.fillStyle = 'rgba(165, 85, 53, 0.55)';
    ctx.beginPath();
    for (var a = 0; a < ville.tracks.length; a++) {
      var tr = ville.tracks[a], n = tr.length / 2 - 1, j0 = Math.min(i0, n), j1 = Math.min(i0 + 1, n);
      ctx.rect(tr[j0 * 2] + (tr[j1 * 2] - tr[j0 * 2]) * fr - 2.2, tr[j0 * 2 + 1] + (tr[j1 * 2 + 1] - tr[j0 * 2 + 1]) * fr - 2.2, 4.4, 4.4);
    }
    ctx.fill();
  }
  // Parcelle bâtie la plus proche d'un repère (le « local » des vidéos).
  function choisirLocal(ville, repere) {
    var cible = null, meilleur = Infinity;
    ville.lots.forEach(function (l) {
      if (!l.bld || l.area < 1800 || l.area > 5200) return;
      var d = Math.hypot(l.cx - repere[0], l.cy - repere[1]);
      if (d < meilleur) { meilleur = d; cible = l; }
    });
    return cible;
  }

  window.PignonOutils = {
    cubicBezier: cubicBezier,
    STANDARD: STANDARD,
    RESSORT: RESSORT,
    CAMERA: CAMERA,
    SORTIE: SORTIE,
    decouperMots: decouperMots,
    decouperCaracteres: decouperCaracteres,
    positionDans: positionDans,
    piloter: piloter,
    titres: titres,
    etatsInitiaux: etatsInitiaux,
    finCta: finCta,
    mesurerCta: mesurerCta,
    dessinerVille: dessinerVille,
    choisirLocal: choisirLocal
  };
})();
