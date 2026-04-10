import { NextResponse } from 'next/server'
import { parseMatrice } from '@/lib/parse-matrice'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const programme = parseMatrice(buffer)
    return NextResponse.json(programme)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur de parsing'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
