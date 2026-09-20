import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from './text-field';

describe('TextField', () => {
  it('labels the input and shows the error over the hint', () => {
    render(
      <TextField label='E-mail' hint='Seu e-mail' error='Email inválido' />,
    );
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent('Email inválido');
    expect(screen.queryByText('Seu e-mail')).toBeNull();
  });
  it('toggles password visibility', () => {
    render(<TextField label='Senha' secure />);
    const input = screen.getByLabelText('Senha');
    expect(input.props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByLabelText('Mostrar senha'));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText('Ocultar senha')).toBeTruthy();
  });
});
