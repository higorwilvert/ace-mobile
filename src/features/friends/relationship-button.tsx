import { Check, UserCheck, UserPlus } from 'lucide-react-native';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { cn, firstName } from '@/lib/utils';
import type { Relationship } from '@/types/api';

import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
} from './api';
import { friendAction } from './schemas';
import { useFriendMutation } from './use-friend-mutation';

/**
 * O botão social de um jogador, derivado só de `relationship` (API). Cada
 * estado oferece apenas a ação possível; desfazer amizade pede confirmação.
 */
export function RelationshipButton({
  userId,
  name,
  relationship,
  size = 'md',
}: {
  userId: string;
  name: string;
  relationship: Relationship;
  size?: 'sm' | 'md';
}) {
  const action = friendAction(relationship);
  const first = firstName(name);
  const send = useFriendMutation(() => sendFriendRequest(userId), {
    success: `Pedido enviado para ${first}.`,
  });
  const accept = useFriendMutation((id: string) => acceptFriendRequest(id), {
    success: `Agora você e ${first} são amigos.`,
  });
  const decline = useFriendMutation((id: string) => declineFriendRequest(id), {
    success: 'Pedido recusado.',
  });
  const cancel = useFriendMutation((id: string) => cancelFriendRequest(id), {
    success: 'Pedido cancelado.',
  });
  const remove = useFriendMutation(() => removeFriend(userId), {
    success: `Você e ${first} não são mais amigos.`,
  });
  const busy =
    send.isPending ||
    accept.isPending ||
    decline.isPending ||
    cancel.isPending ||
    remove.isPending;
  const compact = size === 'sm' ? 'h-10 px-3' : undefined;
  const icon = size === 'sm' ? 15 : 16;
  const confirmRemove = () =>
    Alert.alert(
      `Desfazer amizade com ${first}?`,
      'Vocês deixam de ser amigos e o perfil privado de cada um volta a ficar restrito. Um novo pedido pode ser enviado depois.',
      [
        { text: 'Manter amizade', style: 'cancel' },
        {
          text: 'Desfazer',
          style: 'destructive',
          onPress: () => remove.mutate(undefined),
        },
      ],
    );

  if (action.kind === 'self') return null;
  if (action.kind === 'add')
    return (
      <Button
        label={action.label}
        busy={send.isPending}
        busyLabel='Enviando…'
        disabled={busy}
        icon={<UserPlus size={icon} color='#fff' />}
        className={compact}
        onPress={() => send.mutate(undefined)}
      />
    );
  if (action.kind === 'sent')
    return (
      <>
        <View
          className='h-10 flex-row items-center gap-1.5 rounded-control bg-muted px-3'
          accessibilityLabel={action.hint ?? action.label}
        >
          <Check size={icon} color={palette.colors['muted-foreground']} />
          <Text variant='label' className='text-muted-foreground'>
            {action.label}
          </Text>
        </View>
        <Button
          variant='ghost'
          label='Cancelar'
          accessibilityLabel={`Cancelar pedido de amizade para ${name}`}
          disabled={busy}
          busy={cancel.isPending}
          className={cn(compact, 'h-10')}
          onPress={() =>
            relationship.requestId && cancel.mutate(relationship.requestId)
          }
        />
      </>
    );
  if (action.kind === 'received')
    return (
      <>
        <Button
          variant='secondary'
          label='Recusar'
          accessibilityLabel={`Recusar pedido de amizade de ${name}`}
          disabled={busy}
          busy={decline.isPending}
          className={compact}
          onPress={() =>
            relationship.requestId && decline.mutate(relationship.requestId)
          }
        />
        <Button
          label='Aceitar'
          accessibilityLabel={`Aceitar pedido de amizade de ${name}`}
          disabled={busy}
          busy={accept.isPending}
          icon={<UserCheck size={icon} color='#fff' />}
          className={compact}
          onPress={() =>
            relationship.requestId && accept.mutate(relationship.requestId)
          }
        />
      </>
    );
  return (
    <Button
      variant='secondary'
      label={action.label}
      accessibilityLabel={`Amigos com ${name}. Desfazer amizade`}
      disabled={busy}
      busy={remove.isPending}
      busyLabel='Desfazendo…'
      icon={<UserCheck size={icon} color={palette.colors.brand} />}
      className={compact}
      onPress={confirmRemove}
    />
  );
}
