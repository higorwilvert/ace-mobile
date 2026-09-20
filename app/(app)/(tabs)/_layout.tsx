import { Tabs } from 'expo-router';
import {
  CalendarCheck,
  House,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import palette from '@/config/palette.json';
import { useInboxCount } from '@/hooks/use-inbox-count';

const badgeStyle = {
  backgroundColor: palette.colors.brand,
  color: '#fff',
  fontFamily: 'Inter_600SemiBold',
  fontSize: 10,
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Pendências: convites (T31) na aba Minhas, pedidos de amizade (T33) em Perfil.
  const inbox = useInboxCount();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.colors.brand,
        tabBarInactiveTintColor: palette.colors['muted-foreground'],
        // Altura fixa + inset inferior: sem o espaço vazio que a barra
        // padrão deixa acima dos ícones no iOS.
        tabBarStyle: {
          backgroundColor: palette.colors.card,
          borderTopColor: palette.colors.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarItemStyle: { gap: 2 },
        tabBarIconStyle: { marginBottom: 0 },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
        sceneStyle: { backgroundColor: palette.colors.background },
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <House color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name='for-you'
        options={{
          title: 'Para você',
          tabBarIcon: ({ color }) => <Sparkles color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name='matches'
        options={{
          title: 'Partidas',
          tabBarIcon: ({ color }) => <Trophy color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name='mine'
        options={{
          title: 'Minhas',
          tabBarIcon: ({ color }) => <CalendarCheck color={color} size={22} />,
          tabBarBadge: inbox.label(inbox.invites),
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <UserRound color={color} size={22} />,
          tabBarBadge: inbox.label(inbox.friendRequests),
          tabBarBadgeStyle: badgeStyle,
        }}
      />
    </Tabs>
  );
}
