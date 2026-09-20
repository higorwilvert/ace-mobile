import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { formatWhen } from '@/features/matches/schemas';

import type { RecommendationItem, RecommendationMeta } from './api';
import {
  factorLabels,
  factorOrder,
  formatScore,
  recommendationReasons,
  reconstructScore,
} from './schemas';

/** Score 0–100 + os dois motivos derivados do breakdown persistido. */
export function ScoreHeader({
  item,
  meta,
}: {
  item: RecommendationItem;
  meta: RecommendationMeta;
}) {
  const score = formatScore(item.totalScore);
  return (
    <View className='gap-2'>
      <View className='flex-row items-end gap-2'>
        <Text
          className='font-inter-bold text-3xl leading-9 text-brand'
          accessibilityLabel={`Compatibilidade ${score} de 100`}
        >
          {score}
          <Text className='font-inter-medium text-base text-muted-foreground'>
            /100
          </Text>
        </Text>
        <Text variant='muted' className='pb-1'>
          Compatibilidade
        </Text>
      </View>
      <View
        className='flex-row flex-wrap gap-2'
        accessibilityLabel='Principais fatores'
      >
        {recommendationReasons(item, meta.weights).map((reason) => (
          <View
            key={reason}
            className='rounded-pill bg-brand-muted px-2.5 py-1'
          >
            <Text className='font-inter-medium text-xs text-brand'>
              {reason}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Disclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className='gap-3'>
      <Pressable
        accessibilityRole='button'
        accessibilityState={{ expanded: open }}
        className='flex-row items-center justify-between py-1'
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

/**
 * "Por que esta recomendação?": fatores × pesos recebidos na mesma geração e,
 * aninhado, o modo técnico (versões, id, total da API vs soma reconstruída).
 * Nada aqui recalcula o ranking: é leitura do que a API persistiu.
 */
export function ScoreDetails({
  item,
  meta,
}: {
  item: RecommendationItem;
  meta: RecommendationMeta;
}) {
  return (
    <Disclosure title='Por que esta recomendação?'>
      <Text variant='muted'>
        A compatibilidade combina estes fatores. O peso indica a participação de
        cada um no total.
      </Text>
      <View className='gap-2.5'>
        {factorOrder.map((key) => {
          const value = formatScore(item.scoreBreakdown[key]);
          return (
            <View key={key} className='gap-1'>
              <View className='flex-row items-baseline justify-between'>
                <View className='flex-row items-baseline gap-1.5'>
                  <Text variant='label'>{factorLabels[key]}</Text>
                  <Text variant='muted'>
                    {`peso ${formatScore(meta.weights[key])}%`}
                  </Text>
                </View>
                <Text
                  variant='label'
                  accessibilityLabel={`${factorLabels[key]} ${value} de 100`}
                >
                  {`${value}/100`}
                </Text>
              </View>
              <View className='h-1.5 overflow-hidden rounded-pill bg-muted'>
                <View
                  className='h-full rounded-pill bg-brand'
                  style={{ width: `${item.scoreBreakdown[key] * 100}%` }}
                />
              </View>
            </View>
          );
        })}
      </View>
      {item.coldStart && (
        <Text variant='muted'>
          Rating em calibração: a categoria inicial também participa da
          comparação de nível.
        </Text>
      )}
      <Text variant='muted'>
        {item.distanceMethod === 'CITY_STATE'
          ? 'A proximidade foi estimada por cidade e estado; não representa distância em quilômetros.'
          : 'A proximidade usa a distância calculada pela API. Coordenadas pessoais não são exibidas.'}
      </Text>
      <Disclosure title='Detalhes técnicos'>
        <Row label='Algoritmo' value={meta.algorithmVersion} />
        <Row label='Implementação' value={meta.implementationVersion} />
        <Row label='Recomendação' value={item.recommendationId} />
        <Row label='Total da API' value={item.totalScore.toFixed(6)} />
        <Row
          label='Soma dos fatores × pesos'
          value={reconstructScore(item.scoreBreakdown, meta.weights).toFixed(6)}
        />
        <Text variant='muted'>
          Os detalhes reproduzem o score recebido. O ranking foi calculado na
          API.
        </Text>
      </Disclosure>
    </Disclosure>
  );
}

/** Rodapé da lista: identifica a geração auditada na API. */
export function GenerationDetails({ meta }: { meta: RecommendationMeta }) {
  return (
    <View className='rounded-panel border border-border bg-card px-4 py-2'>
      <Disclosure title='Informações desta geração'>
        <Row label='Geração' value={meta.generationId} />
        <Row label='Algoritmo' value={meta.algorithmVersion} />
        <Row label='Implementação' value={meta.implementationVersion} />
        <Row label='Gerada em' value={formatWhen(meta.generatedAt)} />
      </Disclosure>
    </View>
  );
}
