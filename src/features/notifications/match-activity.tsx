import {
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type MatchActivityProps = {
  title: string;
  /** "Em quadra" depois do início; "Começa às 19:00" antes. */
  status: string;
  place: string;
  teams: string;
  startsAt: number;
  endsAt: number;
};

// Live Activity / Dynamic Island (iOS 16.2+). A função vira string e roda no
// widget: nada de fora dela existe lá (constantes vão dentro).
function MatchActivity(
  props: MatchActivityProps,
  environment: LiveActivityEnvironment,
) {
  'widget';
  const brand = environment.colorScheme === 'dark' ? '#8cc3ff' : '#0052be';
  const start = new Date(props.startsAt);
  const range = { lower: start, upper: new Date(props.endsAt) };
  // `timer`: conta até o início e, passado o horário, o tempo de jogo.
  const clock = (size: number) => (
    <Text
      date={start}
      dateStyle='timer'
      modifiers={[
        font({ size, weight: 'semibold' }),
        monospacedDigit(),
        foregroundStyle(brand),
      ]}
    />
  );
  const icon = <Image systemName='figure.tennis' color={brand} />;
  return {
    banner: (
      <VStack
        alignment='leading'
        spacing={6}
        modifiers={[padding({ all: 14 })]}
      >
        <HStack spacing={8}>
          {icon}
          <Text modifiers={[font({ weight: 'bold' }), lineLimit(1)]}>
            {props.title}
          </Text>
          <Spacer />
          {clock(17)}
        </HStack>
        <Text modifiers={[font({ size: 13 }), lineLimit(1)]}>
          {`${props.status} · ${props.place}`}
        </Text>
        <Text modifiers={[font({ size: 13, weight: 'medium' }), lineLimit(1)]}>
          {props.teams}
        </Text>
        <ProgressView timerInterval={range} countsDown={false} />
      </VStack>
    ),
    compactLeading: icon,
    compactTrailing: clock(14),
    minimal: icon,
    expandedLeading: (
      <VStack alignment='leading' modifiers={[padding({ leading: 6 })]}>
        {icon}
        <Text modifiers={[font({ size: 12 }), lineLimit(1)]}>
          {props.status}
        </Text>
      </VStack>
    ),
    expandedTrailing: clock(20),
    expandedBottom: (
      <VStack alignment='leading' spacing={4} modifiers={[padding({ all: 6 })]}>
        <Text modifiers={[font({ weight: 'semibold' }), lineLimit(1)]}>
          {props.title}
        </Text>
        <Text modifiers={[font({ size: 13 }), lineLimit(1)]}>
          {props.teams}
        </Text>
        <ProgressView timerInterval={range} countsDown={false} />
      </VStack>
    ),
  };
}

export default createLiveActivity('MatchActivity', MatchActivity);
