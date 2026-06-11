import { create } from 'zustand';
import { getDb } from './db';
import { generateUUID } from './utils';
import { scheduleLocalNotification, cancelScheduledNotification } from './notifications';
import type { Alerte, Rappel, Parametres } from '../types';

interface AlerteState {
  alertes: Alerte[];
  rappels: Rappel[];
  parametres: Parametres | null;
  isLoading: boolean;

  loadAlertes: () => Promise<void>;
  addAlerte: (alerte: Omit<Alerte, 'id' | 'created_at' | 'updated_at' | 'sync_status'>) => Promise<Alerte>;
  updateAlerte: (id: string, updates: Partial<Alerte>) => Promise<void>;

  loadRappels: () => Promise<void>;
  addRappel: (rappel: Omit<Rappel, 'id' | 'created_at' | 'updated_at' | 'sync_status' | 'notificationId'>) => Promise<Rappel>;
  updateRappel: (id: string, updates: Partial<Rappel>) => Promise<void>;
  deleteRappel: (id: string) => Promise<void>;

  loadParametres: () => Promise<void>;
  updateParametres: (updates: Partial<Parametres>) => Promise<void>;
}

export const useAlerteStore = create<AlerteState>((set, get) => ({
  alertes: [],
  rappels: [],
  parametres: null,
  isLoading: false,

  loadAlertes: async () => {
    set({ isLoading: true });
    try {
      const db = getDb();
      const results = await db.getAllAsync<Alerte>('SELECT * FROM alertes WHERE deleted_at IS NULL ORDER BY datePrevue ASC');
      set({ alertes: results });
    } catch (e) {
      console.error('Failed to load alertes', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addAlerte: async (alerteData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();

    const newAlerte: Alerte = {
      ...alerteData,
      id,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
    };

    await db.runAsync(`
      INSERT INTO alertes (
        id, type, datePrevue, referenceId, titre, description, statut, notificationId, created_at, updated_at, sync_status, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newAlerte.id,
      newAlerte.type,
      newAlerte.datePrevue,
      newAlerte.referenceId,
      newAlerte.titre,
      newAlerte.description || null,
      newAlerte.statut,
      newAlerte.notificationId || null,
      newAlerte.created_at,
      newAlerte.updated_at,
      newAlerte.sync_status,
      null
    ]);

    await get().loadAlertes();
    return newAlerte;
  },

  updateAlerte: async (id, updates) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    if (keys.length === 0) return;

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => (updates as any)[k] ?? null);

    params.push(nowStr);
    params.push('pending');
    params.push(id);

    await db.runAsync(`
      UPDATE alertes 
      SET ${setClauses}, updated_at = ?, sync_status = ?
      WHERE id = ?
    `, params);

    await get().loadAlertes();
  },

  loadRappels: async () => {
    try {
      const db = getDb();
      const results = await db.getAllAsync<Rappel>('SELECT * FROM rappels WHERE deleted_at IS NULL ORDER BY datePrevue ASC');
      set({ rappels: results });
    } catch (e) {
      console.error('Failed to load rappels', e);
    }
  },

  addRappel: async (rappelData) => {
    const db = getDb();
    const id = generateUUID();
    const nowStr = new Date().toISOString();

    // Planifier une notification native locale
    const triggerDate = new Date(rappelData.datePrevue);
    triggerDate.setHours(9, 0, 0, 0); // Rappel à 9h00 du matin le jour du rappel
    
    let notificationId: string | null = null;
    if (rappelData.statut === 'a_venir') {
      notificationId = await scheduleLocalNotification(
        `Rappel : ${rappelData.titre}`,
        rappelData.description || `Votre rappel pour : ${rappelData.type}`,
        triggerDate,
        { type: 'rappel', rappelId: id }
      );
    }

    const newRappel: Rappel = {
      ...rappelData,
      id,
      notificationId,
      created_at: nowStr,
      updated_at: nowStr,
      sync_status: 'pending',
    };

    await db.runAsync(`
      INSERT INTO rappels (
        id, titre, description, datePrevue, type, statut, notificationId, created_at, updated_at, sync_status, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newRappel.id,
      newRappel.titre,
      newRappel.description || null,
      newRappel.datePrevue,
      newRappel.type,
      newRappel.statut,
      newRappel.notificationId || null,
      newRappel.created_at,
      newRappel.updated_at,
      newRappel.sync_status,
      null
    ]);

    await get().loadRappels();
    return newRappel;
  },

  updateRappel: async (id, updates) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    // Récupérer le rappel actuel pour voir si on doit modifier la notification
    const currentRappel = await db.getFirstAsync<Rappel>('SELECT * FROM rappels WHERE id = ?', [id]);
    
    if (currentRappel) {
      let nextNotificationId = currentRappel.notificationId;

      // Si le statut change en fait/annule ou si la date change
      if (updates.statut && updates.statut !== 'a_venir') {
        if (currentRappel.notificationId) {
          await cancelScheduledNotification(currentRappel.notificationId);
          nextNotificationId = null;
        }
      } else if (updates.datePrevue || updates.titre || updates.description || (updates.statut === 'a_venir' && currentRappel.statut !== 'a_venir')) {
        // Annuler l'ancienne si elle existe
        if (currentRappel.notificationId) {
          await cancelScheduledNotification(currentRappel.notificationId);
        }

        // Planifier la nouvelle
        const title = updates.titre || currentRappel.titre;
        const desc = updates.description || currentRappel.description || '';
        const type = updates.type || currentRappel.type;
        const targetDateStr = updates.datePrevue || currentRappel.datePrevue;
        
        const triggerDate = new Date(targetDateStr);
        triggerDate.setHours(9, 0, 0, 0);

        nextNotificationId = await scheduleLocalNotification(
          `Rappel : ${title}`,
          desc || `Votre rappel pour : ${type}`,
          triggerDate,
          { type: 'rappel', rappelId: id }
        );
      }

      const mergedUpdates = { ...updates, notificationId: nextNotificationId };
      const keys = Object.keys(mergedUpdates).filter(k => k !== 'id' && k !== 'created_at');
      if (keys.length > 0) {
        const setClauses = keys.map(k => `${k} = ?`).join(', ');
        const params = keys.map(k => (mergedUpdates as any)[k] ?? null);

        params.push(nowStr);
        params.push('pending');
        params.push(id);

        await db.runAsync(`
          UPDATE rappels 
          SET ${setClauses}, updated_at = ?, sync_status = ?
          WHERE id = ?
        `, params);
      }
    }

    await get().loadRappels();
  },

  deleteRappel: async (id) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    const currentRappel = await db.getFirstAsync<Rappel>('SELECT * FROM rappels WHERE id = ?', [id]);
    if (currentRappel && currentRappel.notificationId) {
      await cancelScheduledNotification(currentRappel.notificationId);
    }

    await db.runAsync(`
      UPDATE rappels 
      SET deleted_at = ?, sync_status = 'pending', updated_at = ?
      WHERE id = ?
    `, [nowStr, nowStr, id]);

    await get().loadRappels();
  },

  loadParametres: async () => {
    try {
      const db = getDb();
      const results = await db.getAllAsync<Parametres>('SELECT * FROM parametres WHERE id = ?', ['default-settings']);
      if (results.length > 0) {
        set({ parametres: results[0] });
      }
    } catch (e) {
      console.error('Failed to load parametres', e);
    }
  },

  updateParametres: async (updates) => {
    const db = getDb();
    const nowStr = new Date().toISOString();

    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    if (keys.length === 0) return;

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => (updates as any)[k] ?? null);

    params.push(nowStr);
    params.push('pending');
    params.push('default-settings');

    await db.runAsync(`
      UPDATE parametres 
      SET ${setClauses}, updated_at = ?, sync_status = ?
      WHERE id = ?
    `, params);

    await get().loadParametres();
  }
}));
