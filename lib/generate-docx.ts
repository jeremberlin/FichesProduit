import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} from 'docx'
import type { FicheData, Ecole, ProgrammeAnnee } from './types'

const FONT = 'Arial'
const FONT_SIZE = 20 // 10pt in half-points
const COLOR_BLUE = '2F5496'
const COLOR_HEADER_BG = 'F2F2F2'
const BORDER_COLOR = 'BFBFBF'

const PAGE_WIDTH = 11906
const PAGE_HEIGHT = 16838
const MARGIN_LEFT = 1134
const MARGIN_RIGHT = 1260
const MARGIN_TOP = 1260
const MARGIN_BOTTOM = 1260
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

const COL_WIDTHS = [2200, 4512, 2000, 800]

const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR }
const borders = { top: border, bottom: border, left: border, right: border }
const cellMargins = { top: 60, bottom: 60, left: 80, right: 80 }

function textRun(text: string, options: Record<string, unknown> = {}) {
  return new TextRun({ text, font: FONT, size: FONT_SIZE, ...options })
}

function multilineToParagraphs(text: string, options: { bold?: boolean } = {}): Paragraph[] {
  if (!text) return [new Paragraph({ children: [textRun('')] })]
  return text.split('\n').map(line =>
    new Paragraph({ children: [textRun(line.trim(), { bold: options.bold })] })
  )
}

function createCell(content: string, options: {
  width?: number, columnSpan?: number, shading?: string, bold?: boolean
} = {}) {
  const children = multilineToParagraphs(content, { bold: options.bold })
  return new TableCell({
    borders,
    margins: cellMargins,
    verticalAlign: VerticalAlign.TOP,
    children,
    ...(options.width ? { width: { size: options.width, type: WidthType.DXA } } : {}),
    ...(options.columnSpan ? { columnSpan: options.columnSpan } : {}),
    ...(options.shading ? { shading: { fill: options.shading, type: ShadingType.CLEAR } } : {}),
  })
}

function sectionHeaderRow(text: string, colSpan: number = 2) {
  const mergedWidth = COL_WIDTHS.slice(0, colSpan).reduce((a, b) => a + b, 0)
  const cells = [
    createCell(text, { width: mergedWidth, columnSpan: colSpan, shading: COLOR_HEADER_BG, bold: true }),
  ]
  for (let i = colSpan; i < 4; i++) {
    cells.push(createCell('', { width: COL_WIDTHS[i], shading: COLOR_HEADER_BG, bold: true }))
  }
  return new TableRow({ children: cells })
}

function dataRow(label: string, content: string, emplacement: string = '', col4: string = '') {
  return new TableRow({
    children: [
      createCell(label, { width: COL_WIDTHS[0] }),
      createCell(content, { width: COL_WIDTHS[1] }),
      createCell(emplacement, { width: COL_WIDTHS[2] }),
      createCell(col4, { width: COL_WIDTHS[3] }),
    ],
  })
}

