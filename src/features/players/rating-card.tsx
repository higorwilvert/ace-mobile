import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { SportIcon } from '@/components/ace/sport-icon';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { formatWhen } from '@/features/matches/schemas';
import type { RatingChange } from '@/features/results/api';
import {
  ratingDelta,
  ratingDeltaLabel,
  ratingNumber,
} from '@/features/results/schemas';
import type { PublicProfile } from '@/types/api';

import { categoryLabel } from './labels';

type SportProfile = PublicProfile['sportProfiles'][number];

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className='flex-1 items-center rounded-card bg-muted py-2'>
      <Text className='font-inter-bold text-lg'>{String(value)}</Text>
      <Text variant='muted'>{label}</Text>
    </View>
  );
}

/**
 * Rating atual de uma modalidade (`player_ratings`, via perfil). RD e σ
 * ficam sob "Entender os números": são os valores persistidos pela API,
 * nenhum cálculo acontece aqui.
 */
export function RatingCard({ profile }: { profile: SportProfile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { rating } = profile;
  const brand = palette.colors.brand;
  return (
    <View className='gap-3 rounded-panel border border-border bg-card p-4'>
      <View className='flex-row items-center gap-3'>
        <SportIcon slug={profile.sport.slug} size={40} />
        <View className='flex-1 gap-0.5'>
          <Text variant='subtitle'>{profile.sport.name}</Text>
          <Text variant='muted'>
            {`Categoria declarada: ${categoryLabel(profile)}`}
          </Text>
        </View>
      </View>
      {rating ? (
        <>
          <View className='flex-row items-end gap-2'>
            <Text
              className='font-inter-bold text-3xl leading-9 text-brand'
              accessibilityLabel={`Rating ${ratingNumber(rating.rating)}`}
            >
              {ratingNumber(rating.rating)}
            </Text>
            <Text variant='muted' className='pb-1'>
              Rating ACE · Glicko-2
            </Text>
          </View>
          <Text variant='muted'>
            {rating.matchesPlayed === 0
              ? 'Estimativa inicial · sem resultados processados'
              : `${rating.matchesPlayed} ${rating.matchesPlayed === 1 ? 'partida processada' : 'partidas processadas'}`}
          </Text>
          <View className='flex-row gap-2'>
            <Stat value={rating.wins} label='Vitórias' />
            <Stat value={rating.losses} label='Derrotas' />
            <Stat value={rating.draws} label='Empates' />
          </View>
          <Pressable
            accessibilityRole='button'
            accessibilityState={{ expanded: open }}
            className='flex-row items-center justify-between py-1'
            onPress={() => setOpen(!open)}
          >
            <Text className='font-inter-medium text-sm text-brand'>
              Entender os números
            </Text>
            {open ? (
              <ChevronUp size={16} color={brand} />
            ) : (
              <ChevronDown size={16} color={brand} />
            )}
          </Pressable>
          {open && (
            <View className='gap-2'>
              <Text variant='muted'>
                RD:{' '}
                <Text className='font-inter-semibold text-sm text-foreground'>
                  {ratingNumber(rating.rd)}
                </Text>
                . Mede a incerteza: quanto menor, mais precisa é a estimativa.
                Pode aumentar com a inatividade.
              </Text>
              <Text variant='muted'>
                Volatilidade (σ):{' '}
                <Text className='font-inter-semibold text-sm text-foreground'>
                  {String(rating.volatility)}
                </Text>
                . Representa a variação esperada do desempenho.
              </Text>
              <Text variant='muted'>
                A escala de rating pertence ao ACE. Ela não é uma classificação
                oficial da modalidade nem equivale à nota numérica do
                pickleball.
              </Text>
            </View>
          )}
        </>
      ) : (
        <Text variant='muted'>Rating ainda indisponível.</Text>
      )}
      {!profile.category && (
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
    </View>
  );
}

/** Folha "Detalhes do processamento": valores antes/depois registrados pela API (T11). */
export function RatingChangeDetails({ change }: { change: RatingChange }) {
  const delta = ratingDelta(change);
  const rows: [string, string][] = [
    ['Rating registrado', `${change.ratingBefore} → ${change.ratingAfter}`],
    ['Desvio (RD)', `${change.rdBefore} → ${change.rdAfter}`],
    [
      'Volatilidade (σ)',
      `${change.volatilityBefore} → ${change.volatilityAfter}`,
    ],
    ['Versão do algoritmo', change.algorithmVersion],
    ['Processado em', formatWhen(change.processedAt)],
  ];
  return (
    <View className='gap-3 pb-2'>
      <Text variant='subtitle'>
        {`Rating ${ratingNumber(change.ratingBefore)} → ${ratingNumber(change.ratingAfter)}`}
      </Text>
      <Text
        className='font-inter-semibold text-base'
        style={{
          color:
            delta >= 0 ? palette.colors.success : palette.colors.destructive,
        }}
      >
        {`${ratingDeltaLabel(change)} pontos`}
      </Text>
      {rows.map(([label, value]) => (
        <View key={label} className='flex-row justify-between gap-3'>
          <Text variant='muted'>{label}</Text>
          <Text
            className='flex-1 text-right font-inter-medium text-sm'
            selectable
          >
            {value}
          </Text>
        </View>
      ))}
      <Text variant='muted'>
        Valores registrados pela API. A diferença exibida é o rating depois
        menos o rating antes da partida.
      </Text>
    </View>
  );
}
