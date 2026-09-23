import { useRouter } from 'expo-router';
import { Check, Plus, UserPlus, X } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Avatar } from '@/components/ace/avatar';
import { sportColors } from '@/components/ace/sport-icon';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { categoryLabel } from '@/features/players/labels';
import { cn, getFirstAndLastWord } from '@/lib/utils';
import type { Sport } from '@/types/api';

import type {
  Application,
  MatchDetail,
  MatchParticipant,
  TeamIndex,
} from './api';
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

/** Elenco por time: participantes confirmados, vagas, candidatura e pedidos. */
export function CourtBoard({
  match,
  permissions,
  onPickSlot,
  onInviteSlot,
  onWithdraw,
  applications = [],
  actionError,
  activeApplicationId,
  onApprove,
  onReject,
  onRemove,
  applicationsLoading = false,
  busy = false,
}: {
  match: MatchDetail;
  permissions: MatchPermissions;
  onPickSlot?: (teamIndex: TeamIndex) => void;
  onInviteSlot?: (teamIndex: TeamIndex) => void;
  onWithdraw?: () => void;
  applications?: Application[];
  actionError?: Error | null;
  activeApplicationId?: string | null;
  onApprove?: (application: Application, teamIndex: TeamIndex) => void;
  onReject?: (application: Application) => void;
  onRemove?: (participant: MatchParticipant) => void;
  applicationsLoading?: boolean;
  busy?: boolean;
}) {
  const router = useRouter();
  const { bg, ink } = sportColors(match.sport.slug);
  const pickable =
    !!onPickSlot && (permissions.canApply || permissions.canAcceptInvite);
  const policy = {
    MALE: 'Vaga masculina',
    FEMALE: 'Vaga feminina',
    MIXED: 'Dupla mista',
    OPEN: 'Vaga livre',
  }[match.genderPolicy];
  const ownPending =
    permissions.viewerRole === 'pending' ? match.viewer?.participation : null;
  return (
    <View className='gap-3'>
      <View className='flex-row items-center justify-between gap-2'>
        <Text variant='muted' className='flex-1'>
          {match.genderPolicy === 'MIXED'
            ? 'Um homem e uma mulher por time'
            : policy}
        </Text>
        <View className='rounded-pill bg-brand-muted px-2.5 py-1'>
          <Text className='font-inter-semibold text-xs text-brand'>{`${match.capacity.available} ${match.capacity.available === 1 ? 'vaga' : 'vagas'}`}</Text>
        </View>
      </View>
      <View className='gap-3' accessibilityState={{ busy }}>
        {match.teams.map((team) => (
          <View
            key={team.id}
            className='overflow-hidden rounded-panel border border-border bg-white p-3.5'
            accessibilityLabel={`Time ${team.teamIndex}`}
          >
            {courtOutlines[match.sport.slug] && (
              <Svg
                viewBox='0 0 32 20'
                preserveAspectRatio='none'
                fill='none'
                stroke={ink}
                color={ink}
                opacity={0.1}
                pointerEvents='none'
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 130,
                  height: 85,
                }}
              >
                {courtOutlines[match.sport.slug]}
              </Svg>
            )}
            <View className='mb-3 flex-row items-center justify-between'>
              <View
                className='rounded-pill px-3 py-1'
                style={{ backgroundColor: bg }}
              >
                <Text
                  className='font-inter-bold text-xs'
                  style={{ color: ink }}
                >{`Time ${team.teamIndex}`}</Text>
              </View>
              <Text variant='muted'>{`${team.participants.length}/${match.teamSize} jogadores`}</Text>
            </View>
            <View className='gap-2'>
              {Array.from({ length: match.teamSize }, (_, i) => {
                const participant = team.participants[i];
                if (participant)
                  return (
                    <View
                      key={participant.id}
                      className='w-full flex-row items-center gap-2 rounded-card border border-border bg-background px-3 py-2.5'
                      style={{ minHeight: 62 }}
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
                      className='w-full flex-row items-center gap-2 rounded-card border border-dashed border-brand bg-brand-muted px-3 py-2.5 active:bg-brand-light'
                      style={{ minHeight: 62 }}
                    >
                      <View className='h-8 w-8 items-center justify-center rounded-full bg-brand'>
                        <Plus size={16} color='#fff' strokeWidth={2.5} />
                      </View>
                      <View className='flex-1'>
                        <Text className='font-inter-semibold text-sm text-brand'>
                          {permissions.canAcceptInvite
                            ? 'Entrar neste time'
                            : 'Candidatar-me a esta vaga'}
                        </Text>
                        <Text variant='muted' className='text-xs'>
                          {policy}
                        </Text>
                      </View>
                    </Pressable>
                  );
                return (
                  <View
                    key={`vaga-${i}`}
                    className='w-full flex-row items-center gap-2 rounded-card border border-dashed border-input bg-background px-3 py-2.5'
                    style={{ minHeight: 62 }}
                  >
                    <View
                      className='h-8 w-8 rounded-full border border-dashed'
                      style={{ borderColor: `${ink}88` }}
                    />
                    <View className='gap-0.5'>
                      <Text variant='muted'>Vaga disponível</Text>
                      <Text variant='muted' className='text-xs'>
                        {policy}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            {ownPending?.teamIndex === team.teamIndex && (
              <PendingCard busy={busy} onWithdraw={onWithdraw} />
            )}
            {permissions.canInvite &&
              onInviteSlot &&
              team.participants.length < match.teamSize && (
                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel={`Convidar amigo para o Time ${team.teamIndex}`}
                  disabled={busy}
                  onPress={() => onInviteSlot(team.teamIndex)}
                  className='mt-3 min-h-11 flex-row items-center justify-center gap-2 rounded-control border border-input bg-card active:bg-brand-muted'
                >
                  <UserPlus size={16} color={palette.colors.brand} />
                  <Text className='font-inter-semibold text-sm text-brand'>{`Convidar amigo para o Time ${team.teamIndex}`}</Text>
                </Pressable>
              )}
            {applications
              .filter((application) => application.teamIndex === team.teamIndex)
              .map((application) => (
                <CandidateCard
                  key={application.id}
                  application={application}
                  match={match}
                  teamIndex={team.teamIndex}
                  onApprove={onApprove}
                  onReject={onReject}
                  error={
                    activeApplicationId === application.id ? actionError : null
                  }
                  busy={busy}
                />
              ))}
          </View>
        ))}
      </View>
      {ownPending?.teamIndex == null && ownPending && (
        <PendingCard busy={busy} onWithdraw={onWithdraw} />
      )}
      {applications.some((application) => application.teamIndex === null) && (
        <View className='gap-2 rounded-panel bg-muted p-3'>
          <Text variant='label'>Sem preferência de time</Text>
          {applications
            .filter((application) => application.teamIndex === null)
            .map((application) => (
              <CandidateCard
                key={application.id}
                application={application}
                match={match}
                teamIndex={
                  match.teams.find(
                    (team) => team.participants.length < match.teamSize,
                  )?.teamIndex ?? 1
                }
                onApprove={onApprove}
                onReject={onReject}
                error={
                  activeApplicationId === application.id ? actionError : null
                }
                busy={busy}
              />
            ))}
        </View>
      )}
      <View className='flex-row items-center gap-2'>
        <SlotDots
          teamSize={match.teamSize}
          confirmed={match.capacity.confirmed}
        />
        <Text variant='muted'>
          {`${match.capacity.confirmed} de ${match.capacity.total} confirmados`}
        </Text>
      </View>
      {permissions.canManage &&
        !applicationsLoading &&
        applications.length === 0 &&
        match.status === 'OPEN' && (
          <Text variant='muted' className='text-center'>
            Nenhuma candidatura pendente
          </Text>
        )}
    </View>
  );
}

function PendingCard({
  busy,
  onWithdraw,
}: {
  busy: boolean;
  onWithdraw?: () => void;
}) {
  return (
    <View
      className='mt-3 gap-2 rounded-card border border-[#ead49c] bg-[#fff8e8] p-3'
      accessibilityRole='summary'
    >
      <Text className='font-inter-semibold text-sm text-[#765817]'>
        Sua candidatura · Aguardando aprovação
      </Text>
      {onWithdraw && (
        <Pressable
          accessibilityRole='button'
          disabled={busy}
          onPress={onWithdraw}
          className='min-h-10 justify-center'
        >
          <Text className='font-inter-semibold text-sm text-brand'>
            Retirar candidatura
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function CandidateCard({
  application,
  match,
  teamIndex,
  onApprove,
  onReject,
  error,
  busy,
}: {
  application: Application;
  match: MatchDetail;
  teamIndex: TeamIndex;
  onApprove?: (application: Application, teamIndex: TeamIndex) => void;
  onReject?: (application: Application) => void;
  error?: Error | null;
  busy: boolean;
}) {
  const [selectedTeam, setSelectedTeam] = useState<TeamIndex>(teamIndex);
  const first = application.user.fullName.split(' ')[0];
  const room =
    match.teams.find((team) => team.teamIndex === selectedTeam)?.participants
      .length ?? match.teamSize;
  return (
    <View className='mt-3 gap-2 rounded-card border border-[#ead49c] bg-[#fffdf7] p-3'>
      <View className='flex-row items-center gap-2'>
        <Avatar
          name={application.user.fullName}
          url={application.user.avatarUrl}
          size={32}
        />
        <View className='flex-1'>
          <Text variant='label' numberOfLines={1}>
            {application.user.fullName}
          </Text>
          <Text className='text-xs text-[#8a6420]'>
            {application.sportProfile
              ? `${categoryLabel(application.sportProfile)} · `
              : ''}
            Aguardando decisão
          </Text>
        </View>
      </View>
      <View
        className='flex-row gap-2'
        accessibilityRole='radiogroup'
        accessibilityLabel={`Time para ${first}`}
      >
        {([1, 2] as const).map((index) => (
          <Pressable
            key={index}
            accessibilityRole='radio'
            accessibilityLabel={`Time ${index} para ${first}`}
            accessibilityState={{
              selected: selectedTeam === index,
              checked: selectedTeam === index,
            }}
            disabled={
              busy ||
              (match.teams.find((team) => team.teamIndex === index)
                ?.participants.length ?? match.teamSize) >= match.teamSize
            }
            onPress={() => setSelectedTeam(index)}
            className={cn(
              'min-h-9 flex-1 items-center justify-center rounded-control border',
              selectedTeam === index
                ? 'border-brand bg-brand-muted'
                : 'border-input bg-white',
            )}
          >
            <Text className='font-inter-semibold text-xs text-brand'>{`Time ${index}`}</Text>
          </Pressable>
        ))}
      </View>
      <View className='flex-row gap-2'>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={`Aprovar ${first} no Time ${selectedTeam}`}
          disabled={busy || room >= match.teamSize || match.status !== 'OPEN'}
          onPress={() => onApprove?.(application, selectedTeam)}
          className='min-h-10 flex-1 items-center justify-center rounded-control bg-brand'
        >
          <Text className='font-inter-semibold text-sm text-white'>
            Aprovar
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={`Recusar ${first}`}
          disabled={busy || match.status !== 'OPEN'}
          onPress={() => onReject?.(application)}
          className='min-h-10 flex-1 items-center justify-center rounded-control border border-input bg-white'
        >
          <Text className='font-inter-semibold text-sm text-brand'>
            Recusar
          </Text>
        </Pressable>
      </View>
      {error && (
        <Text className='text-xs text-destructive' accessibilityRole='alert'>
          {error.message}
        </Text>
      )}
    </View>
  );
}
