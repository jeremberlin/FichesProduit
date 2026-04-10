# Générateur de Fiches Produit — Galileo Global Education

## Contexte

Ce projet est une **application web Next.js** qui automatise la production de **fiches produit réglementaires** pour les formations du groupe Galileo Global Education. Ces fiches sont un prérequis d'audit, aujourd'hui écrites à la main une par une. L'app permet de saisir les données, récupérer automatiquement des informations depuis France Compétences, importer des matrices pédagogiques Excel, et générer des .docx conformes au format réglementaire.

**Objectif** : permettre à un utilisateur non-technique de produire des fiches produit en quelques minutes au lieu de plusieurs heures, via une interface web claire et guidée.

## Stack technique

- **Frontend** : Next.js 14+ (App Router), React, Tailwind CSS
- **Backend** : API Routes Next.js (Route Handlers)
- **Génération .docx** : librairie `docx` (npm) côté serveur
- **Parsing Excel** : `xlsx` (SheetJS) côté serveur
- **Données** : fichiers JSON/YAML sur disque (pas de BDD pour le proto)
- **Déploiement** : local (`npm run dev`)

## Structure du projet

```
FichesProduits/
├── CLAUDE.md                     ← Ce fichier (instructions pour Claude Code)
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
│
├── app/                          ← App Router Next.js
│   ├── layout.tsx                ← Layout global (sidebar + header)
│   ├── page.tsx                  ← Dashboard : liste des fiches existantes
│   │
│   ├── nouvelle-fiche/
│   │   └── page.tsx              ← Formulaire de création : wizard multi-étapes
│   │
│   ├── fiche/[id]/
│   │   ├── page.tsx              ← Vue détaillée d'une fiche (prévisualisation)
│   │   └── edit/page.tsx         ← Édition d'une fiche existante
│   │
│   └── api/
│       ├── fiches/
│       │   ├── route.ts          ← GET (liste), POST (créer)
│       │   └── [id]/
│       │       ├── route.ts      ← GET (détail), PUT (maj), DELETE
│       │       └── generate/route.ts  ← POST → génère le .docx
│       │
│       ├── rncp/[numero]/route.ts     ← GET → fetch France Compétences
│       └── matrice/parse/route.ts     ← POST (upload Excel) → parse UE/matières
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           ← Navigation latérale
│   │   └── Header.tsx
│   │
│   ├── fiches/
│   │   ├── FicheCard.tsx         ← Carte fiche dans le dashboard
│   │   ├── FichePreview.tsx      ← Prévisualisation HTML de la fiche
│   │   └── FicheStatusBadge.tsx  ← Badge V0/V1/V2
│   │
│   └── wizard/                   ← Les étapes du formulaire de création
│       ├── StepIdentite.tsx      ← Étape 1 : école, intitulé, RNCP, années
│       ├── StepRNCP.tsx          ← Étape 2 : données France Compétences (auto-fetch + revue)
│       ├── StepMatrice.tsx       ← Étape 3 : upload et parsing de la matrice Excel
│       ├── StepContenu.tsx       ← Étape 4 : champs manuels (prérequis, durée, etc.)
│       ├── StepPreview.tsx       ← Étape 5 : prévisualisation avant génération
│       └── WizardNavigation.tsx  ← Barre de progression + navigation entre étapes
│
├── lib/
│   ├── generate-docx.ts          ← Moteur de génération .docx (le cœur technique)
│   ├── fetch-rncp.ts             ← Scraper/fetcher France Compétences
│   ├── parse-matrice.ts          ← Parser de matrices pédagogiques Excel
│   ├── types.ts                  ← Types TypeScript (Formation, Ecole, FicheData, etc.)
│   └── store.ts                  ← Gestion des fiches sur disque (CRUD JSON)
│
├── data/
│   ├── ecoles/
│   │   └── esg.json              ← Données génériques ESG (blocs "FP Générique")
│   └── fiches/                   ← Fiches sauvegardées (1 JSON par fiche)
│
├── public/
│   └── uploads/                  ← Matrices Excel uploadées
│
├── output/                       ← Fichiers .docx générés
│
└── examples/                     ← Fiches .docx de référence (à reproduire exactement)
```

## Parcours utilisateur (UX)

### 1. Dashboard (`/`)

Page d'accueil listant toutes les fiches existantes sous forme de cartes :
- Nom de la formation, école, version (V0/V1/V2), statut (brouillon, générée)
- Bouton "Nouvelle fiche produit" bien visible
- Filtres par école, par statut
- Pour chaque fiche : boutons "Voir", "Modifier", "Regénérer le .docx", "Télécharger"

### 2. Création d'une fiche — Wizard multi-étapes (`/nouvelle-fiche`)

Un formulaire en 5 étapes avec une barre de progression en haut :

**Étape 1 — Identité de la formation**
- Choix de l'école (dropdown : ESG, Digital Campus, etc.)
- Intitulé de la formation (texte libre)
- Numéro RNCP (champ texte + checkbox "Formation qualifiante" si pas de RNCP)
- Années scolaires (ex: 2026-2027, 2027-2028)
- Version (V0 par défaut)
- ➡️ Quand le n° RNCP est saisi, un bouton "Récupérer les données" apparaît

