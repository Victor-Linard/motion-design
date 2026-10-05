/*
 * Pignon — « Insights IA v2 », 25 s, 1080 x 1920 (9:16).
 * D'après trois sessions réelles, reformulées et sans adresse : une comparaison menée en
 * plusieurs tours (questions, réponse chiffrée, synthèse en 3 points), l'explication du
 * panneau d'un lieu, l'aide sur un outil.
 */
(function () {
  'use strict';

  var DUREE = 25;
  if (new URLSearchParams(location.search).has('render')) document.body.classList.add('render');

  var O = window.PignonOutils;
  var RESSORT = O.RESSORT, CAMERA = O.CAMERA, SORTIE = O.SORTIE, STANDARD = O.STANDARD;
  function $(id) { return document.getElementById(id); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function borner(v, a, b) { return v < a ? a : (v > b ? b : v); }

  tous('[data-mots]').forEach(function (el) { O.decouperMots(el); });
  tous('[data-mots-flux]').forEach(function (el) { O.decouperMots(el, 'flux'); });
  tous('[data-frappe]').forEach(function (el) { O.decouperCaracteres(el); });

  // Un indicateur « en train d'écrire » par réponse, posé à l'emplacement de la réponse.
  tous('.fil .bulle-a').forEach(function (r) {
    var a = document.createElement('div');
    a.className = 'bulle-attente-ia';
    a.innerHTML = '<i></i><i></i><i></i>';
    r.parentNode.appendChild(a);
    r._attente = a;
  });

  // ---------- Carte ----------
  var ville = PignonCity.build();
  var cible = O.choisirLocal(ville, [760, 1150]);
  var cam = { x: cible.cx, y: cible.cy, s: 1.6, ax: 540, ay: 960 };
  var carte = { surbrillance: 0, flou: 3 };
  var canvas = $('map'), ctx = canvas.getContext('2d'), pin = $('pin');
  function maj(t) {
    O.dessinerVille(ctx, ville, cam, t, { cible: cible, surbrillance: carte.surbrillance });
    pin.style.transform = 'translate(' + (cam.ax + (cible.cx - cam.x) * cam.s).toFixed(2) + 'px,' + (cam.ay + (cible.cy - cam.y) * cam.s).toFixed(2) + 'px)';
    canvas.style.filter = carte.flou > 0.05 ? 'blur(' + carte.flou.toFixed(2) + 'px)' : 'none';
  }

  // ---------- États initiaux ----------
  O.etatsInitiaux();
  var titres = [0, 1, 2, 3, 4].map(function (i) { return $('titre' + i); });
  var chats = ['chatComp', 'chatPoint', 'chatOutil'].map($);
  var lanceur = $('lanceur'), pinPoint = $('pinPoint');
  gsap.set($('voile'), { opacity: 0.6 });
  gsap.set(lanceur, { scale: 0 });
  gsap.set(chats, { autoAlpha: 0, scale: 0.92, y: 14 });
  gsap.set($('chatVide'), { autoAlpha: 0, y: 16 });
  gsap.set($('contexteComp'), { autoAlpha: 0, y: -10 });
  gsap.set(tous('.fil [data-pas]'), { autoAlpha: 0, scale: 0.9 });
  gsap.set(tous('.fil .flux'), { opacity: 0 });
  gsap.set(tous('.bulle-liste li, .question-retour'), { autoAlpha: 0, x: -16 });
  gsap.set(tous('.fil .bulle-attente-ia'), { autoAlpha: 0, scale: 0.6 });
  gsap.set([$('panneauStats'), $('mesChats')], { autoAlpha: 0, y: 70 });
  gsap.set(tous('.ps-ligne, .mc-ligne'), { '--surligne': 0 });
  gsap.set(pinPoint, { scale: 0 });
  gsap.set($('onde1'), { scale: 1, opacity: 0 });

  // ---------- Timeline ----------
  var tl = gsap.timeline({ paused: true, defaults: { ease: STANDARD, duration: 0.7 } });
  var T = O.titres(tl);
  var defilement = [];
  // Fait défiler le fil pour que l'élément soit entièrement visible en bas du panneau.
  function defiler(fil, el, t) {
    var cle = defilement.length;
    defilement.push({ fil: fil, el: el });
    tl.to(fil, { y: function () { return defilement[cle].y; }, duration: 0.5, ease: CAMERA }, t);
  }
  function question(el, t) {
    defiler(el.parentNode, el, t);
    tl.to(el, { autoAlpha: 1, scale: 1, duration: 0.5, ease: RESSORT }, t);
  }
  // L'assistant écrit (trois points), puis sa réponse s'affiche mot à mot.
  function reponse(el, t, sansFlux) {
    var a = el._attente;
    defiler(el.parentNode, el, t);
    tl.to(a, { autoAlpha: 1, scale: 1, duration: 0.3, ease: RESSORT }, t);
    tl.fromTo(tous('i', a), { y: 0 }, { y: -9, duration: 0.12, stagger: 0.05, yoyo: true, repeat: 1, ease: 'sine.inOut', immediateRender: false }, t + 0.04);
    tl.to(a, { autoAlpha: 0, scale: 0.6, duration: 0.14, ease: SORTIE }, t + 0.3);
    tl.to(el, { autoAlpha: 1, scale: 1, duration: 0.35 }, t + 0.32);
    if (!sansFlux) tl.to(tous('.flux', el), { opacity: 1, duration: 0.1, stagger: 0.032, ease: 'none' }, t + 0.34);
  }
  function surligner(el, t) { tl.to(el, { '--surligne': 1, duration: 0.35, ease: 'power1.out' }, t); }
  var pas = function (id) { return tous('#' + id + ' [data-pas]'); };

  tl.to($('blobPetrole'), { x: -90, y: 60, duration: DUREE, ease: 'sine.inOut' }, 0);
  tl.to($('blobTerracotta'), { x: 80, y: -70, duration: DUREE, ease: 'sine.inOut' }, 0);

  // 0 — Accroche : le bouton de l'assistant s'ouvre
  T.entrer(titres[0], 0);
  tl.to(lanceur, { scale: 1, duration: 0.55, ease: RESSORT }, 0.4);
  tl.to(lanceur, { scale: 0.9, duration: 0.12, ease: 'power1.in', yoyo: true, repeat: 1 }, 1.05);
  tl.to(chats[0], { autoAlpha: 1, scale: 1, y: 0, duration: 0.5 }, 1.2);
  tl.to($('chatVide'), { autoAlpha: 1, y: 0, duration: 0.5 }, 1.45);
  T.sortir(titres[0], 2.15);

  // 1 — Comparer deux adresses : l'IA demande d'abord ce qui compte
  var comp = pas('filComp');
  tl.to($('voile'), { opacity: 0.86, duration: 0.5, ease: 'power1.inOut' }, 2.2);
  T.entrer(titres[1], 2.35);
  tl.to($('contexteComp'), { autoAlpha: 1, y: 0, duration: 0.45 }, 2.4);
  tl.to($('chatVide'), { autoAlpha: 0, y: -16, duration: 0.3, ease: SORTIE }, 2.5);
  question(comp[0], 2.7);
  reponse(comp[1], 3.05);
  question(comp[2], 5.45);
  reponse(comp[3], 5.8);
  T.sortir(titres[1], 8.6);

  // 2 — La synthèse en 3 points, puis la question qui rend la décision à l'utilisateur
  T.entrer(titres[2], 8.8);
  question(comp[4], 9.0);
  reponse(comp[5], 9.35, true);
  tl.to(tous('.bulle-liste li'), { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.45 }, 9.75);
  tl.to(tous('.question-retour'), { autoAlpha: 1, x: 0, duration: 0.5 }, 11.2);
  T.sortir(titres[2], 13.3);
  tl.to(chats[0], { autoAlpha: 0, scale: 0.92, y: 14, duration: 0.35, ease: SORTIE }, 13.3);

  // 3 — Sur la carte : on clique, il explique le panneau
  tl.to($('voile'), { opacity: 0, duration: 0.5, ease: 'power1.inOut' }, 13.35);
  tl.to(carte, { flou: 0, duration: 0.5, ease: 'power1.inOut' }, 13.35);
  tl.to(cam, { ax: 250, ay: 780, s: 2.2, duration: 0.8, ease: CAMERA }, 13.35);
  tl.to($('fonduHaut'), { height: 700, duration: 0.7, ease: CAMERA }, 13.35);
  T.entrer(titres[3], 13.55);
  tl.to(carte, { surbrillance: 1, duration: 0.3, ease: 'none' }, 13.7);
  tl.to(pinPoint, { scale: 1, duration: 0.55, ease: RESSORT }, 13.7);
  tl.fromTo($('onde1'), { scale: 1, opacity: 0.7 }, { scale: 3.2, opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 13.8);
  tl.to($('panneauStats'), { autoAlpha: 1, y: 0, duration: 0.7 }, 13.85);
  tl.to(chats[1], { autoAlpha: 1, scale: 1, y: 0, duration: 0.5 }, 14.05);
  var point = pas('filPoint');
  tl.to(point[0], { autoAlpha: 1, scale: 1, duration: 0.4 }, 14.2);
  question(point[1], 14.35);
  reponse(point[2], 14.7);
  surligner($('ligneJeunes'), 15.15);
  surligner($('ligneCommerces'), 15.55);
  surligner($('ligneAge'), 15.85);
  T.sortir(titres[3], 17.6);
  tl.to([$('panneauStats'), chats[1]], { autoAlpha: 0, y: 50, duration: 0.4, ease: SORTIE }, 17.6);
  tl.to(pinPoint, { scale: 0, duration: 0.3, ease: SORTIE }, 17.6);

  // 4 — Dans l'app : l'historique des discussions, puis l'aide sur un outil
  tl.to($('voile'), { opacity: 0.86, duration: 0.5, ease: 'power1.inOut' }, 17.65);
  tl.to(carte, { flou: 6, surbrillance: 0, duration: 0.5, ease: 'power1.inOut' }, 17.65);
  T.entrer(titres[4], 17.85);
  tl.to($('mesChats'), { autoAlpha: 1, y: 0, duration: 0.6 }, 17.9);
  surligner($('chatOutilLigne'), 18.45);
  tl.to(chats[2], { autoAlpha: 1, scale: 1, y: 0, duration: 0.5 }, 18.6);
  var outil = pas('filOutil');
  question(outil[0], 18.8);
  reponse(outil[1], 19.1);
  T.sortir(titres[4], 21.6);
  tl.to([$('mesChats'), chats[2]], { autoAlpha: 0, y: -40, duration: 0.4, ease: SORTIE, stagger: 0.05 }, 21.6);

  // 5 — Appel à l'action : le bouton de l'assistant devient le point du i
  tl.to($('logoPetit'), { opacity: 0, duration: 0.3, ease: 'none' }, 21.6);
  tl.to($('voile'), { opacity: 0.78, duration: 0.7, ease: 'power1.inOut' }, 21.7);
  tl.to(carte, { flou: 0, duration: 0.7, ease: 'power1.inOut' }, 21.7);
  tl.to($('fonduHaut'), { height: 0, duration: 0.7, ease: 'power1.inOut' }, 21.7);
  tl.to(cam, { s: 1.2, ax: 540, ay: 960, duration: 3.2, ease: 'sine.inOut' }, 21.8);
  tl.to(lanceur.querySelector('svg'), { opacity: 0, duration: 0.2, ease: 'none' }, 22.0);
  var vol = { x: 0, y: 0 };
  tl.to(lanceur, { x: function () { return vol.x; }, duration: 0.65, ease: 'power2.in' }, 22.0);
  tl.to(lanceur, { y: function () { return vol.y; }, duration: 0.65, ease: 'power2.out' }, 22.0);
  tl.to(lanceur, { scale: 41.4 / 116, boxShadow: '0 0 0 rgba(11, 8, 7, 0)', duration: 0.65, ease: CAMERA }, 22.0);
  tl.set(lanceur, { autoAlpha: 0 }, 22.65);
  O.finCta(tl, 22.65);
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
      var pointI = O.mesurerCta(), l = O.positionDans(lanceur, $('stage'));
      vol.x = pointI.x - (l.x + lanceur.offsetWidth / 2);
      vol.y = pointI.y - (l.y + lanceur.offsetHeight / 2);
      tous('.fil .bulle-a').forEach(function (r) { r._attente.style.top = r.offsetTop + 'px'; });
      defilement.forEach(function (d) {
        var visible = d.fil.parentNode.clientHeight - 28;
        d.y = -Math.max(0, d.el.offsetTop + d.el.offsetHeight + 24 - visible);
      });
    }
  });
})();
