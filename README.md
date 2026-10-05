# motion-design

Motion designs codés en HTML/CSS/GSAP, rendus image par image en MP4 (Playwright + ffmpeg).

## Pignon — 15 s, 9:16

**Vidéo : [`renders/pignon-15s-9x16.mp4`](renders/pignon-15s-9x16.mp4)** — 1080 × 1920, 60 i/s, H.264 (BT.709), sans piste son.
Couverture : [`renders/pignon-couverture.png`](renders/pignon-couverture.png).

![Planche](renders/pignon-planche.png)

| Temps | Scène | Contenu |
|---|---|---|
| 0 – 2,1 s | Accroche | « Chaque adresse a quelque chose à cacher. » Un clic sur la carte fait apparaître le point sur le local. |
| 2,1 – 4,6 s | 01 · L’adresse | « Qui a tenu ici ? » Survie du métier : 63 % (fourchette 51 à 74 %) et historique du local : huit ouvertures depuis 1992. |
| 4,6 – 7,1 s | 02 · Autour du point | « Jusqu’où à 10 minutes ? » Isochrone à pied calculée sur le réseau de rues, concurrents, 10 790 hab. et 3 800 €/m². |
| 7,1 – 9,4 s | 03 · Le comparateur | « Vos adresses, côte à côte. » Fourchettes qui se chevauchent, donc écart non établi. |
| 9,4 – 11,7 s | 04 · L’assistant | « Pourquoi, pas juste combien. » Une question et la réponse d’Insights IA. |
| 11,7 – 15 s | Appel à l’action | Le point de la carte devient le point du i du logo. « Le bail dure trois ans. Le clic prend trois secondes. », bouton « Explorer la carte → », « Compte gratuit, sans carte bancaire. », pignon.webapp.lv |

### Charte reprise

Source : webarchive de la page Carte de pignon.webapp.lv, plus des captures du site.

- **Couleurs** : les tokens de `pignon-tokens.css`. Terracotta 600 `#a55535` (actions, logo), pétrole 600 `#00494a` (données, point du i), neutres chauds `#f9f6f2` / `#fefbf9`, couleurs du comparateur `#00958f` / `#b54628`.
- **Typographies** : Newsreader (titres), IBM Plex Sans (interface), IBM Plex Mono (chiffres, surtitres), Bricolage Grotesque 700 (logo). Toutes sous licence OFL et incluses dans `pignon/fonts/`.
- **Logo** : reconstruit comme `.pgn-logo` du site (P, i dessiné, gnon).
- **Mouvement** : les courbes `--pgn-easing-standard` et `--pgn-easing-ressort`.
- **Carte** : l’algorithme du fond « rue » du site (`pignon-rue-bg.js`), étiré en portrait et rendu déterministe.
- **Textes** : repris du site (accroche, rubriques, CTA, réponse de l’assistant).

### Données

Les chiffres viennent de l’exemple publié sur le site (Place du Vieux-Marché, Rouen). Trois éléments sont illustratifs : la position des huit ouvertures sur la frise (cohérente avec les textes du site), les valeurs du « Local B » dans le comparateur, et la carte, qui est procédurale et ne représente pas Rouen.

## Pignon · ombres portées — 15 s, 9:16

**Vidéo : [`renders/pignon-ombres-15s-9x16.mp4`](renders/pignon-ombres-15s-9x16.mp4)** — 1080 × 1920, 60 i/s, sans son.
Couverture : [`renders/pignon-ombres-couverture.png`](renders/pignon-ombres-couverture.png).

![Planche](renders/pignon-ombres-planche.png)

| Temps | Scène | Contenu |
|---|---|---|
| 0 – 2,1 s | Accroche | « Votre terrasse, au soleil ou à l’ombre ? » La terrasse se dessine devant le local. |
| 2,1 – 6,4 s | 01 · L’heure | Le panneau « Ombres portées » de la carte. Le curseur Heure avance par pas d’une heure, de 8 h à 19 h le 21 juin ; les ombres tournent et la pastille passe de « À l’ombre » à « Au soleil ». |
| 6,4 – 9,6 s | 02 · La saison | « Et le 21 décembre à 15 h ? » Le curseur Saison glisse du 21 juin au 21 décembre ; les ombres s’allongent. |
| 9,6 – 11,7 s | 03 · Toute l’année | Bilan : soleil sur la terrasse de 8 h à 19 h, aux deux équinoxes et aux deux solstices. |
| 11,7 – 15 s | Appel à l’action | Le point de la terrasse devient le point du i. « Le bail dure trois ans. Le soleil, lui, tourne. », « Explorer la carte → » |

