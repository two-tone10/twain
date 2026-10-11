// A quiet bar of three words. The current one is gold with a small star under it.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../lib/theme';

const LABELS = { index: 'Play', sky: 'Sky', list: 'List' };

export function TabBar({ state, navigation, insets, dots = {} }) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, i) => {
        const on = state.index === i;
        const press = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!on && !e.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable key={route.key} onPress={press} accessibilityRole="tab" accessibilityState={{ selected: on }} hitSlop={8} style={styles.item}>
            <View style={styles.row}>
              <Text style={[styles.label, on && styles.on]}>{LABELS[route.name] ?? route.name}</Text>
              {dots[route.name] && !on ? <View style={styles.badge} /> : null}
            </View>
            <View style={[styles.star, on && styles.starOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: C.sky1, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: 12 },
  item: { flex: 1, alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontFamily: F.sansMedium, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: C.faint },
  on: { color: C.gold },
  badge: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold },
  star: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  starOn: { backgroundColor: C.star, shadowColor: C.glow, shadowOpacity: 1, shadowRadius: 4 },
});
