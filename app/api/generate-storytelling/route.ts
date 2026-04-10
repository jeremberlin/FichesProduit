import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Tu es un copywriter expert en enseignement supérieur privé en France.
Tu rédiges le champ "Storytelling" des fiches produit du groupe Galileo Global Education.

LE STORYTELLING est un PITCH ÉMOTIONNEL COURT. Son but : donner envie en 5 secondes de lecture.
Ce n'est PAS une description de la formation. C'est un texte d'accroche marketing qui parle du SECTEUR, du MÉTIER, de l'AMBITION de l'étudiant — pas du contenu des cours.

RÈGLES :
- Vouvoiement ("vous")
- Écriture inclusive pour les métiers
- 60 à 100 mots MAXIMUM — c'est un pitch, pas un paragraphe descriptif
- Ton inspirant, concret, orienté terrain professionnel
- PAS de mention de l'école, de la pédagogie, de l'alternance, du titre RNCP
- PAS de liste de compétences
- INTERDIT de commencer par "Les ressources humaines sont..." ou tout énoncé générique de type Wikipédia

CE QUE TU DOIS FAIRE :
Peindre en 3-4 phrases le quotidien passionnant du futur professionnel. Faire ressentir l'impact du métier. Donner envie d'y être.

EXEMPLES DE BON STORYTELLING :

Exemple 1 (Achats) :
"Négocier un contrat à 2 millions d'euros avec un fournisseur stratégique. Réduire les coûts de 15% tout en améliorant la qualité. Piloter une supply chain responsable à l'échelle internationale. C'est le quotidien d'une ou un Manager Achats — un rôle clé où chaque décision impacte directement la rentabilité et la compétitivité de l'entreprise."

Exemple 2 (Marketing) :
"Lancer une campagne qui fait le buzz. Analyser les données pour anticiper les tendances. Construire une marque que les consommateurs adorent. Le marketing, c'est l'art de connecter une entreprise à son marché — et vous êtes au cœur de cette stratégie."

Exemple 3 (Audit) :
"Déceler une anomalie dans un reporting financier. Recommander une réorganisation qui fera gagner 3 points de marge. Accompagner un comité de direction dans ses choix stratégiques. L'audit et le contrôle de gestion, c'est le pouvoir de voir ce que les autres ne voient pas."`

interface GenerateRequest {
  intitule: string
  ecole: string
  blocs_competences: string[]
  debouches: string[]
  niveau: string
  ue_names?: string[]
}

export async function POST(request: Request) {
  const body: GenerateRequest = await request.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Cle API Anthropic non configuree. Ajoutez ANTHROPIC_API_KEY dans .env.local' },
      { status: 500 }
    )
  }

  const client = new Anthropic({ apiKey })

  // Détecter la coloration sectorielle depuis le nom de l'école et les UE
  const ueContext = body.ue_names?.length
    ? `\nMATIÈRES CLÉS DU PROGRAMME (elles révèlent le secteur d'application) :\n${body.ue_names.map(u => `- ${u}`).join('\n')}\n`
    : ''

  const ecoleHint = body.ecole
    ? `\nÉCOLE : ${body.ecole.toUpperCase()} — si le nom de l'école indique un secteur (ex: "ESG Sport" → sport, "Digital Campus" → numérique, "ESG Luxe" → luxe), le storytelling DOIT être ancré dans ce secteur. Les exemples concrets, le vocabulaire et les situations décrites doivent refléter ce secteur, pas rester génériques.\n`
    : ''

  const userPrompt = `Rédige le storytelling pour cette formation :

FORMATION : ${body.intitule}
DÉBOUCHÉS MÉTIERS : ${body.debouches.join(', ')}
${ecoleHint}${ueContext}
Peins en 3-4 phrases le quotidien impactant de ce futur professionnel dans son secteur. 60 à 100 mots maximum. Commence directement, sans titre.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    const text = textBlock ? textBlock.text : ''

    return NextResponse.json({ suggestion: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur API Anthropic'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
