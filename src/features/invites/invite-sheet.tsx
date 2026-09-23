import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import palette from '@/config/palette.json';
import { friendsQuery } from '@/features/friends/api';
import type { MatchDetail, TeamIndex } from '@/features/matches/api';
import { searchPlayersQuery } from '@/features/players/api';
import type { PublicUser } from '@/types/api';

import { InviteComposer } from './invite-composer';

/** Linha de jogador da folha: convida com um toque ou explica por que não. */
function Row({
  player,
  reason,
  onPick,
}: {
  player: PublicUser;
  reason: string | null;
  onPick: (player: PublicUser) => void;
}) {
  return (
    <View className='flex-row items-center gap-3 rounded-card border border-border bg-background p-3'>
      <Avatar name={player.fullName} url={player.avatarUrl} size={40} />
      <View className='flex-1 gap-0.5'>
        <Text variant='label' numberOfLines={1}>
          {player.fullName}
        </Text>
        <Text variant='muted'>{`${player.city}, ${player.state}`}</Text>
      </View>
      {reason ? (
        <Text variant='muted'>{reason}</Text>
      ) : (
        <Button
          className='h-10 px-3'
          label='Convidar'
          accessibilityLabel={`Convidar ${player.fullName}`}
          icon={<UserPlus size={15} color='#fff' />}
          onPress={() => onPick(player)}
        />
      )}
    </View>
  );
}

/**
 * Convite a partir da partida (organizador): antes de digitar, os amigos
 * (T33) ficam à mão; a busca pelo nome — só quem tem perfil na modalidade —
 * segue para time e mensagem. Quem já está na partida aparece marcado em vez
 * de ganhar um convite que a API negaria.
 */
export function InviteSheet({
  match,
  visible,
  initialTeamIndex,
  onClose,
}: {
  match: MatchDetail;
  visible: boolean;
  initialTeamIndex?: TeamIndex;
  onClose: () => void;
}) {
  const [term, setTerm] = useState('');
  const [picked, setPicked] = useState<PublicUser | null>(null);
  const inMatch = new Set(
    match.teams.flatMap((team) => team.participants.map((p) => p.user.id)),
  );
  const reasonFor = (player: PublicUser) =>
    player.id === match.creator.id
      ? 'Você'
      : inMatch.has(player.id)
        ? 'Já está na partida'
        : null;
  const search = searchPlayersQuery(term, match.sportId);
  const results = useQuery({ ...search, enabled: visible && search.enabled });
  // Amigos sem perfil na modalidade ainda aparecem: a API recusa o convite e
  // o compositor mostra o motivo (mesma regra do web).
  const friends = useInfiniteQuery({
    ...friendsQuery('me'),
    enabled: visible && !search.enabled,
  });
  const friendItems = friends.data?.pages[0]?.data ?? [];
  const close = () => {
    onClose();
    setPicked(null);
    setTerm('');
  };
  const muted = palette.colors['muted-foreground'];
  return (
    <Sheet
      visible={visible}
      title={picked ? 'Convidar jogador' : 'Quem você quer chamar?'}
      onClose={close}
    >
      {picked ? (
        <InviteComposer
          match={match}
          player={picked}
          initialTeamIndex={initialTeamIndex}
          onBack={() => setPicked(null)}
          onSent={close}
        />
      ) : (
        <View className='gap-3 pb-2'>
          <TextField
            label='Nome do jogador'
            placeholder='Ex.: Bruno'
            value={term}
            onChangeText={setTerm}
            autoFocus
            autoCorrect={false}
            autoCapitalize='words'
            returnKeyType='search'
            maxLength={100}
            hint={`Só jogadores com perfil em ${match.sport.name} aparecem.`}
          />
          {!search.enabled ? (
            <View className='gap-3'>
              <View className='flex-row items-start gap-2'>
                <Search size={16} color={muted} />
                <Text variant='muted' className='flex-1'>
                  Digite ao menos duas letras para buscar.
                </Text>
              </View>
              {friends.isPending ? (
                <ActivityIndicator color={palette.colors.brand} />
              ) : friendItems.length > 0 ? (
                <>
                  <Text variant='label'>Seus amigos</Text>
                  {friendItems.map((friend) => (
                    <Row
                      key={friend.user.id}
                      player={friend.user}
                      reason={reasonFor(friend.user)}
                      onPick={setPicked}
                    />
                  ))}
                </>
              ) : (
                // Erro na lista de amigos é silencioso: a busca segue funcionando.
                !friends.isError && (
                  <Text variant='muted'>
                    Seus amigos aparecem aqui quando você adicionar alguém.
                  </Text>
                )
              )}
            </View>
          ) : results.isPending ? (
            <LoadingState label='Buscando jogadores…' />
          ) : results.isError ? (
            <ErrorState
              error={results.error}
              retry={() => void results.refetch()}
            />
          ) : results.data.length === 0 ? (
            <EmptyState
              title='Nenhum jogador encontrado'
              description='Confira a grafia do nome ou tente outro trecho.'
            />
          ) : (
            results.data.map((player) => (
              <Row
                key={player.id}
                player={player}
                reason={reasonFor(player)}
                onPick={setPicked}
              />
            ))
          )}
        </View>
      )}
    </Sheet>
  );
}
