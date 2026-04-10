'use client'

import { useEffect, useState } from 'react'
import type { FicheData, Ecole } from '@/lib/types'

interface StepIdentiteProps {
  data: Partial<FicheData>
  onChange: (updates: Partial<FicheData>) => void
}

export default function StepIdentite({ data, onChange }: StepIdentiteProps) {
  const [ecoles, setEcoles] = useState<Ecole[]>([])

  useEffect(() => {
    fetch('/api/ecoles').then(r => r.json()).then(setEcoles)
  }, [])

  const addAnnee = () => {
    const annees = [...(data.annees_scolaires || [])]
    const last = annees[annees.length - 1] || '2026-2027'
    const [start] = last.split('-').map(Number)
    annees.push(`${start + 1}-${start + 2}`)
    onChange({ annees_scolaires: annees })
  }

  const removeAnnee = (idx: number) => {
    const annees = [...(data.annees_scolaires || [])]
    annees.splice(idx, 1)
    onChange({ annees_scolaires: annees })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-lg font-semibold text-gray-900">Identite de la formation</h3>

      {/* Ecole */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ecole <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.ecole || ''}
          onChange={e => onChange({ ecole: e.target.value })}
          placeholder="Ex: ESG, Digital Campus, Cours Florent..."
          list="ecoles-list"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <datalist id="ecoles-list">
          {ecoles.map(e => (
            <option key={e.id} value={e.nom} />
          ))}
        </datalist>
      </div>

      {/* Intitule */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Intitule de la formation <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.intitule || ''}
          onChange={e => onChange({ intitule: e.target.value })}
          placeholder="Ex: Mastere Achats et Supply Chain Management"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* RNCP */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Numero RNCP
        </label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={data.numero_rncp || ''}
            onChange={e => onChange({ numero_rncp: e.target.value, formation_qualifiante: false })}
            placeholder="Ex: 36519"
            disabled={data.formation_qualifiante}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
          />
        </div>
        <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={data.formation_qualifiante || false}
            onChange={e => onChange({ formation_qualifiante: e.target.checked, numero_rncp: '' })}
            className="rounded border-gray-300"
          />
          Formation qualifiante (pas de RNCP)
        </label>
      </div>

      {/* Annees scolaires */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Annees scolaires <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {(data.annees_scolaires || ['2026-2027']).map((annee, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={annee}
                onChange={e => {
                  const annees = [...(data.annees_scolaires || [])]
                  annees[idx] = e.target.value
                  onChange({ annees_scolaires: annees })
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
              />
              {(data.annees_scolaires || []).length > 1 && (
                <button onClick={() => removeAnnee(idx)} className="text-red-500 text-sm hover:underline">
                  Retirer
                </button>
              )}
            </div>
          ))}
          <button onClick={addAnnee} className="text-sm text-galileo-blue hover:underline">
            + Ajouter une annee
          </button>
        </div>
      </div>

      {/* Version */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
        <select
          value={data.version || 'V0'}
          onChange={e => onChange({ version: e.target.value as 'V0' | 'V1' | 'V2' })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="V0">V0</option>
          <option value="V1">V1</option>
          <option value="V2">V2</option>
        </select>
      </div>
    </div>
  )
}
