import { useRouter } from 'expo-router';
import { Check, Plus, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Avatar } from '@/components/ace/avatar';
import { sportColors } from '@/components/ace/sport-icon';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { cn, getFirstAndLastWord } from '@/lib/utils';
import type { Sport } from '@/types/api';

import type { MatchDetail, MatchParticipant, TeamIndex } from './api';
import type { MatchPermissions } from './schemas';

/** Linhas da quadra vista de cima (viewBox 32×20), mesmas do web. */
const courtOutlines: Record<string, ReactNode> = {
  padel: (
    <>
      <Rect x={2} y={2} width={28} height={16} rx={1.5} strokeWidth={2.5} />
      <Path d='M7 2v16M25 2v16M7 10h18' strokeWidth={1.25} />
      <Path d='M16 2v16' strokeWidth={2} />
    </>
  ),
  beach_tennis: (
    <>
      <Rect
        x={2}
        y={2}
        width={28}
        height={16}
        fill='currentColor'
        fillOpacity={0.16}
      />
      <Path d='M16 0.75v18.5' strokeWidth={2} />
    </>
  ),
  tenis: (
    <>
      <Rect x={2} y={2} width={28} height={16} />
      <Path
        d='M2 4.5h28M2 15.5h28M9 4.5v11M23 4.5v11M9 10h14'
        strokeWidth={1.25}
      />
      <Path d='M16 0.75v18.5' strokeWidth={2} />
    </>
  ),
  pickleball: (
    <>
      <Rect x={2} y={2} width={28} height={16} />
      <Rect
        x={11.5}
        y={2}
        width={9}
        height={16}
        fill='currentColor'
        stroke='none'
        opacity={0.16}
      />
      <Path d='M11.5 2v16M20.5 2v16M2 10h9.5M20.5 10H30' strokeWidth={1.25} />
      <Path d='M16 0.75v18.5' strokeWidth={2} />
    </>
  ),
};

