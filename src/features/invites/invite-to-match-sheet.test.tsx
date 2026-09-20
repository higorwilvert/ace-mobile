import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import {
  makeInvite,
  makeMatch,
  makeMatchDetail,
  makePage,
  otherPlayer,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { InviteToMatchSheet } from './invite-to-match-sheet';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

type Config = {
  method?: string;
  url?: string;
  data?: unknown;
  params?: unknown;
};
const open = makeMatch();
const past = makeMatch({
  id: '12121212-1212-4121-8121-121212121212',
  title: 'Já passou',
  scheduledAt: '2020-01-01T10:00:00.000Z',
});
const full = makeMatch({
  id: '13131313-1313-4131-8131-131313131313',
  title: 'Lotada',
  capacity: { teamSize: 2, total: 4, confirmed: 4, available: 0 },
});
const mockApi = (mine = [open, past, full]) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    const url = String(config.url);
    if (config.method === 'POST')
      return Promise.resolve({ status: 201, data: { data: makeInvite() } });
    if (url === '/v1/matches/mine')
      return Promise.resolve({ status: 200, data: makePage(mine) });
    return Promise.resolve({ status: 200, data: { data: makeMatchDetail() } });
  });

beforeEach(() => seedToken());
afterEach(() => jest.restoreAllMocks());

describe('InviteToMatchSheet', () => {
  it('lista só as partidas abertas, futuras e com vaga, e envia o convite', async () => {
    const spy = mockApi();
    const onClose = jest.fn();
    renderWithQuery(
      <InviteToMatchSheet player={otherPlayer} visible onClose={onClose} />,
    );
    expect(await screen.findByText('Padel de sábado')).toBeOnTheScreen();
    expect(screen.queryByText('Já passou')).not.toBeOnTheScreen();
    expect(screen.queryByText('Lotada')).not.toBeOnTheScreen();
    const mine = spy.mock.calls
      .map(([c]) => c as Config)
      .find((c) => c.url === '/v1/matches/mine');
    expect(mine?.params).toMatchObject({ role: 'creator', status: 'OPEN' });
    fireEvent.press(screen.getByLabelText('Convidar para Padel de sábado'));
    expect(await screen.findByText('Enviar convite')).toBeOnTheScreen();
    expect(screen.getByText('Bruno Lima')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Enviar convite'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `/v1/matches/${open.id}/invites`,
          data: { inviteeUserId: otherPlayer.id },
        }),
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('com escopo da recomendação, só oferece partidas da mesma modalidade, formato e composição', async () => {
    const singles = makeMatch({
      id: '15151515-1515-4151-8151-151515151515',
      title: 'Simples livre',
      teamSize: 1,
      genderPolicy: 'OPEN',
    });
    const same = makeMatch({
      id: '16161616-1616-4161-8161-161616161616',
      title: 'Duplas livres',
      genderPolicy: 'OPEN',
    });
    mockApi([open, singles, same]);
    renderWithQuery(
      <InviteToMatchSheet
        player={otherPlayer}
        visible
        onClose={jest.fn()}
        scope={{ sportId: 1, teamSize: 2, genderPolicy: 'OPEN' }}
      />,
    );
    expect(await screen.findByText('Duplas livres')).toBeOnTheScreen();
    expect(screen.queryByText('Padel de sábado')).not.toBeOnTheScreen(); // FEMALE
    expect(screen.queryByText('Simples livre')).not.toBeOnTheScreen(); // 1v1
    expect(
      screen.getByText(/mesma modalidade, formato e composição/),
    ).toBeOnTheScreen();
  });

  it('com escopo e nenhuma partida compatível, explica o que criar', async () => {
    mockApi([open]);
    renderWithQuery(
      <InviteToMatchSheet
        player={otherPlayer}
        visible
        onClose={jest.fn()}
        scope={{ sportId: 1, teamSize: 2, genderPolicy: 'MIXED' }}
      />,
    );
    expect(
      await screen.findByText('Nenhuma partida aberta para convidar'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/composição desta busca/)).toBeOnTheScreen();
  });

  it('sem partida elegível, sugere criar uma', async () => {
    mockApi([past, full]);
    const onClose = jest.fn();
    renderWithQuery(
      <InviteToMatchSheet player={otherPlayer} visible onClose={onClose} />,
    );
    expect(
      await screen.findByText('Nenhuma partida aberta para convidar'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Criar partida'));
    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/matches/new');
  });
});
