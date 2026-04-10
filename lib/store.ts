import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { FicheData, Ecole } from './types'

const IS_VERCEL = !!process.env.BLOB_READ_WRITE_TOKEN

// ---------------------------------------------------------------------------
// Vercel Blob storage (pour le déploiement)
// ---------------------------------------------------------------------------

async function blobImport() {
  return await import('@vercel/blob')
}

async function blobList(prefix: string): Promise<{ url: string; pathname: string }[]> {
  const { list } = await blobImport()
  const result = await list({ prefix })
  return result.blobs.map(b => ({ url: b.url, pathname: b.pathname }))
}

async function blobRead(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl)
  return res.text()
}

async function blobWrite(pathname: string, content: string): Promise<string> {
  const { put } = await blobImport()
  const blob = await put(pathname, content, { access: 'public', addRandomSuffix: false, allowOverwrite: true })
  return blob.url
}

async function blobDelete(url: string): Promise<void> {
  const { del } = await blobImport()
  await del(url)
}

// ---------------------------------------------------------------------------
// Local filesystem storage (pour le développement)
// ---------------------------------------------------------------------------

const FICHES_DIR = path.join(process.cwd(), 'data', 'fiches')
const ECOLES_DIR = path.join(process.cwd(), 'data', 'ecoles')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ---------------------------------------------------------------------------
// Fiches CRUD — fonctionne en local ou Vercel
// ---------------------------------------------------------------------------

export async function getAllFiches(): Promise<FicheData[]> {
  if (IS_VERCEL) {
    const blobs = await blobList('fiches/')
    const fiches = await Promise.all(
      blobs.map(async b => JSON.parse(await blobRead(b.url)) as FicheData)
    )
    return fiches.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  ensureDir(FICHES_DIR)
  const files = fs.readdirSync(FICHES_DIR).filter(f => f.endsWith('.json'))
  return files.map(f => {
    const content = fs.readFileSync(path.join(FICHES_DIR, f), 'utf-8')
    return JSON.parse(content) as FicheData
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function getFiche(id: string): Promise<FicheData | null> {
  if (IS_VERCEL) {
    const blobs = await blobList(`fiches/${id}.json`)
    if (blobs.length === 0) return null
    return JSON.parse(await blobRead(blobs[0].url)) as FicheData
  }

  const filePath = path.join(FICHES_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as FicheData
}

export async function createFiche(data: Omit<FicheData, 'id' | 'createdAt' | 'updatedAt'>): Promise<FicheData> {
  const now = new Date().toISOString()
  const fiche: FicheData = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }

  if (IS_VERCEL) {
    await blobWrite(`fiches/${fiche.id}.json`, JSON.stringify(fiche, null, 2))
  } else {
    ensureDir(FICHES_DIR)
    fs.writeFileSync(path.join(FICHES_DIR, `${fiche.id}.json`), JSON.stringify(fiche, null, 2))
  }
  return fiche
}

export async function updateFiche(id: string, data: Partial<FicheData>): Promise<FicheData | null> {
  const existing = await getFiche(id)
  if (!existing) return null
  const updated: FicheData = {
    ...existing, ...data,
    id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString(),
  }

  if (IS_VERCEL) {
    await blobWrite(`fiches/${id}.json`, JSON.stringify(updated, null, 2))
  } else {
    fs.writeFileSync(path.join(FICHES_DIR, `${id}.json`), JSON.stringify(updated, null, 2))
  }
  return updated
}

export async function deleteFiche(id: string): Promise<boolean> {
  if (IS_VERCEL) {
    const blobs = await blobList(`fiches/${id}.json`)
    if (blobs.length === 0) return false
    await blobDelete(blobs[0].url)
    return true
  }

  const filePath = path.join(FICHES_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) return false
  fs.unlinkSync(filePath)
  return true
}

// ---------------------------------------------------------------------------
// Ecoles — toujours lues depuis le filesystem (fichiers statiques bundlés)
// ---------------------------------------------------------------------------

export function getEcole(id: string): Ecole | null {
  const filePath = path.join(ECOLES_DIR, `${id}.json`)
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Ecole
  }

  const normalized = id.toLowerCase().replace(/\s+/g, '-')
  const normalizedPath = path.join(ECOLES_DIR, `${normalized}.json`)
  if (fs.existsSync(normalizedPath)) {
    return JSON.parse(fs.readFileSync(normalizedPath, 'utf-8')) as Ecole
  }

  const all = getAllEcoles()
  const byName = all.find(e =>
    e.nom.toLowerCase() === id.toLowerCase() ||
    e.id.toLowerCase() === id.toLowerCase() ||
    id.toLowerCase().startsWith(e.nom.toLowerCase()) ||
    id.toLowerCase().startsWith(e.id.toLowerCase())
  )
  if (byName) return byName

  return {
    id: normalized, nom: id, site_web: '', certificateur: '', lien_diplomes: '',
    blocs_generiques: {
      modalites_acces: "L'admission se fait sur dossier et entretien de motivation.",
      tarifs: "Tarifs consultables sur le site de l'ecole.",
      contacts: "Contactez le service des admissions.",
      methodes_mobilisees: "Cours en face a face, travaux de groupe, e-learning, mises en situation professionnelle.",
      modalites_evaluation: "Controle continu, examens, projets professionnels, soutenances.",
      accessibilite_handicap: "Un referent handicap est disponible pour vous accompagner.",
      blocs_competences_generique: '', equivalences: '',
    },
    indicateurs: { indicateur_1: '', indicateur_cfa: '' },
  }
}

export function getAllEcoles(): Ecole[] {
  if (!fs.existsSync(ECOLES_DIR)) return []
  const files = fs.readdirSync(ECOLES_DIR).filter(f => f.endsWith('.json'))
  return files.map(f => JSON.parse(fs.readFileSync(path.join(ECOLES_DIR, f), 'utf-8')) as Ecole)
}
