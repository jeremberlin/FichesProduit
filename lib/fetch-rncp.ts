import fs from 'fs'
import path from 'path'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import type { RNCPData, BlocCompetence, CodeRome, CodeNsf } from './types'

// En local: data/ du projet. Sur Vercel: /tmp (éphémère mais fonctionnel)
const IS_VERCEL = !!process.env.VERCEL
const BASE_DIR = IS_VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const CACHE_DIR = path.join(BASE_DIR, 'rncp')
const CSV_DIR = path.join(BASE_DIR, 'rncp-csv')

const DATA_GOUV_CSV_URL =
  'https://static.data.gouv.fr/resources/repertoire-national-des-certifications-professionnelles-et-repertoire-specifique/20260409-020002/export-fiches-csv-2026-04-09.zip'

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ---------------------------------------------------------------------------
// CSV parsing helpers
// ---------------------------------------------------------------------------

/** Parse une ligne CSV avec guillemets et points-virgules */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ';') {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

/** Lit un CSV et retourne toutes les lignes matchant un numero RNCP */
async function grepCSV(filePath: string, rncpKey: string): Promise<string[][]> {
  if (!fs.existsSync(filePath)) return []

  const results: string[][] = []
  const rl = createInterface({ input: createReadStream(filePath, 'utf-8'), crlfDelay: Infinity })

  for await (const line of rl) {
    if (line.includes(rncpKey)) {
      results.push(parseCSVLine(line))
    }
  }
  return results
}

/** Trouve un fichier CSV par pattern dans le dossier CSV */
function findCSV(pattern: string): string | null {
  if (!fs.existsSync(CSV_DIR)) return null
  const files = fs.readdirSync(CSV_DIR)
  const match = files.find(f => f.toLowerCase().includes(pattern.toLowerCase()) && f.endsWith('.csv'))
  return match ? path.join(CSV_DIR, match) : null
}

// ---------------------------------------------------------------------------
// Download & extract CSVs from data.gouv.fr
// ---------------------------------------------------------------------------

async function ensureCSVData(): Promise<boolean> {
  // Vérifie si les CSV sont déjà présents
  if (fs.existsSync(CSV_DIR) && fs.readdirSync(CSV_DIR).filter(f => f.endsWith('.csv')).length >= 5) {
    return true
  }

  ensureDir(CSV_DIR)
  console.log('[RNCP] Téléchargement des données CSV depuis data.gouv.fr...')

  const response = await fetch(DATA_GOUV_CSV_URL)
  if (!response.ok) {
    throw new Error(`Impossible de télécharger les données RNCP: HTTP ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const zipBuffer = Buffer.from(arrayBuffer)

  // Extract ZIP using yauzl (pure Node.js, pas de dépendance Python)
  const yauzl = await import('yauzl')
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err || new Error('ZIP vide'))
      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          zipfile.readEntry()
          return
        }
        // Nettoyer le nom de fichier
        const safeName = path.basename(entry.fileName)
          .replace(/[^\w.\-]/g, '_')
          .replace(/__+/g, '_')
        zipfile.openReadStream(entry, (err2, readStream) => {
          if (err2 || !readStream) { zipfile.readEntry(); return }
          const outPath = path.join(CSV_DIR, safeName)
          const writeStream = fs.createWriteStream(outPath)
          readStream.pipe(writeStream)
          writeStream.on('finish', () => {
            console.log(`  Extrait: ${safeName}`)
            zipfile.readEntry()
          })
        })
      })
      zipfile.on('end', resolve)
      zipfile.on('error', reject)
    })
  })

  const csvCount = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('.csv')).length
  console.log(`[RNCP] ${csvCount} fichiers CSV extraits.`)
  return csvCount > 0
}

// ---------------------------------------------------------------------------
// Scraping complémentaire de la page France Compétences
// (pour les données non disponibles dans les CSV : prérequis, modalités eval.)
// ---------------------------------------------------------------------------

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É')
    .replace(/&egrave;/g, 'è').replace(/&Egrave;/g, 'È')
    .replace(/&ecirc;/g, 'ê').replace(/&agrave;/g, 'à')
    .replace(/&acirc;/g, 'â').replace(/&icirc;/g, 'î').replace(/&ocirc;/g, 'ô')
    .replace(/&ugrave;/g, 'ù').replace(/&ucirc;/g, 'û')
    .replace(/&ccedil;/g, 'ç').replace(/&Ccedil;/g, 'Ç')
    .replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(+code))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function htmlToText(html: string): string {
  return decodeEntities(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface ScrapedData {
  prerequis: string
  prerequis_validation: string
  modalites_evaluation: string
}

async function scrapePageFC(numero: string): Promise<ScrapedData> {
  const result: ScrapedData = { prerequis: '', prerequis_validation: '', modalites_evaluation: '' }

  try {
    const url = `https://www.francecompetences.fr/recherche/rncp/${numero}/`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) return result
    const html = await response.text()

    // Extraire les prérequis à l'entrée en formation
    const allPrereqBlocks = [...html.matchAll(
      /pr[ée]requis[^<]*<\/p>\s*<div[^>]*>([\s\S]*?)<\/div>/gi
    )]

    if (allPrereqBlocks.length >= 1) {
      // Premier bloc = prérequis d'entrée en formation
      result.prerequis = htmlToText(allPrereqBlocks[0][1])
    }
    if (allPrereqBlocks.length >= 2) {
      // Deuxième bloc = prérequis de validation
      result.prerequis_validation = htmlToText(allPrereqBlocks[1][1])
    }

    // Extraire les modalités d'évaluation
    // Pattern 1: "Modalités d'évaluation :" suivi du contenu dans un div
    const evalPattern = /Modalit[ée]s d[\u2019']?[ée]valuation\s*:\s*<\/[^>]+>\s*([\s\S]*?)<\/div>/gi
    let evalMatch
    while ((evalMatch = evalPattern.exec(html)) !== null) {
      const text = htmlToText(evalMatch[1])
      if (text.length > 50 && text.length > result.modalites_evaluation.length) {
        result.modalites_evaluation = text
      }
    }
    // Pattern 2 (fallback): "Modalités d'évaluation</p> <div>...</div>"
    if (!result.modalites_evaluation) {
      const evalMatch2 = html.match(
        /[Mm]odalit[ée]s d['\u2019]?[ée]valuation[^<]*<\/p>\s*<div[^>]*>([\s\S]*?)<\/div>/i
      )
      if (evalMatch2) {
        result.modalites_evaluation = htmlToText(evalMatch2[1])
      }
    }
  } catch (err) {
    console.warn(`[RNCP] Scraping FC pour ${numero} échoué:`, err instanceof Error ? err.message : err)
  }

  return result
}

// ---------------------------------------------------------------------------
// Assemblage des données RNCP à partir des CSV
// ---------------------------------------------------------------------------

async function fetchFromCSV(numero: string): Promise<RNCPData | null> {
  await ensureCSVData()

  const rncpKey = numero.startsWith('RNCP') ? numero : `RNCP${numero}`
  const numOnly = numero.replace(/^RNCP/i, '')

  // 1. Standard — données de base
  const standardFile = findCSV('Standard')
  if (!standardFile) throw new Error('Fichier CSV Standard introuvable')

  const standardRows = await grepCSV(standardFile, rncpKey)
  if (standardRows.length === 0) return null

  // Colonnes Standard: Id_Fiche;Numero_Fiche;Intitule;Abrege_Libelle;Abrege_Intitule;
  //   Nomenclature_Europe_Niveau;Nomenclature_Europe_Intitule;
  //   Accessible_Nouvelle_Caledonie;Accessible_Polynesie_Francaise;
  //   Date_dernier_jo;Date_Decision;Date_Fin_Enregistrement;Date_Effet;
  //   Type_Enregistrement;Validation_Partielle;Actif
  const std = standardRows[0]
  const titre_officiel = std[2] || ''
  const niveau_code = std[5] || '' // NIV7
  const niveau_intitule = std[6] || '' // Niveau 7
  const date_dernier_jo = std[9] || ''
  const date_decision = std[10] || ''
  const date_fin = std[11] || ''
  const type_enreg = std[13] || ''
  const actif = (std[15] || '').toUpperCase() === 'ACTIVE'

  // Extraire le chiffre du niveau
  const niveauMatch = niveau_code.match(/\d+/)
  const niveau = niveauMatch ? niveauMatch[0] : ''

  // 2. Certificateurs
  const certFile = findCSV('Certificateurs')
  const certRows = certFile ? await grepCSV(certFile, rncpKey) : []
  // Colonnes: Numero_Fiche;Siret_Certificateur;Nom_Certificateur
  const certificateur = certRows.length > 0
    ? (certRows[0][2] || '').replace(/\s*-\s*\d+$/, '').trim() // Retirer le SIRET du nom
    : ''

  // 3. Codes NSF
  const nsfFile = findCSV('Nsf')
  const nsfRows = nsfFile ? await grepCSV(nsfFile, rncpKey) : []
  // Colonnes: Numero_Fiche;Nsf_Code;Nsf_Intitule
  const codes_nsf: CodeNsf[] = nsfRows.map(row => ({
    code: row[1] || '',
    libelle: (row[2] || '').replace(/^\d+\s*:\s*/, ''), // Retirer le code du libellé
  }))

  // 4. Blocs de compétences
  const blocsFile = findCSV('Bloc') || findCSV('Comp')
  const blocsRows = blocsFile ? await grepCSV(blocsFile, rncpKey) : []
  // Colonnes: Numero_Fiche;Bloc_Competences_Code;Bloc_Competences_Libelle
  const blocs_competences: BlocCompetence[] = blocsRows
    .map(row => ({
      code: row[1] || '',
      libelle: (row[2] || '').trim(),
    }))
    .sort((a, b) => a.code.localeCompare(b.code))

  // 5. Codes ROME (débouchés)
  const romeFile = findCSV('Rome')
  const romeRows = romeFile ? await grepCSV(romeFile, rncpKey) : []
  // Colonnes: Numero_Fiche;Codes_Rome_Code;Codes_Rome_Libelle
  const codes_rome: CodeRome[] = romeRows.map(row => ({
    code: row[1] || '',
    libelle: (row[2] || '').replace(/''/g, "'"),
  }))

  // 6. Voies d'accès
  const voiesFile = findCSV('Voix') || findCSV('Acc')
  const voiesRows = voiesFile ? await grepCSV(voiesFile, rncpKey) : []
  // Colonnes: Numero_Fiche;Si_Jury
  const voies_acces = voiesRows.map(row => row[1] || '').filter(Boolean)

  // 7. Anciennes/Nouvelles certifications
  const ancFile = findCSV('Ancienne')
  const ancRows = ancFile ? await grepCSV(ancFile, rncpKey) : []
  // Colonnes: Numero_Fiche;Ancienne_Certification;Nouvelle_Certification
  const anciennes_certifications: string[] = []
  const nouvelles_certifications: string[] = []
  for (const row of ancRows) {
    if (row[0] === rncpKey) {
      if (row[1]) anciennes_certifications.push(row[1])
      if (row[2]) nouvelles_certifications.push(row[2])
    }
    // Aussi capturer les lignes où cette fiche est la nouvelle certification
    if (row[2] === rncpKey && row[0]) {
      anciennes_certifications.push(row[0])
    }
  }

  // 8. Formacodes
  const formFile = findCSV('Formacode')
  const formRows = formFile ? await grepCSV(formFile, rncpKey) : []
  const formacodes = formRows.map(row => ({
    code: row[1] || '',
    libelle: row[2] || '',
  }))

  // ---------------------------------------------------------------------------
  // Formater les données pour la fiche produit
  // ---------------------------------------------------------------------------

  // Débouchés : transformer les codes ROME en liste de métiers lisible
  const debouches_formates = codes_rome.map(r => r.libelle).filter(Boolean)

  // Code NSF principal
  const code_nsf_principal = codes_nsf[0]?.code || ''

  // Nomenclature : construite automatiquement
  // "Titre X délivré par Y, NSF Z - Niveau N. Enregistré au RNCP sous le numéro N
  //  par décision du Directeur Général de France Compétences en date du DD/MM/YYYY."
  // (sera construite côté front pour permettre l'édition)

  // 9. Scraping de la page France Compétences (prérequis, modalités évaluation)
  const scraped = await scrapePageFC(numOnly)

  const data: RNCPData = {
    numero: numOnly,
    titre_officiel,
    niveau,
    niveau_europeen: niveau_intitule,
    codes_nsf,
    certificateur,
    date_decision,
    date_fin_enregistrement: date_fin,
    date_dernier_jo,
    type_enregistrement: type_enreg,
    actif,
    blocs_competences,
    codes_rome,
    voies_acces,
    anciennes_certifications: [...new Set(anciennes_certifications)],
    nouvelles_certifications: [...new Set(nouvelles_certifications)],
    formacodes,
    prerequis: scraped.prerequis,
    prerequis_validation: scraped.prerequis_validation,
    debouches_formates,
    modalites_evaluation_certification: scraped.modalites_evaluation,
    equivalences: '',
  }

  return data
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

export async function fetchRNCP(numero: string): Promise<RNCPData> {
  const numOnly = numero.replace(/^RNCP/i, '')
  ensureDir(CACHE_DIR)

  // Vérifier le cache
  const cachePath = path.join(CACHE_DIR, `${numOnly}.json`)
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as RNCPData
    // Vérifier que c'est le nouveau format (a le champ codes_nsf)
    if (cached.codes_nsf) return cached
  }

  const data = await fetchFromCSV(numOnly)
  if (!data) {
    throw new Error(
      `Fiche RNCP ${numOnly} introuvable dans les données France Compétences. ` +
      `Vérifiez que le numéro est correct.`
    )
  }

  // Mettre en cache
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2))
  return data
}

/** Force le re-téléchargement des CSV */
export async function refreshRNCPData(): Promise<void> {
  if (fs.existsSync(CSV_DIR)) {
    fs.rmSync(CSV_DIR, { recursive: true })
  }
  await ensureCSVData()
}
