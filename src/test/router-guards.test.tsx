import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderRouter, screen } from 'expo-router/testing-library';
import type { PropsWithChildren } from 'react';
import { Text } from 'react-native';

import { api } from '@/lib/api-client';

import TabsLayout from '../../app/(app)/(tabs)/_layout';
import AppLayout from '../../app/(app)/_layout';
import AuthLayout from '../../app/(auth)/_layout';

import { makeUser, makePage } from './fixtures';
import { mockSession, seedToken } from './session-mock';

jest.mock('@/features/auth/session');

// A barra de abas consulta o contador de convites (T31): precisa de um
// QueryClient e de uma API que responda vazio.
const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
const renderApp = (initialUrl: string) =>
  renderRouter(routes, { initialUrl, wrapper });
beforeEach(() => {
  seedToken();
  jest
    .spyOn(api, 'request')
    .mockResolvedValue({ status: 200, data: makePage([]) });
});
afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
});

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/(tabs)/_layout': TabsLayout,
  '(app)/(tabs)/index': () => <Text>Tela inicial</Text>,
  '(app)/(tabs)/profile': () => <Text>Tela de perfil</Text>,
  '(app)/(tabs)/for-you': () => <Text>Tela de recomendações</Text>,
  '(app)/players/index': () => <Text>Tela de jogadores</Text>,
  '(app)/onboarding': () => <Text>Assistente</Text>,
  '(auth)/_layout': AuthLayout,
  '(auth)/login': () => <Text>Entrar</Text>,
  '(auth)/register': () => <Text>Criar conta</Text>,
};

describe('route guards', () => {
  it('sends a signed-out visitor from the app to /login', async () => {
    mockSession({ status: 'signed-out' });
    const result = renderApp('/');
    expect(await screen.findByText('Entrar')).toBeTruthy();
    expect(result.getPathname()).toBe('/login');
  });
  it('manda quem está logado do login para o onboarding', async () => {
    mockSession({ status: 'signed-in', user: makeUser() });
    const result = renderApp('/login');
    expect(await screen.findByText('Assistente')).toBeTruthy();
    expect(result.getPathname()).toBe('/onboarding');
  });
  it('shows the loading state while the session boots', () => {
    mockSession({ status: 'loading' });
    renderApp('/');
    expect(screen.getByLabelText('Preparando tudo para você…')).toBeTruthy();
  });
  it('lets a signed-in user open the home tab at /', async () => {
    mockSession({ status: 'signed-in', user: makeUser() });
    const result = renderApp('/');
    expect(await screen.findByText('Tela inicial')).toBeTruthy();
    expect(result.getPathname()).toBe('/');
  });
  it('lets a signed-in user open the for-you tab', async () => {
    mockSession({ status: 'signed-in', user: makeUser() });
    const result = renderApp('/for-you');
    expect(await screen.findByText('Tela de recomendações')).toBeTruthy();
    expect(result.getPathname()).toBe('/for-you');
  });
  it('lets a signed-in user open /players (T33)', async () => {
    mockSession({ status: 'signed-in', user: makeUser() });
    const result = renderApp('/players');
    expect(await screen.findByText('Tela de jogadores')).toBeTruthy();
    expect(result.getPathname()).toBe('/players');
  });
  it('lets a signed-in user open the profile tab', async () => {
    mockSession({ status: 'signed-in', user: makeUser() });
    const result = renderApp('/profile');
    expect(await screen.findByText('Tela de perfil')).toBeTruthy();
    expect(result.getPathname()).toBe('/profile');
  });
});
