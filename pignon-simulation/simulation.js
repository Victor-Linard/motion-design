/*
 * Pignon — « Simulations », 21,5 s, 1080 x 1920 (9:16).
 * Exemple de boulangerie, chiffres cohérents d'une scène à l'autre :
 * CA = clients × panier × jours ; résultat = CA × (1 − achats) − charges fixes.
 */
(function () {
  'use strict';

  var DUREE = 21.5;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE, STANDARD = O.STANDARD;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function formater(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });

  // ---------- Modèle de l'exemple ----------
  var JOURS = 282, ACHATS = 0.32, FIXES = 24000 + 14000 + 31000 + 36000;
  function resultat(clients, panier, achats, loyerMois) {
    return clients * panier * JOURS * (1 - achats) - (FIXES - 24000 + loyerMois * 12);
  }
  var BASE = resultat(150, 7, ACHATS, 2000);
  var VARIABLES = [
    { nom: 'Clients / jour', plage: '120 → 180', lo: resultat(120, 7, ACHATS, 2000), hi: resultat(180, 7, ACHATS, 2000) },
    { nom: 'Panier moyen', plage: '6 → 8 €', lo: resultat(150, 6, ACHATS, 2000), hi: resultat(150, 8, ACHATS, 2000) },
    { nom: 'Achats', plage: '36 → 28 % du CA', lo: resultat(150, 7, 0.36, 2000), hi: resultat(150, 7, 0.28, 2000) },
    { nom: 'Loyer', plage: '2 400 → 1 800 €', lo: resultat(150, 7, ACHATS, 2400), hi: resultat(150, 7, ACHATS, 1800) }
  ];
  var AXE = [40000, 150000];
  function pct(v) { return (v - AXE[0]) / (AXE[1] - AXE[0]) * 100; }
  var barres = [];
  VARIABLES.forEach(function (v) {
    var l = document.createElement('div');
    l.className = 'tn-ligne';
    l.innerHTML = '<p class="tn-nom">' + v.nom + '<small style="display:block;font-size:20px;color:#605955;font-weight:400">' + v.plage + '</small></p>'
      + '<div class="tn-zone"><span class="tn-barre"></span><span class="tn-zero"></span></div>';
    var b = l.querySelector('.tn-barre');
    b.style.left = pct(v.lo) + '%';
    b.style.width = (pct(v.hi) - pct(v.lo)) + '%';
    b.style.setProperty('--origine', ((BASE - v.lo) / (v.hi - v.lo) * 100) + '%');
    l.querySelector('.tn-zero').style.left = pct(BASE) + '%';
    $('tornade').appendChild(l);
    barres.push(b);
  });

  // ---------- Fond : carte figée sous un voile ----------
  var ville = PignonCity.build();
  var cam = { x: 760, y: 1150, s: 1.35, ax: 540, ay: 960 };
  var canvas = $('map'), ctx = canvas.getContext('2d');
  canvas.style.filter = 'blur(3px)';

  var pointVol = $('pointVol'), depart = { x: 540, y: 1300 }, pointI = { x: 540, y: 620 }, vol = { u: 0 };
  var compteurs = [{ el: $('nCa'), v: 0 }, { el: $('nRes'), v: 0 }];
  function maj(t) {
    O.dessinerVille(ctx, ville, cam, t, {});
    compteurs.forEach(function (k) { k.el.textContent = formater(k.v); });
    var u = vol.u, w = 1 - u, kx = Math.min(depart.x, pointI.x) - 160, ky = Math.min(depart.y, pointI.y) - 140;
    var x = w * w * depart.x + 2 * w * u * kx + u * u * pointI.x, y = w * w * depart.y + 2 * w * u * ky + u * u * pointI.y;
    pointVol.style.left = x.toFixed(2) + 'px';
    pointVol.style.top = y.toFixed(2) + 'px';
  }

  // ---------- États initiaux ----------
  O.etatsInitiaux();
  var titres = [0, 1, 2, 3, 4].map(function (i) { return $('titre' + i); });
  var cartes = ['carteOutils', 'carteFormule', 'carteCharges', 'carteVerdict'].map($);
  gsap.set(cartes, { autoAlpha: 0, y: 80 });
  gsap.set(tous('.tuile'), { autoAlpha: 0, y: 24 });
  gsap.set($('tuileFrequentation').querySelector('.tuile-coche'), { scale: 0 });
  gsap.set(tous('#carteFormule .facteur, #carteFormule .fois'), { autoAlpha: 0, scale: 0.7 });
  gsap.set($('variable'), { autoAlpha: 0, scale: 0.6 });
  gsap.set([$('lCa'), $('fourchetteCa')], { autoAlpha: 0, y: 16 });
  gsap.set($('bandeCa'), { scaleX: 0 });
  gsap.set(tous('.ch-ligne'), { autoAlpha: 0, x: -20 });
  gsap.set(tous('.statuts span'), { autoAlpha: 0, scale: 0.8 });
  gsap.set($('seuil'), { autoAlpha: 0, y: 16 });
  gsap.set(tous('.tn-ligne'), { autoAlpha: 0 });
  gsap.set(barres, { scaleX: 0 });
  gsap.set(pointVol, { scale: 0 });

  // ---------- Timeline ----------
  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
  var T = O.titres(tl);
  function entrer(el, t) { tl.to(el, { autoAlpha: 1, y: 0, duration: 0.7 }, t); }
  function sortir(el, t) { tl.to(el, { autoAlpha: 0, y: -50, duration: 0.4, ease: SORTIE }, t); }

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to(cam, { s: 1.2, x: 700, duration: DUREE, ease: 'none' }, 0);

  // 0 — Accroche
  T.entrer(titres[0], 0);
  tl.fromTo(tous('#puces span'), { autoAlpha: 0, y: 40, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.18, ease: RESSORT }, 0.55);
  tl.to(tous('#puces span'), { autoAlpha: 0, y: -30, duration: 0.35, stagger: 0.05, ease: SORTIE }, 2.2);
  T.sortir(titres[0], 2.25);

  // 1 — Vos recettes : l'outil qui correspond au métier
  T.entrer(titres[1], 2.45);
  entrer(cartes[0], 2.55);
  tl.to(tous('.tuile'), { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.09 }, 2.8);
  tl.to($('tuileFrequentation'), { borderColor: '#00494a', backgroundColor: '#ecf8f7', scale: 1.03, duration: 0.35, ease: RESSORT }, 3.85);
  tl.to($('tuileFrequentation').querySelector('.tuile-coche'), { scale: 1, duration: 0.4, ease: RESSORT }, 3.95);
  tl.to(tous('.tuile:not(#tuileFrequentation)'), { opacity: 0.4, duration: 0.3, ease: 'none' }, 4.05);
  T.sortir(titres[1], 5.9);
  sortir(cartes[0], 5.9);

  // 2 — Vos hypothèses : une valeur fixe, puis une fourchette
  T.entrer(titres[2], 6.1);
  entrer(cartes[1], 6.15);
  tl.to(tous('#carteFormule .facteur, #carteFormule .fois'), { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.09, ease: RESSORT }, 6.45);
  tl.to($('lCa'), { autoAlpha: 1, y: 0, duration: 0.5 }, 7.0);
  tl.to(compteurs[0], { v: 296100, duration: 0.9, ease: 'power2.out' }, 7.05);
  tl.to($('variable'), { autoAlpha: 1, scale: 1, duration: 0.45, ease: RESSORT }, 8.0);
  tl.to($('fClients'), { boxShadow: '0 0 0 3px #00494a', duration: 0.3, ease: 'none' }, 8.0);
  tl.to($('fourchetteCa'), { autoAlpha: 1, y: 0, duration: 0.5 }, 8.25);
  tl.to($('bandeCa'), { scaleX: 1, duration: 0.7 }, 8.45);
  T.sortir(titres[2], 10.15);
  sortir(cartes[1], 10.15);

  // 3 — Charges et statut
  T.entrer(titres[3], 10.35);
  entrer(cartes[2], 10.4);
  tl.to(tous('.ch-ligne'), { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.18 }, 10.7);
  tl.to(tous('.statuts span'), { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.07, ease: RESSORT }, 11.55);
  tl.to($('statutSas'), { backgroundColor: '#00494a', borderColor: '#00494a', color: '#fefbf9', duration: 0.3, ease: 'none' }, 12.3);
  tl.fromTo($('statutSas'), { scale: 1 }, { scale: 1.08, duration: 0.16, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, 12.3);
  T.sortir(titres[3], 14.15);
  sortir(cartes[2], 14.15);

  // 4 — Le verdict : résultat, seuil de rentabilité, sensibilité
  T.entrer(titres[4], 14.35);
  entrer(cartes[3], 14.4);
  tl.to(compteurs[1], { v: BASE, duration: 1.0, ease: 'power2.out' }, 14.7);
  tl.to($('seuil'), { autoAlpha: 1, y: 0, duration: 0.5, ease: RESSORT }, 15.3);
  tl.to(tous('.tn-ligne'), { autoAlpha: 1, duration: 0.3, stagger: 0.15, ease: 'none' }, 15.8);
  tl.to(barres, { scaleX: 1, duration: 0.6, stagger: 0.15, ease: 'power2.out' }, 15.85);
  T.sortir(titres[4], 18.4);
  sortir(cartes[3], 18.4);

  // 5 — Appel à l'action
  tl.to($('logoPetit'), { opacity: 0, duration: 0.3, ease: 'none' }, 18.4);
  tl.to($('voile'), { opacity: 0.78, duration: 0.6, ease: 'power1.inOut' }, 18.45);
  tl.to(pointVol, { scale: 1, duration: 0.4, ease: RESSORT }, 18.85);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 19.05);
  tl.to(pointVol, { width: 41.4, height: 41.4, marginLeft: -20.7, marginTop: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 19.05);
  tl.set(pointVol, { autoAlpha: 0 }, 19.65);
  O.finCta(tl, 19.65);
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
      var s = $('seuil'), p = O.positionDans(s, $('stage'));
      depart = { x: p.x + 45, y: p.y + 46 };
    }
  });
})();
