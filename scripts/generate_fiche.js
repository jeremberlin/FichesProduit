/**
 * Générateur de Fiches Produit V0 — Galileo Global Education
 *
 * Usage: node scripts/generate_fiche.js data/formations/mon_fichier.yaml
 *
 * Génère un .docx conforme au format réglementaire à partir des données YAML.
 */

const fs = require("fs");
const yaml = require("js-yaml");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  HeadingLevel
} = require("docx");

// ============================================================
// Configuration
// ============================================================

const FONT = "Arial";
const FONT_SIZE = 20; // 10pt in half-points
const FONT_SIZE_EMU = 127000;
const COLOR_BLUE = "2F5496";
const COLOR_HEADER_BG = "F2F2F2";
const BORDER_COLOR = "BFBFBF";

// Page A4 en DXA (1 DXA = 1/1440 inch)
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN_LEFT = 1134;  // ~2cm
const MARGIN_RIGHT = 1260; // ~2.2cm
const MARGIN_TOP = 1260;
const MARGIN_BOTTOM = 1260;

const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // ~9512 DXA

// Largeurs des colonnes du tableau principal (4 colonnes)
const COL_WIDTHS = [2200, 4512, 2000, 800];
// Note: cols 0+1 = 6712, cols 0+1+2 = 8712

// ============================================================
// Helpers
// ============================================================

const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 80, right: 80 };

function textRun(text, options = {}) {
  return new TextRun({
    text,
    font: FONT,
    size: FONT_SIZE,
    ...options,
  });
}

function textParagraph(text, options = {}) {
  const { bold, color, alignment, ...rest } = options;
  return new Paragraph({
    alignment: alignment || AlignmentType.LEFT,
    ...rest,
    children: [textRun(text, { bold, color })],
  });
}

/** Convertit un texte multiligne en tableau de Paragraph */
function multilineToParagraphs(text, options = {}) {
  if (!text) return [textParagraph("")];
  const lines = text.split("\n");
  return lines.map(line => textParagraph(line.trim(), options));
}

/** Cellule standard du tableau */
function cell(content, options = {}) {
  const { width, columnSpan, shading, bold } = options;
  const children = typeof content === "string"
    ? multilineToParagraphs(content, { bold })
    : Array.isArray(content) ? content : [content];

  const cellOptions = {
    borders,
    margins: cellMargins,
    verticalAlign: VerticalAlign.TOP,
    children,
  };

  if (width) cellOptions.width = { size: width, type: WidthType.DXA };
  if (columnSpan) cellOptions.columnSpan = columnSpan;
  if (shading) cellOptions.shading = { fill: shading, type: ShadingType.CLEAR };

  return new TableCell(cellOptions);
}

/** Ligne d'en-tête de section (fond gris, texte gras, colonnes fusionnées) */
function sectionHeaderRow(text, colSpan = 2) {
  const cells = [
    cell(text, { width: COL_WIDTHS.slice(0, colSpan).reduce((a, b) => a + b, 0), columnSpan: colSpan, shading: COLOR_HEADER_BG, bold: true }),
  ];
  // Ajouter les colonnes restantes
  for (let i = colSpan; i < 4; i++) {
    cells.push(cell("", { width: COL_WIDTHS[i], shading: COLOR_HEADER_BG, bold: true }));
  }
  return new TableRow({ children: cells });
}

/** Ligne standard du tableau : libellé | contenu | emplacement web | (col4) */
function dataRow(label, content, emplacement = "", col4 = "") {
  return new TableRow({
    children: [
      cell(label, { width: COL_WIDTHS[0] }),
      cell(content, { width: COL_WIDTHS[1] }),
      cell(emplacement, { width: COL_WIDTHS[2] }),
      cell(col4, { width: COL_WIDTHS[3] }),
    ],
  });
}

