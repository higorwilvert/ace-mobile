import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import { makeUser, otherPlayer } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import type { MatchActivity } from './api';
import { MatchSocial } from './match-social';

jest.mock('@/features/auth/session');

const matchId = '7b0f3c52-9a41-4d2e-8f6b-1c3d5e7f9a0b';
const me = makeUser();
const photo = (n: number, mine: boolean) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  url: `https://cdn.example.test/matches/${n}.webp`,
  uploadedBy: mine
    ? {
        id: me.id,
        fullName: me.fullName,
        avatarUrl: null,
        city: me.city,
        state: me.state,
      }
    : otherPlayer,
  createdAt: new Date().toISOString(),
  canDelete: mine,
});
const mockApi = (activity: MatchActivity) =>
  jest
    .spyOn(api, 'request')
    .mockImplementation((config: { url?: string }) =>
      Promise.resolve(
        config.url === `/v1/matches/${matchId}/activity`
          ? { status: 200, data: { data: activity } }
          : { status: 200, data: { data: [], meta: { nextCursor: null } } },
      ),
    );

beforeEach(async () => {
  mockSession({ status: 'signed-in', user: me });
  await seedToken();
});
afterEach(() => jest.restoreAllMocks());

describe('MatchSocial (T36)', () => {
  it('galeria: quem jogou envia, abre a foto e só remove a própria', async () => {
    mockApi({
      photos: [photo(1, false), photo(2, true), photo(3, false)],
      likeCount: 4,
      likedByMe: true,
      commentCount: 0,
      viewer: { canAddPhoto: true, canInteract: true },
    });
    renderWithQuery(<MatchSocial matchId={matchId} />);
    expect(await screen.findAllByLabelText(/^Abrir foto/)).toHaveLength(3);
    expect(screen.getByText('Adicionar foto')).toBeOnTheScreen();
    expect(screen.getByText('3 de 6 fotos')).toBeOnTheScreen();
    expect(screen.getByLabelText('Curtir, 4 curtidas')).toBeSelected();
    expect(screen.getByText('Comentar')).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText(/^Abrir foto 1 de 3/));
    expect(screen.getByText('Foto 1 de 3')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Remover foto')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Fechar'));

    fireEvent.press(screen.getByLabelText(/^Abrir foto 2 de 3/));
    expect(screen.getByText('Foto 2 de 3')).toBeOnTheScreen();
    expect(screen.getByLabelText('Remover foto')).toBeOnTheScreen();
  });

  it('quem só vê: sem envio, sem curtir e sem campo de comentário', async () => {
    mockApi({
      photos: [],
      likeCount: 2,
      likedByMe: false,
      commentCount: 0,
      viewer: { canAddPhoto: false, canInteract: false },
    });
    renderWithQuery(<MatchSocial matchId={matchId} />);
    expect(
      await screen.findByText('Nenhuma foto desta partida.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Adicionar foto')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Curtir/)).not.toBeOnTheScreen();
    expect(screen.getByLabelText('2 curtidas')).toBeOnTheScreen();
    expect(screen.queryByText('Comentar')).not.toBeOnTheScreen();
    expect(
      screen.getByText(
        'Só quem jogou e os amigos de quem jogou podem curtir e comentar.',
      ),
    ).toBeOnTheScreen();
  });
});
