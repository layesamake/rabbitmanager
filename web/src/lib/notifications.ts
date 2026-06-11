import { db } from "./db";
import { differenceInDays } from "date-fns";

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("Ce navigateur ne supporte pas les notifications desktop");
    return false;
  }
  
  if (Notification.permission === "granted") {
    return true;
  }
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  
  return false;
}

export async function checkAndSendWeaningNotifications() {
  if (!("Notification" in window) || Notification.permission !== "granted") {
      // Don't auto-request on load to avoid annoying the user. 
      // Assuming they granted it in settings or explicitly.
      // Wait, we can request it if they interact, but checkAndSendWeaningNotifications runs in App.tsx (on mount),
      // we shouldn't prompt immediately. We will just check if granted.
      // Actually, if we want them to enable it, we can add a toggle in Parametres.
      if (Notification.permission !== "granted") {
          return;
      }
  }

  try {
    const activePortees = await db.portees
        .filter(p => p.statut !== 'sevree' && p.statut !== 'cloturee' && !p.deleted_at)
        .toArray();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const portee of activePortees) {
      if (!portee.dateSevragePrevue) continue;
      
      const sevrageDate = new Date(portee.dateSevragePrevue);
      sevrageDate.setHours(0, 0, 0, 0);

      const daysUntilSevrage = differenceInDays(sevrageDate, today);

      if (daysUntilSevrage <= 2 && daysUntilSevrage >= 0) {
        const notificationKey = `notified_sevrage_${portee.id}`;
        if (!localStorage.getItem(notificationKey)) {
          const title = `Rappel : Sevrage de la portée ${portee.code || portee.id.substring(0, 4)}`;
          const body = daysUntilSevrage === 0 
            ? `Le sevrage est prévu pour aujourd'hui !` 
            : `Le sevrage est prévu dans ${daysUntilSevrage} jour(s).`;

          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            if (registration && registration.showNotification) {
                 registration.showNotification(title, {
                  body,
                  icon: '/icon.svg',
                  tag: notificationKey,
                  data: { url: `/portees/${portee.id}` }
                });
            } else {
                new Notification(title, { body, icon: '/icon.svg' });
            }
          } else {
             new Notification(title, { body, icon: '/icon.svg' });
          }

          localStorage.setItem(notificationKey, "true");
        }
      }
    }
  } catch (err) {
    console.error("Erreur lors de la vérification des notifications de sevrage:", err);
  }
}