Les ombres ne sont pas animées à la main : chaque image calcule la position du soleil à Rouen pour la date et l’heure affichées (`pignon-ombres/soleil.js`, formules NOAA, heure d’été 2026), puis projette chaque bâtiment au sol selon sa hauteur. L’état de la pastille et le bilan viennent du même calcul. Les bâtiments, leurs hauteurs (9 à 24 m) et la terrasse sont fictifs : la terrasse est choisie automatiquement pour que soleil et ombre s’y relaient. Le panneau reprend `.pgn-panneau-ombres` (curseur Saison de 0 à 364, curseur Heure de 8 h à 19 h, repères et icônes du site). La phrase « Le soleil, lui, tourne. » est une proposition, elle n’est pas reprise du site.

## Pignon · Insights IA — 15 s, 9:16

**Vidéo : [`renders/pignon-ia-15s-9x16.mp4`](renders/pignon-ia-15s-9x16.mp4)** — 1080 × 1920, 60 i/s, sans son.
Couverture : [`renders/pignon-ia-couverture.png`](renders/pignon-ia-couverture.png).

![Planche](renders/pignon-ia-planche.png)

| Temps | Scène | Contenu |
|---|---|---|
| 0 – 2 s | Accroche | « Vos données, expliquées en français courant. » Le bouton de l’assistant s’ouvre en panneau Insights IA, comme sur la carte. |
| 2 – 5,6 s | 01 · Les stats d’un lieu | Un clic sur la carte ouvre le panneau Voisinage ; l’IA l’explique et chaque ligne citée s’allume. |
| 5,6 – 9,2 s | 02 · Le comparateur | Projet de boulangerie, clients en voiture : l’IA tranche sur ce critère (parking à 47 m contre 299 m) et signale la concurrence. |
| 9,2 – 12,1 s | 03 · Les outils | « Comment voir ma concurrence ? » L’IA explique l’outil Concurrence pendant que la carte le montre : bouton, rayon, commerces. |
| 12,1 – 15 s | Appel à l’action | Le bouton de l’assistant devient le point du i. « Demandez-lui. Il explique pourquoi, pas juste combien. » (texte du site) |

Les échanges s’inspirent de trois sessions réelles, reformulées et raccourcies. Les chiffres viennent de ces sessions ; aucune adresse n’est citée (les deux emplacements comparés deviennent « Local A » et « Local B »). Le widget reprend `pignon-chat.css` : bouton rond pétrole, en-tête pétrole, bulles pétrole-100 pour l’assistant et neutre-100 pour l’utilisateur. Les commerces qui apparaissent dans le rayon sont illustratifs.

## Pignon · tuto « De la carte à la décision » — 20 s, 9:16

**Vidéo : [`renders/pignon-tuto-20s-9x16.mp4`](renders/pignon-tuto-20s-9x16.mp4)** — 1080 × 1920, 60 i/s, sans son.
Couverture : [`renders/pignon-tuto-couverture.png`](renders/pignon-tuto-couverture.png).

![Planche](renders/pignon-tuto-planche.png)

| Temps | Étape | Contenu |
|---|---|---|
| 0 – 2 s | Accroche | « De la carte à la décision. » (texte du site) et la progression en 4 étapes. |
| 2 – 4,9 s | 1 · Cliquez sur une adresse | Le curseur clique un local : le point apparaît, le panneau s’ouvre. |
| 4,9 – 8,9 s | 2 · Verrouillez-la : elle s’enregistre | Au survol du bouton IA, l’info-bulle de l’app : « Enregistrez ce point avant de pouvoir en discuter avec Insights IA. » Clic sur le cadenas : point verrouillé et enregistré, le bouton IA s’active. |
| 8,9 – 12,8 s | 3 · Parlez-en à l’IA | Le point enregistré est joint à la discussion ; question et réponse chiffrée. |
| 12,8 – 17,3 s | 4 · Comparez, puis partagez | Mes analyses : deux sessions cochées, « Comparer les analyses cochées », puis partage en lecture ou en modification. |
| 17,3 – 20 s | Appel à l’action | La dernière étape validée devient le point du i. « Enregistrez vos points, parlez-en à l’IA. », « Créer un compte gratuit → » |

Parcours et libellés repris de l’app (cadenas du panneau, message d’Insights IA sur l’enregistrement, Mes analyses, « Comparer les analyses cochées ») et du site (« Invitez vos associés à lire ou à modifier », « Pignon vous prévient quand les données ont changé »). La forme exacte du partage (sélecteur Lecture / Modification, « Invitation envoyée ») est une mise en scène. Aucune adresse n’est citée.

## Pignon · vue d’ensemble v2 — 29 s, 9:16

**Vidéo : [`renders/pignon-v2-29s-9x16.mp4`](renders/pignon-v2-29s-9x16.mp4)** — la version à jour de l’app (barre Carte, Mes analyses, Simulations, Rapports, Partages).

