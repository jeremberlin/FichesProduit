'use client'

import { useState } from 'react'
import type { FicheData, ProgrammeAnnee, UE } from '@/lib/types'

interface StepMatriceProps {
  data: Partial<FicheData>
  onChange: (updates: Partial<FicheData>) => void
}

export default function StepMatrice({ data, onChange }: StepMatriceProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  const programme = data.programme || []

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/matrice/parse', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Erreur de parsing')
      const parsed: ProgrammeAnnee[] = await res.json()
      // Calculer la durée totale depuis la matrice
      const totalHeures = parsed.reduce((sum, annee) =>
        sum + annee.ues.reduce((s, ue) =>
          s + ue.matieres.reduce((h, m) => h + (m.heures || 0), 0), 0), 0)
      const dureeText = `${Math.round(totalHeures)}h sur ${parsed.length} an${parsed.length > 1 ? 's' : ''}`
      onChange({ programme: parsed, duree: dureeText })
    } catch {
      setError('Erreur lors du parsing de la matrice. Verifiez le format du fichier.')
    } finally {
      setUploading(false)
    }
  }

  const addAnnee = () => {
    const next = [...programme, { annee: `Annee ${programme.length + 1}`, ues: [] }]
    onChange({ programme: next })
  }

  const addUE = (anneeIdx: number) => {
    const next = [...programme]
    next[anneeIdx] = { ...next[anneeIdx], ues: [...next[anneeIdx].ues, { nom: '', matieres: [] }] }
    onChange({ programme: next })
  }

  const addMatiere = (anneeIdx: number, ueIdx: number) => {
    const next = [...programme]
    const ues = [...next[anneeIdx].ues]
    ues[ueIdx] = { ...ues[ueIdx], matieres: [...ues[ueIdx].matieres, { nom: '' }] }
    next[anneeIdx] = { ...next[anneeIdx], ues }
    onChange({ programme: next })
  }

  const updateUE = (anneeIdx: number, ueIdx: number, updates: Partial<UE>) => {
    const next = [...programme]
    const ues = [...next[anneeIdx].ues]
    ues[ueIdx] = { ...ues[ueIdx], ...updates }
    next[anneeIdx] = { ...next[anneeIdx], ues }
    onChange({ programme: next })
  }

  const removeUE = (anneeIdx: number, ueIdx: number) => {
    const next = [...programme]
    const ues = [...next[anneeIdx].ues]
    ues.splice(ueIdx, 1)
    next[anneeIdx] = { ...next[anneeIdx], ues }
    onChange({ programme: next })
  }

  const removeMatiere = (anneeIdx: number, ueIdx: number, matIdx: number) => {
    const next = [...programme]
    const ues = [...next[anneeIdx].ues]
    const matieres = [...ues[ueIdx].matieres]
    matieres.splice(matIdx, 1)
    ues[ueIdx] = { ...ues[ueIdx], matieres }
    next[anneeIdx] = { ...next[anneeIdx], ues }
    onChange({ programme: next })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Programme (matrice pedagogique)</h3>

      {/* Upload zone */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-600 mb-3">
          Importez votre matrice pedagogique Excel pour generer automatiquement le programme.
        </p>
        <label className="inline-flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
          {uploading ? 'Analyse en cours...' : 'Choisir un fichier Excel'}
          <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
        </label>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {/* Durée calculée */}
      {programme.length > 0 && data.duree && (
        <div className="flex items-center gap-3 bg-galileo-light rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-galileo-blue">Duree calculee :</span>
          <input
            type="text"
            value={data.duree}
            onChange={e => onChange({ duree: e.target.value })}
            className="border border-galileo-blue/30 rounded-lg px-3 py-1.5 text-sm bg-white w-48"
          />
        </div>
      )}

      {/* Programme editor */}
      {programme.length > 0 && (
        <div>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            {programme.map((annee, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === idx
                    ? 'border-galileo-blue text-galileo-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {annee.annee}
              </button>
            ))}
            <button onClick={addAnnee} className="px-4 py-2 text-sm text-galileo-blue hover:underline">
              + Annee
            </button>
          </div>

          {/* Active tab content */}
          {programme[activeTab] && (
            <div className="space-y-4">
              {programme[activeTab].ues.map((ue, ueIdx) => (
                <div key={ueIdx} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={ue.nom}
                      onChange={e => updateUE(activeTab, ueIdx, { nom: e.target.value })}
                      placeholder="Nom de l'UE"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium"
                    />
                    <button onClick={() => removeUE(activeTab, ueIdx)} className="text-red-500 text-sm hover:underline">
                      Supprimer
                    </button>
                  </div>
                  <div className="ml-4 space-y-2">
                    {ue.matieres.map((mat, matIdx) => (
                      <div key={matIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={mat.nom}
                          onChange={e => {
                            const mats = [...ue.matieres]
                            mats[matIdx] = { ...mats[matIdx], nom: e.target.value }
                            updateUE(activeTab, ueIdx, { matieres: mats })
                          }}
                          placeholder="Nom de la matiere"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                        <input
                          type="number"
                          value={mat.heures || ''}
                          onChange={e => {
                            const mats = [...ue.matieres]
                            mats[matIdx] = { ...mats[matIdx], heures: parseInt(e.target.value) || undefined }
                            updateUE(activeTab, ueIdx, { matieres: mats })
                          }}
                          placeholder="h"
                          className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center"
                        />
                        <button onClick={() => removeMatiere(activeTab, ueIdx, matIdx)} className="text-red-400 text-xs hover:underline">
                          x
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addMatiere(activeTab, ueIdx)} className="text-xs text-galileo-blue hover:underline">
                      + Matiere
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => addUE(activeTab)} className="text-sm text-galileo-blue hover:underline">
                + Ajouter une UE
              </button>
            </div>
          )}
        </div>
      )}

      {programme.length === 0 && (
        <div className="text-center py-4">
          <button onClick={addAnnee} className="text-sm text-galileo-blue hover:underline">
            Saisir le programme manuellement
          </button>
        </div>
      )}
    </div>
  )
}
