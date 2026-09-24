import { fireEvent, render, screen } from '@testing-library/react-native';

import { makePublicProfile, makeTier, makeTotals } from '@/test/fixtures';

import { DivisionCard, exactNumber, tierRange } from './division-card';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const profile = makePublicProfile().sportProfiles[0];

// O emblema é decorativo quando o nome da divisão está ao lado.
const hidden = { includeHiddenElements: true };

describe('DivisionCard (T39)', () => {
  it('mostra divisão, rating, progresso, confiança e V/D/E; o Glicko-2 fica nos detalhes técnicos', () => {
    render(<DivisionCard profile={profile} record={makeTotals()} />);
    expect(screen.getByText('Platina I')).toBeOnTheScreen();
    // O número do rating continua visível, pequeno, ao lado da divisão.
    expect(screen.getByText('1.512')).toBeOnTheScreen();
    expect(screen.getByText('8 partidas processadas')).toBeOnTheScreen();
    expect(screen.getByText('Até Platina II')).toBeOnTheScreen();
    expect(screen.getByText('faltam 88 pontos')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Progresso em Platina I').props.accessibilityValue,
    ).toMatchObject({ now: 12 });
    expect(
      screen.getByLabelText('Confiança na divisão').props.accessibilityValue,
    ).toMatchObject({ now: 49 });
    expect(screen.getByText('49%')).toBeOnTheScreen();
    expect(screen.queryByText('0,06')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('Detalhes técnicos'));
    expect(screen.getAllByText('1.512')).toHaveLength(2);
    expect(screen.getByText('0,06')).toBeOnTheScreen();
    expect(screen.getByText('1.500 a 1.600')).toBeOnTheScreen();
    expect(screen.getByText(/quanto o ACE já conhece/)).toBeOnTheScreen();
    expect(screen.queryByText('Ver evolução do rating')).not.toBeOnTheScreen();
  });
  it('marca a estimativa inicial e a divisão mais alta; o próprio perfil leva à evolução', () => {
    render(
      <DivisionCard
        own
        evolutionLink
        profile={{
          ...profile,
          rating: {
            ...profile.rating!,
            tier: makeTier({
              code: 'diamante-ii',
              label: 'Diamante II',
              division: 'diamante',
              level: 2,
              minRating: 2000,
              maxRating: null,
              next: null,
              pointsToNext: null,
              provisional: true,
            }),
          },
        }}
      />,
    );
    expect(screen.getByText('Estimativa inicial')).toBeOnTheScreen();
    expect(screen.getByText('Divisão mais alta')).toBeOnTheScreen();
    expect(screen.getByText('topo da escala')).toBeOnTheScreen();
    fireEvent.press(
      screen.getByRole('link', { name: 'Ver evolução do rating' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/rating');
  });
  it('perfil sem rating não inventa divisão', () => {
    render(<DivisionCard profile={{ ...profile, rating: null }} />);
    expect(
      screen.getByText('Ainda sem divisão nesta modalidade.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('tier-badge', hidden)).not.toBeOnTheScreen();
  });
  it('formata números e limites em pt-BR sem Intl', () => {
    expect(exactNumber(1672.418)).toBe('1.672,418');
    expect(exactNumber(0.059912)).toBe('0,059912');
    expect(tierRange({ minRating: null, maxRating: 1000 })).toBe(
      'abaixo de 1.000',
    );
    expect(tierRange({ minRating: 2000, maxRating: null })).toBe(
      '2.000 ou mais',
    );
  });
});