/** Formate le programme d'une année */
function formatProgramme(programmeAnnee) {
  if (!programmeAnnee || typeof programmeAnnee !== "object") return "";
  const lines = [];
  for (const [ue, matieres] of Object.entries(programmeAnnee)) {
    lines.push(ue);
    if (Array.isArray(matieres)) {
      matieres.forEach(m => lines.push(`    ${m}`));
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ============================================================
// Main generation
// ============================================================

async function generateFiche(formationPath) {
  // Charger les données de la formation
  const formationData = yaml.load(fs.readFileSync(formationPath, "utf8"));

  // Charger les données de l'école
  const ecolePath = `data/ecoles/${formationData.ecole}.yaml`;
  const ecoleData = yaml.load(fs.readFileSync(ecolePath, "utf8"));

  // Fusionner : les données formation priment sur les données école
  const d = { ...ecoleData, ...formationData };

  // --- Construire l'objectifs compétences ---
  let objectifsCompetences = "";
  if (d.blocs_competences && d.blocs_competences.length > 0) {
    objectifsCompetences = `A l'issue de ce ${d.intitule}, vous saurez :\n` +
      d.blocs_competences.map(b => b).join("\n");
  }

  // --- Construire la nomenclature du titre ---
  let nomenclature = d.nomenclature_titre || "";
  if (!nomenclature && d.numero_rncp) {
    nomenclature = `Titre ${d.intitule} délivré par ${d.certificateur}, NSF ${d.code_nsf} - Niveau ${d.niveau}. Enregistré au RNCP sous le numéro ${d.numero_rncp} par décision du Directeur Général de France Compétences en date du ${d.date_enregistrement}.`;
  } else if (!nomenclature) {
    nomenclature = "Formation qualifiante";
  }

  // --- Construire les débouchés ---
  let debouches = "";
  if (d.debouches && d.debouches.length > 0) {
    debouches = "Nos diplômés accèdent aux postes suivants :\n" +
      d.debouches.join("\n");
  }

  // --- Construire le taux d'obtention ---
  let tauxObtention = "";
  if (d.taux_obtention_par_ville && Object.keys(d.taux_obtention_par_ville).length > 0) {
    tauxObtention = Object.entries(d.taux_obtention_par_ville)
      .map(([ville, taux]) => `${ville} : ${taux}`)
      .join("\n");
  }

  // --- Construire les programmes par année ---
  const programmeRows = [];
  if (d.programme && typeof d.programme === "object") {
    const annees = Object.keys(d.programme).sort();
    annees.forEach((annee, idx) => {
      const anneeScolaire = d.annees_scolaires && d.annees_scolaires[idx] ? d.annees_scolaires[idx] : "";
      const label = `Programme ${annee}`;
      const content = `${anneeScolaire}\n\n${formatProgramme(d.programme[annee])}`;
      programmeRows.push(dataRow(label, content, "Page programme"));
    });
  }

  // --- Modalités évaluation certification ---
  let modalitesEvalCert = d.modalites_evaluation_certification || "";
  if (modalitesEvalCert) {
    modalitesEvalCert += `\n\nPlus d'infos sur les modalités d'évaluation sur ${d.site_web}/ecole/diplomes-certifications`;
  }

  // --- Passerelles ---
  let passerelles = d.passerelles || "";
  if (!passerelles && d.nomenclature_titre) {
    passerelles = `Cette formation délivre le titre de ${d.intitule}. Des passerelles sont possibles vers les autres formations de l'${d.nom_ecole} délivrant le même titre et/ou la même formation.`;
  }

  // ============================================================
  // Construire le document
  // ============================================================

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: FONT_SIZE },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: {
            left: MARGIN_LEFT,
            right: MARGIN_RIGHT,
            top: MARGIN_TOP,
            bottom: MARGIN_BOTTOM,
          },
        },
      },
      children: [
        // --- EN-TÊTE ---
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [textRun(d.nom_ecole || d.ecole, { bold: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [textRun(d.intitule, { color: COLOR_BLUE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [textRun(nomenclature, { color: COLOR_BLUE })],
        }),

        // --- TABLEAU STORYTELLING ---
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [
            new TableRow({
              children: [cell("Storytelling", { width: CONTENT_WIDTH, bold: true })],
            }),
            new TableRow({
              children: [cell(d.storytelling || "", { width: CONTENT_WIDTH })],
            }),
          ],
        }),

        new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),

        // --- TABLEAU PRINCIPAL ---
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: COL_WIDTHS,
          rows: [
            // === Section 1 : Caractéristiques ===
            sectionHeaderRow("Caractéristiques de la formation (ind. 1)", 2),
            dataRow("URL", d.url_site || "", "Barre de recherche"),
            dataRow("Prérequis", d.prerequis || "", "Page programme > bloc prérequis"),
            dataRow("Objectifs compétences", objectifsCompetences, "Page programme > bloc objectifs"),
            dataRow("Objectifs pédagogiques / Introduction", d.objectifs_pedagogiques || "", "Introduction de la page formation"),
            dataRow("Durée", d.duree_description || d.duree_heures || "", "Page programme - Voir trame"),
            dataRow("Modalités d'accès", d.modalites_acces || "", ""),
            dataRow("Dates de rentrée", d.dates_rentree || "", "Page programme > header"),
            dataRow("Tarifs", d.tarifs || "", "Page programme - Voir trame"),
            dataRow("Contacts", d.contacts || "", "Page programme - Voir trame"),
            dataRow("Méthodes mobilisées", d.methodes_mobilisees || "", ""),
            dataRow("Modalités d'évaluation", d.modalites_evaluation || "", ""),
            dataRow("Modalités d'évaluation de la certification propres au titre", modalitesEvalCert, "Page programme - Voir trame"),
            dataRow("Accessibilité \naux personnes handicapées", d.accessibilite_handicap || "", ""),

            // === Section 2 : Indicateurs de résultats ===
            sectionHeaderRow("Indicateurs de résultats (ind. 2)", 3),
            dataRow("Indicateur 1", d.indicateur_1 || "", ""),
            dataRow("Indicateur 2", d.indicateur_2 || "", "Page programme - Voir trame"),
            dataRow("Indicateurs CFA", d.indicateur_cfa || "", ""),

            // === Section 3 : Informations RNCP ===
            sectionHeaderRow("Informations spécifiques sur les titres RNCP/ le RS (ind. 3)", 3),
            dataRow("Taux d'obtention des certifications préparées", tauxObtention, "Page programme - Voir trame"),
            dataRow("Possibilités de valider un ou des blocs de compétences", d.blocs_competences_generique || "", ""),
            dataRow("Certification\nou diplôme visé", nomenclature, ""),
            dataRow("Equivalences", d.equivalences_generique || d.equivalences_rncp || "", "Page programme - Voir trame"),
            dataRow("Passerelles", passerelles, "Page programme - Voir trame"),
            dataRow("Suite de parcours", d.suite_de_parcours || "", ""),
            dataRow("Débouchés", debouches, "Page programme > section débouchés"),

            // === Programme par année ===
            ...programmeRows,
          ],
        }),
      ],
    }],
  });

  // --- Générer le fichier ---
  const buffer = await Packer.toBuffer(doc);

  // Construire le nom du fichier
  const ecoleShort = (d.nom_ecole || d.ecole || "").toUpperCase();
  const progShort = (d.intitule || "FORMATION").toUpperCase()
    .replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "").substring(0, 30);
  const annees = d.annees_scolaires ? d.annees_scolaires.join("-").replace(/\d{4}-(\d{4})-\d{4}-(\d{4})/, "$1-$2") : "DATES";
  const version = d.type_version || "V0";
  const fileName = `MAJ_FP_${version}_${ecoleShort}_${progShort}_${annees}.docx`;
  const outputPath = `output/${fileName}`;

  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Fiche produit générée : ${outputPath}`);
  return outputPath;
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: node scripts/generate_fiche.js <fichier_formation.yaml>");
  console.log("Exemple: node scripts/generate_fiche.js data/formations/esg_mastere_achats_2026-2028.yaml");
  process.exit(1);
}

generateFiche(args[0]).catch(err => {
  console.error("Erreur:", err.message);
  process.exit(1);
});
