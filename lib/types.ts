export interface Ecole {
  id: string
  nom: string
  site_web: string
  certificateur: string
  lien_diplomes: string
  blocs_generiques: {
    modalites_acces: string
    tarifs: string
    contacts: string
    methodes_mobilisees: string
    modalites_evaluation: string
    accessibilite_handicap: string
    blocs_competences_generique: string
    equivalences: string
  }
  indicateurs: {
    indicateur_1: string
    indicateur_cfa: string
  }
}

export interface BlocCompetence {
  code: string
  libelle: string
}

export interface CodeRome {
  code: string
  libelle: string
}

export interface CodeNsf {
  code: string
  libelle: string
}

export interface RNCPData {
  numero: string
  titre_officiel: string
  niveau: string
  niveau_europeen: string
  codes_nsf: CodeNsf[]
  certificateur: string
  date_decision: string
  date_fin_enregistrement: string
  date_dernier_jo: string
  type_enregistrement: string
  actif: boolean
  blocs_competences: BlocCompetence[]
  codes_rome: CodeRome[]
  voies_acces: string[]
  anciennes_certifications: string[]
  nouvelles_certifications: string[]
  formacodes: { code: string; libelle: string }[]
  // Champs extraits par scraping de la page France Compétences
  prerequis: string
  prerequis_validation: string
  // Champs dérivés pour la fiche produit
  debouches_formates: string[]
  modalites_evaluation_certification: string
  equivalences: string
}

export interface Matiere {
  nom: string
  heures?: number
}

export interface UE {
  nom: string
  matieres: Matiere[]
}

export interface ProgrammeAnnee {
  annee: string
  ues: UE[]
}

export type FicheVersion = 'V0' | 'V1' | 'V2'
export type FicheStatut = 'brouillon' | 'generee'

export interface FicheData {
  id: string
  createdAt: string
  updatedAt: string

  // Etape 1 - Identite
  ecole: string
  intitule: string
  numero_rncp: string
  formation_qualifiante: boolean
  annees_scolaires: string[]
  version: FicheVersion

  // Etape 2 - RNCP
  nomenclature_titre: string
  blocs_competences: string[]
  modalites_evaluation_certification: string
  debouches: string[]
  equivalences_rncp: string

  // Etape 3 - Programme
  programme: ProgrammeAnnee[]

  // Etape 4 - Informations complementaires
  url_site: string
  prerequis: string
  objectifs_pedagogiques: string
  duree: string
  dates_rentree: string
  storytelling: string
  taux_obtention_par_ville: Record<string, string>
  indicateur_2: string
  passerelles: string
  suite_de_parcours: string

  // Overrides des blocs generiques (si personnalises)
  override_modalites_acces?: string
  override_tarifs?: string
  override_contacts?: string
  override_methodes_mobilisees?: string
  override_modalites_evaluation?: string
  override_accessibilite_handicap?: string

  // Meta
  statut: FicheStatut
  fichier_genere?: string
}

export function createEmptyFiche(): Omit<FicheData, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ecole: 'esg',
    intitule: '',
    numero_rncp: '',
    formation_qualifiante: false,
    annees_scolaires: ['2026-2027'],
    version: 'V0',
    nomenclature_titre: '',
    blocs_competences: [],
    modalites_evaluation_certification: '',
    debouches: [],
    equivalences_rncp: '',
    programme: [],
    url_site: '',
    prerequis: '',
    objectifs_pedagogiques: '',
    duree: '',
    dates_rentree: '',
    storytelling: '',
    taux_obtention_par_ville: {},
    indicateur_2: '',
    passerelles: '',
    suite_de_parcours: '',
    statut: 'brouillon',
  }
}
