import { fireEvent, render, screen } from '@testing-library/react-native';

import { makeRecommendationMeta, makeRecommendedPlayer } from '@/test/fixtures';

import { GenerationDetails, ScoreDetails, ScoreHeader } from './score-details';

const meta = makeRecommendationMeta();
const item = makeRecommendedPlayer();

describe('ScoreHeader', () => {
  it('mostra o score 0–100 e só os dois motivos do breakdown', () => {
    render(<ScoreHeader item={item} meta={meta} />);
    expect(
      screen.getByLabelText('Compatibilidade 82,5 de 100'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Compatibilidade de nível')).toBeOnTheScreen();
    expect(
      screen.getByText('Proximidade por cidade e estado'),
    ).toBeOnTheScreen();
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
    expect(screen.getByText(/estimada por cidade e estado/)).toBeOnTheScreen();
    expect(screen.queryByText('ace-player-v1')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('Detalhes técnicos'));
    expect(screen.getByText('ace-player-v1')).toBeOnTheScreen();
    expect(screen.getByText('ace-player-api-v1')).toBeOnTheScreen();
    expect(screen.getByText(item.recommendationId)).toBeOnTheScreen();
    // Total da API e soma dos fatores × pesos coincidem em 6 casas.
    expect(screen.getAllByText('0.825000')).toHaveLength(2);
  });
  it('sem cold start e com coordenadas, muda as notas', () => {
    render(
      <ScoreDetails
        item={{ ...item, coldStart: false, distanceMethod: 'COORDINATES' }}
        meta={meta}
      />,
    );
    fireEvent.press(screen.getByText('Por que esta recomendação?'));
    expect(screen.queryByText(/Rating em calibração/)).not.toBeOnTheScreen();
    expect(
      screen.getByText(/Coordenadas pessoais não são exibidas/),
    ).toBeOnTheScreen();
  });
});

describe('GenerationDetails', () => {
  it('mostra id, versões e instante da geração ao expandir', () => {
    render(<GenerationDetails meta={meta} />);
    fireEvent.press(screen.getByText('Informações desta geração'));
    expect(screen.getByText(meta.generationId)).toBeOnTheScreen();
    expect(screen.getByText('ace-player-v1')).toBeOnTheScreen();
    expect(screen.getByText('ace-player-api-v1')).toBeOnTheScreen();
  });
});
