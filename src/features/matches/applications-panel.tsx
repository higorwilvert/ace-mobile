import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chips';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { categoryLabel } from '@/features/players/labels';
import { cn, firstName } from '@/lib/utils';

import {
  type Application,
  applicationsQuery,
  approveApplication,
  type MatchDetail,
  rejectApplication,
  type TeamIndex,
} from './api';
import { teamIndexes } from './schemas';
import { useMatchMutation } from './use-match-mutation';

const rating = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

function teamRoom(match: MatchDetail, teamIndex: TeamIndex) {
  const team = match.teams.find((t) => t.teamIndex === teamIndex);
  return match.teamSize - (team?.participants.length ?? 0);
}
function defaultTeam(
  match: MatchDetail,
  application: Application,
): TeamIndex | undefined {
  if (application.teamIndex && teamRoom(match, application.teamIndex) > 0)
    return application.teamIndex;
  return teamIndexes.find((index) => teamRoom(match, index) > 0);
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View className='flex-1 gap-0.5'>
      <Text className='font-inter-medium text-[11px] uppercase tracking-wider text-muted-foreground'>
        {label}
      </Text>
      <Text variant='label' numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ApplicationRow({
  match,
  application,
  pending,
  busy,
  onApprove,
  onReject,
}: {
  match: MatchDetail;
  application: Application;
  pending: boolean;
  busy: boolean;
  onApprove: (teamIndex: TeamIndex | undefined) => void;
  onReject: () => void;
}) {
  const router = useRouter();
  const [team, setTeam] = useState<TeamIndex | undefined>(() =>
    defaultTeam(match, application),
  );
  const full = match.capacity.available === 0;
  const chosen =
    team && teamRoom(match, team) > 0 ? team : defaultTeam(match, application);
  const first = firstName(application.user.fullName);
  return (
    <View className='gap-3 rounded-card border border-border bg-background p-3'>
      <Pressable
        accessibilityRole='link'
        accessibilityLabel={`Ver perfil de ${application.user.fullName}`}
        className='flex-row items-center gap-3'
        onPress={() => router.push(`/players/${application.user.id}`)}
      >
        <Avatar
          name={application.user.fullName}
          url={application.user.avatarUrl}
          size={40}
        />
        <View className='flex-1 gap-0.5'>
          <Text variant='label'>{application.user.fullName}</Text>
          <Text variant='muted'>
            {`${application.user.city}, ${application.user.state}`}
          </Text>
        </View>
      </Pressable>
      <View className='flex-row gap-3'>
        <Meta
          label='Nível'
          value={
            application.sportProfile
              ? categoryLabel(application.sportProfile)
              : 'Não informado'
          }
        />
        <Meta
          label='Rating'
          value={
            application.sportProfile?.rating != null
              ? rating.format(application.sportProfile.rating)
              : 'Sem rating'
          }
        />
        <Meta
          label='Prefere'
          value={
            application.teamIndex
              ? `Time ${application.teamIndex}`
              : 'Qualquer time'
          }
        />
      </View>
      {pending && (
        <View className='gap-2'>
          {match.teamSize === 2 && !full && (
            <View
              className='flex-row rounded-control border border-border bg-card p-1'
              accessibilityRole='radiogroup'
              accessibilityLabel={`Time para ${first}`}
            >
              {teamIndexes.map((index) => {
                const room = teamRoom(match, index);
                const active = chosen === index;
                return (
                  <Pressable
                    key={index}
                    accessibilityRole='radio'
                    accessibilityLabel={`Time ${index} para ${first}`}
                    accessibilityState={{
                      selected: active,
                      checked: active,
                      disabled: room === 0 || busy,
                    }}
                    disabled={room === 0 || busy}
                    onPress={() => setTeam(index)}
                    className={cn(
                      'flex-1 items-center rounded-tiny py-1.5',
                      active && 'bg-brand',
                      room === 0 && 'opacity-40',
                    )}
                  >
                    <Text
                      className={cn(
                        'font-inter-semibold text-sm',
                        active ? 'text-white' : 'text-foreground',
                      )}
                    >
                      {`Time ${index}`}
                    </Text>
                    <Text
                      className={cn(
                        'text-xs',
                        active ? 'text-white' : 'text-muted-foreground',
                      )}
                    >
                      {room === 0
                        ? 'completo'
                        : `${room} ${room === 1 ? 'vaga' : 'vagas'}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <View className='flex-row gap-2'>
            <View className='flex-1'>
              <Button
                label='Aprovar'
                disabled={busy || full}
                onPress={() => onApprove(chosen)}
                accessibilityLabel={`Aprovar ${first}`}
              />
            </View>
            <View className='flex-1'>
              <Button
                variant='secondary'
                label='Recusar'
                disabled={busy}
                onPress={onReject}
                accessibilityLabel={`Recusar ${first}`}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/** Painel do criador: pendentes (aprovar em um time / recusar) e recusadas. */
export function ApplicationsPanel({
  match,
  historyOnly = false,
}: {
  match: MatchDetail;
  historyOnly?: boolean;
}) {
  const [tab, setTab] = useState<'PENDING' | 'DECLINED'>(
    historyOnly ? 'DECLINED' : 'PENDING',
  );
  const pending = useQuery({
    ...applicationsQuery(match.id, 'PENDING'),
    enabled: !historyOnly,
  });
  const declined = useQuery({
    ...applicationsQuery(match.id, 'DECLINED'),
    enabled: historyOnly || tab === 'DECLINED',
  });
  const approve = useMatchMutation(
    ({ id, teamIndex }: { id: string; teamIndex?: TeamIndex }) =>
      approveApplication(match.id, id, teamIndex ? { teamIndex } : {}),
    {
      success: (result) =>
        `${firstName(result.data.user.fullName)} entrou no Time ${result.data.teamIndex}.`,
    },
  );
  const reject = useMatchMutation(
    (id: string) => rejectApplication(match.id, id),
    { success: 'Candidatura recusada.' },
  );
  const busy = approve.isPending || reject.isPending;
  const current = tab === 'PENDING' ? pending : declined;
  const full = match.capacity.available === 0;
  const pendingCount = pending.data?.length ?? 0;
  return (
    <View className='gap-3 rounded-panel border border-border bg-card p-4'>
      <View className='gap-0.5'>
        <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
          {historyOnly ? 'Histórico' : 'Quem quer jogar'}
        </Text>
        <View className='flex-row items-center gap-2'>
          <Text variant='subtitle'>
            {historyOnly ? 'Candidaturas recusadas' : 'Candidaturas'}
          </Text>
          {!historyOnly && pendingCount > 0 && (
            <View className='min-w-6 items-center rounded-pill bg-brand px-1.5 py-0.5'>
              <Text className='font-inter-bold text-xs text-white'>
                {pendingCount}
              </Text>
            </View>
          )}
        </View>
        {!historyOnly && (
          <Text variant='muted'>Você decide quem entra e em qual time.</Text>
        )}
      </View>
      {!historyOnly && (
        <View className='flex-row gap-2'>
          <Chip
            label='Pendentes'
            active={tab === 'PENDING'}
            onPress={() => setTab('PENDING')}
          />
          <Chip
            label='Recusadas'
            active={tab === 'DECLINED'}
            onPress={() => setTab('DECLINED')}
          />
        </View>
      )}
      {!historyOnly && full && tab === 'PENDING' && (
        <View className='rounded-card bg-brand-muted p-3'>
          <Text variant='muted' className='text-brand'>
            Times completos. Se uma vaga abrir, as candidaturas pendentes voltam
            a poder ser aprovadas.
          </Text>
        </View>
      )}
      {current.isPending ? (
        <LoadingState label='Buscando candidaturas…' />
      ) : current.isError ? (
        <ErrorState error={current.error} retry={() => current.refetch()} />
      ) : !current.data.length ? (
        <EmptyState
          icon={<Inbox size={28} color={palette.colors.brand} />}
          title={
            tab === 'PENDING'
              ? 'Nenhuma candidatura pendente'
              : 'Nenhuma candidatura recusada'
          }
          description={
            tab === 'PENDING'
              ? 'Sua partida está visível em Partidas. Quem pedir para entrar aparece aqui.'
              : 'As candidaturas que você recusar ficam registradas aqui.'
          }
        />
      ) : (
        <View className='gap-2'>
          {current.data.map((application) => (
            <ApplicationRow
              key={application.id}
              match={match}
              application={application}
              pending={tab === 'PENDING'}
              busy={busy}
              onApprove={(teamIndex) =>
                approve.mutate({ id: application.id, teamIndex })
              }
              onReject={() => reject.mutate(application.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
