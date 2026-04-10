import { NextResponse } from 'next/server'
import { getFiche, updateFiche, getEcole } from '@/lib/store'
import { generateDocx, generateFileName } from '@/lib/generate-docx'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const fiche = await getFiche(params.id)
    if (!fiche) return NextResponse.json({ error: 'Fiche non trouvee' }, { status: 404 })

    const ecole = getEcole(fiche.ecole)
    if (!ecole) return NextResponse.json({ error: `Ecole "${fiche.ecole}" non trouvee` }, { status: 404 })

    const buffer = await generateDocx(fiche, ecole)
    const fileName = generateFileName(fiche, ecole.nom)

    await updateFiche(params.id, { statut: 'generee', fichier_genere: fileName })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[generate]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
