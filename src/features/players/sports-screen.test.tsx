import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { api } from '@/lib/api-client';
import { makePlayerProfile, makeSport } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { SportsScreen } from './sports-screen';

type Config = { method?: string; url?: string; data?: unknown };
const p1 = '8f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e51';
const p2 = '8f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e52';
const tenis = makeSport({
  id: 2,
  slug: 'tenis',
  name: 'Tênis',
  supportsSingles: true,
  requiresSidePreference: false,
});
const mockList = (profiles: unknown[], sports = [makeSport(), tenis]) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    if (config.method === 'DELETE')
      return Promise.resolve({ status: 204, data: '' });
    if (config.method !== 'GET')
      return Promise.resolve({
        status: 200,
        data: { data: makePlayerProfile() },
      });
    return Promise.resolve({
      status: 200,
      data: {
        data: String(config.url).includes('sport-profiles') ? profiles : sports,
      },
    });
  });

beforeEach(() => seedToken());
afterEach(() => jest.restoreAllMocks());

describe('SportsScreen', () => {
  it('mostra carregando', () => {
    jest.spyOn(api, 'request').mockReturnValue(new Promise(() => {}));
    renderWithQuery(<SportsScreen />);
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  });

  it('mostra o vazio com convite para adicionar', async () => {
    mockList([]);
    renderWithQuery(<SportsScreen />);
    expect(
      await screen.findByText('Nenhuma modalidade ainda'),
    ).toBeOnTheScreen();
  });

  it('mostra erro com nova tentativa', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(new Error('rede'));
    renderWithQuery(<SportsScreen />);
    expect(await screen.findByText('Tentar novamente')).toBeOnTheScreen();
  });

  it('lista o perfil com selo de principal e detalhes', async () => {
    mockList([makePlayerProfile()]);
    renderWithQuery(<SportsScreen />);
    expect(await screen.findByText('Padel')).toBeOnTheScreen();
    expect(screen.getByText('Principal')).toBeOnTheScreen();
    expect(screen.getByText(/Categoria C/)).toBeOnTheScreen();
    expect(screen.getByText(/Direita/)).toBeOnTheScreen();
    expect(screen.getByText(/3 anos/)).toBeOnTheScreen();
    expect(screen.getByText(/2 vezes por semana/)).toBeOnTheScreen();
    expect(screen.queryByText('Tornar principal')).not.toBeOnTheScreen();
  });

  it('tornar principal manda apenas isPrincipal true no perfil escolhido', async () => {
    const spy = mockList([
      makePlayerProfile({ id: p1, isPrincipal: true }),
      makePlayerProfile({ id: p2, isPrincipal: false, sport: tenis }),
    ]);
    renderWithQuery(<SportsScreen />);
    fireEvent.press(await screen.findByText('Tornar principal'));
    await waitFor(() =>
      expect(spy.mock.calls.some((call) => call[0].method === 'PATCH')).toBe(
        true,
      ),
    );
    const patch = spy.mock.calls.find((call) => call[0].method === 'PATCH');
    expect(patch?.[0].url).toBe(`/v1/users/me/sport-profiles/${p2}`);
    expect(patch?.[0].data).toEqual({ isPrincipal: true });
  });

  it('adicionar só oferece as modalidades que faltam e cria com POST', async () => {
    const spy = mockList([makePlayerProfile()]);
    renderWithQuery(<SportsScreen />);
    fireEvent.press(await screen.findByText('Adicionar modalidade'));
    fireEvent.press(screen.getByRole('button', { name: 'Modalidade' }));
    expect(screen.queryByRole('button', { name: 'Padel' })).toBeNull();
    fireEvent.press(await screen.findByRole('button', { name: 'Tênis' }));
    fireEvent.press(screen.getByRole('button', { name: 'Categoria' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Categoria D' }));
    fireEvent.changeText(screen.getByLabelText('Vezes por semana'), '3');
    fireEvent.press(screen.getByText('Salvar'));
    await waitFor(() =>
      expect(spy.mock.calls.some((call) => call[0].method === 'POST')).toBe(
        true,
      ),
    );
    const post = spy.mock.calls.find((call) => call[0].method === 'POST');
    expect(post?.[0].data).toEqual({
      sportId: 2,
      categoryCode: 'D',
      preferredSide: null,
      yearsPracticing: null,
      playFrequencyWeek: 3,
      isPrincipal: false,
    });
  });

  it('editar trava a modalidade e faz PATCH sem sportId', async () => {
    const spy = mockList([makePlayerProfile({ id: p1 })]);
    renderWithQuery(<SportsScreen />);
    fireEvent.press(await screen.findByLabelText('Editar Padel'));
    expect(
      await screen.findByRole('button', { name: 'Modalidade' }),
    ).toBeDisabled();
    fireEvent.changeText(screen.getByLabelText('Tempo de prática (anos)'), '5');
    fireEvent.press(screen.getByText('Salvar'));
    await waitFor(() =>
      expect(spy.mock.calls.some((call) => call[0].method === 'PATCH')).toBe(
        true,
      ),
    );
    const patch = spy.mock.calls.find((call) => call[0].method === 'PATCH');
    expect(patch?.[0].url).toBe(`/v1/users/me/sport-profiles/${p1}`);
    expect(patch?.[0].data).toEqual({
      categoryCode: 'C',
      preferredSide: 'RIGHT',
      yearsPracticing: 5,
      playFrequencyWeek: 2,
      isPrincipal: true,
    });
  });

  it('excluir confirma no alerta e chama DELETE', async () => {
    const spy = mockList([makePlayerProfile({ id: p1 })]);
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) =>
        buttons?.find((button) => button.style === 'destructive')?.onPress?.(),
      );
    renderWithQuery(<SportsScreen />);
    fireEvent.press(await screen.findByLabelText('Excluir Padel'));
    await waitFor(() =>
      expect(spy.mock.calls.some((call) => call[0].method === 'DELETE')).toBe(
        true,
      ),
    );
    expect(jest.mocked(Alert.alert).mock.calls[0][1]).toMatch(/preservad/i);
  });
});
