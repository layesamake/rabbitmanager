import { create } from 'zustand';
import { getDb } from './db';
import { generateUUID } from './utils';
import { addDays, addWeeks, addMonths, addYears, isBefore, isSameDay } from 'date-fns';
import type { Depense, Recette, DepenseRecurrente, FrequenceDepense } from '../types';

interface FinanceState {
  depenses: Depense[];
  recettes: Recette[];
  depensesRecurrentes: DepenseRecurrente[];
  isLoading: boolean;
  
  loadDepenses: () => Promise<void>;
  addDepense: (depense: Omit<Depense, 'id' | 'created_at' | 'updated_at' | 'sync_status'>) => Promise<Depense>;
  deleteDepense: (id: string) => Promise<void>;

  loadRecettes: () => Promise<void>;
  addRecette: (recette: Omit<Recette, 'id' | 'created_at' | 'updated_at' | 'sync_status'>) => Promise<Recette>;
  deleteRecette: (id: string) => Promise<void>;

  loadDepensesRecurrentes: () => Promise<void>;
  addDepenseRecurrente: (depenseRec: Omit<DepenseRecurrente, 'id' | 'created_at' | 'updated_at' | 'sync_status' | 'derniereGeneration'>) => Promise<DepenseRecurrente>;
  deleteDepenseRecurrente: (id: string) => Promise<void>;
  processRecurrences: () => Promise<void>;
}