function formatProgramme(annee: ProgrammeAnnee): string {
  const lines: string[] = []
  for (const ue of annee.ues) {
    lines.push(ue.nom)
    for (const m of ue.matieres) {
      lines.push(`    ${m.nom}${m.heures ? ` (${m.heures}h)` : ''}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

export async function generateDocx(fiche: FicheData, ecole: Ecole): Promise<Buffer> {
  const bg = ecole.blocs_generiques

  // Objectifs competences
  let objectifsCompetences = ''
  if (fiche.blocs_competences.length > 0) {
    objectifsCompetences = `A l'issue de ce ${fiche.intitule}, vous saurez :\n` +
      fiche.blocs_competences.join('\n')
  }

  // Nomenclature
  const nomenclature = fiche.nomenclature_titre || (fiche.formation_qualifiante ? 'Formation qualifiante' : '')

  // Debouches
  let debouches = ''
  if (fiche.debouches.length > 0) {
    debouches = 'Nos diplomes accedent aux postes suivants :\n' + fiche.debouches.join('\n')
  }

  // Taux obtention
  const tauxObtention = Object.entries(fiche.taux_obtention_par_ville)
    .map(([ville, taux]) => `${ville} : ${taux}`)
    .join('\n')

  // Modalites evaluation certification
  let modalitesEvalCert = fiche.modalites_evaluation_certification || ''
  if (modalitesEvalCert) {
    modalitesEvalCert = `Les modalites d'evaluation specifiques a votre certification sont les suivantes :\n${modalitesEvalCert}\n\nPlus d'infos sur les modalites d'evaluation sur ${ecole.lien_diplomes}`
  }

  // Programme rows
  const programmeRows = fiche.programme.map((annee, idx) => {
    const anneeScolaire = fiche.annees_scolaires[idx] || ''
    const content = anneeScolaire ? `${anneeScolaire}\n\n${formatProgramme(annee)}` : formatProgramme(annee)
    return dataRow(`Programme ${annee.annee}`, content, 'Page programme')
  })

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
          margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, top: MARGIN_TOP, bottom: MARGIN_BOTTOM },
        },
      },
      children: [
        // Header
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [textRun(ecole.nom, { bold: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [textRun(fiche.intitule, { color: COLOR_BLUE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [textRun(nomenclature, { color: COLOR_BLUE })],
        }),

        // Storytelling table
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [
            new TableRow({ children: [createCell('Storytelling', { width: CONTENT_WIDTH, bold: true })] }),
            new TableRow({ children: [createCell(fiche.storytelling || '', { width: CONTENT_WIDTH })] }),
          ],
        }),

        new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),

        // Main table
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: COL_WIDTHS,
          rows: [
            // Section 1
            sectionHeaderRow('Caracteristiques de la formation (ind. 1)', 2),
            dataRow('URL', fiche.url_site, 'Barre de recherche'),
            dataRow('Prerequis', fiche.prerequis, 'Page programme > bloc prerequis'),
            dataRow('Objectifs competences', objectifsCompetences, 'Page programme > bloc objectifs'),
            dataRow('Objectifs pedagogiques / Introduction', fiche.objectifs_pedagogiques, 'Introduction de la page formation'),
            dataRow('Duree', fiche.duree, 'Page programme - Voir trame'),
            dataRow("Modalites d'acces", fiche.override_modalites_acces || bg.modalites_acces, ''),
            dataRow('Dates de rentree', fiche.dates_rentree, 'Page programme > header'),
            dataRow('Tarifs', fiche.override_tarifs || bg.tarifs, 'Page programme - Voir trame'),
            dataRow('Contacts', fiche.override_contacts || bg.contacts, 'Page programme - Voir trame'),
            dataRow('Methodes mobilisees', fiche.override_methodes_mobilisees || bg.methodes_mobilisees, ''),
            dataRow("Modalites d'evaluation", fiche.override_modalites_evaluation || bg.modalites_evaluation, ''),
            dataRow("Modalites d'evaluation de la certification propres au titre", modalitesEvalCert, 'Page programme - Voir trame'),
            dataRow('Accessibilite aux personnes handicapees', fiche.override_accessibilite_handicap || bg.accessibilite_handicap, ''),

            // Section 2
            sectionHeaderRow('Indicateurs de resultats (ind. 2)', 3),
            dataRow('Indicateur 1', ecole.indicateurs.indicateur_1, ''),
            dataRow('Indicateur 2', fiche.indicateur_2, 'Page programme - Voir trame'),
            dataRow('Indicateurs CFA', ecole.indicateurs.indicateur_cfa, ''),

            // Section 3
            sectionHeaderRow('Informations specifiques sur les titres RNCP / le RS (ind. 3)', 3),
            dataRow('Taux d\'obtention des certifications preparees', tauxObtention, 'Page programme - Voir trame'),
            dataRow('Possibilites de valider un ou des blocs de competences', bg.blocs_competences_generique, ''),
            dataRow('Certification ou diplome vise', nomenclature, ''),
            dataRow('Equivalences', fiche.equivalences_rncp || bg.equivalences, 'Page programme - Voir trame'),
            dataRow('Passerelles', fiche.passerelles, 'Page programme - Voir trame'),
            dataRow('Suite de parcours', fiche.suite_de_parcours, ''),
            dataRow('Debouches', debouches, 'Page programme > section debouches'),

            ...programmeRows,
          ],
        }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}

export function generateFileName(fiche: FicheData, ecoleNom: string): string {
  const ecoleShort = ecoleNom.toUpperCase()
  const progShort = fiche.intitule.toUpperCase()
    .replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').substring(0, 30)
  const annees = fiche.annees_scolaires.join('-').replace(/\d{4}-(\d{4})-\d{4}-(\d{4})/, '$1-$2')
  return `MAJ_FP_${fiche.version}_${ecoleShort}_${progShort}_${annees}.docx`
}
