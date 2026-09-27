import { fireEvent, render, screen } from '@testing-library/react-native';

import { makeRecommendationMeta, makeRecommendedPlayer } from '@/test/fixtures';

import { ScoreDetails, ScoreHeader } from './score-details';

const meta = makeRecommendationMeta();
const item = makeRecommendedPlayer();

describe('ScoreHeader', () => {
  it('mostra o score 0–100 e só os dois motivos do breakdown', () => {
    render(<ScoreHeader item={item} meta={meta} />);
    expect(
      screen.getByLabelText('Compatibilidade 82,5 de 100'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Compatibilidade de nível')).toBeOnTheScreen();
    expect(screen.getByText('Perto de você')).toBeOnTheScreen();
    expect(screen.queryByText('Atividade esportiva')).not.toBeOnTheScreen();
    expect(screen.queryByText('Preferências de jogo')).not.toBeOnTheScreen();
  });
});

describe('ScoreDetails', () => {
  it('explica os fatores ao expandir e expõe o modo técnico com a soma reconstruída', () => {
    render(<ScoreDetails item={item} meta={meta} />);
    expect(screen.queryByText('Nível de jogo')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('Por que esta recomendação?'));
    expect(screen.getByText('Nível de jogo')).toBeOnTheScreen();
    expect(screen.getByText('peso 50%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Atividade 50 de 100')).toBeOnTheScreen();
    expect(screen.getByLabelText('Preferências 0 de 100')).toBeOnTheScreen();
    expect(screen.getByText(/Rating em calibração/)).toBeOnTheScreen();
    expect(
      screen.getByText(
        /Em Florianópolis, dentro do seu raio de busca de 50 km/,
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('ace-player-v2')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('Detalhes técnicos'));
    expect(screen.getByText('ace-player-v2')).toBeOnTheScreen();
    expect(screen.getByText('ace-player-api-v2')).toBeOnTheScreen();
    expect(screen.getByText(item.recommendationId)).toBeOnTheScreen();
    // Total da API e soma dos fatores × pesos coincidem em 6 casas.
    expect(screen.getAllByText('0.825000')).toHaveLength(2);
  });
  it('sem cold start e com distância em km, muda as notas', () => {
    render(
      <ScoreDetails
        item={{ ...item, coldStart: false, distanceKm: 20 }}
        meta={meta}
      />,
    );
    fireEvent.press(screen.getByText('Por que esta recomendação?'));
    expect(screen.queryByText(/Rating em calibração/)).not.toBeOnTheScreen();
    expect(screen.getByText(/≈ 20 km de Florianópolis/)).toBeOnTheScreen();
  });
});
