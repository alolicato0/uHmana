import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Antiparasitic, PreventiveCheck, Vaccine } from '../store/prevention';

const CHANNEL_ID = 'reminders';
const PREFIX = 'prev_';

interface TherapyItem {
  id: string;
  name: string;
  dose?: string;
  frequency: '8h' | '12h' | '24h';
  time: string;
  startDate: string;
  endDate?: string;
}

function calcTherapyTimes(firstTime: string, freq: '8h' | '12h' | '24h'): string[] {
  const [h, m] = firstTime.split(':').map(Number);
  const interval = freq === '8h' ? 8 : freq === '12h' ? 12 : 24;
  const count = 24 / interval;
  return Array.from({ length: count }, (_, i) => {
    const totalMins = (h * 60 + m + i * interval * 60) % (24 * 60);
    const th = Math.floor(totalMins / 60);
    const tm = totalMins % 60;
    return `${String(th).padStart(2, '0')}:${String(tm).padStart(2, '0')}`;
  });
}

async function scheduleTherapy(t: TherapyItem): Promise<void> {
  const times = calcTherapyTimes(t.time, t.frequency);
  const channelId = Platform.OS === 'android' ? CHANNEL_ID : undefined;
  if (t.endDate && t.endDate > t.startDate) {
    const cur = new Date(t.startDate);
    const end = new Date(t.endDate);
    let dayIdx = 0;
    while (cur <= end) {
      const dayISO = cur.toISOString().slice(0, 10);
      for (let ti = 0; ti < times.length; ti++) {
        const [h, min] = times[ti].split(':').map(Number);
        const date = new Date(dayISO);
        date.setHours(h, min, 0, 0);
        await scheduleAt(`${PREFIX}th_${t.id}_d${dayIdx}_t${ti}`, `💊 ${t.name}${t.dose ? ' ' + t.dose : ''}`, 'Orario terapia', date);
      }
      cur.setDate(cur.getDate() + 1);
      dayIdx++;
    }
  } else {
    for (let ti = 0; ti < times.length; ti++) {
      const [h, min] = times[ti].split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}th_${t.id}_t${ti}`,
        content: { title: `💊 ${t.name}${t.dose ? ' ' + t.dose : ''}`, body: 'Orario terapia', sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: min, channelId },
      });
    }
  }
}

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
  therapies: TherapyItem[] = [],
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
  for (const t of therapies) {
    await scheduleTherapy(t);
  }
}
