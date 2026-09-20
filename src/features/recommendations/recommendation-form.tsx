import { useRouter } from 'expo-router';
import { CalendarDays, Search, X } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';

import { SportIcon } from '@/components/ace/sport-icon';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { PickerField } from '@/components/ui/picker-field';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import {
  dateOptions,
  durationOptions,
  timeOptions,
} from '@/features/matches/schemas';
import type { Sport, User } from '@/types/api';

import type { RecommendationKind, RecommendationMode } from './api';
import {
  defaultTeamSize,
  limitOptions,
  modeLabels,
  type RecommendationDraft,
  type RecommendationFormValues,
  recommendationFormSchema,
} from './schemas';

type Errors = Partial<Record<keyof RecommendationDraft, string>>;
const modes = Object.keys(modeLabels) as RecommendationMode[];
/** Fuso do aparelho só para informar; a API interpreta a agenda no fuso cadastrado. */
function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'fuso local';
  } catch {
    return 'fuso local';
  }
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View className='gap-1.5'>
      <Text variant='label'>{label}</Text>
      {children}
      {error ? (
        <Text variant='error' accessibilityRole='alert'>
          {error}
        </Text>
      ) : hint ? (
        <Text variant='muted'>{hint}</Text>
      ) : null}
    </View>
  );
}

/**
 * Preferências da busca em estado local (strings, como os pickers) e
 * validadas com o schema portado do web ao tocar em Buscar. Nada aqui
 * dispara a geração além do botão.
 */
export function RecommendationForm({
  sports,
  user,
  kind,
  initial,
  busy,
  hasResult,
  onSubmit,
}: {
  sports: Sport[];
  user: User;
  kind: RecommendationKind;
  initial: RecommendationDraft;
  busy: boolean;
  hasResult: boolean;
  onSubmit: (values: RecommendationFormValues) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [schedule, setSchedule] = useState(
    Boolean(initial.date || initial.time),
  );
  const sport = sports.find((s) => String(s.id) === draft.sportId);
  const set = (patch: Partial<RecommendationDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const noGender = !user.gender || user.gender === 'NOT_SPECIFIED';
  const brand = palette.colors.brand;
  const submit = () => {
    const parsed = recommendationFormSchema(
      sports,
      user.gender,
      kind,
    ).safeParse(draft);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  };
  return (
    <View className='gap-4'>
      <Field label='Modalidade' error={errors.sportId}>
        <Chips
          label='Modalidade'
          clearable={false}
          value={draft.sportId}
          options={sports.map((s) => ({
            value: String(s.id),
            label: s.name,
            icon: <SportIcon slug={s.slug} size={18} />,
          }))}
          onChange={(value) => {
            const next = sports.find((s) => String(s.id) === value);
            // Trocar de modalidade recomeça formato e composição: uma escolha
            // mista precisa ser refeita para o novo formato.
            if (next)
              set({
                sportId: String(next.id),
                teamSize: defaultTeamSize(next),
                mode: 'SAME_GENDER',
              });
          }}
        />
      </Field>
      <Field label='Formato' error={errors.teamSize}>
        <Chips
          label='Formato'
          clearable={false}
          value={draft.teamSize}
          options={[
            ...(sport?.supportsSingles
              ? [{ value: '1', label: 'Simples · 1v1' }]
              : []),
            ...(sport?.supportsDoubles
              ? [{ value: '2', label: 'Duplas · 2v2' }]
              : []),
          ]}
          onChange={(value) => {
            if (value)
              set({
                teamSize: value,
                ...(value === '1' ? { mode: 'SAME_GENDER' } : {}),
              });
          }}
        />
      </Field>
      <Field
        label='Composição'
        error={errors.mode}
        hint='Mista: um homem e uma mulher por dupla. Composição livre aceita qualquer gênero. A escolha vale para esta busca.'
      >
        <Chips
          label='Composição'
          clearable={false}
          value={draft.mode as RecommendationMode}
          options={modes
            .filter(
              (mode) => mode !== 'MIXED_PARTNER' || draft.teamSize === '2',
            )
            .map((mode) => ({ value: mode, label: modeLabels[mode] }))}
          onChange={(value) => {
            if (value) set({ mode: value });
          }}
        />
      </Field>
      {noGender && (
        <Pressable
          accessibilityRole='link'
          onPress={() => router.push('/personal')}
        >
          <Text variant='muted'>
            Para buscar por gênero,{' '}
            <Text className='font-inter-medium text-sm text-brand'>
              complete seu perfil
            </Text>
            . Você também pode escolher composição livre.
          </Text>
        </Pressable>
      )}
      <PickerField
        label='Quantidade'
        value={draft.limit}
        options={limitOptions.map((n) => ({
          value: String(n),
          label: `Até ${n} sugestões`,
        }))}
        onChange={(value) => set({ limit: value })}
        error={errors.limit}
      />
      <Pressable
        accessibilityRole='button'
        accessibilityState={{ expanded: schedule }}
        className='flex-row items-center gap-2 py-1'
        onPress={() => {
          if (schedule) set({ date: '', time: '', endDate: '', endTime: '' });
          setSchedule(!schedule);
        }}
      >
        {schedule ? (
          <X size={16} color={brand} />
        ) : (
          <CalendarDays size={16} color={brand} />
        )}
        <Text className='font-inter-medium text-sm text-brand'>
          {schedule ? 'Remover filtro de horário' : 'Filtrar por horário'}
        </Text>
      </Pressable>
      {schedule && (
        <View className='gap-3 rounded-card bg-muted p-3'>
          <Text variant='muted'>
            {kind === 'players'
              ? 'Só entram jogadores disponíveis durante todo o jogo.'
              : 'A partida inteira precisa caber neste intervalo, nos próximos 14 dias.'}
            {` Horários no fuso deste aparelho (${deviceTimeZone()}).`}
          </Text>
          <PickerField
            label={kind === 'players' ? 'Data do jogo' : 'Data inicial'}
            value={draft.date}
            options={dateOptions(new Date(), draft.date || undefined)}
            onChange={(value) => set({ date: value })}
            error={errors.date}
          />
          <PickerField
            label='Horário inicial'
            value={draft.time}
            options={timeOptions(draft.time || undefined)}
            onChange={(value) => set({ time: value })}
            error={errors.time}
          />
          {kind === 'players' ? (
            <PickerField
              label='Duração'
              value={draft.durationMinutes}
              options={durationOptions}
              onChange={(value) => set({ durationMinutes: value })}
              error={errors.durationMinutes}
            />
          ) : (
            <>
              <PickerField
                label='Data final'
                value={draft.endDate}
                options={dateOptions(new Date(), draft.endDate || undefined)}
                onChange={(value) => set({ endDate: value })}
                error={errors.endDate}
              />
              <PickerField
                label='Horário final'
                value={draft.endTime}
                options={timeOptions(draft.endTime || undefined)}
                onChange={(value) => set({ endTime: value })}
                error={errors.endTime}
              />
            </>
          )}
        </View>
      )}
      <Button
        label={hasResult ? 'Atualizar sugestões' : 'Buscar sugestões'}
        busy={busy}
        busyLabel='Buscando…'
        icon={<Search size={17} color='#ffffff' />}
        onPress={submit}
      />
      <Text variant='muted' className='text-center'>
        {kind === 'matches'
          ? 'A agenda cadastrada é considerada em toda busca.'
          : 'Você decide quem convidar.'}
      </Text>
    </View>
  );
}
