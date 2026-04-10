import type { FicheStatut, FicheVersion } from '@/lib/types'

export function StatusBadge({ statut }: { statut: FicheStatut }) {
  const styles = {
    brouillon: 'bg-yellow-100 text-yellow-800',
    generee: 'bg-green-100 text-green-800',
  }
  const labels = {
    brouillon: 'Brouillon',
    generee: 'Generee',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[statut]}`}>
      {labels[statut]}
    </span>
  )
}

export function VersionBadge({ version }: { version: FicheVersion }) {
  const styles = {
    V0: 'bg-gray-100 text-gray-700',
    V1: 'bg-blue-100 text-blue-700',
    V2: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[version]}`}>
      {version}
    </span>
  )
}