![Planche](renders/pignon-v2-planche.png)

| Temps | Scène | Contenu |
|---|---|---|
| 0 – 2,4 s | Accroche | « Ce n’est pas juste un bail, c’est votre projet. » (site) |
| 2,4 – 6,3 s | 01 · La carte | Clic sur une adresse, chances de survie du métier : 75 % à 3 ans, 61 % à 5 ans, 33 % à 10 ans |
| 6,3 – 9,8 s | 02 · Autour du point | Isochrone à pied, concurrents, outils Isochrones / Concurrence / Ombres |
| 9,8 – 13,9 s | 03 · Votre métier | Prix de cession des fonds (médiane 225 k€), devenir des commerces fermés (64 % repris sur place) |
| 13,9 – 18,3 s | 04 · Simulations | Clients × panier × jours, résultat, seuil de rentabilité (exemple) |
| 18,3 – 22 s | 05 · Comparez | Comparateur et réponse d’Insights IA |
| 22 – 25,5 s | 06 · Rapports | Un rapport, un lien, données figées, lisible sans compte |
| 25,5 – 29 s | Appel à l’action | « Le bail dure trois ans. Le clic prend trois secondes. », « Explorer la carte → » |

## Pignon · Simulations — 21,5 s, 9:16

**Vidéo : [`renders/pignon-simulation-21.5s-9x16.mp4`](renders/pignon-simulation-21.5s-9x16.mp4)** — outils de recettes de l’app (couverts, postes, fréquentation, abonnements, personnalisé), valeur fixe ou fourchette, charges, salarié, dirigeant et statut, puis résultat, seuil de rentabilité et sensibilité (tornade). L’exemple de boulangerie est inventé mais cohérent : CA = clients × panier × 282 jours, achats 32 %, charges fixes 105 k€ ; les fourchettes, le seuil (79 clients/jour, marge de sécurité 48 %) et la tornade sont calculés à partir de ces hypothèses. Le coût employeur du salarié (≈ 31 k€) est une approximation, pas le calcul URSSAF de l’app.

## Pignon · Analyse du métier — 20 s, 9:16

**Vidéo : [`renders/pignon-metier-20s-9x16.mp4`](renders/pignon-metier-20s-9x16.mp4)** — chiffres réels d’une session (débits de boissons), sans adresse : chances de survie (75 / 61 / 33 %), devenir des 47 commerces fermés depuis 2008, évolution 2016–2025 (20 → 22 établissements, créations et fermetures par an), prix de cession des fonds (médiane 225 k€, 17 ventes) et CA du secteur (médiane 152 k€, IC 95 % 60–219 k€).

## Pignon · Rapports et partage — 19 s, 9:16

**Vidéo : [`renders/pignon-rapports-19s-9x16.mp4`](renders/pignon-rapports-19s-9x16.mp4)** — formulaire « Créer un rapport » (analyse d’un emplacement, simulation, contenu à cocher), lien du rapport (« fige les données à sa date de création », lisible sans compte), puis fenêtre « Partager la session » : invitation par email du compte Pignon, Lecture ou Écriture, personnes ayant accès. L’aperçu du rapport est stylisé ; l’adresse email est fictive.

## Utilisation

```bash
npm install                 # Chromium : npx playwright install chromium (hors de cet environnement)
npm run preview             # http://127.0.0.1:4173/pignon/, /pignon-ombres/, /pignon-ia/, /pignon-tuto/, /pignon-v2/, /pignon-simulation/, /pignon-metier/ ou /pignon-rapports/ : espace = pause, flèches = image par image, ?t=7.5 pour figer
npm run render              # renders/pignon-15s-9x16.mp4 (60 i/s)
npm run render:ombres       # renders/pignon-ombres-15s-9x16.mp4
npm run render:ia           # renders/pignon-ia-15s-9x16.mp4
npm run render:tuto         # renders/pignon-tuto-20s-9x16.mp4
npm run render:v2           # renders/pignon-v2-29s-9x16.mp4
npm run render:simulation   # renders/pignon-simulation-21.5s-9x16.mp4
npm run render:metier       # renders/pignon-metier-20s-9x16.mp4
npm run render:rapports     # renders/pignon-rapports-19s-9x16.mp4
npm run stills              # images clés et planche dans renders/stills/
```

Le rendu parcourt la timeline GSAP (en pause) avec `window.__seek(t)` et capture chaque image. Le résultat est identique d’une machine à l’autre. Pour changer un texte, modifiez `pignon/index.html`. Pour changer un timing, modifiez `pignon/main.js` : chaque scène y est un bloc repéré par un commentaire.
