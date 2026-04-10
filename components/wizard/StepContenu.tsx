'use client'

import { useState } from 'react'
import type { FicheData } from '@/lib/types'

interface StepContenuProps {
  data: Partial<FicheData>
  onChange: (updates: Partial<FicheData>) => void
}

interface OverrideFieldProps {
  label: string
  genericValue: string
  overrideKey: keyof FicheData
  data: Partial<FicheData>
  onChange: (updates: Partial<FicheData>) => void
}

function OverrideField({ label, genericValue, overrideKey, data, onChange }: OverrideFieldProps) {
  const [custom, setCustom] = useState(!!data[overrideKey])
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={custom}
            onChange={e => {
              setCustom(e.target.checked)
              if (!e.target.checked) onChange({ [overrideKey]: undefined } as Partial<FicheData>)
            }}
            className="rounded border-gray-300"
          />
          Personnaliser
        </label>
      </div>
      <textarea
        value={custom ? (data[overrideKey] as string || '') : genericValue}
        onChange={e => onChange({ [overrideKey]: e.target.value } as Partial<FicheData>)}
        disabled={!custom}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
      />
      {!custom && <p className="text-xs text-gray-400 mt-0.5">Bloc generique ecole</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composant generique de suggestion IA
// ---------------------------------------------------------------------------

interface AISuggestionFieldProps {
  label: string
  fieldKey: keyof FicheData
  value: string
  placeholder: string
  rows: number
  canGenerate: boolean
  disabledHint: string
  apiEndpoint: string
  buildPayload: () => Record<string, unknown>
  onChange: (value: string) => void
}

function AISuggestionField({
  label, fieldKey, value, placeholder, rows,
  canGenerate, disabledHint, apiEndpoint, buildPayload, onChange,
}: AISuggestionFieldProps) {
  const [generating, setGenerating] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setSuggestion(null)
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Erreur de generation')
      setSuggestion(body.suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {canGenerate && !suggestion && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-galileo-blue bg-galileo-light px-3 py-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generation en cours...
              </>
            ) : (
              <>
                <SparklesIcon />
                Generer avec l&apos;IA
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs mb-2">{error}</div>
      )}

      {suggestion && (
        <div className="mb-3 border-2 border-galileo-blue/30 rounded-lg overflow-hidden">
          <div className="bg-galileo-light px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-galileo-blue" />
              <span className="text-sm font-medium text-galileo-blue">Suggestion IA</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Regenerer
              </button>
              <button
                onClick={() => setSuggestion(null)}
                className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
              >
                Rejeter
              </button>
              <button
                onClick={() => { onChange(suggestion); setSuggestion(null) }}
                className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
              >
                Valider
              </button>
            </div>
          </div>
          <div className="p-4 bg-white text-sm whitespace-pre-line leading-relaxed text-gray-800 max-h-80 overflow-y-auto">
            {suggestion}
          </div>
        </div>
      )}

      {!suggestion && (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      )}

      {!canGenerate && !value && (
        <p className="text-xs text-amber-600 mt-1">{disabledHint}</p>
      )}
    </div>
  )
}

function SparklesIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  )
}

