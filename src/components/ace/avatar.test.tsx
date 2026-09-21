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
  it('aceita a mídia local da própria API em desenvolvimento', () => {
    render(
      <Avatar
        name='Ana Clara Souza'
        url='http://localhost:3001/v1/media/avatars/x.webp'
      />,
    );
    expect(screen.getByLabelText('Foto de Ana Clara Souza')).toBeOnTheScreen();
  });
  it('recua para as iniciais quando a imagem falha', () => {
    render(<Avatar name='Ana Clara Souza' url='https://x.com/a.png' />);
    fireEvent(screen.getByLabelText('Foto de Ana Clara Souza'), 'error');
    expect(screen.getByText('AS')).toBeOnTheScreen();
  });
});
