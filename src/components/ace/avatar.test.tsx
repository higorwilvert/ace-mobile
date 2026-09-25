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
  it.each(['http://x.com/a.png', 'javascript:alert(1)', 'not a url'])(
    'ignora URL fora de https ou da mídia da API (%s)',
    (url) => {
      render(<Avatar name='Ana Clara Souza' url={url} />);
      expect(screen.getByText('AS')).toBeOnTheScreen();
    },
  );
  it('reaponta a mídia local da API para a origem que o app usa', () => {
    // A API grava a origem dela (localhost); o celular fala com ela pelo IP.
    render(
      <Avatar
        name='Ana Clara Souza'
        url='http://127.0.0.1:3001/v1/media/avatars/x.webp'
      />,
    );
    expect(
      screen.getByLabelText('Foto de Ana Clara Souza').props.source,
    ).toMatchObject({ uri: 'http://localhost:3001/v1/media/avatars/x.webp' });
  });
  it('recua para as iniciais quando a imagem falha e tenta a URL nova', () => {
    const { rerender } = render(
      <Avatar name='Ana Clara Souza' url='https://x.com/a.png' />,
    );
    fireEvent(screen.getByLabelText('Foto de Ana Clara Souza'), 'error');
    expect(screen.getByText('AS')).toBeOnTheScreen();
    rerender(<Avatar name='Ana Clara Souza' url='https://x.com/b.png' />);
    expect(screen.getByLabelText('Foto de Ana Clara Souza')).toBeOnTheScreen();
  });
});
