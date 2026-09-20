import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  CalendarDays,
  ChevronRight,
  CircleDot,
  MapPin,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { SportIcon } from '@/components/ace/sport-icon';
import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import {
  matchQuery,
  myMatchesQuery,
  type TeamIndex,
} from '@/features/matches/api';
import { SlotDots } from '@/features/matches/court-board';
import {
  formatShort,
  formatWhen,
  matchTitle,
  placeLabel,
} from '@/features/matches/schemas';
import type { GenderPolicy, PublicUser } from '@/types/api';

import { InviteComposer } from './invite-composer';

/** Busca de origem quando o convite parte de uma recomendação (T32). */
export type InviteScope = {
  sportId: number;
  teamSize: TeamIndex;
  genderPolicy: GenderPolicy;
};

/**
 * Convite a partir do perfil de um jogador (ou de uma recomendação): escolhe
 * uma das minhas partidas abertas (futuras, com vaga) e segue para time e
 * mensagem. O detalhe da partida escolhida é carregado para mostrar as vagas
 * por time.
 */
export function InviteToMatchSheet({
  player,
  visible,
  onClose,
  scope,
}: {
  player: PublicUser;
  visible: boolean;
  onClose: () => void;
  scope?: InviteScope;
}) {
  const router = useRouter();
  const [matchId, setMatchId] = useState<string | null>(null);
  // Instante fixado na montagem: o filtro não precisa mudar a cada render.
  const [now] = useState(() => Date.now());
  const matches = useInfiniteQuery({
    ...myMatchesQuery({ role: 'creator', status: 'OPEN' }),
    enabled: visible,
  });
  const candidates = (
    matches.data?.pages.flatMap((page) => page.data) ?? []
  ).filter(
    (m) =>
      new Date(m.scheduledAt).getTime() > now &&
      m.capacity.available > 0 &&
      // Vinda de uma recomendação, a partida oferecida precisa casar com a
      // busca (modalidade, formato, composição); a API revalida no envio.
      (!scope ||
        (m.sportId === scope.sportId &&
          m.teamSize === scope.teamSize &&
          m.genderPolicy === scope.genderPolicy)),
  );
  const detail = useQuery({
    ...matchQuery(matchId ?? ''),
    enabled: visible && matchId !== null,
  });
  const close = () => {
    onClose();
    setMatchId(null);
  };
  const muted = palette.colors['muted-foreground'];
  return (
    <Sheet
      visible={visible}
      title={matchId ? 'Convidar jogador' : 'Convidar para qual partida?'}
      onClose={close}
    >
      {matchId ? (
        detail.isPending ? (
          <LoadingState label='Abrindo a partida…' />
        ) : detail.isError ? (
          <ErrorState
            error={detail.error}
            retry={() => void detail.refetch()}
          />
        ) : (
          <InviteComposer
            match={detail.data}
            player={player}
            onBack={() => setMatchId(null)}
            onSent={close}
          />
        )
      ) : matches.isPending ? (
        <LoadingState label='Buscando suas partidas…' />
      ) : matches.isError ? (
        <ErrorState
          error={matches.error}
          retry={() => void matches.refetch()}
        />
      ) : candidates.length === 0 ? (
        <EmptyState
          icon={<CircleDot size={28} color={palette.colors.brand} />}
          title='Nenhuma partida aberta para convidar'
          description={
            scope
              ? 'Crie uma partida com a modalidade, o formato e a composição desta busca e volte aqui para convidar este jogador.'
              : 'Crie uma partida aberta (ou libere uma vaga) e volte aqui para chamar este jogador.'
          }
        >
          <View className='w-full gap-2 pt-2'>
            <Button
              label='Criar partida'
              onPress={() => {
                close();
                router.push('/matches/new');
              }}
            />
            {matches.hasNextPage && (
              <Button
                variant='secondary'
                label='Carregar mais'
                busy={matches.isFetchingNextPage}
                onPress={() => void matches.fetchNextPage()}
              />
            )}
          </View>
        </EmptyState>
      ) : (
        <View className='gap-2 pb-2'>
          <Text variant='muted'>
            {scope
              ? 'Só partidas que você organiza com a mesma modalidade, formato e composição da busca. A elegibilidade é verificada no envio.'
              : 'Só partidas abertas, futuras e com vaga aparecem aqui.'}
          </Text>
          {candidates.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole='button'
              accessibilityLabel={`Convidar para ${matchTitle(m)}`}
              className='flex-row items-center gap-3 rounded-card border border-border bg-background p-3 active:bg-brand-muted'
              onPress={() => setMatchId(m.id)}
            >
              <SportIcon slug={m.sport.slug} size={36} />
              <View className='flex-1 gap-0.5'>
                <Text variant='label' numberOfLines={1}>
                  {matchTitle(m)}
                </Text>
                <Text variant='muted'>
                  {`${m.sport.name} · ${formatShort(m.teamSize)}`}
                </Text>
                <View className='flex-row items-center gap-1.5'>
                  <CalendarDays size={13} color={muted} />
                  <Text variant='muted'>{formatWhen(m.scheduledAt)}</Text>
                </View>
                <View className='flex-row items-center gap-1.5'>
                  <MapPin size={13} color={muted} />
                  <Text variant='muted' numberOfLines={1} className='flex-1'>
                    {placeLabel(m)}
                  </Text>
                </View>
                <SlotDots
                  teamSize={m.teamSize}
                  confirmed={m.capacity.confirmed}
                />
              </View>
              <ChevronRight size={18} color={muted} />
            </Pressable>
          ))}
          {matches.hasNextPage && (
            <Button
              variant='secondary'
              label='Carregar mais'
              busy={matches.isFetchingNextPage}
              onPress={() => void matches.fetchNextPage()}
            />
          )}
        </View>
      )}
    </Sheet>
  );
}
