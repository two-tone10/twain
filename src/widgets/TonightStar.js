// Tonight's star: one moment from your Keep list on the home or lock screen.
// Runs in the widget's own runtime: only @expo/ui views, no hooks, no outside variables.
import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

const TonightStar = (props, env) => {
  'widget';
  const ink = '#efe6d6';
  const gold = '#d8b46a';
  const faint = '#8a8074';
  const sky = { type: 'linearGradient', colors: ['#141938', '#05060f'], startPoint: { x: 0.5, y: 0 }, endPoint: { x: 0.5, y: 1 } };
  const title = props.title || 'Play a drop';
  const when = props.when || 'KEEP';
  const color = props.color || gold;

  if (env.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" modifiers={[widgetURL('keep://list')]}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' })]}>{when}</Text>
        <Text modifiers={[font({ size: 15, design: 'serif' }), lineLimit(2)]}>{title}</Text>
      </VStack>
    );
  }

  const big = env.widgetFamily === 'systemMedium';
  return (
    <VStack alignment="leading" modifiers={[frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }), padding({ all: big ? 18 : 15 }), containerBackground(sky, 'widget'), widgetURL('keep://list')]}>
      <HStack>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(color)]}>●</Text>
        <Spacer />
        <Text modifiers={[font({ size: 9, weight: 'semibold' }), foregroundStyle(gold)]}>{when}</Text>
      </HStack>
      <Spacer />
      <Text modifiers={[font({ size: big ? 24 : 19, design: 'serif' }), foregroundStyle(ink), lineLimit(3)]}>{title}</Text>
      {props.sub ? <Text modifiers={[font({ size: 11 }), foregroundStyle(faint), lineLimit(1)]}>{props.sub}</Text> : null}
    </VStack>
  );
};

export default createWidget('TonightStar', TonightStar);
