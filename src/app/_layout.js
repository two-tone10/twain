import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { BodoniModa_400Regular, BodoniModa_400Regular_Italic, BodoniModa_500Medium } from '@expo-google-fonts/bodoni-moda';
import { Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from '@expo-google-fonts/jost';
import { C } from '../lib/theme';

export default function Layout() {
  const [ready] = useFonts({ BodoniModa_400Regular, BodoniModa_400Regular_Italic, BodoniModa_500Medium, Jost_400Regular, Jost_500Medium, Jost_600SemiBold });
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {ready ? (
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: C.sky0 } }} />
      ) : (
        <View style={{ flex: 1, backgroundColor: C.sky0 }} />
      )}
    </SafeAreaProvider>
  );
}