function getNextDate(date: Date, frequence: FrequenceDepense): Date {
  switch (frequence) {
    case 'jour': return addDays(date, 1);
    case 'semaine': return addWeeks(date, 1);
    case 'mois': return addMonths(date, 1);
    case 'annee': return addYears(date, 1);
  }
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  depenses: [],
  recettes: [],
  depensesRecurrentes: [],
  isLoading: false,

  loadDepenses: async () => {
    set({ isLoading: true });
    try {
      const db = getDb();
      const results = await db.getAllAsync<Depense>('SELECT * FROM depenses WHERE deleted_at IS NULL ORDER BY date DESC');
      set({ depenses: results });
    } catch (e) {
      console.error('Failed to load depenses', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addDepense: async (depData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();

    const newDep: Depense = {
      ...depData,
      id,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
    };

    await db.runAsync(`
      INSERT INTO depenses (
        id, date, montant, categorie, description, created_at, updated_at, sync_status, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newDep.id,
      newDep.date,
      newDep.montant,
      newDep.categorie,
      newDep.description,
      newDep.created_at,
      newDep.updated_at,
      newDep.sync_status,
      null
    ]);

    await get().loadDepenses();
    return newDep;
  },

  deleteDepense: async (id) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    await db.runAsync(`
      UPDATE depenses 
      SET deleted_at = ?, sync_status = 'pending', updated_at = ?
      WHERE id = ?
    `, [nowStr, nowStr, id]);

    await get().loadDepenses();
  },

  loadRecettes: async () => {
    set({ isLoading: true });
    try {
      const db = getDb();
      const results = await db.getAllAsync<Recette>('SELECT * FROM recettes WHERE deleted_at IS NULL ORDER BY date DESC');
      set({ recettes: results });
    } catch (e) {
      console.error('Failed to load recettes', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addRecette: async (recData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();

    const newRec: Recette = {
      ...recData,
      id,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
    };

    await db.runAsync(`
      INSERT INTO recettes (
        id, date, montant, categorie, description, created_at, updated_at, sync_status, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newRec.id,
      newRec.date,
      newRec.montant,
      newRec.categorie,
      newRec.description,
      newRec.created_at,
      newRec.updated_at,
      newRec.sync_status,
      null
    ]);

    await get().loadRecettes();
    return newRec;
  },

  deleteRecette: async (id) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    await db.runAsync(`
      UPDATE recettes 
      SET deleted_at = ?, sync_status = 'pending', updated_at = ?
      WHERE id = ?
    `, [nowStr, nowStr, id]);

    await get().loadRecettes();
  },

  loadDepensesRecurrentes: async () => {
    try {
      const db = getDb();
      const results = await db.getAllAsync<DepenseRecurrente>('SELECT * FROM depensesRecurrentes WHERE deleted_at IS NULL');
      set({ depensesRecurrentes: results });
    } catch (e) {
      console.error('Failed to load depenses recurrentes', e);
    }
  },

  addDepenseRecurrente: async (depRecData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();

    const newDepRec: DepenseRecurrente = {
      ...depRecData,
      id,
      derniereGeneration: null,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
    };

    await db.runAsync(`
      INSERT INTO depensesRecurrentes (
        id, titre, montant, categorie, frequence, dateDebut, derniereGeneration, created_at, updated_at, sync_status, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newDepRec.id,
      newDepRec.titre,
      newDepRec.montant,
      newDepRec.categorie,
      newDepRec.frequence,
      newDepRec.dateDebut,
      null,
      newDepRec.created_at,
      newDepRec.updated_at,
      newDepRec.sync_status,
      null
    ]);

    await get().loadDepensesRecurrentes();
    // Générer immédiatement les dépenses dues si nécessaire
    await get().processRecurrences();
    return newDepRec;
  },

  deleteDepenseRecurrente: async (id) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    await db.runAsync(`
      UPDATE depensesRecurrentes 
      SET deleted_at = ?, sync_status = 'pending', updated_at = ?
      WHERE id = ?
    `, [nowStr, nowStr, id]);

    await get().loadDepensesRecurrentes();
  },

  processRecurrences: async () => {
    const db = getDb();
    const recurrentes = await db.getAllAsync<DepenseRecurrente>('SELECT * FROM depensesRecurrentes WHERE deleted_at IS NULL');
    const now = new Date();
    let hasChanges = false;

    for (const rec of recurrentes) {
      const toGenerate: Depense[] = [];
      let lastDate = rec.derniereGeneration ? new Date(rec.derniereGeneration) : new Date(rec.dateDebut);
      
      if (!rec.derniereGeneration && (isBefore(lastDate, now) || isSameDay(lastDate, now))) {
        const id = generateUUID();
        const nowStr = new Date().toISOString();
        toGenerate.push({
          id,
          date: lastDate.toISOString(),
          montant: rec.montant,
          categorie: rec.categorie,
          description: rec.titre,
          created_at: nowStr,
          updated_at: nowStr,
          sync_status: 'pending',
          deleted_at: null
        });
      }

      let nextDate = rec.derniereGeneration ? getNextDate(lastDate, rec.frequence) : (
        toGenerate.length > 0 ? getNextDate(lastDate, rec.frequence) : lastDate
      );

      while (isBefore(nextDate, now) || isSameDay(nextDate, now)) {
        const id = generateUUID();
        const nowStr = new Date().toISOString();
        toGenerate.push({
          id,
          date: nextDate.toISOString(),
          montant: rec.montant,
          categorie: rec.categorie,
          description: rec.titre,
          created_at: nowStr,
          updated_at: nowStr,
          sync_status: 'pending',
          deleted_at: null
        });
        lastDate = nextDate;
        nextDate = getNextDate(lastDate, rec.frequence);
      }

      if (toGenerate.length > 0) {
        hasChanges = true;
        const nowStr = new Date().toISOString();
        
        // Insérer les dépenses générées
        for (const dep of toGenerate) {
          await db.runAsync(`
            INSERT INTO depenses (
              id, date, montant, categorie, description, created_at, updated_at, sync_status, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            dep.id,
            dep.date,
            dep.montant,
            dep.categorie,
            dep.description,
            dep.created_at,
            dep.updated_at,
            dep.sync_status,
            null
          ]);
        }

        // Mettre à jour la récurrence
        await db.runAsync(`
          UPDATE depensesRecurrentes
          SET derniereGeneration = ?, updated_at = ?, sync_status = 'pending'
          WHERE id = ?
        `, [lastDate.toISOString(), nowStr, rec.id]);
      }
    }

    if (hasChanges) {
      await get().loadDepenses();
      await get().loadDepensesRecurrentes();
    }
  }
}));
