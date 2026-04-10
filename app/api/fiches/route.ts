import { NextResponse } from 'next/server'
import { getAllFiches, createFiche } from '@/lib/store'

export async function GET() {
  const fiches = await getAllFiches()
  return NextResponse.json(fiches)
}

export async function POST(request: Request) {
  const data = await request.json()
  const fiche = await createFiche(data)
  return NextResponse.json(fiche, { status: 201 })
}
