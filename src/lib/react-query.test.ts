import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

import {
  bindAppStateToQueryFocus,
  queryClient,
  queryConfig,
} from './react-query';

describe('react-query setup', () => {
  it('keeps the web defaults (no retry, no refetch on focus, 60s stale)', () => {
    expect(queryConfig.queries).toMatchObject({
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    });
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });
  it('mirrors AppState into the focus manager and unsubscribes', () => {
    const remove = jest.fn();
    const spy = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove } as never);
    const setFocused = jest.spyOn(focusManager, 'setFocused');
    const unbind = bindAppStateToQueryFocus();
    const handler = spy.mock.calls[0][1] as (state: string) => void;
    handler('background');
    expect(setFocused).toHaveBeenLastCalledWith(false);
    handler('active');
    expect(setFocused).toHaveBeenLastCalledWith(true);
    unbind();
    expect(remove).toHaveBeenCalled();
  });
});
