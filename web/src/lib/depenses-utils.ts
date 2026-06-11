import { db } from './db';
import { createBaseEntity } from './entity-utils';
import { addDays, addWeeks, addMonths, addYears, isBefore, isSameDay, parseISO } from 'date-fns';
import type { DepenseRecurrente, FrequenceDepense, Depense } from '../types';

function getNextDate(date: Date, frequence: FrequenceDepense): Date {
  switch (frequence) {
    case 'jour': return addDays(date, 1);
    case 'semaine': return addWeeks(date, 1);
    case 'mois': return addMonths(date, 1);
    case 'annee': return addYears(date, 1);
  }
}

export async function processDepensesRecurrentes() {
  const recurrentes = await db.depensesRecurrentes.toArray();
  const now = new Date();

  for (const rec of recurrentes) {
    // Avoid strictly deleted items if we handle sync
    if (rec.deleted_at) continue;

    const toGenerate: Depense[] = [];
    let lastDate = rec.derniereGeneration ? new Date(rec.derniereGeneration) : new Date(rec.dateDebut);
    
    // Si aucune génération n'a jamais été faite (derniereGeneration = null), 
    // et que la dateDebut est dans le passé ou aujourd'hui,
    // on doit d'abord générer la première dépense pour dateDebut.
    if (!rec.derniereGeneration && (isBefore(lastDate, now) || isSameDay(lastDate, now))) {
      toGenerate.push({
        ...createBaseEntity(),
        date: lastDate.toISOString(),
        montant: rec.montant,
        categorie: rec.categorie,
        description: rec.titre,
      });
    }

    let nextDate = rec.derniereGeneration ? getNextDate(lastDate, rec.frequence) : (
      toGenerate.length > 0 ? getNextDate(lastDate, rec.frequence) : lastDate
    );

    // Tant que la date de la prochaine génération est passée ou aujourd'hui (<= now)
    while (isBefore(nextDate, now) || isSameDay(nextDate, now)) {
      toGenerate.push({
        ...createBaseEntity(),
        date: nextDate.toISOString(),
        montant: rec.montant,
        categorie: rec.categorie,
        description: rec.titre,
      });
      lastDate = nextDate;
      nextDate = getNextDate(lastDate, rec.frequence);
    }

    if (toGenerate.length > 0) {
      await db.transaction('rw', db.depenses, db.depensesRecurrentes, async () => {
        await db.depenses.bulkAdd(toGenerate);
        await db.depensesRecurrentes.update(rec.id, { 
          derniereGeneration: lastDate.toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    }
  }
}
