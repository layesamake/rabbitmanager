import { db } from './db';
import { supabase } from './supabase';
import type { BaseEntity } from '../types';

export const SYNCABLE_TABLES = [
  'races', 
  'reproducteurs', 
  'saillies', 
  'portees', 
  'alertes', 
  'parametres',
  'rappels',
  'depenses',
  'depensesRecurrentes',
  'recettes',
  'traitements'
] as const;

export async function exportLocalData(): Promise<string> {
  const exportData: Record<string, any[]> = {};
  
  for (const tableName of SYNCABLE_TABLES) {
    const table: any = db[tableName];
    exportData[tableName] = await table.toArray();
  }
  
  return JSON.stringify(exportData, null, 2);
}

export async function importLocalData(jsonData: string): Promise<number> {
  const data = JSON.parse(jsonData);
  let importCount = 0;

  for (const tableName of SYNCABLE_TABLES) {
    if (data[tableName] && Array.isArray(data[tableName])) {
      const table: any = db[tableName];
      await db.transaction('rw', table, async () => {
        await table.clear();
        await table.bulkPut(data[tableName]);
      });
      importCount += data[tableName].length;
    }
  }

  return importCount;
}

export async function pushToSupabase(userId: string): Promise<number> {
  if (!supabase) throw new Error("La configuration Supabase est manquante dans les variables d'environnement.");
  
  let pushCount = 0;

  for (const tableName of SYNCABLE_TABLES) {
    const table: any = db[tableName]; // Casting for dynamic access
    
    // Find all records that need synchronization
    const pendingRecords = await table.where('sync_status').anyOf(['pending', 'error']).toArray();
    
    if (pendingRecords.length > 0) {
      const recordsToPush = pendingRecords.map((record: BaseEntity) => {
        // Exclude sync_status from the payload sent to Supabase
        const { sync_status, ...rest } = record;
        return {
          ...rest,
          user_id: userId,
        };
      });

      // Upsert into Supabase
      const { error } = await supabase.from(tableName).upsert(recordsToPush);

      if (error) {
        console.error(`Erreur lors du push de la table ${tableName}:`, error);
        
        // Mark as error locally
        const erroredRecords = pendingRecords.map((record: BaseEntity) => ({ ...record, sync_status: 'error' }));
        await table.bulkPut(erroredRecords);
        
        throw new Error(`Synchronisation échouée pour ${tableName}: ${error.message}`);
      }

      // Mark as synced locally
      const syncedRecords = pendingRecords.map((record: BaseEntity) => ({ ...record, sync_status: 'synced' }));
      await table.bulkPut(syncedRecords);
      
      pushCount += pendingRecords.length;
    }
  }
  
  return pushCount;
}

export async function pullFromSupabase(userId: string): Promise<number> {
  if (!supabase) throw new Error("La configuration Supabase est manquante dans les variables d'environnement.");
  
  let pullCount = 0;

  for (const tableName of SYNCABLE_TABLES) {
    const table: any = db[tableName];

    // Read all records belonging to the user
    const { data: cloudRecords, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error(`Erreur lors du pull de la table ${tableName}:`, error);
      throw new Error(`Restauration échouée pour ${tableName}: ${error.message}`);
    }

    if (cloudRecords && cloudRecords.length > 0) {
      // Clean and format data for IndexedDB
      const recordsToPut = cloudRecords.map(record => {
        const { user_id, ...rest } = record;
        return {
          ...rest,
          sync_status: 'synced' // Explicitly mark incoming data as synced
        };
      });

      // Erase previous list and put new records (Simple full-restore strategy)
      // Note: for V1, we overwrite local data entirely for this table as requested for restoring.
      // If we wanted real 2-way sync, we would merge based on updated_at.
      // But clearing and replacing is perfectly fine for basic "Restore" button.
      await db.transaction('rw', table, async () => {
        const localRecordsCount = await table.count();
        if(localRecordsCount > 0) {
          // You might prefer not to delete if you want additive restore, 
          // but clearing ensures no ghost deletion issues for a single-user restore.
          await table.clear();
        }
        await table.bulkPut(recordsToPut);
      });
      
      pullCount += recordsToPut.length;
    }
  }

  return pullCount;
}