// Placeholder generic values
const GENERIC = {
  modalites_acces: "L'admission se fait sur dossier et entretien de motivation.\nLes candidatures sont ouvertes tout au long de l'annee.\nPour candidater, rendez-vous sur notre site www.esg.fr, rubrique Admission.",
  tarifs: "Les tarifs de formation sont consultables sur notre page Admission, rubrique Tarifs et financement.\nDans le cadre de l'alternance, aucun frais de scolarite n'est a la charge de l'alternant.",
  contacts: "Pour toute information complementaire, contactez notre service des admissions.",
  methodes_mobilisees: "Les methodes pedagogiques mobilisees sont les suivantes :\n- Cours en face a face avec des intervenants professionnels\n- Travaux de groupe et challenges professionnels\n- E-learning et ressources numeriques\n- Conferences et rencontres avec des professionnels\n- Mises en situation professionnelle et etudes de cas",
  modalites_evaluation: "Les modalites d'evaluation comprennent :\n- Controle continu (devoirs, etudes de cas, travaux de groupe)\n- Examens de fin de semestre\n- Projets professionnels et soutenances\n- Rapports de stage ou d'alternance",
  accessibilite_handicap: "L'ESG s'engage a accueillir les personnes en situation de handicap.\nUn referent handicap est disponible pour vous accompagner dans vos demarches et adapter votre parcours de formation.\nContact : handicap@esg.fr",
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function StepContenu({ data, onChange }: StepContenuProps) {
  const canGenerate = !!(data.intitule && data.blocs_competences?.length)

  return (
    <div className="space-y-6 max-w-3xl">
      <h3 className="text-lg font-semibold text-gray-900">Informations complementaires</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL du site</label>
        <input
          type="text"
          value={data.url_site || ''}
          onChange={e => onChange({ url_site: e.target.value })}
          placeholder="https://www.esg.fr/..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dates de rentree <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.dates_rentree || ''}
          onChange={e => onChange({ dates_rentree: e.target.value })}
          placeholder="Ex: Octobre 2026"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Storytelling avec generation IA */}
      <AISuggestionField
        label="Storytelling"
        fieldKey="storytelling"
        value={data.storytelling || ''}
        placeholder={canGenerate
          ? 'Cliquez sur "Generer avec l\'IA" pour un pitch marketing, ou redigez manuellement. Optionnel en V0.'
          : 'Optionnel en V0. Remplissez les etapes precedentes pour activer la generation IA.'
        }
        rows={5}
        canGenerate={canGenerate}
        disabledHint="Pour activer la generation IA, renseignez l'intitule (etape 1) et les blocs de competences (etape 2)."
        apiEndpoint="/api/generate-storytelling"
        buildPayload={() => ({
          intitule: data.intitule,
          ecole: data.ecole || 'ESG',
          blocs_competences: data.blocs_competences || [],
          debouches: data.debouches || [],
          niveau: data.nomenclature_titre?.match(/Niveau\s*(\d)/i)?.[1] || '7',
          ue_names: data.programme?.flatMap(p => p.ues.map(u => u.nom)).filter(Boolean) || [],
        })}
        onChange={val => onChange({ storytelling: val })}
      />

      {/* Objectifs pedagogiques avec generation IA (utilise le storytelling comme contexte) */}
      <AISuggestionField
        label="Objectifs pedagogiques / Introduction"
        fieldKey="objectifs_pedagogiques"
        value={data.objectifs_pedagogiques || ''}
        placeholder={canGenerate
          ? 'Cliquez sur "Generer avec l\'IA" pour obtenir une suggestion. Redigez d\'abord le storytelling pour un meilleur resultat.'
          : 'Remplissez les etapes precedentes pour activer la generation IA.'
        }
        rows={8}
        canGenerate={canGenerate}
        disabledHint="Pour activer la generation IA, renseignez l'intitule (etape 1) et les blocs de competences (etape 2)."
        apiEndpoint="/api/generate-intro"
        buildPayload={() => ({
          intitule: data.intitule,
          ecole: data.ecole || 'ESG',
          nomenclature_titre: data.nomenclature_titre || '',
          blocs_competences: data.blocs_competences || [],
          debouches: data.debouches || [],
          niveau: data.nomenclature_titre?.match(/Niveau\s*(\d)/i)?.[1] || '7',
          numero_rncp: data.numero_rncp || '',
          storytelling: data.storytelling || '',
          nombre_annees: data.programme?.length || 0,
          annees_labels: data.programme?.map(p => p.annee) || [],
          ue_names: data.programme?.flatMap(p => p.ues.map(u => u.nom)).filter(Boolean) || [],
        })}
        onChange={val => onChange({ objectifs_pedagogiques: val })}
      />

      {/* Taux d'obtention par ville */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Taux d&apos;obtention par ville</label>
        <div className="space-y-2">
          {Object.entries(data.taux_obtention_par_ville || {}).map(([ville, taux], idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={ville}
                onChange={e => {
                  const obj = { ...(data.taux_obtention_par_ville || {}) }
                  const val = obj[ville]
                  delete obj[ville]
                  obj[e.target.value] = val
                  onChange({ taux_obtention_par_ville: obj })
                }}
                placeholder="Ville"
                className="w-40 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              />
              <input
                type="text"
                value={taux}
                onChange={e => {
                  const obj = { ...(data.taux_obtention_par_ville || {}) }
                  obj[ville] = e.target.value
                  onChange({ taux_obtention_par_ville: obj })
                }}
                placeholder="Ex: 85%"
                className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => {
                  const obj = { ...(data.taux_obtention_par_ville || {}) }
                  delete obj[ville]
                  onChange({ taux_obtention_par_ville: obj })
                }}
                className="text-red-500 text-xs hover:underline"
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const obj = { ...(data.taux_obtention_par_ville || {}), '': '' }
              onChange({ taux_obtention_par_ville: obj })
            }}
            className="text-sm text-galileo-blue hover:underline"
          >
            + Ajouter une ville
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Indicateur 2 (taux insertion)</label>
        <textarea
          value={data.indicateur_2 || ''}
          onChange={e => onChange({ indicateur_2: e.target.value })}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Passerelles</label>
        <textarea
          value={data.passerelles || ''}
          onChange={e => onChange({ passerelles: e.target.value })}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Suite de parcours</label>
        <textarea
          value={data.suite_de_parcours || ''}
          onChange={e => onChange({ suite_de_parcours: e.target.value })}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <hr className="border-gray-200" />
      <h4 className="text-sm font-semibold text-gray-700">Blocs generiques ecole</h4>

      <OverrideField label="Modalites d'acces" genericValue={GENERIC.modalites_acces} overrideKey="override_modalites_acces" data={data} onChange={onChange} />
      <OverrideField label="Tarifs" genericValue={GENERIC.tarifs} overrideKey="override_tarifs" data={data} onChange={onChange} />
      <OverrideField label="Contacts" genericValue={GENERIC.contacts} overrideKey="override_contacts" data={data} onChange={onChange} />
      <OverrideField label="Methodes mobilisees" genericValue={GENERIC.methodes_mobilisees} overrideKey="override_methodes_mobilisees" data={data} onChange={onChange} />
      <OverrideField label="Modalites d'evaluation" genericValue={GENERIC.modalites_evaluation} overrideKey="override_modalites_evaluation" data={data} onChange={onChange} />
      <OverrideField label="Accessibilite handicap" genericValue={GENERIC.accessibilite_handicap} overrideKey="override_accessibilite_handicap" data={data} onChange={onChange} />
    </div>
  )
}
