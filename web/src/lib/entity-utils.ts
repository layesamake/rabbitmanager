import { BaseEntity, SyncStatus } from "../types";

export function createBaseEntity(): BaseEntity {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), // Utilisation de l'API web standard pour UUID
    created_at: now,
    updated_at: now,
    sync_status: 'pending' as SyncStatus,
  };
}

export function updateBaseEntity<T extends BaseEntity>(entity: T): T {
  return {
    ...entity,
    updated_at: new Date().toISOString(),
    sync_status: 'pending' as SyncStatus
  };
}
