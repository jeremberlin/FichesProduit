'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { FicheData, FicheStatut } from '@/lib/types'
import FicheCard from '@/components/fiches/FicheCard'

export default function Dashboard() {
  const [fiches, setFiches] = useState<FicheData[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEcole, setFilterEcole] = useState('')
  const [filterStatut, setFilterStatut] = useState<FicheStatut | ''>('')

  const loadFiches = useCallback(async () => {
    const res = await fetch('/api/fiches')
    const data = await res.json()
    setFiches(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadFiches() }, [loadFiches])

  const handleDelete = async (id: string) => {
    await fetch(`/api/fiches/${id}`, { method: 'DELETE' })
    loadFiches()
  }

  const handleGenerate = async (id: string) => {
    const res = await fetch(`/api/fiches/${id}/generate`, { method: 'POST' })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'fiche.docx'
      a.click()
      URL.revokeObjectURL(url)
      loadFiches()
    }
  }

  const ecoles = [...new Set(fiches.map(f => f.ecole))]

  const filtered = fiches.filter(f => {
    if (filterEcole && f.ecole !== filterEcole) return false
    if (filterStatut && f.statut !== filterStatut) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <select
            value={filterEcole}
            onChange={e => setFilterEcole(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Toutes les ecoles</option>
            {ecoles.map(e => (
              <option key={e} value={e}>{e.toUpperCase()}</option>
            ))}
          </select>
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value as FicheStatut | '')}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="brouillon">Brouillon</option>
            <option value="generee">Generee</option>
          </select>
        </div>
        <Link
          href="/nouvelle-fiche"
          className="inline-flex items-center gap-2 bg-galileo-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouvelle fiche produit
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-sm">
            {fiches.length === 0
              ? 'Aucune fiche produit. Commencez par en creer une.'
              : 'Aucune fiche ne correspond aux filtres.'
            }
          </div>
          {fiches.length === 0 && (
            <Link
              href="/nouvelle-fiche"
              className="inline-flex items-center gap-2 mt-4 bg-galileo-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Creer ma premiere fiche
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(fiche => (
            <FicheCard
              key={fiche.id}
              fiche={fiche}
              onDelete={handleDelete}
              onGenerate={handleGenerate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
