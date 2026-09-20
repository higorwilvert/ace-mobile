import type { InviteStatus, MatchSummary } from '@/features/matches/api';

import type { Invite } from './api';

export const inviteStatusLabels: Record<InviteStatus, string> = {
  PENDING: 'Pendente',
  ACCEPTED: 'Aceito',
  DECLINED: 'Recusado',
  CANCELLED: 'Cancelado',
};

export type InviteRole = 'invitee' | 'inviter' | 'none';
export type InvitePermissions = {
  role: InviteRole;
  canAccept: boolean;
  canDecline: boolean;
  canCancel: boolean;
  /** Por que aceitar não está disponível num convite ainda pendente. */
  blockedReason: string | null;
  tone: 'pending' | 'stale' | 'accepted' | 'declined' | 'cancelled';
};

/**
 * Ações possíveis num convite, derivadas só de dados da API: papel do
 * observador, status do convite e estado/horário/vagas da partida. Portada
 * literalmente do web.
 */
export function invitePermissions(
  invite: Pick<Invite, 'status'> & {
    inviter: { id: string };
    invitee: { id: string };
    match: Pick<MatchSummary, 'status' | 'scheduledAt' | 'capacity'>;
  },
  viewerId: string,
  now = new Date(),
): InvitePermissions {
  const role: InviteRole =
    invite.invitee.id === viewerId
      ? 'invitee'
      : invite.inviter.id === viewerId
        ? 'inviter'
        : 'none';
  const pending = invite.status === 'PENDING';
  const { match } = invite;
  const future = new Date(match.scheduledAt).getTime() > now.getTime();
  const blockedReason = !pending
    ? null
    : match.status === 'CANCELLED'
      ? 'A partida foi cancelada.'
      : match.status === 'COMPLETED' || match.status === 'IN_PROGRESS'
        ? 'A partida já aconteceu.'
        : !future
          ? 'O horário da partida já passou.'
          : match.status !== 'OPEN' || match.capacity.available === 0
            ? 'Os times já estão completos.'
            : null;
  return {
    role,
    canAccept: role === 'invitee' && pending && blockedReason === null,
    canDecline: role === 'invitee' && pending,
    canCancel: role === 'inviter' && pending,
    blockedReason,
    tone: pending
      ? blockedReason
        ? 'stale'
        : 'pending'
      : (invite.status.toLowerCase() as 'accepted' | 'declined' | 'cancelled'),
  };
}

export const inviteBoxes = ['received', 'sent'] as const;
export type InviteBox = (typeof inviteBoxes)[number];
export const inviteBoxLabels: Record<InviteBox, string> = {
  received: 'Recebidos',
  sent: 'Enviados',
};
export const inviteStatuses = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
] as const;
