import { NextResponse } from 'next/server'
import { getAllEcoles } from '@/lib/store'

export async function GET() {
  const ecoles = getAllEcoles()
  return NextResponse.json(ecoles)
}
