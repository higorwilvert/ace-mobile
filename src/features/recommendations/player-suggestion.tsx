import { useRouter } from 'expo-router';
import { MapPin, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { TierTag } from '@/components/ace/tier-badge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { InviteToMatchSheet } from '@/features/invites/invite-to-match-sheet';
import type { User } from '@/types/api';

import type { RecommendationMeta, RecommendedPlayer } from './api';
import { scopePolicy } from './schemas';
import { ScoreDetails, ScoreHeader } from './score-details';

/**
 * Jogador recomendado (RF26): quem é, quão compatível e por quê. "Convidar"
 * abre a folha de convite já restrita às minhas partidas com a modalidade,
 * o formato e a composição desta busca. Só os 5 campos públicos do jogador.
 */
export function PlayerSuggestion({
  item,
  meta,
  user,
}: {
  item: RecommendedPlayer;
  meta: RecommendationMeta;
  user: User;
}) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const { player } = item;
  return (
    <View className='gap-4 rounded-panel border border-border bg-card p-4'>
      <Pressable
        accessibilityRole='link'
        accessibilityLabel={`Ver perfil de ${player.fullName}`}
        className='flex-row items-center gap-3 active:opacity-80'
        onPress={() => router.push(`/players/${player.id}`)}
      >
        <Avatar name={player.fullName} url={player.avatarUrl} size={48} />
        <View className='flex-1 gap-0.5'>
          <Text variant='subtitle' numberOfLines={1}>
            {player.fullName}
          </Text>
          <View className='flex-row items-center gap-1'>
            <MapPin size={13} color={palette.colors['muted-foreground']} />
            <Text variant='muted'>{`${player.city}, ${player.state}`}</Text>
          </View>
          <View className='flex-row items-center gap-2 pt-1'>
            <TierTag tier={item.tier} size={22} />
            {item.tier.provisional && (
              <View className='rounded-pill bg-muted px-2.5 py-0.5'>
                <Text className='font-inter-medium text-xs text-muted-foreground'>
                  Estimativa inicial
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
      <ScoreHeader item={item} meta={meta} />
      <Button
        label='Convidar para jogar'
        icon={<Send size={16} color='#ffffff' />}
        onPress={() => setInviting(true)}
      />
      {meta.mode === 'SAME_GENDER' && user.gender === 'NON_BINARY' && (
        <Text variant='muted'>
          Para convidar, escolha uma partida de composição livre.
        </Text>
      )}
      <ScoreDetails item={item} meta={meta} />
      <InviteToMatchSheet
        player={player}
        visible={inviting}
        onClose={() => setInviting(false)}
        scope={{
          sportId: meta.sportId,
          teamSize: meta.teamSize,
          genderPolicy: scopePolicy(meta.mode, user.gender),
        }}
      />
    </View>
  );
}
