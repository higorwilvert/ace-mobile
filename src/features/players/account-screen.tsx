import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { LogOut, ShieldAlert } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Switch, View } from 'react-native';
import { toast } from 'sonner-native';

import { FormError } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import palette from '@/config/palette.json';
import { authQueryOptions } from '@/features/auth/api';
import { useSession } from '@/features/auth/session';
import { ApiError } from '@/lib/api-client';
import { sessionEnded } from '@/lib/events';
import { sessionToken } from '@/lib/token';

import { deactivateAccount, setVisibility } from './api';

const CONFIRM_WORD = 'DESATIVAR';
const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Não foi possível concluir. Tente novamente.';

function Panel({
  title,
  children,
  danger = false,
}: {
  title: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <View
      className={`gap-3 rounded-panel border bg-card p-4 ${
        danger ? 'border-destructive' : 'border-border'
      }`}
    >
      <Text variant='subtitle'>{title}</Text>
      {children}
    </View>
  );
}

export function AccountScreen() {
  const { user, signOut } = useSession();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [word, setWord] = useState('');
  // Valor otimista: o switch responde na hora, volta se a API recusar e cede
  // ao valor da sessão assim que ela acompanha o cache.
  const [privateOverride, setPrivateOverride] = useState<boolean | null>(null);
  const serverPrivate = user?.profileVisibility === 'PRIVATE';
  const [seenPrivate, setSeenPrivate] = useState(serverPrivate);
  if (seenPrivate !== serverPrivate) {
    setSeenPrivate(serverPrivate);
    setPrivateOverride(null);
  }

  const logout = useMutation({
    mutationFn: signOut,
    onError: (error) => toast.error(errorMessage(error)),
  });
  const visibility = useMutation({
    mutationFn: setVisibility,
    onMutate: (value) => setPrivateOverride(value === 'PRIVATE'),
    onSuccess: (updated) => {
      queryClient.setQueryData(authQueryOptions.queryKey, updated);
      toast.success(
        updated.profileVisibility === 'PRIVATE'
          ? 'Seu perfil agora é privado.'
          : 'Seu perfil agora é público.',
      );
    },
    onError: (error) => {
      setPrivateOverride(null);
      toast.error(errorMessage(error));
    },
  });
  const deactivate = useMutation({
    mutationFn: deactivateAccount,
    onSuccess: async () => {
      // A conta já não existe: encerra localmente sem chamar /auth/logout.
      // `sessionEnded` limpa o cache e derruba a sessão; o (app) redireciona.
      await sessionToken.clear();
      sessionEnded.emit();
      toast.info('Sua conta foi desativada.');
    },
  });

  if (!user) return null;
  const isPrivate = privateOverride ?? serverPrivate;
  return (
    <Screen scroll edges={['bottom']} className='gap-4 pt-4'>
      <Panel title='Acesso'>
        <View className='gap-0.5'>
          <Text variant='muted'>E-mail da conta</Text>
          <Text>{user.email}</Text>
        </View>
        <Link href='/forgot-password' asChild>
          <Button
            variant='secondary'
            label='Redefinir minha senha'
            className='self-start'
          />
        </Link>
        <Text variant='muted'>
          Enviamos um link por e-mail; a troca acontece no navegador.
        </Text>
        <Button
          variant='ghost'
          label='Sair'
          busyLabel='Saindo…'
          busy={logout.isPending}
          icon={<LogOut size={18} color={palette.colors.brand} />}
          className='self-start'
          onPress={() => logout.mutate()}
        />
      </Panel>

      <Panel title='Privacidade'>
        <View className='flex-row items-center gap-3'>
          <View className='flex-1 gap-0.5'>
            <Text variant='label'>Perfil privado</Text>
            <Text variant='muted'>
              Quem não é seu amigo vê só o cartão básico: nome, foto, cidade,
              bio e modalidades. Categoria, rating e histórico ficam escondidos.
            </Text>
          </View>
          <Switch
            accessibilityLabel='Perfil privado'
            value={isPrivate}
            disabled={visibility.isPending}
            trackColor={{ true: palette.colors.brand }}
            onValueChange={(value) =>
              visibility.mutate(value ? 'PRIVATE' : 'PUBLIC')
            }
          />
        </View>
      </Panel>

      <Panel title='Desativar conta' danger>
        <View className='flex-row items-start gap-2'>
          <ShieldAlert size={18} color={palette.colors.destructive} />
          <Text variant='muted' className='flex-1'>
            Suas sessões em todos os aparelhos terminam agora. Seu histórico
            esportivo fica preservado, mas não há reativação pelo app.
          </Text>
        </View>
        <Button
          variant='destructive'
          label='Desativar minha conta'
          onPress={() => {
            setWord('');
            setConfirming(true);
          }}
        />
      </Panel>

      <Sheet
        visible={confirming}
        title='Desativar conta'
        onClose={() => setConfirming(false)}
      >
        <Text variant='muted'>
          {`Para confirmar, digite ${CONFIRM_WORD}. Esta ação não pode ser desfeita pelo app.`}
        </Text>
        <TextField
          label={`Digite ${CONFIRM_WORD}`}
          value={word}
          onChangeText={setWord}
          autoCapitalize='characters'
          autoCorrect={false}
          placeholder={CONFIRM_WORD}
        />
        <FormError error={deactivate.error} />
        <Button
          variant='destructive'
          label='Confirmar desativação'
          busyLabel='Desativando…'
          busy={deactivate.isPending}
          disabled={word !== CONFIRM_WORD}
          onPress={() => deactivate.mutate()}
        />
        <Button
          variant='ghost'
          label='Cancelar'
          onPress={() => setConfirming(false)}
        />
      </Sheet>
    </Screen>
  );
}
