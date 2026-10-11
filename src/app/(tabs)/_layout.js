import { useCallback, useState } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import { TabBar } from '../../keep/TabBar';
import { dueCheckIns } from '../../keep/modes.mjs';
import { loadList } from '../../lib/storage';
import { C } from '../../lib/theme';

export default function TabsLayout() {
  // A small gold dot on List when there's a "did you get to it?" waiting.
  const [due, setDue] = useState(false);
  useFocusEffect(useCallback(() => { loadList().then((l) => setDue(dueCheckIns(l, Date.now()).length > 0)); }, []));

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} dots={{ list: due }} />}
      screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: C.sky0 } }}
      screenListeners={{ focus: () => loadList().then((l) => setDue(dueCheckIns(l, Date.now()).length > 0)) }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sky" />
      <Tabs.Screen name="list" />
    </Tabs>
  );
}
