import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Tu es un rédacteur expert en communication pour l'enseignement supérieur privé en France.
Tu rédiges le champ "Objectifs pédagogiques / Introduction" des fiches produit du groupe Galileo Global Education.

CONTEXTE : ce champ est DIFFÉRENT du storytelling. Le storytelling (un autre champ de la fiche) est le pitch émotionnel sur le métier. Ici, tu parles de LA FORMATION ELLE-MÊME : ce qu'on y apprend, comment on y apprend, et ce qu'on obtient à la fin.

RÈGLES :
- Vouvoiement systématique ("vous")
- Écriture inclusive pour les métiers
- Ton professionnel, concret, orienté étudiant/candidat
- Ne jamais inventer de chiffres non fournis
- Terminer par une note renvoyant à la nomenclature du titre RNCP (précédée de *)
- 150 à 250 mots (hors note de bas)

STRUCTURE :

1. ACCROCHE (1 ligne en majuscules) — une question :
   - Mastère/MBA : "POURQUOI CHOISIR LE [INTITULÉ] DE L'[ÉCOLE] ?"
   - Bachelor : "EN QUOI CONSISTE LE [INTITULÉ] DE L'[ÉCOLE] ?"

2. PARAGRAPHE D'OUVERTURE (2-3 phrases) — Ce que vous allez concrètement apprendre et savoir faire à la sortie. S'appuyer sur les blocs de compétences RNCP. NE PAS parler du secteur/métier (c'est le rôle du storytelling).

3. PARAGRAPHES CORPS (3-4 paragraphes courts) — Les atouts de la formation :
   - Pédagogie : "Notre pédagogie est concrète, elle s'appuie sur des mises en situation réelles. Les cours sont animés par des professionnels."
   - Alternance/stages : "Vous vous immergez en entreprise au travers des stages ou de l'alternance pour accroître votre employabilité."
   - International (si pertinent) : "Vous avez la possibilité de partir à l'international."
   - Titre reconnu : "Vous obtenez un titre certifié reconnu par l'État*"
   - Groupe : "Vous intégrez un groupe solide : Galileo Global Education, n°1 mondial de l'enseignement supérieur privé."
   Sélectionner les 3-4 plus pertinents, ne pas tous les mettre.

4. NOTE RNCP (1 ligne) : "* " + nomenclature complète du titre

CONTRAINTE CRITIQUE : si un storytelling est fourni, NE PAS répéter ses idées, ses tournures ni sa structure. Le storytelling parle du MÉTIER. Toi tu parles de la FORMATION (pédagogie, compétences acquises, alternance, titre).

EXEMPLES :

--- Exemple 1 (Mastère Achats) ---
POURQUOI CHOISIR LE MASTÈRE MANAGEMENT DES ACHATS DE L'ESG ?

À l'ESG, vous allez développer des compétences à la fois stratégiques et pratiques, directement applicables en entreprise. Notre pédagogie est concrète, elle s'appuie sur des mises en situation réelles. Les cours sont animés par des professionnels au fait des pratiques actuelles de leur domaine.
Les achats se doivent d'intégrer les questions environnementales et sociales. Elles sont intégrées dans la formation.
Vous vous immergez en entreprise au travers des stages ou de l'alternance pour accroître votre employabilité.
Vous obtenez un titre certifié reconnu par l'État*, gage de l'employabilité qu'assure la formation.
Vous intégrez un groupe solide auquel appartient l'ESG : Galileo Global Education, n°1 mondial de l'enseignement supérieur privé.

* Titre Manager de la performance achats délivré par ESGCV, NSF 312p - Niveau 7. Enregistré au RNCP sous le numéro 39238 par décision du Directeur Général de France Compétences en date du 27/06/2024.

--- Exemple 2 (Bachelor Commerce Marketing) ---
EN QUOI CONSISTE LE BACHELOR COMMERCE ET MARKETING DE L'ESG ?

Vous avez une âme de commercial, aimez négocier et développer des relations fructueuses. Notre bachelor Commerce Marketing va vous préparer de manière progressive à renforcer votre talent.
En années 1 et 2, vous restez généraliste pour bien comprendre le fonctionnement d'une entreprise.
Une fois acquises les bases de gestion d'entreprise, vous préparez en 3e année le titre RNCP et développez toutes les compétences d'un Responsable du développement commercial.
La 3e année peut se faire en alternance.

* Titre de Responsable du développement commercial d'ESGCV, niveau 6 enregistré au RNCP sous le numéro 41114 par décision du directeur général de France compétences du 18/07/2025`

interface GenerateRequest {
  intitule: string
  ecole: string
  nomenclature_titre: string
  blocs_competences: string[]
  debouches: string[]
  niveau: string
  numero_rncp: string
  storytelling?: string
  nombre_annees?: number
  annees_labels?: string[]
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

  const storytellingContext = body.storytelling
    ? `\nSTORYTELLING DÉJÀ RÉDIGÉ (le pitch métier ci-dessous a déjà été rédigé dans un autre champ — NE REPRENDS PAS ses idées ni ses phrases, concentre-toi sur la formation) :\n"${body.storytelling}"\n`
    : ''

  const parcours = body.nombre_annees && body.nombre_annees > 0
    ? `\nSTRUCTURE DU PARCOURS : ${body.nombre_annees} année(s)${body.annees_labels?.length ? ` (${body.annees_labels.join(', ')})` : ''}. Tu peux mentionner la progression pédagogique sur les années si pertinent (ex: "En 1re année vous... En 2e année vous...").\n`
    : ''

  const userPrompt = `Rédige le champ "Objectifs pédagogiques / Introduction" pour :

FORMATION : ${body.intitule}
ÉCOLE : ${body.ecole.toUpperCase()}
NOMENCLATURE DU TITRE : ${body.nomenclature_titre}

BLOCS DE COMPÉTENCES RNCP :
${body.blocs_competences.map((b, i) => `${i + 1}. ${b}`).join('\n')}
${body.ue_names?.length ? `\nMATIÈRES CLÉS DU PROGRAMME (révèlent le secteur d'application) :\n${body.ue_names.map(u => `- ${u}`).join('\n')}\n` : ''}${parcours}${storytellingContext}
${body.ecole ? `Si le nom de l'école (${body.ecole.toUpperCase()}) indique un secteur (sport, luxe, numérique...), ancre le discours dans ce secteur.\n` : ''}Parle de ce qu'on APPREND dans cette formation et COMMENT (pédagogie, alternance, intervenants pro, international, titre reconnu). Commence par la question d'accroche en majuscules. Termine par la note RNCP.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
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
