import { fireEvent, render, screen } from '@testing-library/react-native';

import { ActiveFilterChips } from './chips';

describe('ActiveFilterChips', () => {
  it('não desenha nada sem filtro ativo', () => {
    const { toJSON } = render(
      <ActiveFilterChips chips={[]} onClear={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('remove um filtro em um toque, pelo rótulo acessível', () => {
    const onRemove = jest.fn();
    render(
      <ActiveFilterChips
        chips={[{ key: 'city', label: 'Blumenau · SC', onRemove }]}
        onClear={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByLabelText('Remover filtro Blumenau · SC'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('limpa tudo de uma vez', () => {
    const onClear = jest.fn();
    render(
      <ActiveFilterChips
        chips={[{ key: 'teamSize', label: '2v2', onRemove: jest.fn() }]}
        onClear={onClear}
      />,
    );
    fireEvent.press(screen.getByText('Limpar tudo'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
