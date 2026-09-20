import { makeMatch } from '@/test/fixtures';

import { invitePermissions } from './schemas';

const now = new Date('2026-09-13T12:00:00.000Z');
const ana = '11111111-1111-4111-8111-111111111111';
const bruno = '22222222-2222-4222-8222-222222222222';
const carla = '33333333-3333-4333-8333-333333333333';
const person = (id: string) => ({ id });
const base = makeMatch();
const invite = (
  patch: Partial<Parameters<typeof invitePermissions>[0]> = {},
  match: Partial<typeof base> = {},
) => ({
  status: 'PENDING' as const,
  inviter: person(ana),
  invitee: person(bruno),
  match: {
    ...base,
    status: 'OPEN' as const,
    scheduledAt: '2026-09-20T18:00:00.000Z',
    capacity: { teamSize: 2 as const, total: 4, confirmed: 1, available: 3 },
    ...match,
  },
  ...patch,
});

describe('invitePermissions', () => {
  it('convidado aceita ou recusa um convite pendente de partida aberta e futura', () => {
    expect(invitePermissions(invite(), bruno, now)).toEqual({
      role: 'invitee',
      canAccept: true,
      canDecline: true,
      canCancel: false,
      blockedReason: null,
      tone: 'pending',
    });
  });
  it('só o convidante cancela; terceiros não têm ação', () => {
    expect(invitePermissions(invite(), ana, now)).toMatchObject({
      role: 'inviter',
      canAccept: false,
      canDecline: false,
      canCancel: true,
    });
    expect(invitePermissions(invite(), carla, now)).toMatchObject({
      role: 'none',
      canAccept: false,
      canDecline: false,
      canCancel: false,
    });
  });
  it('bloqueia aceitar (mas não recusar) quando a partida já não recebe jogadores', () => {
    const cases: [Partial<typeof base>, string][] = [
      [{ status: 'CANCELLED' }, 'A partida foi cancelada.'],
      [{ status: 'COMPLETED' }, 'A partida já aconteceu.'],
      [
        { scheduledAt: '2026-09-01T18:00:00.000Z' },
        'O horário da partida já passou.',
      ],
      [
        {
          status: 'CONFIRMED',
          capacity: { teamSize: 2, total: 4, confirmed: 4, available: 0 },
        },
        'Os times já estão completos.',
      ],
    ];
    for (const [match, reason] of cases)
      expect(invitePermissions(invite({}, match), bruno, now)).toMatchObject({
        canAccept: false,
        canDecline: true,
        blockedReason: reason,
        tone: 'stale',
      });
  });
  it('convites decididos não têm ação e mantêm o tom do status', () => {
    for (const status of ['ACCEPTED', 'DECLINED', 'CANCELLED'] as const) {
      expect(invitePermissions(invite({ status }), bruno, now)).toMatchObject({
        canAccept: false,
        canDecline: false,
        canCancel: false,
        blockedReason: null,
        tone: status.toLowerCase(),
      });
    }
  });
});
