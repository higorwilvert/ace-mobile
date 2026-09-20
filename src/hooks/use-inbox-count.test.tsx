import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { api } from '@/lib/api-client';
import { makePage } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { useInboxCount } from './use-inbox-count';

function Probe() {
  const { invites, friendRequests, label } = useInboxCount();
  return (
    <Text>
      {`invites=${invites}/${label(invites) ?? 'none'} requests=${friendRequests}/${label(friendRequests) ?? 'none'}`}
    </Text>
  );
}
const page = (n: number, nextCursor: string | null = null) =>
  makePage(
    Array.from({ length: n }, (_, i) => ({ id: `item-${i}` })),
    nextCursor,
  );
const mockApi = (invites: number, requests: number, more = false) =>
  jest.spyOn(api, 'request').mockImplementation((config: { url?: string }) =>
    Promise.resolve({
      status: 200,
      data: String(config.url).endsWith('/friend-requests')
        ? page(requests, more ? 'next' : null)
        : page(invites, more ? 'next' : null),
    }),
  );

beforeEach(() => seedToken());
afterEach(() => jest.restoreAllMocks());

describe('useInboxCount', () => {
  it('conta convites e pedidos recebidos da primeira página de cada caixa', async () => {
    const request = mockApi(2, 1);
    renderWithQuery(<Probe />);
    expect(
      await screen.findByText('invites=2/2 requests=1/1'),
    ).toBeOnTheScreen();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/v1/users/me/invites',
        params: { direction: 'received', status: 'PENDING', limit: 50 },
      }),
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/v1/users/me/friend-requests',
        params: { direction: 'received', limit: 50 },
      }),
    );
  });
  it('mostra "50+" quando há mais páginas', async () => {
    mockApi(50, 50, true);
    renderWithQuery(<Probe />);
    expect(
      await screen.findByText('invites=51/50+ requests=51/50+'),
    ).toBeOnTheScreen();
  });
  it('não mostra badge sem pendências', async () => {
    mockApi(0, 0);
    renderWithQuery(<Probe />);
    expect(
      await screen.findByText('invites=0/none requests=0/none'),
    ).toBeOnTheScreen();
  });
});
