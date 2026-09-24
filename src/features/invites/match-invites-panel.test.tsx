import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { api } from '@/lib/api-client';
import { makeInvite, makeMatchDetail, makePage } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { MatchInvitesPanel } from './match-invites-panel';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

type Config = { method?: string; url?: string; params?: unknown };
const match = makeMatchDetail();
const pending = makeInvite();
const declined = makeInvite({
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  status: 'DECLINED',
  invitee: { ...pending.invitee, fullName: 'Carla Dias' },
});
const mockApi = () =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    if (config.method === 'POST')
      return Promise.resolve({
        status: 200,
        data: { data: { ...pending, status: 'CANCELLED' } },
      });
    return Promise.resolve({
      status: 200,
      data: makePage(
        (config.params as { status?: string } | undefined)?.status === 'PENDING'
          ? [pending]
          : [pending, declined],
      ),
    });
  });

beforeEach(() => seedToken());
afterEach(() => jest.restoreAllMocks());

describe('MatchInvitesPanel', () => {
  it('lista os pendentes com dados do convidado e cancela após confirmar', async () => {
    const spy = mockApi();
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    const onInvite = jest.fn();
    renderWithQuery(
      <MatchInvitesPanel match={match} canInvite onInvite={onInvite} />,
    );
    expect(await screen.findByText('Bruno Lima')).toBeOnTheScreen();
    expect(screen.getByText('Categoria C')).toBeOnTheScreen();
    expect(screen.getByText('Platina I')).toBeOnTheScreen();
    expect(screen.getByText('Time 2')).toBeOnTheScreen();
    expect(screen.getByText('Bora?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Convidar jogador'));
    expect(onInvite).toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Cancelar convite para Bruno Lima'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `/v1/matches/${match.id}/invites/${pending.id}/cancel`,
        }),
      ),
    );
  });

  it('a aba Respondidos carrega todos e filtra os pendentes', async () => {
    mockApi();
    renderWithQuery(
      <MatchInvitesPanel
        match={match}
        canInvite={false}
        onInvite={jest.fn()}
      />,
    );
    await screen.findByText('Bruno Lima');
    expect(screen.queryByText('Convidar jogador')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('Respondidos'));
    expect(await screen.findByText('Carla Dias')).toBeOnTheScreen();
    expect(screen.getByText('Recusado')).toBeOnTheScreen();
    expect(screen.queryByText('Bruno Lima')).not.toBeOnTheScreen();
  });

  it('vazio quando ninguém foi convidado', async () => {
    jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: makePage([]) });
    renderWithQuery(
      <MatchInvitesPanel match={match} canInvite onInvite={jest.fn()} />,
    );
    expect(
      await screen.findByText('Nenhum convite aguardando resposta'),
    ).toBeOnTheScreen();
  });
});
