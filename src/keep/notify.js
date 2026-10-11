// Opt-in local notifications: slow-drop reminders and the evening nudge. Nothing leaves the phone.
import * as Notifications from 'expo-notifications';
import { reminderTimes } from './modes.mjs';
import { eveningPick, nextEvening } from './readings.mjs';

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

// Each kind clears only its own queued notifications.
async function clear(kind) {
  const queued = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(queued.filter((n) => (n.content.data?.kind ?? 'slow') === kind).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

const at = (date) => ({ type: Notifications.SchedulableTriggerInputTypes.DATE, date });

// Lines up reminders for whatever in the slow drop is still falling.
export async function scheduleReminders(s) {
  try {
    await clear('slow');
    if (!s?.notify) return;
    for (const r of reminderTimes(s, Date.now())) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'A star is about to fall past', body: `${r.t}. Thirty minutes left to keep it.`, data: { kind: 'slow' } },
        trigger: at(r.at),
      });
    }
  } catch {}
}

// One nudge at the next 6pm, naming the newest open moment on your list. Re-run whenever the list changes.
export async function scheduleEvening(list, on) {
  try {
    await clear('evening');
    const pick = on ? eveningPick(list, nextEvening() - 60e3) : null;
    if (!pick) return;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Keep', body: pick.body, data: { kind: 'evening' } },
      trigger: at(nextEvening()),
    });
  } catch {}
}
