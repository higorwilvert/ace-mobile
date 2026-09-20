import { fireEvent, render, screen } from '@testing-library/react-native';

import { ApiError } from '@/lib/api-client';

import { EmptyState, ErrorState, FormError, LoadingState } from './states';

describe('states', () => {
  it('LoadingState exposes its label to assistive tech', () => {
    render(<LoadingState />);
    expect(screen.getByLabelText('Preparando tudo para você…')).toBeTruthy();
  });
  it('FormError renders reviewed messages and a fallback for unknown errors', () => {
    const { rerender } = render(
      <FormError error={new ApiError('INVALID_CREDENTIALS', 401)} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /E-mail ou senha incorretos/,
    );
    rerender(<FormError error={new Error('raw')} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível concluir. Tente novamente.',
    );
    rerender(<FormError error={null} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('ErrorState offers retry', () => {
    const retry = jest.fn();
    render(<ErrorState error={new ApiError('NETWORK_ERROR')} retry={retry} />);
    expect(screen.getByText(/Confira sua conexão/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalled();
  });
  it('EmptyState renders title, description and children', () => {
    render(
      <EmptyState title='Nada por aqui' description='Volte depois.'>
        <LoadingState label='filho' />
      </EmptyState>,
    );
    expect(screen.getByText('Nada por aqui')).toBeTruthy();
    expect(screen.getByText('Volte depois.')).toBeTruthy();
    expect(screen.getByLabelText('filho')).toBeTruthy();
  });
});
