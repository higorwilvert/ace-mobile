import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { api } from '@/lib/api-client';
import { makeApplication, makeMatchDetail } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { ApplicationsPanel } from './applications-panel';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

type Config = {
  method?: string;
  url?: string;
  data?: unknown;
  params?: unknown;
};
const match = makeMatchDetail();
const application = makeApplication();
const mockApi = (pending = [application]) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    if (config.method === 'POST')
      return Promise.resolve({
        status: 200,
        data: {
          data: {
            ...application,
            status: String(config.url).endsWith('/approve')
              ? 'CONFIRMED'
              : 'DECLINED',
            teamIndex: 1,
          },
        },
      });
    const status = (config.params as { status?: string } | undefined)?.status;
    return Promise.resolve({
      status: 200,
      data: { data: status === 'PENDING' ? pending : [] },
    });
  });

beforeEach(() => seedToken());
afterEach(() => jest.restoreAllMocks());

describe('ApplicationsPanel', () => {
  it('aprova no time escolhido pelo criador', async () => {
    const spy = mockApi();
    renderWithQuery(<ApplicationsPanel match={match} />);
    expect(await screen.findByText('Bruno Lima')).toBeOnTheScreen();
    // Bruno pediu o Time 2 (pré-selecionado); o criador muda para o Time 1.
    fireEvent.press(screen.getByLabelText('Time 1 para Bruno'));
    fireEvent.press(screen.getByLabelText('Aprovar Bruno'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `/v1/matches/${match.id}/applications/${application.id}/approve`,
          data: { teamIndex: 1 },
        }),
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Bruno entrou no Time 1.'),
    );
  });

  it('recusa e mostra a aba de recusadas vazia', async () => {
    const spy = mockApi();
    renderWithQuery(<ApplicationsPanel match={match} />);
    fireEvent.press(await screen.findByLabelText('Recusar Bruno'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `/v1/matches/${match.id}/applications/${application.id}/reject`,
        }),
      ),
    );
    fireEvent.press(screen.getByText('Recusadas'));
    expect(
      await screen.findByText('Nenhuma candidatura recusada'),
    ).toBeOnTheScreen();
  });

  it('avisa quando os times estão completos e desabilita aprovar', async () => {
    mockApi();
    renderWithQuery(
      <ApplicationsPanel
        match={{
          ...match,
          capacity: { teamSize: 2, total: 4, confirmed: 4, available: 0 },
        }}
      />,
    );
    expect(await screen.findByText(/Times completos/)).toBeOnTheScreen();
    expect(await screen.findByLabelText('Aprovar Bruno')).toBeDisabled();
  });

  it('mostra o vazio de pendentes', async () => {
    mockApi([]);
    renderWithQuery(<ApplicationsPanel match={match} />);
    expect(
      await screen.findByText('Nenhuma candidatura pendente'),
    ).toBeOnTheScreen();
  });
});
