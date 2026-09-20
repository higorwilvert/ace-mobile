import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './button';

describe('Button', () => {
  it('fires onPress and exposes the button role', () => {
    const onPress = jest.fn();
    render(<Button label='Entrar' onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('blocks presses and shows the busy label while busy', () => {
    const onPress = jest.fn();
    render(
      <Button label='Entrar' busyLabel='Entrando…' busy onPress={onPress} />,
    );
    const button = screen.getByRole('button');
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText('Entrando…')).toBeTruthy();
    expect(button.props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
  });
});
