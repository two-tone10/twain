// Keeps the home-screen widget in step with the list. The widget module only exists in real builds,
// so in Expo Go (or if anything goes wrong) this quietly does nothing.
import { requireOptionalNativeModule } from 'expo';
import { WHY } from './content.mjs';
import { widgetPick } from './plans.mjs';

let widget;
function load() {
  if (widget === undefined) {
    if (!requireOptionalNativeModule('ExpoWidgets')) widget = null;
    else try { widget = require('../widgets/TonightStar').default; } catch { widget = null; }
  }
  return widget;
}

export function updateWidget(list) {
  const w = load();
  if (!w) return;
  const pick = widgetPick(list);
  try {
    w.updateSnapshot(pick
      ? { title: pick.t, when: pick.when, sub: pick.sub, color: WHY[pick.k].color }
      : { title: 'Play a drop', when: 'KEEP', sub: 'Your list is empty', color: '#d8b46a' });
  } catch {}
}
