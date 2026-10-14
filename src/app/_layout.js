import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { BodoniModa_400Regular, BodoniModa_400Regular_Italic, BodoniModa_500Medium } from '@expo-google-fonts/bodoni-moda';
import { Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from '@expo-google-fonts/jost';
import { loadPrefs } from '../lib/prefs';
import { loadList, onListChange } from '../lib/storage';
import { updateWidget } from '../keep/widget';
import { sendHeldStar, syncCommunity } from '../lib/commons';
import { setExtra, setGone } from '../keep/content.mjs';
import { C } from '../lib/theme';

export default function Layout() {
  const [fonts] = useFonts({ BodoniModa_400Regular, BodoniModa_400Regular_Italic, BodoniModa_500Medium, Jost_400Regular, Jost_500Medium, Jost_600SemiBold });
  const [prefs, setPrefs] = useState(false);
  useEffect(() => { loadPrefs().finally(() => setPrefs(true)); syncCommunity().then(({ items, gone }) => { setExtra(items); setGone(gone); }); sendHeldStar(); }, []);
  // The widget follows the list: refreshed on launch and on every change.
  useEffect(() => { onListChange(updateWidget); loadList().then(updateWidget); }, []);
  const ready = fonts && prefs;
  return (
    <SafeAreaProvider>
      <StatusBar style={C.light ? 'dark' : 'light'} />
      {ready ? (
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: C.sky0 } }} />
      ) : (
        <View style={{ flex: 1, backgroundColor: C.sky0 }} />
      )}
    </SafeAreaProvider>
  );
}
