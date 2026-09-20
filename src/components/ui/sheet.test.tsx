import { fireEvent, render, screen } from '@testing-library/react-native';

import { Sheet } from './sheet';
import { Text } from './text';

it('mostra o conteúdo quando visível e fecha ao tocar em fechar', () => {
  const onClose = jest.fn();
  render(
    <Sheet visible title='Novo horário' onClose={onClose}>
      <Text>Conteúdo</Text>
    </Sheet>,
  );
  expect(screen.getByText('Novo horário')).toBeOnTheScreen();
  expect(screen.getByText('Conteúdo')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Fechar'));
  expect(onClose).toHaveBeenCalled();
});

it('não renderiza o conteúdo quando oculto', () => {
  render(
    <Sheet visible={false} title='Novo horário' onClose={() => {}}>
      <Text>Conteúdo</Text>
    </Sheet>,
  );
  expect(screen.queryByText('Conteúdo')).not.toBeOnTheScreen();
});
