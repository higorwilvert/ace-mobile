import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import { makePlayerProfile, makeSport, makeUser } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { OnboardingScreen } from './onboarding-screen';

jest.mock('@/features/auth/session');
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ...jest.requireActual('expo-router'),
    Redirect: ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text>,
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
  };
});

type Config = { method?: string; url?: string; data?: unknown };
const mockApi = (profiles: unknown[], sports = [makeSport()]) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    if (config.method === 'POST')
      return Promise.resolve({
        status: 201,
        data: { data: makePlayerProfile() },
      });
    if (config.method === 'PATCH')
      return Promise.resolve({ status: 200, data: { data: makeUser() } });
    if (String(config.url).includes('sport-profiles'))
      return Promise.resolve({ status: 200, data: { data: profiles } });
    return Promise.resolve({ status: 200, data: { data: sports } });
  });

beforeEach(async () => {
  mockSession({ status: 'signed-in', user: makeUser() });
  await seedToken();
});
afterEach(() => jest.restoreAllMocks());

describe('OnboardingScreen', () => {
  it('mostra carregando enquanto busca os perfis', () => {
    jest.spyOn(api, 'request').mockReturnValue(new Promise(() => {}));
    renderWithQuery(<OnboardingScreen />);
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  });

  it('mostra erro com nova tentativa quando os perfis falham', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(new Error('rede'));
    renderWithQuery(<OnboardingScreen />);
    expect(await screen.findByText('Tentar novamente')).toBeOnTheScreen();
  });

  it('manda para o início quem já tem perfil esportivo', async () => {
    mockApi([makePlayerProfile()]);
    renderWithQuery(<OnboardingScreen />);
    expect(await screen.findByText('redirect:/')).toBeOnTheScreen();
  });

  it('pula a etapa opcional sem chamar a API', async () => {
    const spy = mockApi([]);
    renderWithQuery(<OnboardingScreen />);
    expect(await screen.findByLabelText('Etapa 3 de 5')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Pular'));
    expect(await screen.findByText('Qual é o seu esporte?')).toBeOnTheScreen();
    await screen.findByText('Padel');
    expect(
      spy.mock.calls.filter((call) => call[0].method === 'PATCH'),
    ).toHaveLength(0);
  });

  it('salva os extras com vazio virando null e avança', async () => {
    const spy = mockApi([]);
    renderWithQuery(<OnboardingScreen />);
    fireEvent.changeText(await screen.findByLabelText('Bio'), 'Jogo à noite.');
    fireEvent.press(screen.getByText('Salvar e continuar'));
    expect(await screen.findByText('Qual é o seu esporte?')).toBeOnTheScreen();
    await screen.findByText('Padel');
    const patch = spy.mock.calls.find((call) => call[0].method === 'PATCH');
    expect(patch?.[0].data).toEqual({
      phone: null,
      avatarUrl: null,
      bio: 'Jogo à noite.',
      dominantHand: null,
    });
  });

  it('só continua da etapa 4 com modalidade escolhida e permite sair', async () => {
    mockApi([]);
    renderWithQuery(<OnboardingScreen />);
    fireEvent.press(await screen.findByText('Pular'));
    await screen.findByText('Padel');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    fireEvent.press(screen.getByText('Agora não'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('cria o primeiro perfil como principal e mostra a conclusão', async () => {
    const spy = mockApi([]);
    renderWithQuery(<OnboardingScreen />);
    fireEvent.press(await screen.findByText('Pular'));
    fireEvent.press(await screen.findByText('Padel'));
    fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Como você joga')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Perfil principal')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Categoria' }));
    fireEvent.press(await screen.findByText('Categoria C'));
    fireEvent.press(screen.getByRole('button', { name: 'Lado preferido' }));
    fireEvent.press(await screen.findByText('Direita'));
    fireEvent.press(screen.getByText('Concluir'));
    await waitFor(() =>
      expect(screen.getByText(/tudo pronto/i)).toBeOnTheScreen(),
    );
    const created = spy.mock.calls.find((call) => call[0].method === 'POST');
    expect(created?.[0].data).toEqual({
      sportId: 1,
      categoryCode: 'C',
      preferredSide: 'RIGHT',
      yearsPracticing: null,
      playFrequencyWeek: null,
      isPrincipal: true,
    });
    fireEvent.press(screen.getByText('Definir minha disponibilidade'));
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockPush).toHaveBeenCalledWith('/availability');
  });
});
