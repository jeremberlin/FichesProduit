'use client'

import { useState } from 'react'
import type { FicheData } from '@/lib/types'

interface StepPreviewProps {
  data: Partial<FicheData>
  onGenerate: () => void
  onSaveDraft: () => void
  generating: boolean
  saving: boolean
  onChange: (updates: Partial<FicheData>) => void
}

const V0_REQUIRED: (keyof FicheData)[] = [
  'ecole', 'intitule', 'nomenclature_titre', 'blocs_competences',
  'duree', 'dates_rentree', 'modalites_evaluation_certification',
  'debouches',
]

function isFieldFilled(data: Partial<FicheData>, key: keyof FicheData): boolean {
  const val = data[key]
  if (Array.isArray(val)) return val.length > 0
  if (typeof val === 'string') return val.trim().length > 0
  return val !== undefined && val !== null
}

export default function StepPreview({ data, onGenerate, onSaveDraft, generating, saving, onChange }: StepPreviewProps) {
  const filledCount = V0_REQUIRED.filter(k => isFieldFilled(data, k)).length
  const totalRequired = V0_REQUIRED.length
  const completionPct = Math.round((filledCount / totalRequired) * 100)

  const missingFields = V0_REQUIRED.filter(k => !isFieldFilled(data, k))

  const objectifsCompetences = (data.blocs_competences || []).length > 0
    ? `A l'issue de ce ${data.intitule}, vous saurez :\n${(data.blocs_competences || []).join('\n')}`
    : ''

  const debouches = (data.debouches || []).length > 0
    ? `Nos diplomes accedent aux postes suivants :\n${(data.debouches || []).join('\n')}`
    : ''

  const canGenerateAI = !!(data.intitule && data.blocs_competences?.length)
  const hasStorytelling = !!(data.storytelling?.trim())
  const hasIntro = !!(data.objectifs_pedagogiques?.trim())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Apercu et generation</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{completionPct}% complet</span>
          <div className="w-32 h-2 bg-gray-200 rounded-full">
            <div
              className={`h-2 rounded-full ${completionPct === 100 ? 'bg-green-500' : 'bg-galileo-blue'}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {missingFields.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800 font-medium">Champs V0 manquants :</p>
          <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
            {missingFields.map(f => <li key={f}>{f.replace(/_/g, ' ')}</li>)}
          </ul>
        </div>
      )}

      {/* Suggestion de generation IA pour les champs vides */}
      {canGenerateAI && (!hasStorytelling || !hasIntro) && (
        <AIGeneratePrompt
          hasStorytelling={hasStorytelling}
          hasIntro={hasIntro}
          data={data}
          onChange={onChange}
        />
      )}

      {/* Preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="text-center mb-4">
          <p className="font-bold">{(data.ecole || '').toUpperCase()}</p>
          <p style={{ color: '#2F5496' }}>{data.intitule || ''}</p>
          <p style={{ color: '#2F5496' }}>{data.nomenclature_titre || ''}</p>
        </div>

        {/* Storytelling */}
        <table className="w-full border-collapse border border-gray-300 mb-4">
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 font-bold">Storytelling</td>
            </tr>
            <tr>
              <td className={`border border-gray-300 p-2 ${!hasStorytelling ? 'bg-amber-50' : ''}`}>
                {hasStorytelling
                  ? <span className="whitespace-pre-line">{data.storytelling}</span>
                  : <span className="text-amber-500 italic">Non renseigne — utilisez le bouton ci-dessus pour generer</span>
                }
              </td>
            </tr>
          </tbody>
        </table>

        {/* Main table */}
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <tbody>
            {/* Section 1 */}
            <tr className="bg-gray-100">
              <td colSpan={2} className="border border-gray-300 p-2 font-bold">Caracteristiques de la formation (ind. 1)</td>
              <td className="border border-gray-300 p-2 font-bold">Emplacement site web</td>
              <td className="border border-gray-300 p-2 font-bold"></td>
            </tr>
            <PreviewRow label="URL" value={data.url_site} />
            <PreviewRow label="Prerequis" value={data.prerequis} />
            <PreviewRow label="Objectifs competences" value={objectifsCompetences} />
            <PreviewRow label="Objectifs pedagogiques / Introduction" value={data.objectifs_pedagogiques} highlight={!hasIntro} />
            <PreviewRow label="Duree" value={data.duree} required />
            <PreviewRow label="Modalites d'acces" value="[Bloc generique]" />
            <PreviewRow label="Dates de rentree" value={data.dates_rentree} required />
            <PreviewRow label="Tarifs" value="[Bloc generique]" />
            <PreviewRow label="Contacts" value="[Bloc generique]" />
            <PreviewRow label="Methodes mobilisees" value="[Bloc generique]" />
            <PreviewRow label="Modalites d'evaluation" value="[Bloc generique]" />
            <PreviewRow label="Modalites eval. certification" value={data.modalites_evaluation_certification} required />
            <PreviewRow label="Accessibilite handicap" value="[Bloc generique]" />

            {/* Section 2 */}
            <tr className="bg-gray-100">
              <td colSpan={3} className="border border-gray-300 p-2 font-bold">Indicateurs de resultats (ind. 2)</td>
              <td className="border border-gray-300 p-2 font-bold"></td>
            </tr>
            <PreviewRow label="Indicateur 1" value="[Chiffres ecole]" />
            <PreviewRow label="Indicateur 2" value={data.indicateur_2} />
            <PreviewRow label="Indicateurs CFA" value="[Chiffres ecole]" />

            {/* Section 3 */}
            <tr className="bg-gray-100">
              <td colSpan={3} className="border border-gray-300 p-2 font-bold">Informations specifiques RNCP / RS (ind. 3)</td>
              <td className="border border-gray-300 p-2 font-bold"></td>
            </tr>
            <PreviewRow label="Taux obtention" value={
              Object.entries(data.taux_obtention_par_ville || {}).map(([v, t]) => `${v}: ${t}`).join(', ') || undefined
            } />
            <PreviewRow label="Blocs de competences" value="[Bloc generique]" />
            <PreviewRow label="Certification visee" value={data.nomenclature_titre} />
            <PreviewRow label="Equivalences" value={data.equivalences_rncp || '[Bloc generique]'} />
            <PreviewRow label="Passerelles" value={data.passerelles} />
            <PreviewRow label="Suite de parcours" value={data.suite_de_parcours} />
            <PreviewRow label="Debouches" value={debouches} required />

            {/* Programme */}
            {(data.programme || []).map((annee, idx) => (
              <PreviewRow
                key={idx}
                label={`Programme ${annee.annee}`}
                value={annee.ues.map(ue =>
                  `${ue.nom}\n${ue.matieres.map(m => `  - ${m.nom}`).join('\n')}`
                ).join('\n\n') || undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {generating ? 'Generation...' : 'Generer le .docx'}
        </button>
        <button
          onClick={onSaveDraft}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder comme brouillon'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bandeau de generation IA rapide
// ---------------------------------------------------------------------------

function AIGeneratePrompt({ hasStorytelling, hasIntro, data, onChange }: {
  hasStorytelling: boolean
  hasIntro: boolean
  data: Partial<FicheData>
  onChange: (updates: Partial<FicheData>) => void
}) {
  const [generatingField, setGeneratingField] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<{ field: string; text: string } | null>(null)

  const ueNames = data.programme?.flatMap(p => p.ues.map(u => u.nom)).filter(Boolean) || []

  const generateField = async (field: 'storytelling' | 'objectifs_pedagogiques') => {
    setGeneratingField(field)
    setSuggestion(null)

    const endpoint = field === 'storytelling' ? '/api/generate-storytelling' : '/api/generate-intro'
    const payload = field === 'storytelling'
      ? {
          intitule: data.intitule,
          ecole: data.ecole || 'ESG',
          blocs_competences: data.blocs_competences || [],
          debouches: data.debouches || [],
          niveau: data.nomenclature_titre?.match(/Niveau\s*(\d)/i)?.[1] || '7',
          ue_names: ueNames,
        }
      : {
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
          ue_names: ueNames,
        }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)
      setSuggestion({ field, text: body.suggestion })
    } catch {
      // silently fail
    } finally {
      setGeneratingField(null)
    }
  }

  const acceptSuggestion = () => {
    if (!suggestion) return
    onChange({ [suggestion.field]: suggestion.text })
    setSuggestion(null)
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            {!hasStorytelling && !hasIntro
              ? 'Le storytelling et les objectifs pedagogiques ne sont pas remplis.'
              : !hasStorytelling
              ? 'Le storytelling n\'est pas rempli.'
              : 'Les objectifs pedagogiques ne sont pas remplis.'
            }
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Ces champs sont optionnels en V0 mais presents dans toutes les fiches de reference. Generez-les maintenant en un clic.
          </p>
          <div className="flex items-center gap-2 mt-2">
            {!hasStorytelling && (
              <button
                onClick={() => generateField('storytelling')}
                disabled={!!generatingField}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-galileo-blue px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generatingField === 'storytelling' ? (
                  <><Spinner /> Generation...</>
                ) : (
                  <><SparklesIcon /> Generer le storytelling</>
                )}
              </button>
            )}
            {!hasIntro && (
              <button
                onClick={() => generateField('objectifs_pedagogiques')}
                disabled={!!generatingField}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-galileo-blue px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generatingField === 'objectifs_pedagogiques' ? (
                  <><Spinner /> Generation...</>
                ) : (
                  <><SparklesIcon /> Generer les objectifs pedagogiques</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {suggestion && (
        <div className="border-2 border-galileo-blue/30 rounded-lg overflow-hidden mt-3">
          <div className="bg-galileo-light px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-galileo-blue">
              {suggestion.field === 'storytelling' ? 'Storytelling' : 'Objectifs pedagogiques'} — Suggestion IA
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => generateField(suggestion.field as 'storytelling' | 'objectifs_pedagogiques')}
                disabled={!!generatingField}
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
                onClick={acceptSuggestion}
                className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
              >
                Valider
              </button>
            </div>
          </div>
          <div className="p-4 bg-white text-sm whitespace-pre-line leading-relaxed text-gray-800 max-h-60 overflow-y-auto">
            {suggestion.text}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Petits composants utilitaires
// ---------------------------------------------------------------------------

function PreviewRow({ label, value, required, highlight }: { label: string; value?: string; required?: boolean; highlight?: boolean }) {
  const empty = !value || value.trim() === ''
  return (
    <tr>
      <td className="border border-gray-300 p-2 align-top font-medium w-40">{label}</td>
      <td className={`border border-gray-300 p-2 align-top whitespace-pre-line ${
        empty && required ? 'bg-yellow-50' : empty && highlight ? 'bg-amber-50' : ''
      }`}>
        {empty
          ? <span className={required ? 'text-red-400 italic' : 'text-gray-400 italic'}>
              {required ? 'Requis' : '-'}
            </span>
          : value
        }
      </td>
      <td className="border border-gray-300 p-2 align-top text-gray-400"></td>
      <td className="border border-gray-300 p-2 align-top"></td>
    </tr>
  )
}

function SparklesIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