**Étape 2 — Données RNCP** (pré-rempli automatiquement)
- Affiche les données récupérées depuis France Compétences :
  - Nomenclature du titre (éditable)
  - Blocs de compétences (liste éditable — seront les "objectifs compétences")
  - Modalités d'évaluation de la certification (éditable)
  - Débouchés / métiers visés (liste éditable)
  - Équivalences
- L'utilisateur peut corriger / compléter avant de passer à la suite
- Si "Formation qualifiante" : cette étape est simplifiée (saisie manuelle)

**Étape 3 — Programme (matrice pédagogique)**
- Zone d'upload pour le fichier Excel de la matrice
- Après upload : parsing automatique → affiche les UE et matières extraites
- L'utilisateur peut réorganiser, renommer, supprimer des matières
- Vue par année (onglets : "Année 1", "Année 2", etc.)
- Si pas de matrice : saisie manuelle du programme

**Étape 4 — Informations complémentaires**
- Champs pré-remplis avec les blocs génériques de l'école (grisés, non éditables par défaut, avec toggle "Personnaliser")
- Champs manuels à remplir :
  - Prérequis (par année)
  - Durée / volumétrie horaire
  - Dates de rentrée
  - Storytelling (optionnel en V0)
  - Objectifs pédagogiques / Introduction (optionnel en V0)
  - Taux d'obtention par ville
  - Indicateur 2 (taux insertion)
  - Passerelles, suite de parcours
- Indicateur visuel : champs V0 obligatoires marqués d'un astérisque rouge

**Étape 5 — Prévisualisation et génération**
- Affiche un rendu HTML fidèle au format .docx final :
  - En-tête avec nom école, intitulé, nomenclature
  - Tableau storytelling
  - Tableau principal avec les 3 sections et toutes les lignes
- Indicateur de complétude (champs remplis / champs attendus)
- Champs manquants surlignés en jaune
- Bouton **"Générer le .docx"** → génère et propose le téléchargement
- Bouton "Sauvegarder comme brouillon" (enregistre sans générer)

### 3. Vue détaillée d'une fiche (`/fiche/[id]`)

