/*
 * Position du soleil (formules NOAA, précision de l'ordre du degré) pour Rouen, en 2026.
 * jour : 0 = 1er janvier (comme le curseur Saison de la carte, 0 à 364) ; heure : heure légale.
 */
(function () {
  'use strict';

  var LAT = 49.443, LON = 1.099;
  var RAD = Math.PI / 180;
  // Heure d'été 2026 : du 29 mars (jour 87) au 25 octobre (jour 297).
  function decalageUTC(jour) { return jour >= 87 && jour < 297 ? 2 : 1; }

  function position(jour, heure) {
    var utc = heure - decalageUTC(jour);
    var g = 2 * Math.PI / 365 * (jour + (utc - 12) / 24);
    var eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
      + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var tsv = utc * 60 + eqt + 4 * LON;             // temps solaire vrai, en minutes
    var ha = (tsv / 4 - 180) * RAD;                 // angle horaire
    var phi = LAT * RAD;
    var sinEl = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
    var el = Math.asin(sinEl);
    // Azimut compté depuis le nord, dans le sens horaire.
    var az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) + Math.PI;
    return { elevation: el / RAD, azimut: az / RAD };
  }

  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var LONGUEURS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function date(jour) {
    var j = Math.round(jour), m = 0;
    while (m < 11 && j >= LONGUEURS[m]) { j -= LONGUEURS[m]; m++; }
    return (j + 1) + ' ' + MOIS[m];
  }

  window.PignonSoleil = { position: position, date: date };
})();
