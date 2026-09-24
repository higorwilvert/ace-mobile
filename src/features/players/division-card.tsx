import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Star, TrendingUp } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { SportIcon } from '@/components/ace/sport-icon';
import { ErrorState, LoadingState } from '@/components/ace/states';
import { TierBadge } from '@/components/ace/tier-badge';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import type { SportTotals } from '@/features/results/api';
import { cn } from '@/lib/utils';
import type { PublicProfile, RatingTier } from '@/types/api';

import { ratingTiersQuery } from './api';
import { categoryLabel } from './labels';
import { profileDetails } from './sports-screen';

type SportProfile = PublicProfile['sportProfiles'][number];

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

// pt-BR sem Intl (Hermes): "1.672,418".
export function exactNumber(value: number) {
  const [int, dec] = String(Math.abs(value)).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}${grouped}${dec ? `,${dec}` : ''}`;
}
const wholeNumber = (value: number) => exactNumber(Math.round(value));

/** "1.500 a 1.600", "abaixo de 1.000", "2.000 ou mais". */
export function tierRange({
  minRating,
  maxRating,
}: Pick<RatingTier, 'minRating' | 'maxRating'>) {
  if (minRating === null) return `abaixo de ${wholeNumber(maxRating!)}`;
  if (maxRating === null) return `${wholeNumber(minRating)} ou mais`;
  return `${wholeNumber(minRating)} a ${wholeNumber(maxRating)}`;
}

/** Mesmo disclosure de "Por que esta recomendação?". */
function Disclosure({
  title,
  initiallyOpen = false,
  children,
}: {
  title: string;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View className='gap-3'>
      <Pressable
        accessibilityRole='button'
        accessibilityState={{ expanded: open }}
        className='flex-row items-center justify-between py-1 active:opacity-70'
        onPress={() => setOpen(!open)}
      >
        <Text className='font-inter-medium text-sm text-brand'>{title}</Text>
        {open ? (
          <ChevronUp size={16} color={palette.colors.brand} />
        ) : (
          <ChevronDown size={16} color={palette.colors.brand} />
        )}
      </Pressable>
      {open && children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className='flex-row justify-between gap-3'>
      <Text variant='muted'>{label}</Text>
      <Text className='flex-1 text-right font-inter-medium text-sm' selectable>
        {value}
      </Text>
    </View>
  );
}

/** Linha com barra, no formato dos fatores da recomendação. */
function Factor({
  label,
  hint,
  percent,
  a11yLabel,
}: {
  label: string;
  hint: string;
  percent: number;
  a11yLabel: string;
}) {
  return (
    <View className='gap-1'>
      <View className='flex-row items-baseline justify-between'>
        <View className='flex-row items-baseline gap-1.5'>
          <Text variant='label'>{label}</Text>
          <Text variant='muted'>{hint}</Text>
        </View>
        <Text variant='label'>{`${percent}%`}</Text>
      </View>
      <View
        className='h-1.5 overflow-hidden rounded-pill bg-muted'
        accessible
        accessibilityRole='progressbar'
        accessibilityLabel={a11yLabel}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
      >
        <View
          className='h-full rounded-pill bg-brand'
          style={{ width: `${percent}%` }}
        />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Text variant='muted'>
      <Text className='font-inter-semibold text-sm text-foreground'>
        {String(value)}
      </Text>
      {` ${label}`}
    </Text>
  );
}

/**
 * Divisão ACE de uma modalidade: emblema, divisão e rating, progresso até a
 * próxima e confiança (RD apresentado como 1 − RD/350, vindo da API), V/D/E do
 * resumo do histórico (RF25) e os números do Glicko-2 nos detalhes técnicos.
 */
export function DivisionCard({
  profile,
  record,
  own = false,
  evolutionLink = false,
  technicalOpen = false,
}: {
  profile: SportProfile;
  record?: SportTotals;
  own?: boolean;
  evolutionLink?: boolean;
  technicalOpen?: boolean;
}) {
  const router = useRouter();
  const { rating } = profile;
  const tier = rating?.tier;
  return (
    <View className='gap-4 rounded-panel border border-border bg-card p-4'>
      <View className='gap-1'>
        <View className='flex-row items-center gap-2'>
          <SportIcon slug={profile.sport.slug} size={28} />
          <Text variant='subtitle' className='shrink'>
            {profile.sport.name}
          </Text>
          {profile.isPrincipal && (
            <View className='flex-row items-center gap-1 rounded-pill bg-brand-muted px-2.5 py-1'>
              <Star size={11} color={palette.colors.brand} />
              <Text className='font-inter-medium text-xs text-brand'>
                Principal
              </Text>
            </View>
          )}
        </View>
        <Text variant='muted'>
          {profileDetails(profile).join(' · ') || categoryLabel(profile)}
        </Text>
      </View>
      {rating && tier ? (
        <>
          <View className='flex-row items-center gap-4'>
            <TierBadge tier={tier} size={76} />
            <View className='flex-1 gap-1.5'>
              <Text variant='title'>{tier.label}</Text>
              <View className='flex-row flex-wrap items-center gap-x-2 gap-y-1'>
                <Text variant='muted'>
                  {'Rating '}
                  <Text className='font-inter-semibold text-sm text-foreground'>
                    {wholeNumber(rating.rating)}
                  </Text>
                </Text>
                {tier.provisional ? (
                  <View className='rounded-pill bg-muted px-2.5 py-0.5'>
                    <Text className='font-inter-medium text-xs text-muted-foreground'>
                      Estimativa inicial
                    </Text>
                  </View>
                ) : (
                  <Text variant='muted'>
                    {plural(
                      rating.matchesPlayed,
                      'partida processada',
                      'partidas processadas',
                    )}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <View className='gap-3'>
            <Factor
              label={tier.next ? `Até ${tier.next.label}` : 'Divisão mais alta'}
              hint={
                tier.next
                  ? `faltam ${wholeNumber(tier.pointsToNext!)} pontos`
                  : 'topo da escala'
              }
              percent={Math.round(tier.progress * 100)}
              a11yLabel={`Progresso em ${tier.label}`}
            />
            <Factor
              label='Confiança'
              hint='sobe a cada resultado'
              percent={Math.round(rating.confidence * 100)}
              a11yLabel='Confiança na divisão'
            />
          </View>
          <View className='flex-row flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3'>
            <Stat
              value={record?.wins ?? 0}
              label={record?.wins === 1 ? 'vitória' : 'vitórias'}
            />
            <Stat
              value={record?.losses ?? 0}
              label={record?.losses === 1 ? 'derrota' : 'derrotas'}
            />
            <Stat
              value={record?.draws ?? 0}
              label={record?.draws === 1 ? 'empate' : 'empates'}
            />
          </View>
          {own && !profile.category && (
            <Pressable
              accessibilityRole='link'
              onPress={() => router.push('/sports')}
            >
              <Text variant='muted'>
                <Text className='font-inter-medium text-sm text-brand'>
                  Defina sua categoria
                </Text>{' '}
                para completar o perfil esportivo.
              </Text>
            </Pressable>
          )}
          <Disclosure title='Detalhes técnicos' initiallyOpen={technicalOpen}>
            <View className='gap-2'>
              <Row label='Rating' value={exactNumber(rating.rating)} />
              <Row label='Desvio (RD)' value={exactNumber(rating.rd)} />
              <Row
                label='Volatilidade (σ)'
                value={exactNumber(rating.volatility)}
              />
              <Row
                label='Confiança (1 − RD/350)'
                value={exactNumber(rating.confidence)}
              />
              <Row label={`Limites de ${tier.label}`} value={tierRange(tier)} />
              <Row
                label='Versões'
                value={`${rating.algorithmVersion} · ${tier.version}`}
              />
            </View>
            <Text variant='muted'>
              A confiança mostra quanto o ACE já conhece o nível nesta
              modalidade: começa baixa, cresce a cada resultado e volta a cair
              depois de muito tempo sem jogar. A divisão só apresenta o rating;
              o cálculo do Glicko-2 não muda por causa dela.
            </Text>
          </Disclosure>
          {evolutionLink && (
            <Pressable
              accessibilityRole='link'
              className='flex-row items-center gap-1 self-start py-1 active:opacity-70'
              onPress={() => router.push('/rating')}
            >
              <TrendingUp size={16} color={palette.colors.brand} />
              <Text className='font-inter-medium text-sm text-brand'>
                Ver evolução do rating
              </Text>
            </Pressable>
          )}
        </>
      ) : own ? (
        <Pressable
          accessibilityRole='link'
          onPress={() => router.push('/sports')}
        >
          <Text variant='muted'>
            Ainda sem divisão.{' '}
            <Text className='font-inter-medium text-sm text-brand'>
              Defina sua categoria
            </Text>{' '}
            para receber a estimativa inicial.
          </Text>
        </Pressable>
      ) : (
        <Text variant='muted'>Ainda sem divisão nesta modalidade.</Text>
      )}
    </View>
  );
}

/** As 12 divisões, da mais alta à mais baixa, com a atual marcada. */
export function DivisionLadder({
  sportId,
  current,
}: {
  sportId: number;
  current?: RatingTier;
}) {
  const tiers = useQuery(ratingTiersQuery(sportId));
  if (tiers.isPending) return <LoadingState label='Buscando as divisões…' />;
  if (tiers.isError)
    return <ErrorState error={tiers.error} retry={() => tiers.refetch()} />;
  return (
    <View accessibilityLabel='Divisões ACE' className='gap-0.5'>
      {[...tiers.data.tiers].reverse().map((tier) => {
        const here = tier.code === current?.code;
        return (
          <View
            key={tier.code}
            accessibilityState={{ selected: here }}
            className={cn(
              'flex-row items-center gap-3 rounded-control px-2.5 py-1.5',
              here && 'bg-brand-muted',
            )}
          >
            <TierBadge tier={tier} size={30} />
            <Text
              className={cn(
                'flex-1 text-sm',
                here ? 'font-inter-semibold text-brand' : 'font-inter-medium',
              )}
            >
              {tier.label}
            </Text>
            <Text
              className={cn(
                'text-xs',
                here
                  ? 'font-inter-semibold text-brand'
                  : 'text-muted-foreground',
              )}
            >
              {here ? 'Você está aqui' : tierRange(tier)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
