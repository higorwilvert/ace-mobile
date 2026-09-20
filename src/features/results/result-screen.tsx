import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Trash2, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { z } from 'zod';

import { SportIcon, sportColors } from '@/components/ace/sport-icon';
import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import palette from '@/config/palette.json';
import {
  type MatchDetail,
  matchQuery,
  type TeamIndex,
} from '@/features/matches/api';
import { MatchUnavailable } from '@/features/matches/match-detail-screen';
import {
  formatWhen,
  matchPermissions,
  matchTitle,
} from '@/features/matches/schemas';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

import { recordResult } from './api';
import {
  deriveOutcome,
  describeOutcome,
  emptySet,
  MAX_SETS,
  resultFormSchema,
  resultPayload,
  type SetFormValues,
  teamName,
  teamPlayers,
} from './schemas';
import { useResultMutation } from './use-result-mutation';

function ScoreInput({
  label,
  value,
  invalid,
  small = false,
  editable,
  onChangeText,
}: {
  label: string;
  value: string;
  invalid: boolean;
  small?: boolean;
  editable: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      keyboardType='number-pad'
      maxLength={2}
      selectTextOnFocus
      className={cn(
        'rounded-control border bg-card text-center font-inter-bold',
        invalid ? 'border-destructive' : 'border-input',
        small ? 'h-10 w-12 text-base' : 'h-14 w-16 text-2xl',
      )}
      style={{ color: palette.colors.foreground, paddingVertical: 0 }}
    />
  );
}

function TeamHeader({
  match,
  index,
}: {
  match: MatchDetail;
  index: TeamIndex;
}) {
  const { bg, ink } = sportColors(match.sport.slug);
  return (
    <View
      className='flex-1 gap-0.5 rounded-card px-3 py-2'
      style={{ backgroundColor: bg }}
    >
      <Text
        className='font-inter-bold text-[11px] uppercase tracking-widest'
        style={{ color: ink }}
      >
        {`Time ${index}`}
      </Text>
      <Text variant='label' numberOfLines={2}>
        {teamPlayers(match, index).join(' e ') || '—'}
      </Text>
    </View>
  );
}

/**
 * Registro do placar (RF23), set a set. O vencedor nunca é perguntado: sai
 * dos sets (`deriveOutcome`) e aparece ao vivo antes do envio, que é
 * confirmado porque o resultado não pode ser editado depois.
 */
