import { create } from 'zustand';
import { getDb } from './db';
import { generateUUID } from './utils';
import type { Saillie, Portee, Mortalite } from '../types';

interface ReproductionState {
  saillies: Saillie[];
  portees: Portee[];
  mortalites: Mortalite[];
  isLoading: boolean;
  
  loadSaillies: () => Promise<void>;
  addSaillie: (saillie: Omit<Saillie, 'id' | 'created_at' | 'updated_at' | 'sync_status'>) => Promise<Saillie>;
  updateSaillie: (id: string, updates: Partial<Saillie>) => Promise<void>;
  deleteSaillie: (id: string) => Promise<void>;

  loadPortees: () => Promise<void>;
  addPortee: (portee: Omit<Portee, 'id' | 'created_at' | 'updated_at' | 'sync_status'>) => Promise<Portee>;
  updatePortee: (id: string, updates: Partial<Portee>) => Promise<void>;
  deletePortee: (id: string) => Promise<void>;

  loadMortalites: () => Promise<void>;
  addMortalite: (mortalite: Omit<Mortalite, 'id' | 'created_at' | 'updated_at' | 'sync_status'>) => Promise<Mortalite>;
  deleteMortalite: (id: string) => Promise<void>;
}

export const useReproductionStore = create<ReproductionState>((set, get) => ({
  saillies: [],
  portees: [],
  mortalites: [],
  isLoading: false,

  loadSaillies: async () => {
    set({ isLoading: true });
    try {
      const db = getDb();
      const results = await db.getAllAsync<any>('SELECT * FROM saillies WHERE deleted_at IS NULL ORDER BY dateSaillie DESC');
      
      const parsedResults: Saillie[] = results.map(row => ({
        ...row,
        maleIds: row.maleIds ? JSON.parse(row.maleIds) : [],
      }));

      set({ saillies: parsedResults });
    } catch (e) {
      console.error('Failed to load saillies', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addSaillie: async (saillieData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();

    const newSaillie: Saillie = {
      ...saillieData,
      id,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
    };

    await db.runAsync(`
      INSERT INTO saillies (
        id, femelleId, maleIds, dateSaillie, type, observation, statut, 
        dateControle, datePreparation, dateMiseBasPrevue, created_at, updated_at, sync_status, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newSaillie.id,
      newSaillie.femelleId,
      JSON.stringify(newSaillie.maleIds),
      newSaillie.dateSaillie,
      newSaillie.type,
      newSaillie.observation || null,
      newSaillie.statut,
      newSaillie.dateControle,
      newSaillie.datePreparation,
      newSaillie.dateMiseBasPrevue,
      newSaillie.created_at,
      newSaillie.updated_at,
      newSaillie.sync_status,
      null
    ]);

    await get().loadSaillies();
    return newSaillie;
  },

  updateSaillie: async (id, updates) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    if (keys.length === 0) return;

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => {
      const val = (updates as any)[k];
      if (k === 'maleIds') {
        return JSON.stringify(val);
      }
      return val === undefined ? null : val;
    });

    params.push(nowStr);
    params.push('pending');
    params.push(id);

    await db.runAsync(`
      UPDATE saillies 
      SET ${setClauses}, updated_at = ?, sync_status = ?
      WHERE id = ?
    `, params);

    await get().loadSaillies();
  },

  deleteSaillie: async (id) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    await db.runAsync(`
      UPDATE saillies 
      SET deleted_at = ?, sync_status = 'pending', updated_at = ?
      WHERE id = ?
    `, [nowStr, nowStr, id]);

    await get().loadSaillies();
  },

  loadPortees: async () => {
    set({ isLoading: true });
    try {
      const db = getDb();
      const results = await db.getAllAsync<Portee>('SELECT * FROM portees WHERE deleted_at IS NULL ORDER BY dateMiseBas DESC');
      set({ portees: results });
    } catch (e) {
      console.error('Failed to load portees', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addPortee: async (porteeData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();

    const newPortee: Portee = {
      ...porteeData,
      id,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
    };

    await db.runAsync(`
      INSERT INTO portees (
        id, code, femelleId, saillieId, dateMiseBas, totalNes, vivantsNaissance, 
        mortsNes, vivantsActuels, emplacement, observation, dateSevragePrevue, 
        dateSevrageReelle, statut, vivantsSevres, destination, adoptionsIn, 
        adoptionsOut, created_at, updated_at, sync_status, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newPortee.id,
      newPortee.code,
      newPortee.femelleId,
      newPortee.saillieId || null,
      newPortee.dateMiseBas,
      newPortee.totalNes,
      newPortee.vivantsNaissance,
      newPortee.mortsNes,
      newPortee.vivantsActuels,
      newPortee.emplacement || null,
      newPortee.observation || null,
      newPortee.dateSevragePrevue,
      newPortee.dateSevrageReelle || null,
      newPortee.statut,
      newPortee.vivantsSevres ?? null,
      newPortee.destination || null,
      newPortee.adoptionsIn ?? null,
      newPortee.adoptionsOut ?? null,
      newPortee.created_at,
      newPortee.updated_at,
      newPortee.sync_status,
      null
    ]);

    await get().loadPortees();
    return newPortee;
  },

  updatePortee: async (id, updates) => {
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
      UPDATE portees 
      SET ${setClauses}, updated_at = ?, sync_status = ?
      WHERE id = ?
    `, params);

    await get().loadPortees();
  },

  deletePortee: async (id) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    await db.runAsync(`
      UPDATE portees 
      SET deleted_at = ?, sync_status = 'pending', updated_at = ?
      WHERE id = ?
    `, [nowStr, nowStr, id]);

    await get().loadPortees();
  },

  loadMortalites: async () => {
    try {
      const db = getDb();
      const results = await db.getAllAsync<Mortalite>('SELECT * FROM mortalites WHERE deleted_at IS NULL ORDER BY date DESC');
      set({ mortalites: results });
    } catch (e) {
      console.error('Failed to load mortalites', e);
    }
  },

  addMortalite: async (mortData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();

    const newMort: Mortalite = {
      ...mortData,
      id,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
    };

    await db.runAsync(`
      INSERT INTO mortalites (
        id, porteeId, date, quantite, cause, created_at, updated_at, sync_status, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newMort.id,
      newMort.porteeId,
      newMort.date,
      newMort.quantite,
      newMort.cause || null,
      newMort.created_at,
      newMort.updated_at,
      newMort.sync_status,
      null
    ]);

    await get().loadMortalites();
    return newMort;
  },

  deleteMortalite: async (id) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    await db.runAsync(`
      UPDATE mortalites 
      SET deleted_at = ?, sync_status = 'pending', updated_at = ?
      WHERE id = ?
    `, [nowStr, nowStr, id]);

    await get().loadMortalites();
  }
}));
