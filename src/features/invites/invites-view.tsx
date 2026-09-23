import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Mail, Send } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import type { InviteStatus } from '@/features/matches/api';
import { PagedList } from '@/features/matches/paged-list';
import { type MineSearch, mineActiveFilters } from '@/features/matches/schemas';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';

import { myInvitesQuery } from './api';
import { InviteCard } from './invite-card';
import { inviteStatusLabels } from './schemas';

/** Segmento "Convites" da aba Minhas: caixa (recebidos/enviados) e situação nos params. */
export function MyInvitesView({
  search,
  header,
}: {
  search: MineSearch;
  header: ReactNode;
}) {
  const router = useRouter();
  const { user } = useSession();
  const status = search.status as InviteStatus | undefined;
  const invites = useInfiniteQuery(myInvitesQuery(search.box, status));
  useRefetchOnFocus(invites.refetch);
  const items = invites.data?.pages.flatMap((page) => page.data) ?? [];
  const received = search.box === 'received';
  const emptyActions = (
    <View className='w-full gap-2 pt-2'>
      {mineActiveFilters(search).length > 0 && (
        <Button
          variant='secondary'
          label='Limpar filtros'
          onPress={() =>
            router.setParams({
              view: 'invites',
              role: 'all',
              box: 'received',
              status: '',
            })
          }
        />
      )}
      <Button
        variant='secondary'
        label='Minhas partidas'
        onPress={() =>
          router.setParams({
            view: 'matches',
            role: 'all',
            box: 'received',
            status: '',
          })
        }
      />
    </View>
  );
  return (
    <PagedList
      query={invites}
      header={header}
      empty={
        received ? (
          <EmptyState
            icon={<Mail size={28} color={palette.colors.brand} />}
            title='Nenhum convite recebido'
            description={
              status
                ? `Nenhum convite ${inviteStatusLabels[status].toLowerCase()} por aqui.`
                : 'Quando um criador chamar você para uma partida, o convite aparece aqui para aceitar ou recusar.'
            }
          >
            {emptyActions}
          </EmptyState>
        ) : (
          <EmptyState
            icon={<Send size={28} color={palette.colors.brand} />}
            title='Você ainda não convidou ninguém'
            description={
              status
                ? `Nenhum convite ${inviteStatusLabels[status].toLowerCase()} por aqui.`
                : 'Abra uma partida que você organiza e toque em "Convidar jogador".'
            }
          >
            {emptyActions}
          </EmptyState>
        )
      }
      items={items.map((invite) => ({
        id: invite.id,
        data: invite,
        node: <InviteCard invite={invite} viewerId={user?.id ?? ''} />,
      }))}
    />
  );
}
