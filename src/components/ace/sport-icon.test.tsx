import { render } from '@testing-library/react-native';

import palette from '@/config/palette.json';

import { SportIcon, sportColors, sportCourtImages } from './sport-icon';

describe('sportColors', () => {
  it('usa a cor da modalidade conhecida', () => {
    expect(sportColors('padel')).toEqual(palette.sports.padel);
  });
  it('cai na marca para modalidade desconhecida', () => {
    expect(sportColors('xadrez').ink).toBe(palette.colors.brand);
  });
});

it('renderiza sem quebrar para slug desconhecido', () => {
  expect(() => render(<SportIcon slug='xadrez' />)).not.toThrow();
});

it('usa uma imagem própria para cada modalidade conhecida', () => {
  expect(Object.keys(sportCourtImages)).toEqual([
    'padel',
    'beach_tennis',
    'tenis',
    'pickleball',
  ]);
  const screen = render(<SportIcon slug='padel' />);
  expect(
    screen.getByTestId('sport-court-padel', { includeHiddenElements: true }),
  ).toBeTruthy();
});
