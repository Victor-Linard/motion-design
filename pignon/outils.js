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

  window.PignonOutils = {
    cubicBezier: cubicBezier,
    STANDARD: cubicBezier(0.16, 1, 0.3, 1),
    RESSORT: cubicBezier(0.34, 1.56, 0.64, 1),
    CAMERA: cubicBezier(0.65, 0, 0.35, 1),
    SORTIE: 'power2.in',
    decouperMots: decouperMots,
    decouperCaracteres: decouperCaracteres,
    positionDans: positionDans,
    piloter: piloter
  };
})();
