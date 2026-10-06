/*
 * Pignon — teaser 3, 16,2 s, 1080 x 1920 (9:16). Une seule façade, de 1992 à aujourd'hui en
 * accéléré : 8 commerces se succèdent, 4 disparaissent en moins de 2 ans (exemple publié sur
 * le site). Les métiers, les dates exactes et les enseignes sont illustratifs.
 */
(function () {
  'use strict';

  var DUREE = 16.2;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });

  // ---------- Les occupants successifs (illustratifs : 8 ouvertures, 4 de moins de 2 ans) ----------
  var ICONES = {
    pain: '<path d="M14 64c0-20 16-32 36-32s36 12 36 32z"/><path d="M34 40l-6 14M50 36v18M66 40l6 14"/>',
    video: '<rect x="14" y="30" width="72" height="42" rx="6"/><circle cx="36" cy="51" r="9"/><circle cx="64" cy="51" r="9"/>',
    mobile: '<rect x="34" y="14" width="32" height="72" rx="7"/><line x1="46" y1="76" x2="54" y2="76"/>',
    crepe: '<circle cx="50" cy="52" r="32"/><circle cx="50" cy="52" r="18"/><circle cx="50" cy="52" r="6"/>',
    livre: '<path d="M50 30v52M50 30c-10-8-24-8-34-4v52c10-4 24-4 34 4M50 30c10-8 24-8 34-4v52c-10-4-24-4-34 4"/>',
    jus: '<path d="M30 30h40l-6 56H36z"/><path d="M56 30l10-18"/><line x1="33" y1="48" x2="67" y2="48"/>',
    fripe: '<path d="M36 18l-22 14 10 16 10-6v42h32V42l10 6 10-16-22-14c-2 8-8 12-14 12s-12-4-14-12z"/>',
    tasse: '<path d="M24 40h44v18a22 22 0 0 1-44 0z"/><path d="M68 46h6a9 9 0 0 1 0 18h-8"/><path d="M38 18c0 6 6 6 6 12M52 18c0 6 6 6 6 12"/>'
  };
  var OCCUPANTS = [
    { nom: 'Boulangerie', police: 'italic 400 76px Newsreader', fond: '#f6ecd8', texte: '#86422a', couleurs: ['#a55535', '#fbf3ea'], motif: 'pain', debut: 1992.0, fin: 2001.0 },
    { nom: 'VIDÉO CLUB', police: '700 68px "Bricolage Grotesque"', fond: '#2a2522', texte: '#f2cfc0', couleurs: ['#453e3a', '#807973'], motif: 'video', debut: 2001.3, fin: 2002.6 },
    { nom: 'Téléphonie', police: '600 64px "IBM Plex Sans"', fond: '#086b6c', texte: '#fefbf9', couleurs: ['#086b6c', '#d6eded'], motif: 'mobile', debut: 2003.2, fin: 2008.0 },
    { nom: 'Crêperie', police: 'italic 400 78px Newsreader', fond: '#fbe6de', texte: '#a55535', couleurs: ['#d08b6c', '#fdf3ef'], motif: 'crepe', debut: 2008.3, fin: 2009.3 },
    { nom: 'Librairie', police: '400 74px Newsreader', fond: '#003839', texte: '#f6ecd8', couleurs: ['#00494a', '#b4dad9'], motif: 'livre', debut: 2010.0, fin: 2016.0 },
    { nom: 'Bar à jus', police: '700 68px "Bricolage Grotesque"', fond: '#c08a2e', texte: '#fefbf9', couleurs: ['#e5b099', '#fdf3ef'], motif: 'jus', debut: 2016.4, fin: 2017.6 },
    { nom: 'FRIPERIE', police: '500 62px "IBM Plex Mono"', fond: '#fefbf9', texte: '#2a2522', couleurs: ['#605955', '#e2ddd8'], motif: 'fripe', debut: 2018.2, fin: 2019.3 },
    { nom: 'Café', police: 'italic 400 80px Newsreader', fond: '#00494a', texte: '#fefbf9', couleurs: ['#00494a', '#fefbf9'], motif: 'tasse', debut: 2020.0, fin: 2025.4 }
  ];
  var AN0 = 1992, AN1 = 2026, T0 = 1.2, T1 = 10.2;
  function temps(an) { return T0 + (an - AN0) / (AN1 - AN0) * (T1 - T0); }

  OCCUPANTS.forEach(function (o) {
    o.court = o.fin - o.debut < 2;
    o.enseigne = document.createElement('span');
    o.enseigne.className = 'enseigne';
    o.enseigne.style.cssText = 'background:' + o.fond + ';color:' + o.texte + ';font:' + o.police;
    o.enseigne.textContent = o.nom;
    $('enseignes').appendChild(o.enseigne);
    o.store = document.createElement('span');
    o.store.className = 'store';
    o.store.style.background = 'repeating-linear-gradient(90deg,' + o.couleurs[0] + ' 0 46px,' + o.couleurs[1] + ' 46px 92px)';
    $('stores').appendChild(o.store);
    o.icone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    o.icone.setAttribute('viewBox', '0 0 100 100');
    o.icone.style.stroke = o.couleurs[0];
    o.icone.innerHTML = ICONES[o.motif];
    $('vitre').appendChild(o.icone);
    o.segment = document.createElement('span');
    o.segment.style.cssText = 'left:' + ((o.debut - AN0) / (AN1 - AN0) * 100) + '%;width:' + ((o.fin - o.debut) / (AN1 - AN0) * 100) + '%;background:' + (o.court ? '#a55535' : '#086b6c');
    $('frisePiste').appendChild(o.segment);
  });
  // Dernière enseigne : la place est libre
  var etVous = document.createElement('span');
  etVous.className = 'enseigne';
  etVous.style.cssText = 'background:#fefbf9;color:#00494a;font:italic 400 80px Newsreader;border:4px dashed #88bdbc';
  etVous.textContent = 'Et vous ?';
  $('enseignes').appendChild(etVous);

  var annee = { v: AN0 }, pointVol = $('pointVol'), depart = { x: 760, y: 980 }, pointI = { x: 540, y: 620 }, vol = { u: 0 };
  function maj() {
    $('annee').textContent = Math.floor(annee.v + 1e-6);
    var u = vol.u, w = 1 - u, kx = Math.min(depart.x, pointI.x) - 160, ky = Math.min(depart.y, pointI.y) - 140;
    pointVol.style.left = (w * w * depart.x + 2 * w * u * kx + u * u * pointI.x).toFixed(2) + 'px';
    pointVol.style.top = (w * w * depart.y + 2 * w * u * ky + u * u * pointI.y).toFixed(2) + 'px';
  }

  // ---------- États initiaux ----------
  O.etatsInitiaux();
  var titres = [$('titre0'), $('titre1')];
  OCCUPANTS.forEach(function (o) {
    gsap.set([o.enseigne, o.icone], { autoAlpha: 0 });
    gsap.set(o.store, { scaleY: 0 });
    gsap.set(o.segment, { scaleX: 0 });
  });
  gsap.set(etVous, { autoAlpha: 0, scale: 0.9 });
  gsap.set($('rideau'), { scaleY: 1 });
  gsap.set($('friseLegende'), { autoAlpha: 0, y: 12 });
  gsap.set([$('facade'), $('trottoir'), $('annee'), $('frise')], { autoAlpha: 0, y: 40 });
  gsap.set(pointVol, { scale: 0 });

  var tl = gsap.timeline({ paused: true, defaults: { ease: O.STANDARD, duration: 0.7 } });
  var T = O.titres(tl);
  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);

  // Accroche : la façade, rideau baissé
  T.entrer(titres[0], 0);
  tl.to([$('facade'), $('trottoir')], { autoAlpha: 1, y: 0, duration: 0.7 }, 0.2);
  tl.to([$('annee'), $('frise')], { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.45);

  // 1992 → 2026 en accéléré : chaque occupant lève le rideau, puis le baisse
  tl.to(annee, { v: AN1, duration: T1 - T0, ease: 'none' }, T0);
  OCCUPANTS.forEach(function (o) {
    var ts = temps(o.debut), te = temps(o.fin);
    tl.set([o.enseigne, o.icone], { autoAlpha: 1 }, ts);
    tl.set($('aLouer'), { autoAlpha: 0 }, ts);
    tl.to($('rideau'), { scaleY: 0, duration: 0.16, ease: 'power2.out' }, ts);
    tl.to(o.store, { scaleY: 1, duration: 0.18, ease: 'power2.out' }, ts + 0.04);
    tl.to(o.segment, { scaleX: 1, duration: te - ts, ease: 'none' }, ts);
    tl.to(o.store, { scaleY: 0, duration: 0.12, ease: 'power2.in' }, te - 0.12);
    tl.to($('rideau'), { scaleY: 1, duration: 0.14, ease: 'power2.in' }, te - 0.14);
    tl.set([o.enseigne, o.icone], { autoAlpha: 0 }, te);
    tl.set($('aLouer'), { autoAlpha: 1 }, te);
  });
  T.sortir(titres[0], 9.9);

  // Arrêt sur image : 8 commerces, 4 n'ont pas tenu 2 ans
  T.entrer(titres[1], 10.35);
  tl.to($('friseLegende'), { autoAlpha: 1, y: 0, duration: 0.5 }, 10.6);
  tl.fromTo(OCCUPANTS.filter(function (o) { return o.court; }).map(function (o) { return o.segment; }),
    { scaleY: 1 }, { scaleY: 1.5, duration: 0.18, stagger: 0.1, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, 11.0);
  T.sortir(titres[1], 12.5);

  // La place est libre : « Et vous ? »
  tl.to(etVous, { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, 12.6);
  tl.set($('aLouer'), { autoAlpha: 0 }, 12.75);
  tl.to($('rideau'), { scaleY: 0, duration: 0.4, ease: 'power2.out' }, 12.75);

  // Appel à l'action : le point de l'enseigne devient le point du i
  tl.to(pointVol, { scale: 1, duration: 0.35, ease: RESSORT }, 13.15);
  tl.to([$('facade'), $('trottoir'), $('annee'), $('frise')], { autoAlpha: 0, y: 40, duration: 0.4, stagger: 0.04, ease: SORTIE }, 13.3);
  tl.to(vol, { u: 1, duration: 0.6, ease: CAMERA }, 13.4);
  tl.to(pointVol, { width: 41.4, height: 41.4, marginLeft: -20.7, marginTop: -20.7, borderWidth: 0, boxShadow: 'rgba(0, 56, 57, 0) 0px 0px 0px 0px', duration: 0.6, ease: CAMERA }, 13.4);
  tl.set(pointVol, { autoAlpha: 0 }, 14.0);
  O.finCta(tl, 14.0);
  tl.set({}, {}, DUREE);

  function allerA(t) {
    t = borner(t, 0, DUREE);
    tl.seek(t, true);
    maj();
    return t;
  }
  O.piloter({
    duree: DUREE, allerA: allerA,
    preparer: function () {
      pointI = O.mesurerCta();
      var e = $('enseignes'), p = O.positionDans(e, $('stage'));
      depart = { x: p.x + e.offsetWidth / 2 + 210, y: p.y + e.offsetHeight / 2 + 22 };
    }
  });
})();
