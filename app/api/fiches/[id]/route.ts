import { NextResponse } from 'next/server'
import { getFiche, updateFiche, deleteFiche } from '@/lib/store'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const fiche = await getFiche(params.id)
  if (!fiche) return NextResponse.json({ error: 'Fiche non trouvee' }, { status: 404 })
  return NextResponse.json(fiche)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const data = await request.json()
  const fiche = await updateFiche(params.id, data)
  if (!fiche) return NextResponse.json({ error: 'Fiche non trouvee' }, { status: 404 })
  return NextResponse.json(fiche)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const success = await deleteFiche(params.id)
  if (!success) return NextResponse.json({ error: 'Fiche non trouvee' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
