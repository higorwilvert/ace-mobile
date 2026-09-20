import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { api } from '@/lib/api-client';
import { makeAvailability } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { AvailabilityScreen } from './availability-screen';

type Config = { method?: string; url?: string; data?: unknown };
const mockList = (windows: unknown[]) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    if (config.method === 'DELETE')
      return Promise.resolve({ status: 204, data: '' });
    if (config.method === 'GET')
      return Promise.resolve({ status: 200, data: { data: windows } });
    return Promise.resolve({
      status: 201,
      data: { data: makeAvailability(config.data as object) },
    });
  });
const uuidA = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6a';
const uuidB = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6b';
const pick = async (label: string, option: string) => {
  fireEvent.press(screen.getByRole('button', { name: label }));
  // Opções do PickerField são botões; os cabeçalhos de dia da tela não.
  fireEvent.press(await screen.findByRole('button', { name: option }));
};

beforeEach(() => seedToken());
afterEach(() => jest.restoreAllMocks());

describe('AvailabilityScreen', () => {
  it('mostra carregando', () => {
    jest.spyOn(api, 'request').mockReturnValue(new Promise(() => {}));
    renderWithQuery(<AvailabilityScreen />);
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  });

  it('mostra o vazio quando não há janelas', async () => {
    mockList([]);
    renderWithQuery(<AvailabilityScreen />);
    expect(await screen.findByText('Sem horários ainda')).toBeOnTheScreen();
  });

  it('mostra erro com nova tentativa', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(new Error('rede'));
    renderWithQuery(<AvailabilityScreen />);
    expect(await screen.findByText('Tentar novamente')).toBeOnTheScreen();
  });

  it('lista a janela no dia certo, de segunda a domingo', async () => {
    mockList([
      makeAvailability({ id: uuidA, dayOfWeek: 0 }),
      makeAvailability({ id: uuidB, dayOfWeek: 1 }),
    ]);
    renderWithQuery(<AvailabilityScreen />);
    expect(await screen.findAllByText('19:00 — 21:00')).toHaveLength(2);
    const days = screen
      .getAllByLabelText(/^Dia: /)
      .map((node) => node.props.accessibilityLabel);
    expect(days[0]).toBe('Dia: Segunda');
    expect(days[6]).toBe('Dia: Domingo');
    expect(screen.getByText(/privada/i)).toBeOnTheScreen();
  });

  it('bloqueia sobreposição antes de chamar a API', async () => {
    const spy = mockList([
      makeAvailability({ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }),
    ]);
    renderWithQuery(<AvailabilityScreen />);
    // "Adicionar horário" abre já na segunda-feira.
    fireEvent.press(await screen.findByText('Adicionar horário'));
    await pick('Início', '09:30');
    await pick('Fim', '10:30');
    fireEvent.press(screen.getByText('Salvar horário'));
    expect(await screen.findByText(/se sobrepõe/i)).toBeOnTheScreen();
    expect(
      spy.mock.calls.filter((call) => call[0].method === 'POST'),
    ).toHaveLength(0);
  });

  it('cria uma janela nova e trava o fuso quando já existe outra', async () => {
    const spy = mockList([makeAvailability({ dayOfWeek: 1 })]);
    renderWithQuery(<AvailabilityScreen />);
    fireEvent.press(await screen.findByText('Adicionar horário'));
    expect(screen.getByRole('button', { name: 'Fuso horário' })).toBeDisabled();
    await pick('Dia da semana', 'Quarta');
    await pick('Início', '08:00');
    await pick('Fim', '09:30');
    fireEvent.press(screen.getByText('Salvar horário'));
    await waitFor(() =>
      expect(
        spy.mock.calls.find((call) => call[0].method === 'POST'),
      ).toBeTruthy(),
    );
    const post = spy.mock.calls.find((call) => call[0].method === 'POST');
    expect(post?.[0].data).toEqual({
      dayOfWeek: 3,
      startTime: '08:00',
      endTime: '09:30',
      timeZone: 'America/Sao_Paulo',
    });
  });

  it('exclui após confirmar no alerta nativo', async () => {
    const spy = mockList([makeAvailability({ id: uuidA, dayOfWeek: 1 })]);
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) =>
        buttons?.find((button) => button.style === 'destructive')?.onPress?.(),
      );
    renderWithQuery(<AvailabilityScreen />);
    fireEvent.press(await screen.findByLabelText('Excluir 19:00 — 21:00'));
    await waitFor(() =>
      expect(
        spy.mock.calls.find((call) => call[0].method === 'DELETE'),
      ).toBeTruthy(),
    );
    expect(
      spy.mock.calls.find((call) => call[0].method === 'DELETE')?.[0].url,
    ).toBe(`/v1/users/me/availability/${uuidA}`);
  });
});
