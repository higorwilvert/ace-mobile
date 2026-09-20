import { sessionEnded } from './events';

describe('sessionEnded', () => {
  it('notifies every subscriber once and honours unsubscribe', () => {
    const first = jest.fn();
    const second = jest.fn();
    const stop = sessionEnded.subscribe(first);
    sessionEnded.subscribe(second);
    sessionEnded.emit();
    stop();
    sessionEnded.emit();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });
});
