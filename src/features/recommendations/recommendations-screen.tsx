import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Compass, Search, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
} from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import { formatLabel, formatWhen } from '@/features/matches/schemas';
import { profilesQuery, sportsQuery } from '@/features/players/api';
import type { PlayerProfile, Sport, User } from '@/types/api';

import {
  generateRecommendations,
  type RecommendationKind,
  type RecommendationResponse,
} from './api';
import { MatchSuggestion } from './match-suggestion';
import { PlayerSuggestion } from './player-suggestion';
import { RecommendationForm } from './recommendation-form';
import {
  availabilityNote,
  defaultDraft,
  emptyCopy,
  kindLabels,
  modeLabels,
  recommendationPayload,
} from './schemas';
import { GenerationDetails } from './score-details';

const brand = palette.colors.brand;

function Empty({
  response,
  sportId,
}: {
  response: RecommendationResponse;
  sportId: number;
}) {
  const router = useRouter();
  const copy = emptyCopy(response);
  return (
    <EmptyState
      icon={<Search size={28} color={brand} />}
      title={copy.title}
      description={copy.description}
    >
      <View className='w-full gap-2 pt-2'>
        <Button
          variant='secondary'
          label={copy.cta.label}
          onPress={() => router.push(copy.cta.href)}
        />
        <Button
          variant='ghost'
          label='Explorar partidas'
          onPress={() => router.push(`/matches?sportId=${sportId}`)}
        />
      </View>
    </EmptyState>
  );
}

/** Ordem e `totalScore` são os da API; o app só apresenta. */
function Results({
  response,
  sport,
  user,
}: {
  response: RecommendationResponse;
  sport: Sport;
  user: User;
}) {
  const n = response.data.length;
  return (
    <View className='gap-4' accessibilityLabel='Resultados das recomendações'>
      <View className='gap-1'>
        <Text variant='subtitle'>
          {`${n} ${n === 1 ? 'sugestão' : 'sugestões'} para você`}
        </Text>
        <Text variant='muted'>
          {`${sport.name} · ${formatLabel(response.meta.teamSize)} · ${modeLabels[response.meta.mode]} · geradas ${formatWhen(response.meta.generatedAt)}`}
        </Text>
        <Text variant='muted'>{availabilityNote(response)}</Text>
      </View>
      {n === 0 ? (
        <Empty response={response} sportId={sport.id} />
      ) : response.kind === 'players' ? (
        response.data.map((item) => (
          <PlayerSuggestion
            key={item.recommendationId}
            item={item}
            meta={response.meta}
            user={user}
          />
        ))
      ) : (
        response.data.map((item) => (
          <MatchSuggestion
            key={item.recommendationId}
            item={item}
            meta={response.meta}
            sport={sport}
          />
        ))
      )}
      <GenerationDetails meta={response.meta} />
    </View>
  );
}

function RecommendationSearch({
  kind,
  user,
  sports,
  profiles,
}: {
  kind: RecommendationKind;
  user: User;
  sports: Sport[];
  profiles: PlayerProfile[];
}) {
  const router = useRouter();
  const available = sports.filter((s) =>
    profiles.some((p) => p.sportId === s.id),
  );
  const initial = defaultDraft(available, profiles);
  // Gerar grava auditoria na API: mutação sem retry nem cache, só pelo botão.
  const generate = useMutation({
    mutationFn: generateRecommendations,
    retry: false,
    gcTime: 0,
  });
  if (!initial)
    return (
      <EmptyState
        icon={<Users size={28} color={brand} />}
        title='Adicione sua primeira modalidade'
        description='Seu perfil esportivo é o ponto de partida para encontrar jogadores e partidas compatíveis.'
      >
        <View className='w-full pt-2'>
          <Button
            label='Montar perfil esportivo'
            onPress={() => router.push('/sports')}
          />
        </View>
      </EmptyState>
    );
  const sport = generate.data
    ? sports.find((s) => s.id === generate.data.meta.sportId)
    : undefined;
  return (
    <>
      <View className='gap-4 rounded-panel border border-border bg-card p-4'>
        <RecommendationForm
          sports={available}
          user={user}
          kind={kind}
          initial={initial}
          busy={generate.isPending}
          hasResult={Boolean(generate.data)}
          onSubmit={(values) =>
            generate.mutate(recommendationPayload(kind, values))
          }
        />
        <FormError error={generate.error} />
        {generate.isError && (
          <View className='flex-row flex-wrap items-center gap-1'>
            <Pressable
              accessibilityRole='link'
              onPress={() => router.push('/sports')}
            >
              <Text className='font-inter-medium text-sm text-brand'>
                Revisar categoria
              </Text>
            </Pressable>
            <Text variant='muted'>·</Text>
            <Pressable
              accessibilityRole='link'
              onPress={() => router.push('/personal')}
            >
              <Text className='font-inter-medium text-sm text-brand'>
                Revisar gênero
              </Text>
            </Pressable>
            <Text variant='muted'>
              · depois toque em Buscar sugestões de novo.
            </Text>
          </View>
        )}
      </View>
      {generate.isPending ? (
        <LoadingState label='Buscando opções compatíveis…' />
      ) : generate.data && sport ? (
        <Results
          key={generate.data.meta.generationId}
          response={generate.data}
          sport={sport}
          user={user}
        />
      ) : generate.isError ? null : (
        <View className='items-center gap-2 px-4 py-6'>
          <Compass size={28} color={brand} />
          <Text variant='subtitle' className='text-center'>
            Sua próxima conexão começa aqui
          </Text>
          <Text variant='muted' className='text-center'>
            Escolha a modalidade e a composição para gerar sugestões com os
            dados atuais do ACE.
          </Text>
        </View>
      )}
    </>
  );
}

/**
 * Aba "Para você" (RF26/RF27). A busca remonta ao trocar o tipo ou quando o
 * usuário edita o perfil (`updatedAt`): gênero e modalidades mudam as regras.
 */
export function RecommendationsScreen() {
  const { user } = useSession();
  const sports = useQuery(sportsQuery);
  const profiles = useQuery(profilesQuery);
  const [kind, setKind] = useState<RecommendationKind>('players');
  if (!user) return null;
  return (
    <Screen scroll edges={['top']} className='gap-5 pt-4'>
      <View className='gap-1'>
        <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
          Encontre o jogo certo
        </Text>
        <Text variant='title'>
          Para você
          <Text className='font-inter-bold text-2xl text-brand'>.</Text>
        </Text>
        <Text variant='muted'>
          Sugestões pelo seu nível, sua região e seu jeito de jogar. O score
          indica compatibilidade, não chance de vitória.
        </Text>
      </View>
      <Chips
        label='Tipo de recomendação'
        clearable={false}
        value={kind}
        onChange={(value) => {
          if (value) setKind(value);
        }}
        options={[
          { value: 'players', label: kindLabels.players },
          { value: 'matches', label: kindLabels.matches },
        ]}
      />
      {sports.isPending || profiles.isPending ? (
        <LoadingState label='Preparando recomendações…' />
      ) : sports.isError ? (
        <ErrorState error={sports.error} retry={() => sports.refetch()} />
      ) : profiles.isError ? (
        <ErrorState error={profiles.error} retry={() => profiles.refetch()} />
      ) : (
        <RecommendationSearch
          key={`${kind}:${user.id}:${user.updatedAt}`}
          kind={kind}
          user={user}
          sports={sports.data}
          profiles={profiles.data}
        />
      )}
    </Screen>
  );
}
