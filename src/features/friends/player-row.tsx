import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { SportIcon } from '@/components/ace/sport-icon';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import type { PublicUser } from '@/types/api';

/**
 * Linha/cartão de jogador reutilizada em busca, amigos, pedidos e listas de
 * terceiros. As ações (`children`) ficam numa linha própria, abaixo, para
 * não espremer o nome em telas estreitas.
 */
export function PlayerRow({
  user,
  sports = [],
  isPrivate = false,
  meta,
  children,
  linked = true,
}: {
  user: PublicUser;
  sports?: { id: number; slug: string; name: string }[];
  isPrivate?: boolean;
  meta?: string;
  children?: ReactNode;
  linked?: boolean;
}) {
  const router = useRouter();
  const muted = palette.colors['muted-foreground'];
  return (
    <View className='gap-3 rounded-panel border border-border bg-card p-3'>
      <Pressable
        accessibilityRole={linked ? 'button' : undefined}
        accessibilityLabel={user.fullName}
        disabled={!linked}
        className='flex-row items-center gap-3 active:opacity-70'
        onPress={() => router.push(`/players/${user.id}`)}
      >
        <Avatar name={user.fullName} url={user.avatarUrl} size={44} />
        <View className='flex-1 gap-0.5'>
          <View className='flex-row items-center gap-1.5'>
            <Text variant='label' numberOfLines={1} className='shrink'>
              {user.fullName}
            </Text>
            {isPrivate && (
              <View
                accessible
                accessibilityRole='image'
                accessibilityLabel='Perfil privado'
              >
                <Lock size={12} color={muted} />
              </View>
            )}
          </View>
          <Text variant='muted' numberOfLines={1}>
            {`${user.city} · ${user.state}${meta ? ` · ${meta}` : ''}`}
          </Text>
        </View>
        {sports.length > 0 && (
          <View className='flex-row gap-1' accessibilityLabel='Modalidades'>
            {sports.map((sport) => (
              <View
                key={sport.id}
                accessible
                accessibilityRole='image'
                accessibilityLabel={sport.name}
              >
                <SportIcon slug={sport.slug} size={22} />
              </View>
            ))}
          </View>
        )}
      </Pressable>
      {children && (
        <View className='flex-row items-center justify-end gap-2'>
          {children}
        </View>
      )}
    </View>
  );
}
