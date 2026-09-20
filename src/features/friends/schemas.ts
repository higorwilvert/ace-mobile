import { z } from 'zod';

import { formatDay, MONTHS } from '@/features/matches/schemas';
import type { Relationship } from '@/types/api';

// ---------------------------------------------------------------- datas
const pad = (n: number) => String(n).padStart(2, '0');
/** "19/09/2026" sem Intl (Hermes). */
export const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
/** "Desde set. 2026". */
export const sinceLabel = (iso: string) => {
  const d = new Date(iso);
  return `Desde ${MONTHS[d.getMonth()]}. ${d.getFullYear()}`;
};
/** "Pediu em Sáb, 19 set" / "Enviado em Sáb, 19 set". */
export const requestDateLabel = (box: RequestBox, iso: string) =>
  `${box === 'received' ? 'Pediu em' : 'Enviado em'} ${formatDay(new Date(iso))}`;

// -------------------------------------------------------------- relação
export type FriendActionKind = 'self' | 'add' | 'sent' | 'received' | 'friends';
export type FriendAction = {
  kind: FriendActionKind;
  label: string;
  hint: string | null;
};

/** O único botão social que faz sentido para cada estado vindo da API (portado do web). */
export function friendAction(relationship: Relationship): FriendAction {
  switch (relationship.status) {
    case 'SELF':
      return { kind: 'self', label: 'Você', hint: null };
    case 'FRIENDS':
      return {
        kind: 'friends',
        label: 'Amigos',
        hint: relationship.since
          ? `Amigos desde ${shortDate(relationship.since)}`
          : 'Vocês são amigos',
      };
    case 'REQUEST_SENT':
      return {
        kind: 'sent',
        label: 'Pedido enviado',
        hint: 'Aguardando resposta',
      };
    case 'REQUEST_RECEIVED':
      return {
        kind: 'received',
        label: 'Aceitar',
        hint: 'Esta pessoa pediu sua amizade',
      };
    default:
      return { kind: 'add', label: 'Adicionar', hint: null };
  }
}

// ------------------------------------------------------------ navegação
export const playersViews = ['search', 'friends', 'requests'] as const;
export type PlayersView = (typeof playersViews)[number];
export const playersViewLabels: Record<PlayersView, string> = {
  search: 'Buscar',
  friends: 'Amigos',
  requests: 'Pedidos',
};
export const requestBoxes = ['received', 'sent'] as const;
export type RequestBox = (typeof requestBoxes)[number];
export const requestBoxLabels: Record<RequestBox, string> = {
  received: 'Recebidos',
  sent: 'Enviados',
};
/** `view`/`q`/`sportId`/`box` vivem nos params de `/players`, como os filtros de Minhas. */
export const playersSearchSchema = z.object({
  view: z.enum(playersViews).catch('search'),
  q: z.string().trim().max(100).catch(''),
  sportId: z.coerce.number().int().positive().optional().catch(undefined),
  box: z.enum(requestBoxes).catch('received'),
});
export type PlayersSearch = z.infer<typeof playersSearchSchema>;
