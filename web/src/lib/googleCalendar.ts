import { db } from "./db";
import { format, addDays } from "date-fns";

export async function authorizeGoogleAndSync(accessToken: string) {
  // Get upcoming saillies (Contrôle & Mise bas)
  const saillies = await db.saillies.where('statut').anyOf(['enregistree', 'en_attente', 'confirmee']).toArray();
  const portees = await db.portees.where('statut').anyOf(['nee', 'en_cours', 'a_surveiller']).toArray();
  const reproducteurs = await db.reproducteurs.toArray();
  const rappels = await db.rappels.where('statut').equals('a_venir').toArray();
  
  let syncedCount = 0;

  for (const s of saillies) {
    const femelle = reproducteurs.find(r => r.id === s.femelleId);
    if (!femelle) continue;

    if (new Date(s.dateControle) >= new Date()) {
      await createGoogleEvent(accessToken, {
        summary: `Contrôle palpation: ${femelle.code}`,
        description: `Saillie enregistrée le ${format(new Date(s.dateSaillie), 'dd/MM/yyyy')}`,
        date: s.dateControle
      });
      syncedCount++;
    }

    if (new Date(s.dateMiseBasPrevue) >= new Date()) {
      await createGoogleEvent(accessToken, {
        summary: `Mise bas prévue: ${femelle.code}`,
        description: `Saillie du ${format(new Date(s.dateSaillie), 'dd/MM/yyyy')}`,
        date: s.dateMiseBasPrevue
      });
      syncedCount++;
    }
  }

  for (const p of portees) {
    const femelle = reproducteurs.find(r => r.id === p.femelleId);
    if (new Date(p.dateSevragePrevue) >= new Date()) {
      await createGoogleEvent(accessToken, {
        summary: `Sevrage: Portée ${p.code}`,
        description: `Mère: ${femelle?.code || 'Inconnue'}`,
        date: p.dateSevragePrevue
      });
      syncedCount++;
    }
  }

  for (const r of rappels) {
    if (new Date(r.datePrevue) >= new Date()) {
       await createGoogleEvent(accessToken, {
         summary: `Rappel: ${r.titre}`,
         description: r.description || `Rappel de type ${r.type}`,
         date: r.datePrevue
       });
       syncedCount++;
    }
  }

  return syncedCount;
}

async function createGoogleEvent(accessToken: string, event: { summary: string, description: string, date: string }) {
  const endDate = format(addDays(new Date(event.date), 1), 'yyyy-MM-dd');
  
  const eventBody = {
    summary: event.summary,
    description: event.description,
    start: {
      date: event.date,
    },
    end: {
      date: endDate,
    }
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    console.error('Failed to create event', await response.json());
  }
}
