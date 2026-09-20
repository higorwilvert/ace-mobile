import { type Href, useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CalendarClock,
  ChevronRight,
  History,
  type LucideIcon,
  Settings,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ace/avatar';
import { Logo } from '@/components/ace/logo';
import { SLANT, SlantPanel } from '@/components/ace/slant-shell';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import { useInboxCount } from '@/hooks/use-inbox-count';

const items: { label: string; hint: string; href: Href; Icon: LucideIcon }[] = [
  {
    label: 'Dados pessoais',
    hint: 'Nome, cidade, foto e bio',
    href: '/personal',
    Icon: UserRound,
  },
  {
    label: 'Meus esportes',
    hint: 'Modalidades, categoria e principal',
    href: '/sports',
    Icon: Trophy,
  },
  {
    label: 'Disponibilidade',
    hint: 'Seus horários na semana',
    href: '/availability',
    Icon: CalendarClock,
  },
  {
    label: 'Rating e evolução',
    hint: 'Glicko-2 por modalidade e por partida',
    href: '/rating',
    Icon: TrendingUp,
  },
  {
    label: 'Histórico e totais',
    hint: 'Vitórias, derrotas e placares',
    href: '/history',
    Icon: History,
  },
  {
    label: 'Jogadores e amigos',
    hint: 'Buscar, pedidos e sua rede',
    href: '/players',
    Icon: Users,
  },
  {
    label: 'Conta',
    hint: 'Senha, privacidade e desativação',
    href: '/account',
    Icon: Settings,
  },
];

export function ProfileMenuScreen() {
  const { user } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // As abas ficam montadas juntas: só a aba em foco dita a barra de status.
  const focused = useIsFocused();
  // Pedidos de amizade pendentes (T33) ficam visíveis já no menu.
  const inbox = useInboxCount();
  if (!user) return null;
  // Sete itens + painel navy passam da altura do celular: rola, como o SlantShell.
  return (
    <ScrollView
      className='flex-1 bg-background'
      contentContainerClassName='pb-8'
      showsVerticalScrollIndicator={false}
    >
      {focused && <StatusBar style='light' />}
      {/* Única faixa navy do app autenticado, com a diagonal do perfil do web. */}
      <SlantPanel
        className='items-center gap-3 px-5'
        style={{ paddingTop: insets.top + 12, paddingBottom: SLANT + 28 }}
      >
        <View className='w-full flex-row'>
          <Logo width={64} color='#ffffff' />
        </View>
        <Avatar name={user.fullName} url={user.avatarUrl} size={84} />
        <View className='items-center gap-0.5'>
          <Text className='font-inter-semibold text-xl text-white'>
            {user.fullName}
          </Text>
          <Text className='text-sm text-brand-light'>
            {`${user.city} · ${user.state}`}
          </Text>
        </View>
      </SlantPanel>
      <View className='gap-2 px-5' style={{ marginTop: -SLANT + 8 }}>
        {items.map(({ label, hint, href, Icon }) => {
          const badge =
            href === '/players' ? inbox.label(inbox.friendRequests) : undefined;
          return (
            <Pressable
              key={label}
              accessibilityRole='button'
              className='flex-row items-center gap-3 rounded-panel border border-border bg-card p-4 active:bg-brand-muted'
              onPress={() => router.push(href)}
            >
              <View className='h-10 w-10 items-center justify-center rounded-card bg-brand-muted'>
                <Icon size={20} color={palette.colors.brand} />
              </View>
              <View className='flex-1 gap-0.5'>
                <Text variant='label'>{label}</Text>
                <Text variant='muted'>{hint}</Text>
              </View>
              {badge && (
                <View className='min-w-6 items-center rounded-pill bg-brand px-2 py-0.5'>
                  <Text className='font-inter-semibold text-xs text-white'>
                    {badge}
                  </Text>
                </View>
              )}
              <ChevronRight
                size={18}
                color={palette.colors['muted-foreground']}
              />
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
