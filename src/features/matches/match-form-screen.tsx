import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleDot, Globe, Lock, Save, Send } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef } from 'react';
import {
  FormProvider,
  useController,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { toast } from 'sonner-native';
import { z } from 'zod';

import { FormPickerField, FormTextField } from '@/components/ace/form-fields';
import { SportIcon } from '@/components/ace/sport-icon';
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
import { profilesQuery, sportsQuery } from '@/features/players/api';
import { availablePolicies, categoryOptions } from '@/features/players/labels';
import { useZodForm } from '@/hooks/use-zod-form';
import { ApiError } from '@/lib/api-client';
import { citiesQuery, isUf, matchesCity } from '@/lib/locations';
import { cn } from '@/lib/utils';
import type { PlayerProfile, Sport, User } from '@/types/api';

import {
  createMatch,
  type MatchDetail,
  matchKeys,
  matchQuery,
  type TeamIndex,
  updateMatch,
} from './api';
import { FormatChoice } from './court-board';
import { MatchUnavailable } from './match-detail-screen';
import {
  dateOptions,
  durationOptions,
  formatLabel,
  type MatchFormOutput,
  matchFormDefaults,
  matchFormSchema,
  matchPayload,
  matchPermissions,
  timeOptions,
  UF_OPTIONS,
} from './schemas';

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <View className='gap-3 rounded-panel border border-border bg-card p-4'>
      <View className='flex-row items-center gap-2'>
        <View className='h-6 w-6 items-center justify-center rounded-full bg-brand'>
          <Text className='font-inter-bold text-xs text-white'>{step}</Text>
        </View>
        <Text variant='subtitle'>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Fields({
  user,
  sports,
  profiles,
  match,
}: {
  user: User;
  sports: Sport[];
  profiles: PlayerProfile[];
  match?: MatchDetail;
}) {
  const router = useRouter();
  const { control, getValues, setValue } = useFormContext();
  const sportField = useController({ control, name: 'sportId' });
  const sizeField = useController({ control, name: 'teamSize' });
  const visibilityField = useController({ control, name: 'visibility' });
  const sportId = Number(sportField.field.value);
  const sport = sports.find((s) => s.id === sportId);
  const size = Number(sizeField.field.value);
  const state = String(useWatch({ control, name: 'state' }) ?? '');
  const date = String(useWatch({ control, name: 'date' }) ?? '');
  const time = String(useWatch({ control, name: 'time' }) ?? '');
  const cities = useQuery(citiesQuery(state));
  // Trocar de estado invalida a cidade escolhida (a atual segue válida).
  const initialState = useRef(state);
  useEffect(() => {
    if (state !== initialState.current) {
      initialState.current = state;
      setValue('city', '', { shouldDirty: true });
    }
  }, [state, setValue]);

  const policyOptions = availablePolicies(user.gender, size);
  if (match && !policyOptions.some((o) => o.value === match.genderPolicy))
    policyOptions.unshift({
      value: match.genderPolicy,
      label: 'Composição atual da partida',
    });
  const mine = sports.filter((s) => profiles.some((p) => p.sportId === s.id));
  const canChangeFormat = match
    ? matchPermissions(match).canChangeFormat
    : true;
  const categories = [
    { value: '', label: 'Qualquer' },
    ...categoryOptions(sport),
  ];
  const brand = palette.colors.brand;

  return (
    <>
      <Section step={1} title='Modalidade e formato'>
        {canChangeFormat ? (
          <>
            <Chips
              label='Modalidade da partida'
              clearable={false}
              value={sportId ? String(sportId) : undefined}
              onChange={(value) => {
                const id = Number(value);
                sportField.field.onChange(id);
                setValue('minCategoryCode', '', { shouldDirty: true });
                setValue('maxCategoryCode', '', { shouldDirty: true });
                const next = sports.find((s) => s.id === id);
                const current = Number(getValues('teamSize'));
                if (
                  next &&
                  ((current === 1 && !next.supportsSingles) ||
                    (current === 2 && !next.supportsDoubles))
                )
                  setValue('teamSize', next.defaultTeamSize, {
                    shouldDirty: true,
                  });
              }}
              options={mine.map((s) => ({
                value: String(s.id),
                label: s.name,
                icon: <SportIcon slug={s.slug} size={18} />,
              }))}
            />
            {sportField.fieldState.error && (
              <Text variant='error' accessibilityRole='alert'>
                {sportField.fieldState.error.message}
              </Text>
            )}
            {mine.length < sports.length && (
              <Pressable
                accessibilityRole='link'
                onPress={() => router.push('/sports')}
              >
                <Text variant='muted'>
                  Você cria partidas nas modalidades do seu perfil.{' '}
                  <Text className='font-inter-medium text-sm text-brand'>
                    Adicionar modalidade
                  </Text>
                </Text>
              </Pressable>
            )}
            <FormatChoice
              sport={sport}
              value={(size === 1 ? 1 : 2) as TeamIndex}
              onChange={(next) => {
                sizeField.field.onChange(next);
                if (next === 1 && getValues('genderPolicy') === 'MIXED')
                  setValue('genderPolicy', '', { shouldDirty: true });
              }}
            />
            {sizeField.fieldState.error && (
              <Text variant='error' accessibilityRole='alert'>
                {sizeField.fieldState.error.message}
              </Text>
            )}
          </>
        ) : (
          <View className='flex-row items-start gap-2 rounded-card bg-muted p-3'>
            <Lock size={15} color={palette.colors['muted-foreground']} />
            <View className='flex-1 gap-0.5'>
              <Text variant='label'>
                {`${match?.sport.name} · ${formatLabel(match?.teamSize ?? 2)}`}
              </Text>
              <Text variant='muted'>
                Modalidade e formato não mudam depois que outros jogadores
                entram.
              </Text>
            </View>
          </View>
        )}
        <FormPickerField
          name='genderPolicy'
          label='Composição da partida'
          placeholder='Escolha quem pode jogar'
          options={policyOptions}
          disabled={!canChangeFormat}
          hint='Mista: um homem e uma mulher em cada dupla. Composição livre: qualquer gênero.'
        />
        {(!user.gender ||
          user.gender === 'NOT_SPECIFIED' ||
          user.gender === 'NON_BINARY') && (
          <Pressable
            accessibilityRole='link'
            onPress={() => router.push('/personal')}
          >
            <Text variant='muted'>
              Com seu perfil atual, você cria jogos de composição livre.{' '}
              <Text className='font-inter-medium text-sm text-brand'>
                Editar gênero
              </Text>
            </Text>
          </Pressable>
        )}
      </Section>

      <Section step={2} title='Quando'>
        <FormPickerField
          name='date'
          label='Data'
          options={dateOptions(new Date(), date)}
          searchable
        />
        <View className='flex-row gap-3'>
          <View className='flex-1'>
            <FormPickerField
              name='time'
              label='Horário'
              options={timeOptions(time)}
              searchable
            />
          </View>
          <View className='flex-1'>
            <FormPickerField
              name='durationMinutes'
              label='Duração'
              options={durationOptions}
            />
          </View>
        </View>
      </Section>

      <Section step={3} title='Onde'>
        <View className='flex-row gap-3'>
          <View className='w-28'>
            <FormPickerField
              name='state'
              label='Estado'
              placeholder='UF'
              options={UF_OPTIONS}
            />
          </View>
          <View className='flex-1'>
            <FormPickerField
              name='city'
              label='Cidade'
              placeholder={
                isUf(state) ? 'Escolha a cidade' : 'Escolha o estado primeiro'
              }
              disabled={!isUf(state)}
              loading={cities.isLoading}
              searchable
              filter={(option, term) => matchesCity(option.label, term)}
              options={(cities.data ?? []).map((city) => ({
                value: city,
                label: city,
              }))}
            />
          </View>
        </View>
        <FormTextField
          name='locationText'
          label='Local'
          placeholder='Quadra 2 do Parque Ramiro Ruediger'
          hint='Nome da arena, clube ou endereço'
          maxLength={255}
        />
      </Section>

      <Section step={4} title='Detalhes'>
        <FormTextField
          name='title'
          label='Título (opcional)'
          placeholder='Ex.: Padel de sábado'
          maxLength={120}
        />
        <FormTextField
          name='description'
          label='Descrição (opcional)'
          placeholder='Combine o ritmo, o que levar, como chegar…'
          maxLength={2000}
          multiline
        />
        <View className='flex-row gap-3'>
          <View className='flex-1'>
            <FormPickerField
              name='minCategoryCode'
              label='Categoria mínima'
              options={categories}
            />
          </View>
          <View className='flex-1'>
            <FormPickerField
              name='maxCategoryCode'
              label='Categoria máxima'
              options={categories}
            />
          </View>
        </View>
        <View className='gap-1.5'>
          <Text variant='label'>Visibilidade</Text>
          <View className='gap-2' accessibilityRole='radiogroup'>
            {[
              {
                value: 'PUBLIC',
                Icon: Globe,
                title: 'Pública',
                text: 'Aparece em Partidas e recebe candidaturas.',
              },
              {
                value: 'PRIVATE',
                Icon: Lock,
                title: 'Privada',
                text: 'Só quem você convidar vê a partida.',
              },
            ].map(({ value, Icon, title, text }) => {
              const selected = visibilityField.field.value === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole='radio'
                  accessibilityLabel={`Visibilidade ${title}`}
                  accessibilityState={{ selected, checked: selected }}
                  onPress={() => visibilityField.field.onChange(value)}
                  className={cn(
                    'flex-row items-center gap-3 rounded-card border p-3',
                    selected ? 'border-brand bg-brand-muted' : 'border-border',
                  )}
                >
                  <Icon
                    size={18}
                    color={
                      selected ? brand : palette.colors['muted-foreground']
                    }
                  />
                  <View className='flex-1 gap-0.5'>
                    <Text variant='label'>{title}</Text>
                    <Text variant='muted'>{text}</Text>
                  </View>
                  <View
                    className={cn(
                      'h-5 w-5 items-center justify-center rounded-full border-2',
                      selected ? 'border-brand' : 'border-input',
                    )}
                  >
                    {selected && (
                      <View className='h-2.5 w-2.5 rounded-full bg-brand' />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Section>
    </>
  );
}

/** Formulário compartilhado por criação e edição. */
export function MatchForm({
  sports,
  profiles,
  user,
  match,
  onSaved,
}: {
  sports: Sport[];
  profiles: PlayerProfile[];
  user: User;
  match?: MatchDetail;
  onSaved: (match: MatchDetail) => void;
}) {
  const queryClient = useQueryClient();
  const form = useZodForm(
    matchFormSchema(sports),
    matchFormDefaults({ user, profiles, sports, match }),
  );
  const mutation = useMutation({
    mutationFn: async ({
      values,
      status,
    }: {
      values: MatchFormOutput;
      status: 'OPEN' | 'DRAFT';
    }) => {
      if (match) {
        const payload = matchPayload(values, { original: match });
        if (!Object.keys(payload).length) return match;
        return (await updateMatch(match.id, payload)).data;
      }
      return (await createMatch(matchPayload(values, { status }))).data;
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(matchKeys.detail(saved.id), saved);
      await queryClient.invalidateQueries({ queryKey: matchKeys.all });
      onSaved(saved);
    },
  });
  const submit = (status: 'OPEN' | 'DRAFT') =>
    void form.handleSubmit((values) => mutation.mutate({ values, status }))();
  const pendingStatus = mutation.isPending ? mutation.variables.status : null;
  const editing = !!match;
  return (
    <FormProvider {...form}>
      <Screen scroll edges={['bottom']} className='gap-4 pt-4'>
        <View className='gap-1'>
          <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
            {editing ? 'Ajustes de jogo' : 'Nova partida'}
          </Text>
          <Text variant='title'>
            {editing ? 'Ajuste a partida.' : 'Marque a próxima partida.'}
          </Text>
          <Text variant='muted'>
            {editing
              ? 'As mudanças valem na hora para quem já está na partida.'
              : 'Escolha o esporte, o formato, quando e onde. Você aprova quem entra.'}
          </Text>
        </View>
        <Fields sports={sports} profiles={profiles} match={match} user={user} />
        <FormError error={mutation.error} />
        <View className='gap-2 pb-4'>
          {editing ? (
            <Button
              label='Salvar alterações'
              busy={mutation.isPending}
              busyLabel='Salvando…'
              icon={<Save size={16} color='#fff' />}
              onPress={() => submit('OPEN')}
            />
          ) : (
            <>
              <Button
                label='Publicar partida'
                busy={pendingStatus === 'OPEN'}
                busyLabel='Publicando…'
                disabled={mutation.isPending}
                icon={<Send size={16} color='#fff' />}
                onPress={() => submit('OPEN')}
              />
              <Button
                variant='secondary'
                label='Salvar como rascunho'
                busy={pendingStatus === 'DRAFT'}
                busyLabel='Salvando…'
                disabled={mutation.isPending}
                icon={<Save size={16} color={palette.colors.brand} />}
                onPress={() => submit('DRAFT')}
              />
            </>
          )}
        </View>
      </Screen>
    </FormProvider>
  );
}

function useFormDeps() {
  const sports = useQuery(sportsQuery);
  const profiles = useQuery(profilesQuery);
  const { user } = useSession();
  return { sports, profiles, user };
}

export function CreateMatchScreen() {
  const { sports, profiles, user } = useFormDeps();
  const router = useRouter();
  if (sports.isPending || profiles.isPending || !user)
    return <LoadingState label='Preparando o formulário…' />;
  if (sports.isError || profiles.isError)
    return (
      <ErrorState
        error={sports.error ?? profiles.error}
        retry={() => {
          void sports.refetch();
          void profiles.refetch();
        }}
      />
    );
  return (
    <MatchForm
      sports={sports.data}
      profiles={profiles.data}
      user={user}
      onSaved={(saved) => {
        toast.success(
          saved.status === 'DRAFT'
            ? 'Rascunho salvo. Publique quando quiser.'
            : 'Partida publicada. Agora é só esperar as candidaturas.',
        );
        router.replace(`/matches/${saved.id}`);
      }}
    />
  );
}

export function EditMatchScreen() {
  const { matchId = '' } = useLocalSearchParams<{ matchId: string }>();
  const { sports, profiles, user } = useFormDeps();
  const valid = z.string().uuid().safeParse(matchId).success;
  const match = useQuery({ ...matchQuery(matchId), enabled: valid });
  const router = useRouter();
  if (!valid) return <MatchUnavailable />;
  if (sports.isPending || profiles.isPending || match.isPending || !user)
    return <LoadingState label='Abrindo a partida…' />;
  if (
    match.isError &&
    match.error instanceof ApiError &&
    match.error.status === 404
  )
    return <MatchUnavailable />;
  if (sports.isError || profiles.isError || match.isError)
    return (
      <ErrorState
        error={sports.error ?? profiles.error ?? match.error}
        retry={() => {
          void sports.refetch();
          void profiles.refetch();
          void match.refetch();
        }}
      />
    );
  const permissions = matchPermissions(match.data);
  if (!permissions.canEdit)
    return (
      <Screen edges={['bottom']} className='justify-center'>
        <EmptyState
          icon={<CircleDot size={28} color={palette.colors.brand} />}
          title='Esta partida não pode mais ser editada'
          description={
            permissions.lockedReason ??
            'Só quem organiza a partida pode editá-la, e apenas enquanto ela está aberta.'
          }
        >
          <Button label='Ver a partida' onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  return (
    <MatchForm
      sports={sports.data}
      profiles={profiles.data}
      user={user}
      match={match.data}
      onSaved={() => {
        toast.success('Partida atualizada.');
        router.back();
      }}
    />
  );
}
