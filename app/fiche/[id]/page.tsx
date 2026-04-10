'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { FicheData } from '@/lib/types'
import { StatusBadge, VersionBadge } from '@/components/fiches/FicheStatusBadge'

export default function FicheDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [fiche, setFiche] = useState<FicheData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch(`/api/fiches/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setFiche(data); setLoading(false) })
  }, [params.id])

  const handleGenerate = async () => {
    if (!fiche) return
    setGenerating(true)
    const res = await fetch(`/api/fiches/${fiche.id}/generate`, { method: 'POST' })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'fiche.docx'
      a.click()
      URL.revokeObjectURL(url)
      // Refresh
      const updated = await fetch(`/api/fiches/${fiche.id}`).then(r => r.json())
      setFiche(updated)
    }
    setGenerating(false)
  }

  const handleDelete = async () => {
    if (!fiche || !confirm('Supprimer cette fiche ?')) return
    await fetch(`/api/fiches/${fiche.id}`, { method: 'DELETE' })
    router.push('/')
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>
  if (!fiche) return <div className="text-center py-12 text-gray-500">Fiche non trouvee.</div>

  const objectifs = fiche.blocs_competences.length > 0
    ? `A l'issue de ce ${fiche.intitule}, vous saurez :\n${fiche.blocs_competences.join('\n')}`
    : ''
  const debouches = fiche.debouches.length > 0
    ? `Nos diplomes accedent aux postes suivants :\n${fiche.debouches.join('\n')}`
    : ''

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{fiche.intitule || 'Sans titre'}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{fiche.ecole.toUpperCase()}</span>
            <VersionBadge version={fiche.version} />
            <StatusBadge statut={fiche.statut} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/fiche/${fiche.id}/edit`}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Modifier
          </Link>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? 'Generation...' : fiche.fichier_genere ? 'Regenerer' : 'Generer .docx'}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
          >
            Supprimer
          </button>
        </div>
      </div>

      {fiche.fichier_genere && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center justify-between">
          <span className="text-sm text-green-700">Fichier genere : {fiche.fichier_genere}</span>
          <button onClick={handleGenerate} className="text-sm text-green-700 font-medium hover:underline">
            Telecharger
          </button>
        </div>
      )}

      {/* Preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="text-center mb-4">
          <p className="font-bold">{fiche.ecole.toUpperCase()}</p>
          <p style={{ color: '#2F5496' }}>{fiche.intitule}</p>
          <p style={{ color: '#2F5496' }}>{fiche.nomenclature_titre}</p>
        </div>

        <table className="w-full border-collapse border border-gray-300 mb-4">
          <tbody>
            <tr><td className="border border-gray-300 p-2 font-bold">Storytelling</td></tr>
            <tr><td className="border border-gray-300 p-2">{fiche.storytelling || <span className="text-gray-400 italic">-</span>}</td></tr>
          </tbody>
        </table>

        <table className="w-full border-collapse border border-gray-300 text-xs">
          <tbody>
            <tr className="bg-gray-100">
              <td colSpan={2} className="border border-gray-300 p-2 font-bold">Caracteristiques de la formation (ind. 1)</td>
              <td className="border border-gray-300 p-2 font-bold">Emplacement</td>
              <td className="border border-gray-300 p-2 font-bold"></td>
            </tr>
            <Row label="URL" value={fiche.url_site} />
            <Row label="Prerequis" value={fiche.prerequis} />
            <Row label="Objectifs competences" value={objectifs} />
            <Row label="Objectifs pedagogiques" value={fiche.objectifs_pedagogiques} />
            <Row label="Duree" value={fiche.duree} />
            <Row label="Dates de rentree" value={fiche.dates_rentree} />
            <Row label="Modalites eval. certification" value={fiche.modalites_evaluation_certification} />

            <tr className="bg-gray-100">
              <td colSpan={3} className="border border-gray-300 p-2 font-bold">Indicateurs de resultats (ind. 2)</td>
              <td className="border border-gray-300 p-2"></td>
            </tr>
            <Row label="Indicateur 2" value={fiche.indicateur_2} />

            <tr className="bg-gray-100">
              <td colSpan={3} className="border border-gray-300 p-2 font-bold">Informations RNCP / RS (ind. 3)</td>
              <td className="border border-gray-300 p-2"></td>
            </tr>
            <Row label="Taux obtention" value={Object.entries(fiche.taux_obtention_par_ville).map(([v, t]) => `${v}: ${t}`).join('\n')} />
            <Row label="Certification visee" value={fiche.nomenclature_titre} />
            <Row label="Equivalences" value={fiche.equivalences_rncp} />
            <Row label="Passerelles" value={fiche.passerelles} />
            <Row label="Suite de parcours" value={fiche.suite_de_parcours} />
            <Row label="Debouches" value={debouches} />

            {fiche.programme.map((annee, idx) => (
              <Row
                key={idx}
                label={`Programme ${annee.annee}`}
                value={annee.ues.map(ue => `${ue.nom}\n${ue.matieres.map(m => `  - ${m.nom}`).join('\n')}`).join('\n\n')}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Cree le {new Date(fiche.createdAt).toLocaleDateString('fr-FR')} - Modifie le {new Date(fiche.updatedAt).toLocaleDateString('fr-FR')}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <tr>
      <td className="border border-gray-300 p-2 align-top font-medium w-40">{label}</td>
      <td className="border border-gray-300 p-2 align-top whitespace-pre-line">
        {value || <span className="text-gray-400 italic">-</span>}
      </td>
      <td className="border border-gray-300 p-2 align-top"></td>
      <td className="border border-gray-300 p-2 align-top"></td>
    </tr>
  )
}
