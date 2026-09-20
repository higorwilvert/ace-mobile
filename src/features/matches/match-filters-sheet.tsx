import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PickerField } from '@/components/ui/picker-field';
import { Sheet } from '@/components/ui/sheet';
import { categoryOptions, policyLabels } from '@/features/players/labels';
import { citiesQuery, isUf, matchesCity } from '@/lib/locations';
import type { Sport } from '@/types/api';

import {
  dateOptions,
  matchesSearchSchema,
  type MatchesSearch,
  UF_OPTIONS,
} from './schemas';

type Draft = Record<
  | 'teamSize'
  | 'state'
  | 'city'
  | 'categoryCode'
  | 'genderPolicy'
  | 'dateFrom'
  | 'dateTo',
  string
>;
const toDraft = (search: MatchesSearch): Draft => ({
  teamSize: search.teamSize ? String(search.teamSize) : '',
  state: search.state ?? '',
  city: search.city ?? '',
  categoryCode: search.categoryCode ?? '',
  genderPolicy: search.genderPolicy ?? '',
  dateFrom: search.dateFrom ?? '',
  dateTo: search.dateTo ?? '',
});
const any = (label: string) => ({ value: '', label });

/**
 * Filtros do Explorar num rascunho local; "Aplicar" devolve a busca já
 * validada (o schema descarta o que estiver inválido) e quem grava nos
 * query params é a tela.
 */
export function MatchFiltersSheet({
  visible,
  search,
  sport,
  onApply,
  onClose,
}: {
  visible: boolean;
  search: MatchesSearch;
  sport: Sport | undefined;
  onApply: (next: Omit<MatchesSearch, 'sportId'>) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} title='Filtrar partidas' onClose={onClose}>
      {/* Remontar a cada abertura descarta o rascunho não aplicado. */}
      {visible && (
        <Fields
          search={search}
          sport={sport}
          onApply={onApply}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

function Fields({
  search,
  sport,
  onApply,
  onClose,
}: {
  search: MatchesSearch;
  sport: Sport | undefined;
  onApply: (next: Omit<MatchesSearch, 'sportId'>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(search));
  const cities = useQuery(citiesQuery(draft.state));
  const set = (key: keyof Draft) => (value: string) =>
    setDraft((current) => ({
      ...current,
      [key]: value,
      // Trocar a UF invalida a cidade escolhida.
      ...(key === 'state' && value !== current.state ? { city: '' } : {}),
    }));
  const dates = dateOptions();
  const apply = () => {
    const parsed = matchesSearchSchema.parse(draft);
    onApply({
      teamSize: parsed.teamSize,
      state: parsed.state,
      city: parsed.city,
      categoryCode: sport ? parsed.categoryCode : undefined,
      genderPolicy: parsed.genderPolicy,
      dateFrom: parsed.dateFrom,
      dateTo: parsed.dateTo,
    });
    onClose();
  };
  return (
    <View className='gap-4 pb-2'>
      <PickerField
        label='Formato'
        value={draft.teamSize}
        onChange={set('teamSize')}
        options={[
          any('Todos os formatos'),
          { value: '1', label: '1v1 · Simples' },
          { value: '2', label: '2v2 · Duplas' },
        ]}
      />
      <View className='flex-row gap-3'>
        <View className='w-28'>
          <PickerField
            label='Estado'
            value={draft.state}
            onChange={set('state')}
            options={[any('Todos'), ...UF_OPTIONS]}
          />
        </View>
        <View className='flex-1'>
          <PickerField
            label='Cidade'
            value={draft.city}
            onChange={set('city')}
            placeholder={
              isUf(draft.state) ? 'Todas as cidades' : 'Escolha o estado'
            }
            disabled={!isUf(draft.state)}
            loading={cities.isLoading}
            searchable
            filter={(option, term) => matchesCity(option.label, term)}
            options={[
              any('Todas as cidades'),
              ...(cities.data ?? []).map((city) => ({
                value: city,
                label: city,
              })),
            ]}
          />
        </View>
      </View>
      <PickerField
        label='Categoria'
        value={draft.categoryCode}
        onChange={set('categoryCode')}
        disabled={!sport}
        placeholder={sport ? 'Todas as categorias' : 'Escolha uma modalidade'}
        hint={sport ? undefined : 'Escolha uma modalidade nos chips acima.'}
        options={[any('Todas as categorias'), ...categoryOptions(sport)]}
      />
      <PickerField
        label='Composição'
        value={draft.genderPolicy}
        onChange={set('genderPolicy')}
        options={[
          any('Todas as composições'),
          ...Object.entries(policyLabels).map(([value, label]) => ({
            value,
            label,
          })),
        ]}
      />
      <View className='flex-row gap-3'>
        <View className='flex-1'>
          <PickerField
            label='De'
            value={draft.dateFrom}
            onChange={set('dateFrom')}
            options={[any('Qualquer data'), ...dates]}
          />
        </View>
        <View className='flex-1'>
          <PickerField
            label='Até'
            value={draft.dateTo}
            onChange={set('dateTo')}
            options={[any('Qualquer data'), ...dates]}
          />
        </View>
      </View>
      <View className='flex-row gap-3 pt-2'>
        <View className='flex-1'>
          <Button
            variant='secondary'
            label='Limpar'
            onPress={() => setDraft(toDraft({}))}
          />
        </View>
        <View className='flex-1'>
          <Button label='Aplicar filtros' onPress={apply} />
        </View>
      </View>
    </View>
  );
}
