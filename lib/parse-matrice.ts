import * as XLSX from 'xlsx'
import type { ProgrammeAnnee, UE, Matiere } from './types'

/**
 * Parse une matrice pédagogique Excel.
 *
 * Gère deux formats :
 *
 * FORMAT A — "Galileo standard" (colonnes structurées) :
 *   Col A = code UE (UE01, UE02...), répété par matière
 *   Col B = nom UE, répété par matière
 *   Col C = code matière
 *   Col D = nom matière
 *   Col E = heures
 *   Col F = ECTS
 *   Col X = section (M1, M2, B3...)
 *   Détecté si la ligne 2 contient des headers reconnus (Codes UE, Unités, Matières...)
 *
 * FORMAT B — "libre" (fallback) :
 *   Lignes UE = texte court en majuscules ou contenant "UE"
 *   Lignes matières = les autres lignes sous une UE
 */
export function parseMatrice(buffer: Buffer): ProgrammeAnnee[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const programmes: ProgrammeAnnee[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { header: 'A' })

    if (rows.length < 2) continue

    // Détecter le format en regardant les headers (ligne 2, index 1)
    const headerRow = rows[1] || rows[0]
    const headers = Object.values(headerRow).map(v => String(v || '').toLowerCase())
    const isGalileoFormat = headers.some(h =>
      h.includes('unité') || h.includes('unite') || h.includes('matière') || h.includes('matiere') || h.includes('codes ue')
    )

    if (isGalileoFormat) {
      const result = parseGalileoFormat(rows, sheetName)
      programmes.push(...result)
    } else {
      const result = parseFreeFormat(rows, sheetName)
      if (result) programmes.push(result)
    }
  }

  if (programmes.length === 0 && workbook.SheetNames.length > 0) {
    programmes.push({ annee: 'Annee 1', ues: [] })
  }

  return programmes
}

// ---------------------------------------------------------------------------
// Format Galileo (ESG, Digital Campus, etc.)
// ---------------------------------------------------------------------------

function parseGalileoFormat(rows: Record<string, string | number>[], sheetName: string): ProgrammeAnnee[] {
  // Identifier les colonnes dynamiquement
  const headerRow = rows[1] || rows[0]
  const colMap = detectColumns(headerRow)

  // Lire les données (à partir de la ligne 3, index 2)
  const dataRows = rows.slice(2)

  // Regrouper par UE
  const ueMap = new Map<string, { nom: string; matieres: Matiere[] }>()
  let globalYear: string | null = null

  for (const row of dataRows) {
    const ueCode = str(row[colMap.ueCode])
    const ueName = str(row[colMap.ueName])
    const matiereName = str(row[colMap.matiere])
    const heures = num(row[colMap.heures])
    const section = str(row[colMap.section]) // M1, M2, B1, B2, B3...

    if (!ueCode && !matiereName) continue

    // Détecter l'année depuis la colonne section
    if (section && !globalYear) {
      globalYear = sectionToAnnee(section)
    }

    const ueKey = ueCode || ueName
    if (!ueKey) continue

    if (!ueMap.has(ueKey)) {
      ueMap.set(ueKey, { nom: ueName || ueCode, matieres: [] })
    }

    if (matiereName) {
      const matiere: Matiere = { nom: matiereName }
      if (heures > 0) matiere.heures = heures
      ueMap.get(ueKey)!.matieres.push(matiere)
    }
  }

  // Déterminer le nom de l'année
  const annee = globalYear || detectAnneeFromSheetName(sheetName)

  const ues: UE[] = []
  for (const [, ue] of ueMap) {
    if (ue.matieres.length > 0) {
      ues.push(ue)
    }
  }

  if (ues.length === 0) return []
  return [{ annee, ues }]
}

/** Détecte les lettres de colonne à partir des headers */
function detectColumns(headerRow: Record<string, string | number>): {
  ueCode: string; ueName: string; matiere: string; heures: string; section: string
} {
  const result = { ueCode: 'A', ueName: 'B', matiere: 'D', heures: 'E', section: 'X' }

  for (const [col, val] of Object.entries(headerRow)) {
    const lower = String(val || '').toLowerCase()
    if (lower.includes('codes ue') || lower === 'code ue') result.ueCode = col
    else if (lower.includes('unité') || lower.includes('unite')) result.ueName = col
    else if (lower === 'matières' || lower === 'matieres' || lower === 'matière' || lower === 'matiere') result.matiere = col
    else if (lower.includes('code matière') || lower.includes('code matiere')) { /* skip - c'est le code, pas le nom */ }
    else if (lower === 'heures matières' || lower === 'heures matieres' || lower === 'heures' || lower === 'volume horaire') result.heures = col
    else if (lower === 'section' || lower === 'niveau') result.section = col
  }

  return result
}

/** Convertit M1→Annee 1, M2→Annee 2, B1→Annee 1, B3→Annee 3 */
function sectionToAnnee(section: string): string {
  const match = section.match(/[MB](\d)/i)
  if (match) return `Annee ${match[1]}`
  return section
}

// ---------------------------------------------------------------------------
// Format libre (fallback)
// ---------------------------------------------------------------------------

function parseFreeFormat(rows: Record<string, string | number>[], sheetName: string): ProgrammeAnnee | null {
  const annee = detectAnneeFromSheetName(sheetName)
  const ues: UE[] = []
  let currentUE: UE | null = null

  for (const row of rows) {
    const colA = str(row.A)
    const colB = str(row.B)
    const colC = str(row.C)
    const colD = str(row.D)

    if (!colA && !colB && !colD) continue

    // Heuristique : UE si col A contient "UE" ou si c'est un titre court en majuscules sans matière à côté
    const isUERow = colA.match(/^UE\s*\d*/i) ||
      (colA.length > 0 && colA.length < 80 && !colB && !colD && colA === colA.toUpperCase())

    if (isUERow) {
      const nom = colB || colA
      // Vérifier si cette UE existe déjà (regroupement)
      const existing = ues.find(u => u.nom === nom)
      if (existing) {
        currentUE = existing
      } else {
        currentUE = { nom, matieres: [] }
        ues.push(currentUE)
      }
    } else if (currentUE) {
      const matiereName = colD || colB || colA
      if (matiereName) {
        const heures = num(row.E) || num(row.C)
        const matiere: Matiere = { nom: matiereName }
        if (heures > 0) matiere.heures = heures
        currentUE.matieres.push(matiere)
      }
    } else if (colA) {
      currentUE = { nom: 'Programme', matieres: [] }
      ues.push(currentUE)
      currentUE.matieres.push({ nom: colA })
    }
  }

  if (ues.length === 0) return null
  return { annee, ues }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectAnneeFromSheetName(name: string): string {
  const yearMatch = name.match(/ann[ée]e\s*(\d+)/i) ||
    name.match(/\b[MB](\d)\b/i) ||
    name.match(/(\d+)\s*[eè](?:re|me)?\s*ann/i)
  if (yearMatch) return `Annee ${yearMatch[1]}`

  // Chercher M1, M2, B1, B2, B3 dans le nom
  const sectionMatch = name.match(/[.-]([MB]\d)[.-]/i) || name.match(/\b([MB]\d)\b/i)
  if (sectionMatch) return sectionToAnnee(sectionMatch[1])

  return name
}

function str(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return ''
  return String(val).trim()
}

function num(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0
  const n = typeof val === 'number' ? val : parseFloat(String(val))
  return isNaN(n) ? 0 : n
}
