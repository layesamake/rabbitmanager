import { create } from 'zustand';
import { getDb } from './db';
import { generateUUID } from './utils';
import type { Traitement } from '../types';

interface SanteState {
  traitements: Traitement[];
  isLoading: boolean;
  
  loadTraitements: () => Promise<void>;
  addTraitement: (traitement: Omit<Traitement, 'id' | 'created_at' | 'updated_at' | 'sync_status'>) => Promise<Traitement>;
  updateTraitement: (id: string, updates: Partial<Traitement>) => Promise<void>;
  deleteTraitement: (id: string) => Promise<void>;
}

export const useSanteStore = create<SanteState>((set, get) => ({
  traitements: [],
  isLoading: false,

  loadTraitements: async () => {
    set({ isLoading: true });
    try {
      const db = getDb();
      const results = await db.getAllAsync<Traitement>('SELECT * FROM traitements WHERE deleted_at IS NULL ORDER BY datePrevue DESC');
      set({ traitements: results });
    } catch (e) {
      console.error('Failed to load traitements', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addTraitement: async (traitData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();

    const newTrait: Traitement = {
      ...traitData,
      id,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
    };

    await db.runAsync(`
      INSERT INTO traitements (
        id, sujetType, sujetId, sujetNom, typeAction, nomProduit, objectif, 
        datePrevue, dateRealisation, heure, dose, frequence, duree, prochainRappel, 
        statut, resultatObserve, responsable, observation, created_at, updated_at, sync_status, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newTrait.id,
      newTrait.sujetType,
      newTrait.sujetId || null,
      newTrait.sujetNom || null,
      newTrait.typeAction,
      newTrait.nomProduit,
      newTrait.objectif || null,
      newTrait.datePrevue,
      newTrait.dateRealisation || null,
      newTrait.heure || null,
      newTrait.dose || null,
      newTrait.frequence || null,
      newTrait.duree || null,
      newTrait.prochainRappel || null,
      newTrait.statut,
      newTrait.resultatObserve || null,
      newTrait.responsable || null,
      newTrait.observation || null,
      newTrait.created_at,
      newTrait.updated_at,
      newTrait.sync_status,
      null
    ]);

    await get().loadTraitements();
    return newTrait;
  },

  updateTraitement: async (id, updates) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    if (keys.length === 0) return;

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => {
      const val = (updates as any)[k];
      return val === undefined ? null : val;
    });

    params.push(nowStr);
    params.push('pending');
    params.push(id);

    await db.runAsync(`
      UPDATE traitements 
      SET ${setClauses}, updated_at = ?, sync_status = ?
      WHERE id = ?
    `, params);

    await get().loadTraitements();
  },

  deleteTraitement: async (id) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    await db.runAsync(`
      UPDATE traitements 
      SET deleted_at = ?, sync_status = 'pending', updated_at = ?
      WHERE id = ?
    `, [nowStr, nowStr, id]);

    await get().loadTraitements();
  }
}));
