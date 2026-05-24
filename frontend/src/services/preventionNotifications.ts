import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Antiparasitic, PreventiveCheck, Vaccine } from '../store/prevention';

const CHANNEL_ID = 'reminders';
const PREFIX = 'prev_';

function notifyHour(): { hour: number; minute: number } {
  return { hour: 9, minute: 0 };
}

function dateAt(iso: string, hour: number, minute: number, offsetDays = 0): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d + offsetDays, hour, minute, 0, 0);
}

async function scheduleAt(
  identifier: string,
  title: string,
  body: string,
  date: Date,
): Promise<void> {
  if (date.getTime() <= Date.now()) return;
  const channelId = Platform.OS === 'android' ? CHANNEL_ID : undefined;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId,
    },
  });
}

async function cancelAllPrevention(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.identifier?.startsWith(PREFIX)) {
      try {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      } catch {
        // ignore
      }
    }
  }
}

async function scheduleItem(
  kindPrefix: 'v' | 'a' | 'c',
  id: string,
  emoji: string,
  itemName: string,
  typeLabel: string,
  nextDate: string,
): Promise<void> {
  const { hour, minute } = notifyHour();
  const dayBefore = dateAt(nextDate, hour, minute, -1);
  const dayOf = dateAt(nextDate, hour, minute, 0);

  await scheduleAt(
    `${PREFIX}${kindPrefix}_${id}_pre`,
    `${emoji} ${typeLabel} domani`,
    `${itemName} è in scadenza domani`,
    dayBefore,
  );
  await scheduleAt(
    `${PREFIX}${kindPrefix}_${id}_day`,
    `${emoji} ${typeLabel} oggi`,
    `${itemName} scade oggi`,
    dayOf,
  );
}

export async function scheduleTestNotification(): Promise<void> {
  const channelId = Platform.OS === 'android' ? CHANNEL_ID : undefined;
  await Notifications.scheduleNotificationAsync({
    identifier: `${PREFIX}test_${Date.now()}`,
    content: { title: '🔔 Test notifica', body: 'Se vedi questo, le notifiche funzionano correttamente.', sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      channelId,
    },
  });
}

export async function rescheduleAllPrevention(
  vaccines: Vaccine[],
  antiparasitics: Antiparasitic[],
  checks: PreventiveCheck[],
): Promise<void> {
  await cancelAllPrevention();
  for (const v of vaccines) {
    if (v.nextDate) {
      await scheduleItem('v', v.id, '💉', v.name, 'Vaccino', v.nextDate);
    }
  }
  for (const a of antiparasitics) {
    await scheduleItem('a', a.id, '🦟', a.name, 'Antiparassitario', a.nextDate);
  }
  for (const c of checks) {
    if (c.nextDate) {
      await scheduleItem('c', c.id, '🩺', c.name, 'Controllo', c.nextDate);
    }
  }
}
