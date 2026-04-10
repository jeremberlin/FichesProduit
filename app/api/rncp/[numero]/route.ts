import { NextResponse } from 'next/server'
import { fetchRNCP } from '@/lib/fetch-rncp'

export async function GET(_request: Request, { params }: { params: { numero: string } }) {
  try {
    const data = await fetchRNCP(params.numero)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
