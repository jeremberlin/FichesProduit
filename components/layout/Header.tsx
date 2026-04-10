'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/nouvelle-fiche': 'Nouvelle fiche produit',
}

export default function Header() {
  const pathname = usePathname()
  const title = titles[pathname] || (pathname.startsWith('/fiche/') ? 'Fiche produit' : 'Fiches Produit')

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    </header>
  )
}
