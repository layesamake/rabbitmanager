import Dexie, { type Table } from 'dexie';
import type { Race, Reproducteur, Saillie, Portee, Mortalite, Alerte, Parametres, Rappel, Depense, DepenseRecurrente, Recette, Traitement } from '../types';

export class LapinManagerDB extends Dexie {
  races!: Table<Race, string>;
  reproducteurs!: Table<Reproducteur, string>;
  saillies!: Table<Saillie, string>;
  portees!: Table<Portee, string>;
  mortalites!: Table<Mortalite, string>;
  alertes!: Table<Alerte, string>;
  parametres!: Table<Parametres, string>;
  rappels!: Table<Rappel, string>;
  depenses!: Table<Depense, string>;
  depensesRecurrentes!: Table<DepenseRecurrente, string>;
  recettes!: Table<Recette, string>;
  traitements!: Table<Traitement, string>;

  constructor() {
    super('LapinManagerDB');
    this.version(1).stores({
      races: 'id, nom, sync_status',
      reproducteurs: 'id, code, sexe, raceId, statut, sync_status',
      saillies: 'id, femelleId, statut, dateSaillie, *maleIds, sync_status',
      portees: 'id, code, femelleId, saillieId, statut, dateMiseBas, sync_status',
      mortalites: 'id, porteeId, date, sync_status',
      alertes: 'id, type, statut, datePrevue, referenceId, sync_status',
      parametres: 'id, sync_status'
    });
    this.version(2).stores({
      rappels: 'id, type, statut, datePrevue, sync_status'
    });
    this.version(3).stores({
      depenses: 'id, date, categorie, sync_status'
    });
    this.version(4).stores({
      depensesRecurrentes: 'id, frequence, dateDebut, sync_status'
    });
    this.version(5).stores({
      recettes: 'id, date, categorie, sync_status'
    });
    this.version(6).stores({
      traitements: 'id, sujetType, sujetId, typeAction, statut, datePrevue, dateRealisation, sync_status'
    });
  }
}

export const db = new LapinManagerDB();

// Initialisation des paramètres par défaut si nécessaire
export async function initDbSettings() {
  const count = await db.parametres.count();
  if (count === 0) {
    await db.parametres.add({
      id: 'default-settings',
      joursAvantControle: 14,
      joursAvantPreparation: 27,
      dureeGestation: 31,
      ageSevrage: 35,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    });
  }
}
