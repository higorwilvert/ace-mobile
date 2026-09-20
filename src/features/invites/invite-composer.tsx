import { ArrowLeft, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { SportIcon } from '@/components/ace/sport-icon';
import { FormError } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import palette from '@/config/palette.json';
import type { MatchDetail, TeamIndex } from '@/features/matches/api';
import {
  formatShort,
  formatWhen,
  matchTitle,
  teamIndexes,
} from '@/features/matches/schemas';
import { cn } from '@/lib/utils';
import type { PublicUser } from '@/types/api';

import { sendInvite } from './api';
import { useInviteMutation } from './use-invite-mutation';

const MESSAGE_MAX = 1000;

export function teamRoom(match: MatchDetail, teamIndex: TeamIndex) {
  const team = match.teams.find((t) => t.teamIndex === teamIndex);
  return match.teamSize - (team?.participants.length ?? 0);
}

/**
 * Último passo do convite, comum aos dois caminhos (da partida ou do
 * perfil): time sugerido (só em 2v2), mensagem e envio. Erros do backend
 * ficam na própria folha para o organizador corrigir sem perder o contexto.
 */
export function InviteComposer({
  match,
  player,
  onBack,
  onSent,
}: {
  match: MatchDetail;
  player: PublicUser;
  onBack?: () => void;
  onSent: () => void;
}) {
  const [team, setTeam] = useState<TeamIndex | undefined>(undefined);
  const [message, setMessage] = useState('');
  const send = useInviteMutation(
    () =>
      sendInvite(match.id, {
        inviteeUserId: player.id,
        ...(team ? { teamIndex: team } : {}),
        ...(message.trim() ? { message: message.trim() } : {}),
      }),
    {
      toastError: false,
      success:
        'Convite enviado. Você acompanha a resposta em Minhas › Convites.',
      onSuccess: onSent,
    },
  );
  const busy = send.isPending;
  return (
    <View className='gap-4'>
      <View className='flex-row items-center gap-3 rounded-card bg-muted p-3'>
        <Avatar name={player.fullName} url={player.avatarUrl} size={44} />
        <View className='flex-1 gap-0.5'>
          <Text variant='label'>{player.fullName}</Text>
          <Text variant='muted'>{`${player.city}, ${player.state}`}</Text>
        </View>
      </View>
      <View className='flex-row items-center gap-3'>
        <SportIcon slug={match.sport.slug} size={36} />
        <View className='flex-1 gap-0.5'>
          <Text variant='label' numberOfLines={1}>
            {matchTitle(match)}
          </Text>
          <Text variant='muted'>
            {`${match.sport.name} · ${formatShort(match.teamSize)} · ${formatWhen(match.scheduledAt)}`}
          </Text>
        </View>
      </View>

      {match.teamSize === 2 && (
        <View className='gap-1.5'>
          <Text variant='label'>Time sugerido (opcional)</Text>
          <View
            className='flex-row rounded-control border border-border bg-card p-1'
            accessibilityRole='radiogroup'
            accessibilityLabel='Time sugerido'
          >
            {[...teamIndexes, undefined].map((index) => {
              const room = index ? teamRoom(match, index) : null;
              const active = team === index;
              const disabled = busy || room === 0;
              return (
                <Pressable
                  key={index ?? 'any'}
                  accessibilityRole='radio'
                  accessibilityLabel={index ? `Time ${index}` : 'Qualquer time'}
                  accessibilityState={{
                    selected: active,
                    checked: active,
                    disabled,
                  }}
                  disabled={disabled}
                  onPress={() => setTeam(index)}
                  className={cn(
                    'flex-1 items-center rounded-tiny py-1.5',
                    active && 'bg-brand',
                    room === 0 && 'opacity-40',
                  )}
                >
                  <Text
                    className={cn(
                      'font-inter-semibold text-sm',
                      active ? 'text-white' : 'text-foreground',
                    )}
                  >
                    {index ? `Time ${index}` : 'Qualquer'}
                  </Text>
                  <Text
                    className={cn(
                      'text-xs',
                      active ? 'text-white' : 'text-muted-foreground',
                    )}
                  >
                    {room === null
                      ? 'quem aceita escolhe'
                      : room === 0
                        ? 'completo'
                        : `${room} ${room === 1 ? 'vaga' : 'vagas'}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <TextField
        label='Mensagem (opcional)'
        placeholder='Ex.: Bora fechar a dupla no sábado?'
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={MESSAGE_MAX}
        editable={!busy}
        hint={`${message.length}/${MESSAGE_MAX}`}
      />
      <FormError error={send.error} />
      <View className='gap-2 pb-2'>
        <Button
          label='Enviar convite'
          busy={busy}
          busyLabel='Enviando…'
          icon={<Send size={16} color='#fff' />}
          onPress={() => send.mutate(undefined)}
        />
        {onBack && (
          <Button
            variant='ghost'
            label='Voltar'
            disabled={busy}
            icon={<ArrowLeft size={16} color={palette.colors.brand} />}
            onPress={onBack}
          />
        )}
      </View>
    </View>
  );
}