export function ResultScreen() {
  const { matchId = '' } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const valid = z.string().uuid().safeParse(matchId).success;
  const match = useQuery({ ...matchQuery(matchId), enabled: valid });
  const [sets, setSets] = useState<SetFormValues[]>([emptySet()]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const parsed = resultFormSchema.safeParse({ sets, notes });
  const outcome = parsed.success ? deriveOutcome(parsed.data.sets) : null;
  const record = useResultMutation(
    () => {
      if (!parsed.success) throw new Error('unreachable');
      return recordResult(matchId, resultPayload(parsed.data));
    },
    {
      success: 'Placar registrado. A partida foi encerrada.',
      onSuccess: () => router.back(),
      onError: (error) => {
        // Alguém registrou antes: o detalhe já tem o placar.
        if (error instanceof ApiError && error.status === 409) router.back();
      },
    },
  );
  const busy = record.isPending;

  const patchSet = (index: number, patch: Partial<SetFormValues>) => {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
    setErrors({});
  };
  const submit = () => {
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [i.path.join('.'), i.message]),
        ),
      );
      return;
    }
    Alert.alert(
      'Registrar este placar?',
      'Depois de registrado ele não pode ser alterado e vale para o rating de todos os jogadores.',
      [
        { text: 'Revisar', style: 'cancel' },
        { text: 'Registrar', onPress: () => record.mutate(undefined) },
      ],
    );
  };

  if (!valid) return <MatchUnavailable />;
  if (match.isPending) return <LoadingState label='Abrindo a partida…' />;
  if (match.isError) {
    if (match.error instanceof ApiError && match.error.status === 404)
      return <MatchUnavailable />;
    return <ErrorState error={match.error} retry={() => match.refetch()} />;
  }
  const m = match.data;
  const permissions = matchPermissions(m);
  if (!permissions.canRecordResult)
    return (
      <Screen edges={['bottom']} className='justify-center'>
        <EmptyState
          icon={<Trophy size={28} color={palette.colors.brand} />}
          title='Ainda não dá para registrar o placar'
          description={
            permissions.resultBlockedReason ??
            (m.result
              ? 'O placar desta partida já foi registrado.'
              : 'Só o criador ou um jogador confirmado registra o placar, depois do horário da partida.')
          }
        >
          <Button label='Voltar' onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  const name = (index: TeamIndex) => teamName(m, index);
  const setErrorAt = (index: number) =>
    errors[`sets.${index}.team1`] ??
    errors[`sets.${index}.team2`] ??
    errors[`sets.${index}.tiebreak`] ??
    errors[`sets.${index}.tiebreak.team1`] ??
    errors[`sets.${index}.tiebreak.team2`];
  const muted = palette.colors['muted-foreground'];

  return (
    <Screen scroll edges={['bottom']} className='gap-4 pt-4'>
      <View className='flex-row items-center gap-3'>
        <SportIcon slug={m.sport.slug} size={44} />
        <View className='flex-1 gap-0.5'>
          <Text variant='subtitle' numberOfLines={1}>
            {matchTitle(m)}
          </Text>
          <Text variant='muted'>{formatWhen(m.scheduledAt)}</Text>
        </View>
      </View>

      <View className='flex-row gap-2'>
        <TeamHeader match={m} index={1} />
        <TeamHeader match={m} index={2} />
      </View>

      <View className='gap-3 rounded-panel border border-border bg-card p-4'>
        <View className='gap-0.5'>
          <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
            Set a set
          </Text>
          <Text variant='subtitle'>Placar</Text>
          <Text variant='muted'>
            Games (ou pontos) de cada time por set. Tiebreak é opcional.
          </Text>
        </View>
        {sets.map((set, index) => {
          const error = setErrorAt(index);
          return (
            <View
              key={index}
              className='gap-2 rounded-card border border-border bg-background p-3'
            >
              <View className='flex-row items-center justify-between'>
                <Text variant='label'>{`Set ${index + 1}`}</Text>
                {sets.length > 1 && (
                  <Pressable
                    accessibilityRole='button'
                    accessibilityLabel={`Remover set ${index + 1}`}
                    hitSlop={8}
                    disabled={busy}
                    onPress={() => {
                      setSets((prev) => prev.filter((_, i) => i !== index));
                      setErrors({});
                    }}
                  >
                    <Trash2 size={18} color={palette.colors.destructive} />
                  </Pressable>
                )}
              </View>
              <View className='flex-row items-center justify-center gap-3'>
                <ScoreInput
                  label={`Set ${index + 1}, ${name(1)}`}
                  value={set.team1}
                  invalid={Boolean(errors[`sets.${index}.team1`])}
                  editable={!busy}
                  onChangeText={(team1) => patchSet(index, { team1 })}
                />
                <Text className='font-inter-bold text-xl text-muted-foreground'>
                  ×
                </Text>
                <ScoreInput
                  label={`Set ${index + 1}, ${name(2)}`}
                  value={set.team2}
                  invalid={Boolean(errors[`sets.${index}.team2`])}
                  editable={!busy}
                  onChangeText={(team2) => patchSet(index, { team2 })}
                />
              </View>
              {set.tiebreak ? (
                <View className='flex-row items-center justify-center gap-2'>
                  <Text variant='muted'>Tiebreak</Text>
                  <ScoreInput
                    small
                    label={`Tiebreak do set ${index + 1}, ${name(1)}`}
                    value={set.tiebreak.team1}
                    invalid={Boolean(errors[`sets.${index}.tiebreak`])}
                    editable={!busy}
                    onChangeText={(team1) =>
                      patchSet(index, {
                        tiebreak: { ...set.tiebreak!, team1 },
                      })
                    }
                  />
                  <Text variant='muted'>×</Text>
                  <ScoreInput
                    small
                    label={`Tiebreak do set ${index + 1}, ${name(2)}`}
                    value={set.tiebreak.team2}
                    invalid={Boolean(errors[`sets.${index}.tiebreak`])}
                    editable={!busy}
                    onChangeText={(team2) =>
                      patchSet(index, {
                        tiebreak: { ...set.tiebreak!, team2 },
                      })
                    }
                  />
                  <Pressable
                    accessibilityRole='button'
                    accessibilityLabel={`Remover tiebreak do set ${index + 1}`}
                    hitSlop={8}
                    disabled={busy}
                    onPress={() => patchSet(index, { tiebreak: null })}
                  >
                    <Text className='font-inter-medium text-sm text-brand'>
                      remover
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole='button'
                  className='self-center'
                  hitSlop={8}
                  disabled={busy}
                  onPress={() =>
                    patchSet(index, { tiebreak: { team1: '', team2: '' } })
                  }
                >
                  <Text className='font-inter-medium text-sm text-brand'>
                    + tiebreak
                  </Text>
                </Pressable>
              )}
              {error && (
                <Text className='text-center text-sm text-destructive'>
                  {error}
                </Text>
              )}
            </View>
          );
        })}
        {errors.sets && (
          <Text className='text-sm text-destructive'>{errors.sets}</Text>
        )}
        {sets.length < MAX_SETS && (
          <Button
            variant='secondary'
            label='Adicionar set'
            disabled={busy}
            icon={<Plus size={16} color={palette.colors.brand} />}
            onPress={() => {
              setSets((prev) => [...prev, emptySet()]);
              setErrors({});
            }}
          />
        )}
      </View>

      <View
        className={cn(
          'flex-row items-center gap-3 rounded-card p-3',
          outcome ? 'bg-[#e3f3ea]' : 'bg-muted',
        )}
        accessibilityRole='summary'
      >
        <Trophy size={20} color={outcome ? palette.colors.success : muted} />
        <Text
          className='flex-1 font-inter-semibold'
          style={{ color: outcome ? palette.colors.success : muted }}
        >
          {outcome
            ? describeOutcome(outcome, name)
            : 'Preencha os sets para ver o desfecho.'}
        </Text>
      </View>

      <TextField
        label='Observações (opcional)'
        placeholder='Ex.: partida interrompida pela chuva no 3º set'
        value={notes}
        onChangeText={(value) => {
          setNotes(value);
          setErrors({});
        }}
        multiline
        maxLength={1000}
        editable={!busy}
        error={errors.notes}
      />

      <View className='gap-2 pb-6'>
        <Button
          label='Registrar placar'
          busy={busy}
          busyLabel='Registrando…'
          icon={<Trophy size={16} color='#fff' />}
          onPress={submit}
        />
        <Text variant='muted' className='text-center'>
          O placar não pode ser alterado depois. Ele encerra a partida e
          atualiza o histórico e o rating de todos.
        </Text>
      </View>
    </Screen>
  );
}
