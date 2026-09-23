import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PickerField } from '@/components/ui/picker-field';
import { Sheet } from '@/components/ui/sheet';
import { inviteStatusLabels, inviteStatuses } from '@/features/invites/schemas';

import type { MatchStatus, ParticipantStatus } from './api';
import {
  matchStatusLabels,
  type MineSearch,
  mineRoleLabels,
  mineRoles,
  participantStatusLabels,
} from './schemas';

const matchStatuses: MatchStatus[] = [
  'OPEN',
  'CONFIRMED',
  'DRAFT',
  'COMPLETED',
  'CANCELLED',
];
const applicationStatuses: ParticipantStatus[] = [
  'PENDING',
  'CONFIRMED',
  'DECLINED',
  'REMOVED',
];

/** Campos variam com o segmento; só Aplicar grava os filtros na URL. */
export function MineFiltersSheet({
  visible,
  search,
  onApply,
  onClose,
}: {
  visible: boolean;
  search: MineSearch;
  onApply: (patch: Partial<MineSearch>) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} title='Filtrar' onClose={onClose}>
      {visible && (
        <Fields search={search} onApply={onApply} onClose={onClose} />
      )}
    </Sheet>
  );
}

function Fields({
  search,
  onApply,
  onClose,
}: {
  search: MineSearch;
  onApply: (patch: Partial<MineSearch>) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState<string>(search.role);
  const [box, setBox] = useState<string>(search.box);
  const [status, setStatus] = useState<string>(search.status ?? '');
  const statusOptions =
    search.view === 'matches'
      ? matchStatuses.map((value) => ({
          value,
          label: matchStatusLabels[value],
        }))
      : search.view === 'applications'
        ? applicationStatuses.map((value) => ({
            value,
            label: participantStatusLabels[value],
          }))
        : inviteStatuses.map((value) => ({
            value,
            label: inviteStatusLabels[value],
          }));
  const statusLabel =
    search.view === 'applications'
      ? 'Situação da candidatura'
      : search.view === 'invites'
        ? 'Situação do convite'
        : 'Situação';
  const apply = () => {
    onApply({
      role: role as MineSearch['role'],
      box: box as MineSearch['box'],
      status: (status || undefined) as MineSearch['status'],
    });
    onClose();
  };
  return (
    <View className='gap-4 pb-2'>
      {search.view === 'matches' && (
        <PickerField
          label='Meu papel'
          value={role}
          onChange={setRole}
          options={mineRoles.map((value) => ({
            value,
            label: mineRoleLabels[value],
          }))}
        />
      )}
      {search.view === 'invites' && (
        <PickerField
          label='Caixa'
          value={box}
          onChange={setBox}
          options={[
            { value: 'received', label: 'Recebidos' },
            { value: 'sent', label: 'Enviados' },
          ]}
        />
      )}
      <PickerField
        label={statusLabel}
        value={status}
        onChange={setStatus}
        options={[{ value: '', label: 'Todas as situações' }, ...statusOptions]}
      />
      <View className='flex-row gap-3 pt-2'>
        <View className='flex-1'>
          <Button
            variant='secondary'
            label='Limpar'
            onPress={() => {
              setRole('all');
              setBox('received');
              setStatus('');
            }}
          />
        </View>
        <View className='flex-1'>
          <Button label='Aplicar filtros' onPress={apply} />
        </View>
      </View>
    </View>
  );
}
