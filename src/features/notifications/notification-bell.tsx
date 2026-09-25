import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import palette from '@/config/palette.json';

import { unreadCountQuery } from './api';

/** Sininho do Início (T41): abre a caixa de notificações. */
export function NotificationBell() {
  const unread = useQuery(unreadCountQuery).data ?? 0;
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={
        unread ? `Notificações, ${unread} não lidas` : 'Notificações'
      }
      hitSlop={8}
      onPress={() => router.push('/notifications')}
      className='h-10 w-10 items-center justify-center rounded-full bg-card active:opacity-70'
    >
      <Bell size={22} color={palette.colors.foreground} />
      {unread > 0 && (
        <View className='absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1'>
          <Text className='font-inter-semibold text-[10px] text-white'>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
