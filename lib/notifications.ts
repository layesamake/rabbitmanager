import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuration par défaut du gestionnaire de notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.warn('Permission de notification refusée !');
    return false;
  }

  // Configuration spécifique à Android pour les canaux
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notifications d\'Élevage',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FDE884',
    });
  }

  return true;
}

/**
 * Planifie une notification locale pour une date future
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  targetDate: Date | string,
  data?: Record<string, any>
): Promise<string | null> {
  const trigger = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  
  // S'assurer que la date est dans le futur
  if (trigger.getTime() <= Date.now()) {
    return null;
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
    return id;
  } catch (e) {
    console.error('Erreur lors de la planification de la notification', e);
    return null;
  }
}

/**
 * Annule une notification planifiée
 */
export async function cancelScheduledNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn(`Impossible d'annuler la notification ${notificationId}`, e);
  }
}

/**
 * Planifie les rappels pour une saillie
 */
export async function scheduleSaillieNotifications(
  saillieId: string,
  lapineCode: string,
  dateControle: string,
  datePreparation: string,
  dateMiseBasPrevue: string
): Promise<{ controlId: string | null; prepId: string | null; birthId: string | null }> {
  // Demander la permission
  await requestNotificationPermission();

  // 1. Contrôle de gestation (ex: Palpation à 14j)
  const controlDate = new Date(dateControle);
  controlDate.setHours(9, 0, 0, 0); // Rappel à 9h00 du matin
  const controlId = await scheduleLocalNotification(
    `Palpation / Contrôle de gestation - ${lapineCode}`,
    `C'est le moment de contrôler la gestation (palpation) de la lapine ${lapineCode}.`,
    controlDate,
    { type: 'controle', saillieId }
  );

  // 2. Préparation de la boîte à nid (ex: à 27j)
  const prepDate = new Date(datePreparation);
  prepDate.setHours(9, 0, 0, 0);
  const prepId = await scheduleLocalNotification(
    `Préparation du nid - ${lapineCode}`,
    `Installez la boîte à nid avec de la paille propre pour la lapine ${lapineCode}.`,
    prepDate,
    { type: 'preparation', saillieId }
  );

  // 3. Mise bas prévue (ex: à 31j)
  const birthDate = new Date(dateMiseBasPrevue);
  birthDate.setHours(8, 0, 0, 0);
  const birthId = await scheduleLocalNotification(
    `Mise bas attendue - ${lapineCode}`,
    `La lapine ${lapineCode} doit mettre bas aujourd'hui ! Surveillez le nid.`,
    birthDate,
    { type: 'mise_bas', saillieId }
  );

  return { controlId, prepId, birthId };
}

/**
 * Planifie le rappel pour le sevrage d'une portée
 */
export async function schedulePorteeSevrageNotification(
  porteeId: string,
  porteeCode: string,
  dateSevragePrevue: string
): Promise<string | null> {
  await requestNotificationPermission();

  const sevrageDate = new Date(dateSevragePrevue);
  sevrageDate.setHours(9, 0, 0, 0);

  return await scheduleLocalNotification(
    `Sevrage de la portée ${porteeCode}`,
    `C'est le jour prévu pour sevrer les lapereaux de la portée ${porteeCode}.`,
    sevrageDate,
    { type: 'sevrage', porteeId }
  );
}
