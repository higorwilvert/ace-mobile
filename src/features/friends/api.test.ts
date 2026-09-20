import { api } from '@/lib/api-client';
import { makeFriend, makeFriendRequest } from '@/test/fixtures';
import { seedToken } from '@/test/session-mock';

import {
  acceptFriendRequest,
  friendRequestSchema,
  friendSchema,
  removeFriend,
  sendFriendRequest,
} from './api';

beforeEach(() => seedToken());
afterEach(() => jest.restoreAllMocks());

describe('schemas', () => {
  it('descartam campos extras e rejeitam status desconhecido', () => {
    const request = makeFriendRequest();
    const parsed = friendRequestSchema.parse({
      ...request,
      requester: { ...request.requester, email: 'x@y.z', phone: '1' },
      secret: true,
    });
    expect(parsed).toEqual(request);
    expect(
      friendRequestSchema.safeParse({ ...request, status: 'LOST' }).success,
    ).toBe(false);
    const friend = makeFriend();
    expect(friendSchema.parse({ ...friend, extra: 1 })).toEqual(friend);
  });
});

describe('mutações', () => {
  it('chamam os caminhos do contrato T28', async () => {
    const spy = jest
      .spyOn(api, 'request')
      .mockImplementation((config: { method?: string }) =>
        Promise.resolve(
          config.method === 'DELETE'
            ? { status: 204, data: '' }
            : { status: 200, data: { data: makeFriendRequest() } },
        ),
      );
    const other = makeFriend().user.id;
    const id = makeFriendRequest().id;
    await sendFriendRequest(other);
    await acceptFriendRequest(id);
    await removeFriend(other);
    expect(spy.mock.calls.map(([c]) => `${c.method} ${c.url}`)).toEqual([
      `POST /v1/users/${other}/friend-requests`,
      `POST /v1/friend-requests/${id}/accept`,
      `DELETE /v1/users/me/friends/${other}`,
    ]);
  });
  it('recusam id que não é uuid antes de chamar a API', () => {
    const spy = jest.spyOn(api, 'request');
    expect(() => sendFriendRequest('not-a-uuid')).toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
});
