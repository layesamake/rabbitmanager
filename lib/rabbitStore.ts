import { create } from 'zustand';
import { getDb } from './db';
import { generateUUID } from './utils';
import type { Race, Reproducteur } from '../types';

interface RabbitState {
  races: Race[];
  reproducteurs: Reproducteur[];
  isLoading: boolean;
  loadRaces: () => Promise<void>;
  addRace: (race: Omit<Race, 'id' | 'created_at' | 'updated_at' | 'sync_status'>) => Promise<Race>;
  loadReproducteurs: () => Promise<void>;
  addReproducteur: (reproducteur: Omit<Reproducteur, 'id' | 'created_at' | 'updated_at' | 'sync_status'>) => Promise<Reproducteur>;
  updateReproducteur: (id: string, updates: Partial<Reproducteur>) => Promise<void>;
  deleteReproducteur: (id: string) => Promise<void>;
}

export const useRabbitStore = create<RabbitState>((set, get) => ({
  races: [],
  reproducteurs: [],
  isLoading: false,

  loadRaces: async () => {
    set({ isLoading: true });
    try {
      const db = getDb();
      const results = await db.getAllAsync<Race>('SELECT * FROM races WHERE deleted_at IS NULL ORDER BY nom ASC');
      set({ races: results });
    } catch (e) {
      console.error('Failed to load races', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addRace: async (raceData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();
    
    const newRace: Race = {
      ...raceData,
      id,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
      deleted_at: null,
    };

    await db.runAsync(`
      INSERT INTO races (id, nom, description, poidsMoyenAdulte, remarques, created_at, updated_at, sync_status, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newRace.id,
      newRace.nom,
      newRace.description || null,
      newRace.poidsMoyenAdulte ?? null,
      newRace.remarques || null,
      newRace.created_at,
      newRace.updated_at,
      newRace.sync_status,
      null
    ]);

    await get().loadRaces();
    return newRace;
  },

  loadReproducteurs: async () => {
    set({ isLoading: true });
    try {
      const db = getDb();
      const results = await db.getAllAsync<Reproducteur>('SELECT * FROM reproducteurs WHERE deleted_at IS NULL ORDER BY code ASC');
      set({ reproducteurs: results });
    } catch (e) {
      console.error('Failed to load reproducteurs', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addReproducteur: async (repData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();

    const newRep: Reproducteur = {
      ...repData,
      id,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
    };

    await db.runAsync(`
      INSERT INTO reproducteurs (
        id, code, nom, sexe, raceId, dateNaissance, origine, statut, 
        emplacement, poids, observation, prixAchat, vendeur, 
        dateAchat, donateur, dateReception, photo, created_at, updated_at, sync_status, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newRep.id,
      newRep.code,
      newRep.nom || null,
      newRep.sexe,
      newRep.raceId,
      newRep.dateNaissance || null,
      newRep.origine,
      newRep.statut,
      newRep.emplacement || null,
      newRep.poids ?? null,
      newRep.observation || null,
      newRep.prixAchat ?? null,
      newRep.vendeur || null,
      newRep.dateAchat || null,
      newRep.donateur || null,
      newRep.dateReception || null,
      newRep.photo || null,
      newRep.created_at,
      newRep.updated_at,
      newRep.sync_status,
      null
    ]);

    await get().loadReproducteurs();
    return newRep;
  },

  updateReproducteur: async (id, updates) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    // Construire dynamiquement la requête de mise à jour pour éviter d'écraser des champs
    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    if (keys.length === 0) return;

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => {
      const val = (updates as any)[k];
      return val === undefined ? null : val;
    });

    params.push(nowStr); // pour updated_at
    params.push('pending'); // pour sync_status
    params.push(id);

    await db.runAsync(`
      UPDATE reproducteurs 
      SET ${setClauses}, updated_at = ?, sync_status = ?
      WHERE id = ?
    `, params);

    await get().loadReproducteurs();
  },

  deleteReproducteur: async (id) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    // Soft delete
    await db.runAsync(`
      UPDATE reproducteurs 
      SET deleted_at = ?, sync_status = 'pending', updated_at = ?
      WHERE id = ?
    `, [nowStr, nowStr, id]);

    await get().loadReproducteurs();
  }
}));