/** Bolinhas de vagas agrupadas por time: "•• | •◦". */
export function SlotDots({
  teamSize,
  confirmed,
  size = 8,
}: {
  teamSize: number;
  confirmed: number;
  size?: number;
}) {
  const total = teamSize * 2;
  return (
    <View
      className='flex-row items-center gap-1.5'
      accessibilityRole='image'
      accessibilityLabel={`${confirmed} de ${total} vagas preenchidas`}
    >
      {[0, 1].map((team) => (
        <View key={team} className='flex-row gap-1'>
          {Array.from({ length: teamSize }, (_, i) => {
            const filled = team * teamSize + i < confirmed;
            return (
              <View
                key={i}
                className={cn(
                  'rounded-full border',
                  filled ? 'border-brand bg-brand' : 'border-input bg-card',
                )}
                style={{ width: size, height: size }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Cards de formato (1v1 / 2v2) com as vagas desenhadas. */
export function FormatChoice({
  sport,
  value,
  onChange,
  disabled = false,
}: {
  sport: Sport | undefined;
  value: TeamIndex;
  onChange: (teamSize: TeamIndex) => void;
  disabled?: boolean;
}) {
  const options = [
    {
      size: 1 as const,
      title: '1v1',
      subtitle: 'Simples · 2 jogadores',
      supported: sport?.supportsSingles ?? true,
      hint: 'Só em duplas nesta modalidade',
    },
    {
      size: 2 as const,
      title: '2v2',
      subtitle: 'Duplas · 4 jogadores',
      supported: sport?.supportsDoubles ?? true,
      hint: 'Só individual nesta modalidade',
    },
  ];
  return (
    <View className='flex-row gap-3' accessibilityRole='radiogroup'>
      {options.map((option) => {
        const selected = value === option.size;
        const blocked = disabled || !option.supported;
        return (
          <Pressable
            key={option.size}
            accessibilityRole='radio'
            accessibilityLabel={`Formato ${option.title}`}
            accessibilityState={{
              selected,
              checked: selected,
              disabled: blocked,
            }}
            disabled={blocked}
            onPress={() => onChange(option.size)}
            className={cn(
              'flex-1 gap-2 rounded-card border bg-card p-3',
              selected ? 'border-brand bg-brand-muted' : 'border-border',
              !option.supported && 'opacity-50',
            )}
          >
            <View className='flex-row items-center justify-between'>
              <SlotDots
                teamSize={option.size}
                confirmed={option.size * 2}
                size={7}
              />
              <View
                className={cn(
                  'h-5 w-5 items-center justify-center rounded-full border-2',
                  selected ? 'border-brand bg-brand' : 'border-input',
                )}
              >
                {selected && <Check size={12} color='#fff' strokeWidth={3} />}
              </View>
            </View>
            <Text variant='subtitle'>{option.title}</Text>
            <Text variant='muted'>
              {option.supported ? option.subtitle : option.hint}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A quadra vista de cima: Time 1 à esquerda, Time 2 à direita, rede no meio,
 * `teamSize` vagas por lado. Vaga ocupada mostra o jogador; vaga livre vira
 * botão "Quero jogar aqui" quando o visitante pode se candidatar.
 */
export function CourtBoard({
  match,
  permissions,
  onPickSlot,
  onRemove,
  busy = false,
}: {
  match: MatchDetail;
  permissions: MatchPermissions;
  onPickSlot?: (teamIndex: TeamIndex) => void;
  onRemove?: (participant: MatchParticipant) => void;
  busy?: boolean;
}) {
  const router = useRouter();
  const outline = courtOutlines[match.sport.slug];
  const { bg, ink } = sportColors(match.sport.slug);
  const pickable =
    !!onPickSlot && (permissions.canApply || permissions.canAcceptInvite);
  return (
    <View className='gap-3'>
      <View
        className='flex-row overflow-hidden rounded-panel border px-2 py-4'
        style={{
          backgroundColor: bg,
          borderColor: `${ink}33`,
          opacity: busy ? 0.7 : 1,
        }}
        accessibilityState={{ busy }}
      >
        {outline && (
          <Svg
            viewBox='0 0 32 20'
            preserveAspectRatio='none'
            fill='none'
            stroke={ink}
            color={ink}
            strokeWidth={1.5}
            opacity={0.35}
            pointerEvents='none'
            style={{ position: 'absolute', inset: 8 }}
            width='100%'
            height='100%'
          >
            {outline}
          </Svg>
        )}
        {match.teams.map((team, index) => (
          <View
            key={team.id}
            className={cn(
              'flex-1 items-center gap-2.5 px-2',
              index === 1 && 'border-l-[3px] border-dashed',
            )}
            style={index === 1 ? { borderLeftColor: `${ink}88` } : undefined}
            accessibilityLabel={`Time ${team.teamIndex}`}
          >
            <View className='rounded-pill bg-[#ffffffd9] px-2.5 py-0.5'>
              <Text
                className='font-inter-bold text-[11px] uppercase tracking-widest'
                style={{ color: ink }}
              >
                {`Time ${team.teamIndex}`}
              </Text>
            </View>
            {Array.from({ length: match.teamSize }, (_, i) => {
              const participant = team.participants[i];
              if (participant)
                return (
                  <View
                    key={participant.id}
                    className='w-full flex-row items-center gap-2 rounded-card border bg-[#ffffffeb] px-2.5 py-2'
                    style={{ borderColor: `${ink}38`, minHeight: 56 }}
                  >
                    <Pressable
                      accessibilityRole='link'
                      accessibilityLabel={`Ver perfil de ${participant.user.fullName}`}
                      className='flex-1 flex-row items-center gap-2'
                      onPress={() =>
                        router.push(`/players/${participant.user.id}`)
                      }
                    >
                      <Avatar
                        name={participant.user.fullName}
                        url={participant.user.avatarUrl}
                        size={32}
                      />
                      <View className='flex-1 gap-0.5'>
                        <Text variant='label' numberOfLines={1}>
                          {getFirstAndLastWord(participant.user.fullName)}
                        </Text>
                        {participant.isCreator && (
                          <Text className='font-inter-bold text-[10px] uppercase tracking-wider text-navy'>
                            Criador
                          </Text>
                        )}
                      </View>
                    </Pressable>
                    {onRemove &&
                      permissions.canManage &&
                      !participant.isCreator && (
                        <Pressable
                          accessibilityRole='button'
                          accessibilityLabel={`Remover ${participant.user.fullName}`}
                          hitSlop={8}
                          disabled={busy}
                          onPress={() => onRemove(participant)}
                          className='h-8 w-8 items-center justify-center rounded-full active:bg-destructive-soft'
                        >
                          <X size={16} color={palette.colors.destructive} />
                        </Pressable>
                      )}
                  </View>
                );
              if (pickable)
                return (
                  <Pressable
                    key={`vaga-${i}`}
                    accessibilityRole='button'
                    accessibilityLabel={`${permissions.canAcceptInvite ? 'Entrar' : 'Quero jogar'} no Time ${team.teamIndex}`}
                    disabled={busy}
                    onPress={() => onPickSlot(team.teamIndex)}
                    className='w-full flex-row items-center gap-2 rounded-card border border-dashed border-brand bg-[#ffffffeb] px-2.5 py-2 active:bg-brand-muted'
                    style={{ minHeight: 56 }}
                  >
                    <View className='h-8 w-8 items-center justify-center rounded-full bg-brand'>
                      <Plus size={16} color='#fff' strokeWidth={2.5} />
                    </View>
                    <View className='flex-1'>
                      <Text className='font-inter-semibold text-sm text-brand'>
                        {permissions.canAcceptInvite
                          ? 'Entrar neste time'
                          : 'Quero jogar aqui'}
                      </Text>
                    </View>
                  </Pressable>
                );
              return (
                <View
                  key={`vaga-${i}`}
                  className='w-full flex-row items-center gap-2 rounded-card border border-dashed bg-[#ffffff99] px-2.5 py-2'
                  style={{ borderColor: `${ink}55`, minHeight: 56 }}
                >
                  <View
                    className='h-8 w-8 rounded-full border border-dashed'
                    style={{ borderColor: `${ink}88` }}
                  />
                  <Text variant='muted'>Vaga</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View className='flex-row items-center gap-2'>
        <SlotDots
          teamSize={match.teamSize}
          confirmed={match.capacity.confirmed}
        />
        <Text variant='muted'>
          {`${match.capacity.confirmed} de ${match.capacity.total} confirmados`}
        </Text>
      </View>
    </View>
  );
}