- Prévisualisation HTML de la fiche (même rendu que l'étape 5)
- Historique des versions générées
- Boutons : "Modifier", "Regénérer", "Télécharger le .docx"

## Spécifications techniques du .docx généré

Le .docx généré doit être **identique en structure et en formatage** aux exemples dans `examples/`. C'est un point critique — les fiches sont des documents réglementaires d'audit.

### Structure du document

1. **En-tête** (3 paragraphes centrés) :
   - Nom de l'école : Arial 10pt, **gras**, noir, centré
   - Intitulé formation : Arial 10pt, centré, couleur **#2F5496**
   - Nomenclature titre : Arial 10pt, centré, couleur **#2F5496**

2. **Tableau Storytelling** (1 colonne, 2 lignes) :
   - Ligne 0 : "Storytelling" (gras)
   - Ligne 1 : Texte (vide en V0)

3. **Tableau principal** (4 colonnes, ~28 lignes) :
   - Colonne 0 : Libellé du champ (~2200 DXA)
   - Colonne 1 : Contenu (~4512 DXA)
   - Colonne 2 : Emplacement site web (~2000 DXA)
   - Colonne 3 : Notes (~800 DXA)

### Lignes du tableau principal

Le tableau est divisé en **3 sections** par des en-têtes grisés (fond #F2F2F2, gras) :

**Section 1 — "Caractéristiques de la formation (ind. 1)"** (cols 0-1 fusionnées sur l'en-tête)

| Champ | Source |
|-------|--------|
| URL | Saisie manuelle |
| Prérequis | Saisie manuelle / RNCP |
| Objectifs compétences | France Compétences (blocs reformulés) |
| Objectifs pédagogiques / Introduction | Saisie manuelle (V1) |
| Durée | Saisie manuelle |
| Modalités d'accès | Bloc générique école |
| Dates de rentrée | Saisie manuelle |
| Tarifs | Bloc générique école |
| Contacts | Bloc générique école |
| Méthodes mobilisées | Bloc générique école |
| Modalités d'évaluation | Bloc générique école |
| Modalités d'évaluation de la certification | France Compétences + lien esg.fr/diplomes |
| Accessibilité aux personnes handicapées | Bloc générique école |

**Section 2 — "Indicateurs de résultats (ind. 2)"** (cols 0-1-2 fusionnées sur l'en-tête)

| Champ | Source |
|-------|--------|
| Indicateur 1 | Chiffres école |
| Indicateur 2 | Taux insertion (France Compétences) |
| Indicateurs CFA | Taux interruption apprentis |

**Section 3 — "Informations spécifiques RNCP / RS (ind. 3)"** (cols 0-1-2 fusionnées)

| Champ | Source |
|-------|--------|
| Taux d'obtention certifications | Par ville (saisie manuelle) |
| Possibilités de valider des blocs | Texte générique école |
| Certification ou diplôme visé | Nomenclature titre |
| Équivalences | Texte générique + France Compétences |
| Passerelles | Saisie manuelle |
| Suite de parcours | Saisie manuelle |
| Débouchés | France Compétences (métiers visés) |
| Programme année 1 | Matrice pédagogique |
| Programme année 2 | Matrice pédagogique |
| (Programme année 3) | Si applicable |

### Formatage technique

- **Police** : Arial 10pt partout (127000 EMU = 10pt, ou 20 half-points en docx-js)
- **Couleur titre** : #2F5496
- **Fond en-têtes section** : #F2F2F2, texte gras
- **Bordures** : fines, gris clair (#BFBFBF)
- **Cellules fusionnées** :
  - Section 1 header : cols 0-1 fusionnées (gridSpan=2)
  - Sections 2 et 3 headers : cols 0-1-2 fusionnées (gridSpan=3)
- **Marges page** : left ~1134 DXA, right/top/bottom ~1260 DXA
- **Page** : A4 portrait (11906 x 16838 DXA)

### Règles docx-js critiques

- Utiliser `WidthType.DXA` partout (jamais de pourcentages)
- `columnWidths` sur la table ET `width` sur chaque cellule
- `ShadingType.CLEAR` (pas SOLID) pour le fond gris
- Sauts de ligne dans une cellule = plusieurs `Paragraph`, jamais `\n` dans un `TextRun`
- Ajouter `margins` sur les cellules (top: 60, bottom: 60, left: 80, right: 80)

## Formulation des contenus

### Objectifs compétences (à partir des blocs RNCP)

```
A l'issue de ce [intitulé formation], vous saurez :
[Bloc 1]
[Bloc 2]
[Bloc 3]
...
```

Ou variante :
```
A l'issue de ce [intitulé], vous aurez acquis les compétences suivantes :
```

### Nomenclature du titre

Format strict :
```
Titre [intitulé officiel] délivré par [certificateur], NSF [code] - Niveau [niveau].
Enregistré au RNCP sous le numéro [numéro] par décision du Directeur Général de France Compétences en date du [date].
```

Si pas de RNCP : "Formation qualifiante"

### Modalités d'évaluation de la certification

```
Les modalités d'évaluation spécifiques à votre certification sont les suivantes :
[liste des modalités depuis France Compétences]

Plus d'infos sur les modalités d'évaluation sur https://www.esg.fr/ecole/diplomes-certifications
```

### Débouchés

```
Nos diplômés accèdent aux postes suivants :
[Liste de métiers en écriture inclusive : "Acheteuse ou Acheteur", "Responsable", etc.]
```

## Règles de rédaction

1. **Écriture inclusive** : "Acheteuse ou Acheteur", "Chargée ou Chargé" (cf. exemples)
2. **Vouvoiement** : toujours "vous"
3. **Ton** : professionnel mais accessible, orienté étudiant/candidat
4. **Blocs génériques** : reprendre **textuellement**, ne pas reformuler
5. **Données RNCP** : reprendre fidèlement, adapter la formulation pour la rendre accessible

## Convention de nommage des fichiers de sortie

```
MAJ_FP_{version}_{ecole}_{programme}_{annees}.docx
```

Exemples : `MAJ_FP_V0_ESG_MAST_ACHATS_2026-2028.docx`

## Données école — Blocs génériques ESG

Les blocs génériques de l'ESG sont dans `data/ecoles/esg.json`. Ils contiennent les textes "FP Générique" partagés entre toutes les fiches ESG : modalités d'accès, tarifs, contacts, méthodes mobilisées, modalités d'évaluation, accessibilité handicap, indicateurs école, texte blocs compétences, équivalences.

Ces textes doivent être injectés tels quels dans les fiches — jamais reformulés.

## Récupération des données France Compétences

L'API Route `/api/rncp/[numero]` doit :
1. Aller scraper `https://www.francecompetences.fr/recherche/rncp/{numero}/`
2. Extraire : titre officiel, niveau, NSF, certificateur, date d'enregistrement, blocs de compétences, modalités d'évaluation, débouchés, équivalences
3. Renvoyer les données structurées en JSON
4. Mettre en cache dans `data/rncp/{numero}.json`

Le scraping se fait côté serveur (API Route Node.js). Utiliser `cheerio` ou `node-html-parser` pour parser le HTML.

## Champs V0 obligatoires

Pour une V0, ces champs DOIVENT être remplis (les autres peuvent rester vides) :
- École, Intitulé, Nomenclature du titre
- Objectifs compétences
- Durée, Dates de rentrée
- Modalités d'évaluation de la certification
- Possibilité de valider des blocs de compétences
- Certification ou diplôme visé
- Équivalences, Débouchés
- Programme (UE + matières)

L'interface doit clairement indiquer quels champs sont requis pour la V0.

## Design de l'interface

- **Style** : professionnel, sobre, inspiré des apps d'entreprise type Notion/Linear
- **Couleurs** : bleu Galileo (#2F5496 en accent), gris clair, blanc
- **Typographie** : Inter ou system font
- **Responsive** : desktop first (l'app sera utilisée sur ordinateur)
- **Composants** : utiliser shadcn/ui ou des composants Tailwind maison
