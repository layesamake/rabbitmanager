export type SyncStatus = 'pending' | 'synced' | 'error';

export interface BaseEntity {
  id: string; // UUID
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  sync_status: SyncStatus;
  deleted_at?: string | null;
}

export interface Race extends BaseEntity {
  nom: string;
  description?: string;
  poidsMoyenAdulte?: number;
  remarques?: string;
}

export type Sexe = 'male' | 'femelle';
export type Origine = 'ne_elevage' | 'achete' | 'recu' | 'autre';
export type StatutReproducteur = 
  | 'disponible' | 'saillie' | 'gestante' | 'allaitante' | 'repos' | 'reforme' | 'decede'
  | 'actif'; // Mâle actif

export interface Reproducteur extends BaseEntity {
  code: string;
  nom?: string;
  sexe: Sexe;
  raceId: string;
  dateNaissance?: string;
  origine: Origine;
  statut: StatutReproducteur;
  emplacement?: string; // Cage
  poids?: number;
  observation?: string;
  prixAchat?: number;
  vendeur?: string;
  dateAchat?: string;
  donateur?: string;
  dateReception?: string;
  photo?: string; // Base64 data URL or local file URI
}

export type TypeSaillie = 'naturelle' | 'controlee' | 'double' | 'autre';
export type StatutSaillie = 'enregistree' | 'en_attente' | 'confirmee' | 'non_confirmee' | 'mise_bas' | 'echec' | 'annulee';

export interface Saillie extends BaseEntity {
  femelleId: string;
  maleIds: string[];
  dateSaillie: string; // ISO format YYYY-MM-DD
  type: TypeSaillie;
  observation?: string;
  statut: StatutSaillie;
  dateControle: string;
  datePreparation: string;
  dateMiseBasPrevue: string;
}

export type StatutPortee = 'nee' | 'en_cours' | 'a_surveiller' | 'a_sevrer' | 'sevree' | 'cloturee';
export type DestinationPortee = 'engraissement' | 'reproducteurs' | 'autre';

export interface Portee extends BaseEntity {
  code: string;
  femelleId: string;
  saillieId?: string; // optionnel
  dateMiseBas: string;
  totalNes: number;
  vivantsNaissance: number;
  mortsNes: number;
  vivantsActuels: number;
  emplacement?: string;
  observation?: string;
  dateSevragePrevue: string;
  dateSevrageReelle?: string;
  statut: StatutPortee;
  vivantsSevres?: number;
  destination?: DestinationPortee;
  adoptionsIn?: number;
  adoptionsOut?: number;
}

export interface Mortalite extends BaseEntity {
  porteeId: string;
  date: string;
  quantite: number;
  cause?: string;
}

export type TypeAlerte = 'controle' | 'preparation' | 'mise_bas' | 'sevrage' | 'surveillance';
export type StatutAlerte = 'a_faire' | 'fait' | 'reporte' | 'ignore';

export interface Rappel extends BaseEntity {
  titre: string;
  description?: string;
  datePrevue: string;
  type: 'vaccination' | 'vermifugation' | 'nettoyage' | 'autre';
  statut: 'a_venir' | 'fait' | 'annule';
  notificationId?: string | null;
}

export interface Alerte extends BaseEntity {
  type: TypeAlerte;
  datePrevue: string;
  referenceId: string; // ID saillie ou portée
  titre: string;
  description?: string;
  statut: StatutAlerte;
  notificationId?: string | null;
}

export type CategorieDepense = string;

export interface Depense extends BaseEntity {
  date: string; // ISO string
  montant: number;
  categorie: CategorieDepense;
  description: string;
}

export type FrequenceDepense = 'jour' | 'semaine' | 'mois' | 'annee';

export interface DepenseRecurrente extends BaseEntity {
  titre: string;
  montant: number;
  categorie: string;
  frequence: FrequenceDepense;
  dateDebut: string; // ISO string (YYYY-MM-DD)
  derniereGeneration: string | null; // ISO string (YYYY-MM-DD or full ISO), null if never generated
}

export interface Recette extends BaseEntity {
  date: string; // ISO string
  montant: number;
  categorie: string;
  description: string;
}

export type SujetType = 'Reproducteur' | 'Portee' | 'Lot' | 'Elevage' | 'Autre';
export type ActionType = 'Prophylaxie' | 'Déparasitage' | 'Prévention coccidiose' | 'Vitamines' | 'Vaccination' | 'Traitement curatif' | 'Soin local' | 'Nettoyage / désinfection' | 'Autre';
export type StatutTraitement = 'Programmé' | 'À faire' | 'En cours' | 'Fait' | 'En retard' | 'À renouveler' | 'Terminé' | 'Annulé';
export type ResultatTraitement = 'Aucun changement observé' | 'Amélioration' | 'À surveiller' | 'Traitement terminé' | 'À renouveler' | 'Cas préoccupant';

export interface Traitement extends BaseEntity {
  sujetType: SujetType;
  sujetId?: string; // ID du reproducteur, portée
  sujetNom?: string; // Display name pour affichage
  typeAction: ActionType;
  nomProduit: string;
  objectif?: string;
  datePrevue: string; // YYYY-MM-DD
  dateRealisation?: string; // YYYY-MM-DD
  heure?: string;
  dose?: string;
  frequence?: string; // Ex: '1 fois/jour'
  duree?: string; // Ex: '3 jours'
  prochainRappel?: string; // YYYY-MM-DD
  statut: StatutTraitement;
  resultatObserve?: ResultatTraitement;
  responsable?: string;
  observation?: string;
}

export interface Parametres extends BaseEntity {
  joursAvantControle: number;
  joursAvantPreparation: number;
  dureeGestation: number;
  ageSevrage: number;
}
