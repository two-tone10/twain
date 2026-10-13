import { useCallback, useState } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import { TabBar } from '../../keep/TabBar';
import { dueCheckIns } from '../../keep/modes.mjs';
import { loadDailies, loadList } from '../../lib/storage';
import { loadDailyHour, loadEvening } from '../../lib/prefs';
import { dayNumber } from '../../keep/fun.mjs';
import { scheduleDailyDrop, scheduleEvening } from '../../keep/notify';
import { C } from '../../lib/theme';

export default function TabsLayout() {
  // A small gold dot on List when there's a "did you get to it?" waiting.
  // Also keeps tonight's star in step with whatever was just added to the list.
  const [due, setDue] = useState(false);
  const refresh = useCallback(async () => {
    const [l, evening] = await Promise.all([loadList(), loadEvening()]);
    setDue(dueCheckIns(l, Date.now()).length > 0);
    if (evening) scheduleEvening(l, true);
    // The daily reminder skips today once today's drop is played.
    const [hour, dailies] = await Promise.all([loadDailyHour(), loadDailies()]);
    if (hour != null) scheduleDailyDrop(hour, !!dailies[dayNumber()]);
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} dots={{ list: due }} />}
      screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: C.sky0 } }}
      screenListeners={{ focus: refresh }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sky" />
      <Tabs.Screen name="list" />
      <Tabs.Screen name="kept" />
    </Tabs>
  );
}
