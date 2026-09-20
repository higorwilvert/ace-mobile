import { fireEvent, render, screen } from '@testing-library/react-native';

import { makeSport, makeUser } from '@/test/fixtures';

import { RecommendationForm } from './recommendation-form';
import type { RecommendationDraft } from './schemas';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

const padel = makeSport(); // só duplas
const tenis = makeSport({
  id: 2,
  slug: 'tenis',
  name: 'Tênis',
  defaultTeamSize: 1,
  supportsSingles: true,
  supportsDoubles: true,
  requiresSidePreference: false,
});
const initial: RecommendationDraft = {
  sportId: '1',
  teamSize: '2',
  mode: 'SAME_GENDER',
  limit: '10',
  date: '',
  time: '',
  endDate: '',
  endTime: '',
  durationMinutes: '90',
};
const setup = (
  props: Partial<Parameters<typeof RecommendationForm>[0]> = {},
) => {
  const onSubmit = jest.fn();
  render(
    <RecommendationForm
      sports={[padel, tenis]}
      user={makeUser()}
      kind='players'
      initial={initial}
      busy={false}
      hasResult={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return onSubmit;
};

describe('RecommendationForm', () => {
  it('envia os padrões validados e refaz formato/composição ao trocar de modalidade', () => {
    const onSubmit = setup();
    expect(screen.queryByText('Simples · 1v1')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('Buscar sugestões'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        sportId: 1,
        teamSize: 2,
        mode: 'SAME_GENDER',
        limit: 10,
      }),
    );
    fireEvent.press(screen.getByText('Tênis'));
    expect(screen.getByText('Simples · 1v1')).toBeOnTheScreen();
    expect(screen.queryByText('Duplas mistas')).not.toBeOnTheScreen(); // tênis abre em 1v1
    fireEvent.press(screen.getByText('Duplas · 2v2'));
    fireEvent.press(screen.getByText('Duplas mistas'));
    fireEvent.press(screen.getByText('Buscar sugestões'));
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sportId: 2,
        teamSize: 2,
        mode: 'MIXED_PARTNER',
      }),
    );
  });
  it('sem gênero no perfil, mesmo gênero é recusado e o aviso leva aos dados pessoais', () => {
    const onSubmit = setup({ user: makeUser({ gender: null }) });
    fireEvent.press(screen.getByText('Buscar sugestões'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe seu gênero no perfil ou escolha composição livre',
    );
    fireEvent.press(screen.getByText(/complete seu perfil/));
    expect(mockPush).toHaveBeenCalledWith('/personal');
    fireEvent.press(screen.getByText('Composição livre'));
    fireEvent.press(screen.getByText('Buscar sugestões'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'OPEN' }),
    );
  });
  it('horário: valor passado é recusado; remover o filtro limpa os campos', () => {
    const onSubmit = setup({
      initial: { ...initial, date: '2020-01-01', time: '10:00' },
    });
    expect(screen.getByText('Remover filtro de horário')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Buscar sugestões'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Escolha um horário futuro',
    );
    fireEvent.press(screen.getByText('Remover filtro de horário'));
    expect(screen.getByText('Filtrar por horário')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Buscar sugestões'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ date: '', time: '' }),
    );
  });
  it('partidas mostram janela (fim) e a nota de 14 dias; jogadores mostram duração', () => {
    setup({ kind: 'matches' });
    fireEvent.press(screen.getByText('Filtrar por horário'));
    expect(screen.getByText('Data final')).toBeOnTheScreen();
    expect(screen.getByText(/próximos 14 dias/)).toBeOnTheScreen();
    expect(screen.queryByText('Duração')).not.toBeOnTheScreen();
  });
  it('com resultado, o botão vira "Atualizar sugestões" e busy desabilita', () => {
    setup({ hasResult: true, busy: true });
    expect(screen.getByText('Buscando…')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Buscando…' })).toBeDisabled();
  });
});
