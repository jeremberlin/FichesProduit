'use client'

import Link from 'next/link'
import type { FicheData } from '@/lib/types'
import { StatusBadge, VersionBadge } from './FicheStatusBadge'

interface FicheCardProps {
  fiche: FicheData
  onDelete: (id: string) => void
  onGenerate: (id: string) => void
}

export default function FicheCard({ fiche, onDelete, onGenerate }: FicheCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{fiche.intitule || 'Sans titre'}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{fiche.ecole.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <VersionBadge version={fiche.version} />
          <StatusBadge statut={fiche.statut} />
        </div>
      </div>

      {fiche.numero_rncp && (
        <p className="text-xs text-gray-500 mb-3">RNCP {fiche.numero_rncp}</p>
      )}
      {fiche.annees_scolaires.length > 0 && (
        <p className="text-xs text-gray-400 mb-4">{fiche.annees_scolaires.join(', ')}</p>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <Link
          href={`/fiche/${fiche.id}`}
          className="text-xs font-medium text-galileo-blue hover:underline"
        >
          Voir
        </Link>
        <Link
          href={`/fiche/${fiche.id}/edit`}
          className="text-xs font-medium text-gray-600 hover:underline"
        >
          Modifier
        </Link>
        <button
          onClick={() => onGenerate(fiche.id)}
          className="text-xs font-medium text-green-600 hover:underline"
        >
          Generer .docx
        </button>
        {fiche.fichier_genere && (
          <a
            href={`/api/fiches/${fiche.id}/generate`}
            className="text-xs font-medium text-purple-600 hover:underline"
          >
            Telecharger
          </a>
        )}
        <button
          onClick={() => {
            if (confirm('Supprimer cette fiche ?')) onDelete(fiche.id)
          }}
          className="text-xs font-medium text-red-500 hover:underline ml-auto"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}
