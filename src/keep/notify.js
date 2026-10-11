// Opt-in reminders for the slow drop. Only ever local; nothing leaves the phone.
import * as Notifications from 'expo-notifications';
import { reminderTimes } from './modes.mjs';

// While Keep is open you can already see the sky, so don't banner over it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function allowReminders() {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return !!asked.granted;
  } catch {
    return false;
  }
}

// Clears what's queued and lines up reminders for whatever is still falling.
export async function scheduleReminders(s) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!s?.notify) return;
    for (const r of reminderTimes(s, Date.now())) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'A star is about to fall past', body: `${r.t}. Thirty minutes left to keep it.` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
      });
    }
  } catch {}
}
