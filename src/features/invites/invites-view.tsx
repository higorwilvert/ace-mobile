import { useInfiniteQuery } from '@tanstack/react-query';
import { Mail, Send } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import type { InviteStatus } from '@/features/matches/api';
import { PagedList } from '@/features/matches/paged-list';
import type { MineSearch } from '@/features/matches/schemas';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';

import { myInvitesQuery } from './api';
import { InviteCard } from './invite-card';
import {
  inviteBoxes,
  inviteBoxLabels,
  inviteStatuses,
  inviteStatusLabels,
} from './schemas';

/** Segmento "Convites" da aba Minhas: caixa (recebidos/enviados) e situação nos params. */
export function MyInvitesView({
  search,
  go,
  header,
}: {
  search: MineSearch;
  go: (patch: Partial<MineSearch>) => void;
  header: ReactNode;
}) {
  const { user } = useSession();
  const status = search.status as InviteStatus | undefined;
  const invites = useInfiniteQuery(myInvitesQuery(search.box, status));
  useRefetchOnFocus(invites.refetch);
  const items = invites.data?.pages.flatMap((page) => page.data) ?? [];
  const received = search.box === 'received';
  return (
    <PagedList
      query={invites}
      header={
        <View className='gap-3'>
          {header}
          <Chips
            label='Caixa'
            options={inviteBoxes.map((value) => ({
              value,
              label: inviteBoxLabels[value],
            }))}
            value={search.box}
            clearable={false}
            onChange={(box) =>
              go({ box: box ?? 'received', status: undefined })
            }
          />
          <Chips
            label='Situação do convite'
            options={inviteStatuses.map((value) => ({
              value,
              label: inviteStatusLabels[value],
            }))}
            value={status}
            onChange={(next) => go({ status: next })}
          />
          <View className='h-1' />
        </View>
      }
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
          />
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
            <View className='w-full pt-2'>
              <Button
                variant='secondary'
                label='Minhas partidas'
                onPress={() => go({ view: 'matches', status: undefined })}
              />
            </View>
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
