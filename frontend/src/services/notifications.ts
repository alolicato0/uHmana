import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Reminder } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'reminders';

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Promemoria',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00B5A6',
      sound: 'default',
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

function parseTime(time?: string): { hour: number; minute: number } {
  if (!time) return { hour: 9, minute: 0 };
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  return { hour: isNaN(h) ? 9 : h, minute: isNaN(m) ? 0 : m };
}

function categoryEmoji(c: Reminder['category']): string {
  switch (c) {
    case 'medication': return '💊';
    case 'visit': return '🩺';
    case 'vaccine': return '💉';
    default: return '🔔';
  }
}

async function scheduleOne(
  reminder: Reminder,
  trigger: Notifications.NotificationTriggerInput,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${categoryEmoji(reminder.category)} ${reminder.title}`,
      body: reminder.notes ?? 'Promemoria uHmana',
      sound: 'default',
      data: { reminderId: reminder.id },
    },
    trigger,
  });
}

export async function scheduleReminder(reminder: Reminder): Promise<void> {
  if (!reminder.enabled) return;
  const { hour, minute } = parseTime(reminder.schedule.time);
  const channelId = Platform.OS === 'android' ? CHANNEL_ID : undefined;

  switch (reminder.schedule.kind) {
    case 'once': {
      if (!reminder.schedule.date) return;
      const date = new Date(reminder.schedule.date);
      if (reminder.schedule.time) {
        date.setHours(hour, minute, 0, 0);
      }
      if (date.getTime() <= Date.now()) return;
      await scheduleOne(reminder, {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId,
      });
      break;
    }
    case 'daily': {
      await scheduleOne(reminder, {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId,
      });
      break;
    }
    case 'weekly': {
      const days = reminder.schedule.daysOfWeek ?? [];
      for (const d of days) {
        await scheduleOne(reminder, {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: ((d % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
          hour,
          minute,
          channelId,
        });
      }
      break;
    }
    case 'monthly': {
      const day = reminder.schedule.date
        ? new Date(reminder.schedule.date).getDate()
        : 1;
      await scheduleOne(reminder, {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day,
        hour,
        minute,
        channelId,
      });
      break;
    }
  }
}

export async function cancelAllReminders(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (!n.identifier?.startsWith('prev_')) {
      try {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      } catch {
        // ignore
      }
    }
  }
}

export async function rescheduleAll(reminders: Reminder[]): Promise<void> {
  await cancelAllReminders();
  for (const r of reminders) {
    try {
      await scheduleReminder(r);
    } catch {
      // ignore single reminder failures
    }
  }
}
