'use client'

import { useState } from 'react'
import type { FicheData, RNCPData } from '@/lib/types'

interface StepRNCPProps {
  data: Partial<FicheData>
  onChange: (updates: Partial<FicheData>) => void
}

export default function StepRNCP({ data, onChange }: StepRNCPProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetched, setFetched] = useState(false)
  const [rncpRaw, setRncpRaw] = useState<RNCPData | null>(null)

  const fetchRNCP = async () => {
    if (!data.numero_rncp) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/rncp/${data.numero_rncp}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Erreur lors de la recuperation')
      }
      const rncp: RNCPData = await res.json()
      setRncpRaw(rncp)

      // Construire la nomenclature du titre
      const nomenclature = buildNomenclature(rncp)

      // Construire les blocs de competences (libelles uniquement)
      const blocs = rncp.blocs_competences.map(b => b.libelle)

      // Construire les debouches
      const debouches = rncp.debouches_formates.length > 0
        ? rncp.debouches_formates
        : rncp.codes_rome.map(r => r.libelle)

      // Construire les equivalences
      let equivalences = ''
      if (rncp.anciennes_certifications.length > 0) {
        equivalences = `Cette certification remplace : ${rncp.anciennes_certifications.join(', ')}.`
      }

      onChange({
        nomenclature_titre: nomenclature,
        blocs_competences: blocs,
        modalites_evaluation_certification: rncp.modalites_evaluation_certification || '',
        debouches,
        equivalences_rncp: equivalences,
        prerequis: rncp.prerequis || '',
      })
      setFetched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  if (data.formation_qualifiante) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-900">Formation qualifiante</h3>
        <p className="text-sm text-gray-600">
          Cette formation n&apos;est pas certifiante. Saisissez manuellement les informations ci-dessous.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nomenclature du titre</label>
          <input
            type="text"
            value={data.nomenclature_titre || 'Formation qualifiante'}
            onChange={e => onChange({ nomenclature_titre: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Donnees RNCP</h3>
        {data.numero_rncp && (
          <button
            onClick={fetchRNCP}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-galileo-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoadingSpinner />
                Chargement...
              </>
            ) : fetched ? 'Actualiser les donnees' : 'Recuperer les donnees'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Fiche RNCP resume - affiché apres fetch */}
      {rncpRaw && (
        <div className="bg-galileo-light border border-galileo-blue/20 rounded-lg p-4 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rncpRaw.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {rncpRaw.actif ? 'Active' : 'Inactive'}
            </span>
            <span className="font-semibold text-galileo-blue">RNCP{rncpRaw.numero}</span>
          </div>
          <p className="font-medium">{rncpRaw.titre_officiel}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600 text-xs">
            <div><span className="font-medium">Niveau :</span> {rncpRaw.niveau_europeen}</div>
            <div><span className="font-medium">Certificateur :</span> {rncpRaw.certificateur}</div>
            <div><span className="font-medium">NSF :</span> {rncpRaw.codes_nsf.map(n => `${n.code} - ${n.libelle}`).join(', ')}</div>
            <div><span className="font-medium">Decision :</span> {rncpRaw.date_decision}</div>
            <div><span className="font-medium">Fin enregistrement :</span> {rncpRaw.date_fin_enregistrement}</div>
            <div><span className="font-medium">Type :</span> {rncpRaw.type_enregistrement}</div>
          </div>
          {rncpRaw.voies_acces.length > 0 && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Voies d&apos;acces :</span> {rncpRaw.voies_acces.join(' / ')}
            </div>
          )}
          {rncpRaw.codes_rome.length > 0 && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Codes ROME :</span>{' '}
              {rncpRaw.codes_rome.map(r => `${r.code} - ${r.libelle}`).join(', ')}
            </div>
          )}
          {rncpRaw.anciennes_certifications.length > 0 && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Remplace :</span> {rncpRaw.anciennes_certifications.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Nomenclature */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nomenclature du titre <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.nomenclature_titre || ''}
          onChange={e => onChange({ nomenclature_titre: e.target.value })}
          rows={3}
          placeholder="Sera genere automatiquement a partir des donnees RNCP"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        {!data.nomenclature_titre && rncpRaw && (
          <p className="text-xs text-gray-400 mt-1">Cliquez sur &quot;Recuperer les donnees&quot; pour generer automatiquement</p>
        )}
      </div>

      {/* Blocs de competences */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Blocs de competences <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Ces blocs seront utilises pour generer les &quot;Objectifs competences&quot; de la fiche.
        </p>
        <div className="space-y-2">
          {(data.blocs_competences || []).map((bloc, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs text-gray-400 mt-2.5 w-10 flex-shrink-0">
                {rncpRaw?.blocs_competences[idx]?.code?.replace(`RNCP${rncpRaw.numero}`, '') || `#${idx + 1}`}
              </span>
              <input
                type="text"
                value={bloc}
                onChange={e => {
                  const blocs = [...(data.blocs_competences || [])]
                  blocs[idx] = e.target.value
                  onChange({ blocs_competences: blocs })
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  const blocs = [...(data.blocs_competences || [])]
                  blocs.splice(idx, 1)
                  onChange({ blocs_competences: blocs })
                }}
                className="text-red-500 text-sm hover:underline mt-2"
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ blocs_competences: [...(data.blocs_competences || []), ''] })}
            className="text-sm text-galileo-blue hover:underline"
          >
            + Ajouter un bloc
          </button>
        </div>
      </div>

      {/* Modalites evaluation certification */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Modalites d&apos;evaluation de la certification <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Ce champ n&apos;est pas disponible dans les donnees ouvertes. Remplissez-le manuellement
          a partir de la fiche RNCP sur le site France Competences.
        </p>
        <textarea
          value={data.modalites_evaluation_certification || ''}
          onChange={e => onChange({ modalites_evaluation_certification: e.target.value })}
          rows={4}
          placeholder="Copiez les modalites d'evaluation depuis la fiche RNCP..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        {data.numero_rncp && (
          <a
            href={`https://www.francecompetences.fr/recherche/rncp/${data.numero_rncp}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-galileo-blue hover:underline mt-1 inline-block"
          >
            Ouvrir la fiche RNCP {data.numero_rncp} sur France Competences
          </a>
        )}
      </div>

      {/* Debouches */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Debouches / metiers vises <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Generes a partir des codes ROME. Adaptez la formulation en ecriture inclusive.
        </p>
        <div className="space-y-2">
          {(data.debouches || []).map((d, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={d}
                onChange={e => {
                  const list = [...(data.debouches || [])]
                  list[idx] = e.target.value
                  onChange({ debouches: list })
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  const list = [...(data.debouches || [])]
                  list.splice(idx, 1)
                  onChange({ debouches: list })
                }}
                className="text-red-500 text-sm hover:underline"
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ debouches: [...(data.debouches || []), ''] })}
            className="text-sm text-galileo-blue hover:underline"
          >
            + Ajouter un debouche
          </button>
        </div>
      </div>

      {/* Prerequis */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Prerequis <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Recuperes automatiquement depuis la fiche France Competences. Modifiez si besoin.
        </p>
        <textarea
          value={data.prerequis || ''}
          onChange={e => onChange({ prerequis: e.target.value })}
          rows={6}
          placeholder="Les prerequis seront remplis automatiquement lors de la recuperation des donnees RNCP."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Equivalences */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Equivalences</label>
        <textarea
          value={data.equivalences_rncp || ''}
          onChange={e => onChange({ equivalences_rncp: e.target.value })}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildNomenclature(rncp: RNCPData): string {
  const nsf = rncp.codes_nsf[0]?.code || ''
  return (
    `Titre ${rncp.titre_officiel} delivre par ${rncp.certificateur}, ` +
    `NSF ${nsf} - Niveau ${rncp.niveau}. ` +
    `Enregistre au RNCP sous le numero ${rncp.numero} par decision du Directeur General ` +
    `de France Competences en date du ${rncp.date_decision}.`
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
