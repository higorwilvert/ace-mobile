import { useRouter, type Href } from 'expo-router';
import {
  CalendarClock,
  ChevronRight,
  CircleDot,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { SportIcon } from '@/components/ace/sport-icon';
import { TierTag } from '@/components/ace/tier-badge';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { ActivityFeed } from '@/features/activity/activity-feed';
import { InviteCard } from '@/features/invites/invite-card';
import { formatWhen, matchTitle } from '@/features/matches/schemas';
import { exactNumber } from '@/features/players/division-card';
import {
  formatScore,
  recommendationReasons,
} from '@/features/recommendations/schemas';
import { firstName } from '@/lib/utils';
import type { PublicUser, User } from '@/types/api';

import type { Home } from './api';
import {
  generatedLabel,
  noticeText,
  pendingCount,
  teamLabel,
  type KindErrors,
  type Notice,
} from './schemas';

const brand = palette.colors.brand;
const muted = palette.colors['muted-foreground'];
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: { label: string; href: Href };
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <View className='gap-3 rounded-panel border border-border bg-card p-4'>
      <View className='flex-row items-center justify-between gap-3'>
        <View className='flex-1 flex-row items-center gap-2'>
          <Text variant='subtitle'>{title}</Text>
          {count !== undefined && (
            <View className='rounded-tiny bg-muted px-2 py-0.5'>
              <Text className='font-inter-semibold text-xs text-navy'>
                {String(count)}
              </Text>
            </View>
          )}
        </View>
        {action && (
          <Pressable
            accessibilityRole='link'
            hitSlop={12}
            onPress={() => router.push(action.href)}
          >
            <Text className='font-inter-medium text-sm text-brand'>
              {action.label}
            </Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View className='rounded-pill bg-brand-muted px-2.5 py-1'>
      <Text className='font-inter-semibold text-xs text-brand'>{label}</Text>
    </View>
  );
}

function Row({
  label,
  href,
  icon,
  title,
  detail,
  spokenExtra,
  trailing,
  children,
}: {
  label: string;
  href: Href;
  icon?: ReactNode;
  title: string;
  detail?: string;
  /** Texto dos `children` para o leitor de tela (ex.: os times). */
  spokenExtra?: string;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  const router = useRouter();
  // Leitor de tela ouve a ação e o conteúdo da linha, não só a ação.
  const spoken = [
    ...new Set([label, title, detail, spokenExtra].filter(Boolean)),
  ];
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={spoken.join('. ')}
      className='min-h-12 flex-row items-center gap-3 rounded-card bg-background px-3 py-2.5 active:opacity-80'
      onPress={() => router.push(href)}
    >
      {icon}
      <View className='flex-1 gap-0.5'>
        <Text variant='label' numberOfLines={2}>
          {title}
        </Text>
        {detail ? (
          <Text variant='muted' numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
        {children}
      </View>
      {trailing ?? <ChevronRight size={18} color={muted} />}
    </Pressable>
  );
}

function Faces({ players }: { players: PublicUser[] }) {
  return (
    <View className='flex-row' importantForAccessibility='no-hide-descendants'>
      {players.slice(0, 2).map((p, i) => (
        <Avatar
          key={p.id}
          name={p.fullName}
          url={p.avatarUrl}
          size={26}
          className={i ? '-ml-2 border-2 border-card' : 'border-2 border-card'}
        />
      ))}
    </View>
  );
}

function Heading({ home, viewer }: { home: Home; viewer: User }) {
  const p = home.principal;
  return (
    <View className='gap-1.5'>
      <Text variant='title'>{`Olá, ${firstName(viewer.fullName)}.`}</Text>
      <View className='flex-row flex-wrap items-center gap-x-2 gap-y-1'>
        {p && (
          <>
            <SportIcon slug={p.sport.slug} size={22} />
            <Text variant='muted'>{p.sport.name}</Text>
            {p.tier && <TierTag tier={p.tier} size={18} />}
            {p.rating !== null && (
              <Text className='font-inter-semibold text-sm text-brand'>
                {`Rating ${exactNumber(Math.round(p.rating))}`}
              </Text>
            )}
            <Text variant='muted'>·</Text>
          </>
        )}
        <Text variant='muted'>{`${viewer.city}, ${viewer.state}`}</Text>
      </View>
    </View>
  );
}

function SuggestionNotice({
  notice,
  sportName,
  onDismiss,
}: {
  notice: Notice;
  sportName: string;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const text = noticeText(notice, sportName);
  return (
    <View
      accessibilityLiveRegion='polite'
      className='flex-row items-center gap-3 rounded-panel border border-brand bg-brand-muted p-4'
    >
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={`${text.title}. Ver sugestões`}
        className='flex-1 flex-row items-center gap-3 active:opacity-80'
        onPress={() => router.push('/for-you')}
      >
        <View className='h-11 w-11 items-center justify-center rounded-card bg-brand'>
          <Sparkles size={22} color='#ffffff' />
        </View>
        <View className='flex-1 gap-0.5'>
          <Text variant='label'>{text.title}</Text>
          <Text variant='muted'>{text.detail}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Dispensar aviso'
        hitSlop={14}
        className='h-8 w-8 items-center justify-center active:opacity-60'
        onPress={onDismiss}
      >
        <X size={18} color={muted} />
      </Pressable>
    </View>
  );
}

function NextMatch({ home, viewerId }: { home: Home; viewerId: string }) {
  const next = home.nextMatch;
  const others = home.upcomingCount - (next ? 1 : 0);
  const side = (index: number) => {
    const players = next?.teams.find((t) => t.teamIndex === index)?.players;
    return players?.length ? teamLabel(players, viewerId) : 'vagas abertas';
  };
  return (
    <Section
      title='Próxima partida'
      action={{ label: 'Ver agenda', href: '/mine' }}
    >
      {next ? (
        <>
          <Row
            label={`Abrir ${matchTitle(next.match)}`}
            href={`/matches/${next.match.id}`}
            icon={<SportIcon slug={next.match.sport.slug} size={44} />}
            title={matchTitle(next.match)}
            detail={`${formatWhen(next.match.scheduledAt)} · ${next.match.arena?.name ?? next.match.locationText ?? next.match.city}`}
            spokenExtra={`${side(1)} contra ${side(2)}`}
          >
            <View className='flex-row flex-wrap items-center gap-x-2 gap-y-1 pt-1'>
              {[1, 2].map((index) => {
                const players =
                  next.teams.find((t) => t.teamIndex === index)?.players ?? [];
                return (
                  <View key={index} className='flex-row items-center gap-1.5'>
                    {index === 2 && (
                      <Text className='font-inter-semibold text-sm text-navy'>
                        ×
                      </Text>
                    )}
                    <Faces players={players} />
                    <Text variant='muted'>{side(index)}</Text>
                  </View>
                );
              })}
            </View>
          </Row>
          {others > 0 && (
            <Text variant='muted'>
              {`+${others} ${others === 1 ? 'outra marcada' : 'outras marcadas'}`}
            </Text>
          )}
        </>
      ) : (
        <Row
          label='Explorar partidas'
          href='/matches'
          icon={<CircleDot size={20} color={brand} />}
          title='Nenhuma partida confirmada'
          detail={
            others > 0
              ? `Você está em ${plural(others, 'partida aberta', 'partidas abertas')} aguardando jogadores.`
              : 'Explore as partidas abertas na sua cidade ou crie a sua.'
          }
        />
      )}
    </Section>
  );
}

function Pending({ home, viewerId }: { home: Home; viewerId: string }) {
  const { pending } = home;
  const total = pendingCount(pending) + (home.principal ? 0 : 1);
  if (total === 0) return null;
  return (
    <Section title='Pendências' count={total}>
      {pending.invites.map((invite) => (
        <InviteCard key={invite.id} invite={invite} viewerId={viewerId} />
      ))}
      {pending.invitesTotal > pending.invites.length && (
        <Row
          label='Ver todos os convites'
          href='/mine?view=invites&box=received'
          title={`Ver os ${pending.invitesTotal} convites`}
        />
      )}
      {!home.principal && (
        <Row
          label='Monte seu perfil esportivo'
          href='/sports'
          icon={<CircleDot size={20} color={brand} />}
          title='Monte seu perfil esportivo'
          detail='Sem modalidade, o ACE não calcula rating nem sugestões.'
          trailing={<Pill label='Adicionar' />}
        />
      )}
      {!pending.availability && (
        <Row
          label='Definir horários'
          href='/availability'
          icon={<CalendarClock size={20} color={brand} />}
          title='Cadastre quando você pode jogar'
          detail='Sem horários, o ACE não recomenda partidas.'
          trailing={<Pill label='Definir' />}
        />
      )}
      {pending.applications.map(({ match, pendingCount: n }) => (
        <Row
          key={match.id}
          label={`Revisar ${plural(n, 'candidatura', 'candidaturas')} em ${matchTitle(match)}`}
          href={`/matches/${match.id}`}
          icon={<Users size={20} color={brand} />}
          title={plural(n, 'candidatura', 'candidaturas')}
          detail={`${matchTitle(match)} · ${formatWhen(match.scheduledAt)}`}
          trailing={<Pill label='Revisar' />}
        />
      ))}
      {pending.friendRequests > 0 && (
        <Row
          label={`Ver ${plural(pending.friendRequests, 'pedido de amizade', 'pedidos de amizade')}`}
          href='/players?view=requests'
          icon={<UserPlus size={20} color={brand} />}
          title={plural(
            pending.friendRequests,
            'pedido de amizade',
            'pedidos de amizade',
          )}
          detail='Alguém quer entrar na sua rede.'
          trailing={<Pill label='Ver' />}
        />
      )}
      {pending.results.length > 0 && (
        <>
          <Text variant='label' className='pt-1 text-navy'>
            Aguardando placar
          </Text>
          {pending.results.map((match) => (
            <Row
              key={match.id}
              label={`Registrar placar de ${matchTitle(match)}`}
              href={`/matches/${match.id}/result`}
              icon={<SportIcon slug={match.sport.slug} size={32} />}
              title={matchTitle(match)}
              detail={`${formatWhen(match.scheduledAt)} · ${match.city}`}
              trailing={<Pill label='Registrar placar' />}
            />
          ))}
        </>
      )}
    </Section>
  );
}

function Suggestions({
  home,
  refreshing,
  errors,
}: {
  home: Home;
  refreshing: boolean;
  errors: KindErrors;
}) {
  const router = useRouter();
  const s = home.suggestions;
  const sportName = home.principal?.sport.name;
  if (!s || !sportName) return null;
  const { players, matches } = s;
  const generatedAt = [players?.meta.generatedAt, matches?.meta.generatedAt]
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);
  const seeAll = (kind: 'players' | 'matches', label: string) => (
    <Pressable
      accessibilityRole='link'
      hitSlop={10}
      className='self-start'
      onPress={() => router.push(`/for-you?kind=${kind}`)}
    >
      <Text className='font-inter-medium text-sm text-brand'>{label}</Text>
    </Pressable>
  );
  return (
    <Section title='Sugestões para você'>
      <Text variant='muted' className='-mt-2'>
        {`${sportName}${generatedAt ? ` · geradas ${generatedLabel(generatedAt)}` : ''}`}
      </Text>
      {refreshing && (
        <View className='flex-row items-center gap-2'>
          <ActivityIndicator color={brand} />
          <Text variant='muted'>Atualizando sugestões…</Text>
        </View>
      )}
      <Text variant='label' className='text-navy'>
        Jogadores
      </Text>
      {errors.players ? (
        <Text variant='muted'>{errors.players}</Text>
      ) : players && players.data.length ? (
        players.data.map((item) => (
          <Row
            key={item.recommendationId}
            label={`${item.player.fullName}, compatibilidade ${formatScore(item.totalScore)}`}
            href={`/players/${item.player.id}`}
            icon={
              <Avatar
                name={item.player.fullName}
                url={item.player.avatarUrl}
                size={40}
              />
            }
            title={item.player.fullName}
            detail={
              recommendationReasons(item, players.meta.weights)[0] ??
              `${item.player.city}, ${item.player.state}`
            }
            trailing={
              <Text className='font-inter-bold text-base text-brand'>
                {formatScore(item.totalScore)}
              </Text>
            }
          >
            <View className='pt-0.5'>
              <TierTag tier={item.tier} size={16} />
            </View>
          </Row>
        ))
      ) : (
        !refreshing && (
          <Text variant='muted'>Nenhum jogador compatível agora.</Text>
        )
      )}
      {players &&
        players.total > players.data.length &&
        seeAll('players', `Ver ${players.total} jogadores`)}
      <Text variant='label' className='pt-1 text-navy'>
        Partidas
      </Text>
      {errors.matches ? (
        <Text variant='muted'>{errors.matches}</Text>
      ) : matches && matches.data.length ? (
        matches.data.map((item) => (
          <Row
            key={item.recommendationId}
            label={`${
              item.match.title ??
              `${sportName} · ${item.match.teamSize}v${item.match.teamSize}`
            }, compatibilidade ${formatScore(item.totalScore)}`}
            href={`/matches/${item.match.id}`}
            icon={<Trophy size={20} color={brand} />}
            title={
              item.match.title ??
              `${sportName} · ${item.match.teamSize}v${item.match.teamSize}`
            }
            detail={`${formatWhen(item.match.scheduledAt)} · ${plural(item.match.capacity.available, 'vaga', 'vagas')}`}
            trailing={
              <Text className='font-inter-bold text-base text-brand'>
                {formatScore(item.totalScore)}
              </Text>
            }
          />
        ))
      ) : (
        !refreshing && (
          <Text variant='muted'>Nenhuma partida compatível agora.</Text>
        )
      )}
      {seeAll(
        'matches',
        matches && matches.total > matches.data.length
          ? `Ver ${matches.total} partidas`
          : 'Abrir Para você',
      )}
    </Section>
  );
}

/** Início como feed (T38): só apresenta o que `GET /users/me/home` agregou. */
export function HomeSections({
  home,
  viewer,
  notice,
  refreshing,
  errors,
  onDismissNotice,
}: {
  home: Home;
  viewer: User;
  notice: Notice | null;
  refreshing: boolean;
  errors: KindErrors;
  onDismissNotice: () => void;
}) {
  return (
    <>
      <Heading home={home} viewer={viewer} />
      {notice && home.principal && (
        <SuggestionNotice
          notice={notice}
          sportName={home.principal.sport.name}
          onDismiss={onDismissNotice}
        />
      )}
      <NextMatch home={home} viewerId={viewer.id} />
      <Pending home={home} viewerId={viewer.id} />
      <Suggestions home={home} refreshing={refreshing} errors={errors} />
      <ActivityFeed viewerId={viewer.id} />
    </>
  );
}
