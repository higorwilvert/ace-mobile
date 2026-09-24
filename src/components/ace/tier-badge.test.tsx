import { fireEvent, render, screen } from '@testing-library/react-native';

import { env } from '@/config/env';
import { makeTier } from '@/test/fixtures';
import { ratingTierSchema } from '@/types/api';

import { TierBadge, TierTag } from './tier-badge';

// O emblema é decorativo quando o nome da divisão está ao lado.
const hidden = { includeHiddenElements: true };

describe('TierBadge (T39)', () => {
  it('mostra o emblema servido pela API quando a arte existe', () => {
    render(<TierBadge tier={makeTier()} size={48} />);
    expect(screen.getByTestId('tier-badge-image', hidden).props.source).toEqual(
      [{ uri: new URL(makeTier().imagePath!, env.API_URL).href }],
    );
  });
  it('desenha o escudo da faixa sem arte e quando a imagem falha', () => {
    render(<TierBadge tier={makeTier({ imagePath: null })} />);
    expect(
      screen.queryByTestId('tier-badge-image', hidden),
    ).not.toBeOnTheScreen();
    screen.unmount();
    render(<TierBadge tier={makeTier()} />);
    fireEvent(screen.getByTestId('tier-badge-image', hidden), 'error', {
      nativeEvent: { error: 'falhou' },
    });
    expect(
      screen.queryByTestId('tier-badge-image', hidden),
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId('tier-badge', hidden)).toBeOnTheScreen();
  });
  it('mantém o nome da divisão ao lado do emblema em listas', () => {
    render(<TierTag tier={makeTier()} />);
    expect(screen.getByText('Platina I')).toBeOnTheScreen();
  });
  it('só usa emblema com caminho da própria API', () => {
    for (const imagePath of [
      'https://evil.example.com/x.webp',
      '//evil.example.com/v1/tiers/padel/ouro-i.webp?v=1',
      'javascript:alert(1)',
    ])
      expect(
        ratingTierSchema.parse({ ...makeTier(), imagePath }).imagePath,
      ).toBeNull();
  });
});
