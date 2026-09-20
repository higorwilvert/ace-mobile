import { fireEvent, render, screen } from '@testing-library/react-native';

import { Avatar } from './avatar';

describe('Avatar', () => {
  it('mostra as iniciais sem URL', () => {
    render(<Avatar name='Ana Clara Souza' />);
    expect(screen.getByText('AS')).toBeOnTheScreen();
  });
  it('mostra a imagem quando há URL', () => {
    render(<Avatar name='Ana Clara Souza' url='https://x.com/a.png' />);
    expect(screen.getByLabelText('Foto de Ana Clara Souza')).toBeOnTheScreen();
    expect(screen.queryByText('AS')).not.toBeOnTheScreen();
  });
  it('recua para as iniciais quando a imagem falha', () => {
    render(<Avatar name='Ana Clara Souza' url='https://x.com/a.png' />);
    fireEvent(screen.getByLabelText('Foto de Ana Clara Souza'), 'error');
    expect(screen.getByText('AS')).toBeOnTheScreen();
  });
});
