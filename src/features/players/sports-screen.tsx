import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Star, Trash2, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { toast } from 'sonner-native';

import { SportIcon } from '@/components/ace/sport-icon';
import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { ApiError } from '@/lib/api-client';
import type { PlayerProfile } from '@/types/api';

import {
  deletePlayerProfile,
  profilesQuery,
  savePlayerProfile,
  sportsQuery,
} from './api';
import { frequencyLabel, sideLabels, yearsLabel } from './labels';
import { SportForm } from './sport-form';

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Não foi possível concluir. Tente novamente.';

/** Linha "categoria · lado · tempo · frequência", só com o que foi informado. */
export const profileDetails = (profile: {
  category: { label: string } | null;
  preferredSide: keyof typeof sideLabels | null;
  yearsPracticing: number | null;
  playFrequencyWeek: number | null;
}) =>
  [
    profile.category?.label,
    profile.preferredSide && `Lado: ${sideLabels[profile.preferredSide]}`,
    profile.yearsPracticing !== null && yearsLabel(profile.yearsPracticing),
    profile.playFrequencyWeek !== null &&
      frequencyLabel(profile.playFrequencyWeek),
  ].filter((item): item is string => Boolean(item));

type Editing = { profile?: PlayerProfile } | null;

export function SportsScreen() {
  const queryClient = useQueryClient();
  const profiles = useQuery(profilesQuery);
  const sports = useQuery(sportsQuery);
  const [editing, setEditing] = useState<Editing>(null);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: profilesQuery.queryKey });
  // Só o campo promovido: a API rebaixa o principal anterior na transação.
  const promote = useMutation({
    mutationFn: (id: string) => savePlayerProfile({ isPrincipal: true }, id),
    onSuccess: async () => {
      await invalidate();
      toast.success('Esporte principal atualizado.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: deletePlayerProfile,
    onSuccess: async () => {
      await invalidate();
      toast.success('Modalidade removida.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const confirmRemove = (profile: PlayerProfile) =>
    Alert.alert(
      `Remover ${profile.sport.name}?`,
      'Seu rating e seu histórico nesta modalidade ficam preservados. Você pode adicioná-la de novo quando quiser.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => remove.mutate(profile.id),
        },
      ],
    );

  if (profiles.isPending || sports.isPending) return <LoadingState />;
  if (profiles.isError)
    return (
      <ErrorState error={profiles.error} retry={() => profiles.refetch()} />
    );
  if (sports.isError)
    return <ErrorState error={sports.error} retry={() => sports.refetch()} />;

  const owned = new Set(profiles.data.map((profile) => profile.sportId));
  const missing = sports.data.filter((sport) => !owned.has(sport.id));
  const sorted = [...profiles.data].sort(
    (a, b) => Number(b.isPrincipal) - Number(a.isPrincipal),
  );
  return (
    <Screen scroll edges={['bottom']} className='gap-5 pt-4'>
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Trophy size={28} color={palette.colors.brand} />}
          title='Nenhuma modalidade ainda'
          description='Adicione o esporte que você pratica para ter categoria, rating e recomendações.'
        />
      ) : (
        <View className='gap-3'>
          {sorted.map((profile) => (
            <View
              key={profile.id}
              className='gap-3 rounded-panel border border-border bg-card p-4'
            >
              <View className='flex-row items-center gap-3'>
                <SportIcon slug={profile.sport.slug} />
                <View className='flex-1 gap-0.5'>
                  <View className='flex-row items-center gap-2'>
                    <Text variant='subtitle'>{profile.sport.name}</Text>
                    {profile.isPrincipal && (
                      <View className='flex-row items-center gap-1 rounded-pill bg-brand-light px-2 py-0.5'>
                        <Star size={12} color={palette.colors.brand} />
                        <Text className='font-inter-medium text-xs text-brand'>
                          Principal
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text variant='muted'>
                    {profileDetails(profile).join(' · ') || 'Sem detalhes'}
                  </Text>
                </View>
              </View>
              <View className='flex-row items-center gap-2'>
                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel={`Editar ${profile.sport.name}`}
                  className='h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-control bg-brand-muted active:opacity-80'
                  onPress={() => setEditing({ profile })}
                >
                  <Pencil size={16} color={palette.colors.brand} />
                  <Text className='font-inter-medium text-sm text-brand'>
                    Editar
                  </Text>
                </Pressable>
                {!profile.isPrincipal && (
                  <Pressable
                    accessibilityRole='button'
                    className='h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-control bg-brand-muted active:opacity-80'
                    disabled={promote.isPending}
                    onPress={() => promote.mutate(profile.id)}
                  >
                    <Star size={16} color={palette.colors.brand} />
                    <Text className='font-inter-medium text-sm text-brand'>
                      Tornar principal
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel={`Excluir ${profile.sport.name}`}
                  hitSlop={6}
                  className='h-10 w-10 items-center justify-center rounded-control bg-destructive-soft active:opacity-80'
                  onPress={() => confirmRemove(profile)}
                >
                  <Trash2 size={16} color={palette.colors.destructive} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
      {missing.length > 0 ? (
        <Button
          label='Adicionar modalidade'
          icon={<Plus size={18} color='#ffffff' />}
          onPress={() => setEditing({})}
        />
      ) : (
        <Text variant='muted' className='text-center'>
          Você já tem perfil em todas as modalidades disponíveis.
        </Text>
      )}
      <Sheet
        visible={editing !== null}
        title={editing?.profile ? 'Editar modalidade' : 'Nova modalidade'}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <SportForm
            sports={editing.profile ? sports.data : missing}
            profile={editing.profile}
            onSaved={() => {
              setEditing(null);
              toast.success(
                editing.profile
                  ? 'Modalidade atualizada.'
                  : 'Modalidade adicionada.',
              );
            }}
          />
        )}
      </Sheet>
    </Screen>
  );
}
