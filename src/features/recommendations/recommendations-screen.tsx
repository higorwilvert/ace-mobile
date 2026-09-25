import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import {
  feedKey,
  feedQuery,
  homeKey,
  noticeKey,
  type Feed,
  type KindError,
} from '@/features/home/api';
import { isKindError, withGeneration } from '@/features/home/schemas';
import { formatLabel, formatWhen } from '@/features/matches/schemas';
import { profilesQuery, sportsQuery } from '@/features/players/api';
import { ApiError } from '@/lib/api-client';
import type { Sport, User } from '@/types/api';

import {
  generateRecommendations,
  type RecommendationKind,
  type RecommendationMeta,
  type RecommendationResponse,
} from './api';
import { MatchSuggestion } from './match-suggestion';
import { PlayerSuggestion } from './player-suggestion';
import { RecommendationForm } from './recommendation-form';
import {
  availabilityNote,
  emptyCopy,
  kindLabels,
  modeLabels,
  recommendationPayload,
  type RecommendationDraft,
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

function FixLinks() {
  const router = useRouter();
  return (
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
    </View>
  );
}

const responseOf = (
  feed: Feed,
  kind: RecommendationKind,
): RecommendationResponse | KindError => {
  if (kind === 'players')
    return isKindError(feed.players)
      ? feed.players
      : { kind: 'players', ...feed.players };
  return isKindError(feed.matches)
    ? feed.matches
    : { kind: 'matches', ...feed.matches };
};
/** Os parâmetros da geração exibida viram o ponto de partida do ajuste. */
const draftOf = (meta: RecommendationMeta): RecommendationDraft => ({
  sportId: String(meta.sportId),
  teamSize: String(meta.teamSize),
  mode: meta.mode,
  limit: String(meta.limit),
  date: '',
  time: '',
  endDate: '',
  endTime: '',
  durationMinutes: '90',
});

/**
 * T38: abre direto na última geração da modalidade (a API só gera de novo o
 * que tem 24 h ou mais). "Atualizar" e "Ajustar busca" são as gerações
 * explícitas de sempre, com auditoria.
 */
function RecommendationFeed({
  kind,
  user,
  sports,
  available,
  initialSportId,
}: {
  kind: RecommendationKind;
  user: User;
  sports: Sport[];
  available: Sport[];
  initialSportId: number;
}) {
  const queryClient = useQueryClient();
  const [sportId, setSportId] = useState(initialSportId);
  const [adjusting, setAdjusting] = useState(false);
  const feed = useQuery(feedQuery(sportId));
  const generate = useMutation({
    mutationFn: generateRecommendations,
    retry: false,
    gcTime: 0,
    onSuccess: (response) => {
      queryClient.setQueryData<Feed>(feedKey(response.meta.sportId), (f) =>
        f ? withGeneration(f, response) : f,
      );
      setSportId(response.meta.sportId);
      setAdjusting(false);
      void queryClient.invalidateQueries({ queryKey: homeKey });
    },
  });
  // Depois de uma candidatura o feed fica marcado como velho: trocar de aba
  // relê a geração (a partida já não volta).
  useEffect(() => {
    if (feed.isStale) void feed.refetch();
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const sport = sports.find((s) => s.id === sportId);
  const response = feed.data ? responseOf(feed.data, kind) : null;
  return (
    <>
      {available.length > 1 && (
        <Chips
          label='Modalidade'
          clearable={false}
          value={String(sportId)}
          onChange={(value) => {
            if (value) setSportId(Number(value));
          }}
          options={available.map((s) => ({
            value: String(s.id),
            label: s.name,
          }))}
        />
      )}
      {feed.isPending ? (
        <LoadingState label='Buscando suas sugestões…' />
      ) : feed.isError ? (
        <ErrorState error={feed.error} retry={() => feed.refetch()} />
      ) : response && isKindError(response) ? (
        <View className='gap-3 rounded-panel border border-border bg-card p-4'>
          <FormError error={new ApiError(response.error.code, 400)} />
          <FixLinks />
        </View>
      ) : response && sport ? (
        <>
          <View className='flex-row gap-3'>
            <View className='flex-1'>
              <Button
                variant='secondary'
                label='Atualizar'
                busy={generate.isPending}
                icon={<RefreshCw size={16} color={brand} />}
                onPress={() =>
                  generate.mutate({
                    kind,
                    body: {
                      sportId,
                      teamSize: response.meta.teamSize,
                      mode: response.meta.mode,
                      limit: response.meta.limit,
                    },
                  })
                }
              />
            </View>
            <View className='flex-1'>
              <Button
                variant='ghost'
                label='Ajustar busca'
                icon={<SlidersHorizontal size={16} color={brand} />}
                onPress={() => setAdjusting(true)}
              />
            </View>
          </View>
          {generate.isError && !adjusting && (
            <View className='gap-2'>
              <FormError error={generate.error} />
              <FixLinks />
            </View>
          )}
          {generate.isPending ? (
            <LoadingState label='Buscando opções compatíveis…' />
          ) : (
            <Results
              key={response.meta.generationId}
              response={response}
              sport={sport}
              user={user}
            />
          )}
          <Sheet
            visible={adjusting}
            title='Ajustar busca'
            onClose={() => setAdjusting(false)}
          >
            <View className='gap-4'>
              <RecommendationForm
                sports={available}
                user={user}
                kind={kind}
                initial={draftOf(response.meta)}
                busy={generate.isPending}
                hasResult={false}
                onSubmit={(values) =>
                  generate.mutate(recommendationPayload(kind, values))
                }
              />
              <FormError error={generate.error} />
            </View>
          </Sheet>
        </>
      ) : null}
    </>
  );
}

/**
 * Aba "Para você" (RF26/RF27, T38): abre na lista, sem formulário na frente.
 * A lista remonta quando o usuário edita o perfil (`updatedAt`): gênero e
 * modalidades mudam as regras.
 */
export function RecommendationsScreen() {
  const { user } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sports = useQuery(sportsQuery);
  const profiles = useQuery(profilesQuery);
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<RecommendationKind>(
    params.kind === 'matches' ? 'matches' : 'players',
  );
  // "Ver todos" do Início chega com ?kind mesmo com a aba já montada:
  // ajusta o estado no render (padrão do React), sem efeito em cascata.
  const [seenParam, setSeenParam] = useState(params.kind);
  if (params.kind !== seenParam) {
    setSeenParam(params.kind);
    if (params.kind === 'players' || params.kind === 'matches')
      setKind(params.kind);
  }
  // Abrir "Para você" é ver as sugestões: o aviso do Início sai.
  useEffect(() => {
    queryClient.setQueryData(noticeKey, null);
  }, [queryClient]);
  if (!user) return null;
  const available =
    sports.data?.filter((s) =>
      profiles.data?.some((p) => p.sportId === s.id),
    ) ?? [];
  const principal =
    profiles.data?.find((p) => p.isPrincipal) ?? profiles.data?.[0];
  const initial =
    available.find((s) => s.id === principal?.sportId) ?? available[0];
  return (
    <Screen
      scroll
      edges={['top']}
      className='gap-5 pt-4'
      onRefresh={() =>
        queryClient.refetchQueries({
          queryKey: ['private', 'recommendations'],
          type: 'active',
        })
      }
    >
      <View className='gap-1'>
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
      ) : initial && sports.data ? (
        <RecommendationFeed
          key={`${user.id}:${user.updatedAt}`}
          kind={kind}
          user={user}
          sports={sports.data}
          available={available}
          initialSportId={initial.id}
        />
      ) : (
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
      )}
    </Screen>
  );
}
