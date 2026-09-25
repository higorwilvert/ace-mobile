import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from './screen';

const refreshControl = () =>
  screen.getByTestId('screen-scroll').props.refreshControl;

describe('Screen (T38)', () => {
  it('puxar para atualizar chama onRefresh e mostra o indicador até terminar', async () => {
    let finish!: () => void;
    const onRefresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <Screen scroll onRefresh={onRefresh}>
        <Text>conteúdo</Text>
      </Screen>,
    );
    expect(refreshControl().props.refreshing).toBe(false);
    await act(async () => refreshControl().props.onRefresh());
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(refreshControl().props.refreshing).toBe(true);
    await act(async () => finish());
    expect(refreshControl().props.refreshing).toBe(false);
  });

  it('sem onRefresh não há RefreshControl', () => {
    render(
      <Screen scroll>
        <Text>conteúdo</Text>
      </Screen>,
    );
    expect(refreshControl()).toBeUndefined();
  });
});
