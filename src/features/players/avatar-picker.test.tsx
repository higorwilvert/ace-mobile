import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AxiosError, AxiosHeaders } from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';

import { authQueryOptions } from '@/features/auth/api';
import { api } from '@/lib/api-client';
import { makeUser } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { AvatarPicker } from './avatar-picker';

const asset = {
  uri: 'file:///tmp/foto.jpg',
  mimeType: 'image/jpeg',
  width: 800,
  height: 800,
};
const pressSheetButton = (label: string) => {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
  const button = buttons.find((b) => b.text === label);
  if (!button?.onPress) throw new Error(`botão "${label}" não encontrado`);
  button.onPress();
};

beforeEach(async () => {
  await seedToken();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('AvatarPicker', () => {
  it('abre a folha, escolhe da galeria e atualiza o cache do usuário', async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValueOnce({ canceled: false, assets: [asset] } as never);
    const saved = makeUser({ avatarUrl: 'https://pub.r2.dev/avatars/a.webp' });
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: { data: saved } });
    const { queryClient } = renderWithQuery(<AvatarPicker user={makeUser()} />);
    fireEvent.press(
      screen.getByRole('button', { name: 'Alterar foto de perfil' }),
    );
    expect(
      jest.mocked(Alert.alert).mock.calls[0][2]?.map((b) => b.text),
    ).toEqual(['Escolher da galeria', 'Cancelar']);
    pressSheetButton('Escolher da galeria');
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'PUT',
      url: '/v1/users/me/avatar',
    });
    await waitFor(() =>
      expect(queryClient.getQueryData(authQueryOptions.queryKey)).toEqual(
        saved,
      ),
    );
    expect(toast.success).toHaveBeenCalledWith('Foto atualizada.');
  });

  it('oferece remover quando há foto e limpa o cache', async () => {
    const withPhoto = makeUser({
      avatarUrl: 'https://pub.r2.dev/avatars/a.webp',
    });
    const saved = makeUser({ avatarUrl: null });
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: { data: saved } });
    const { queryClient } = renderWithQuery(<AvatarPicker user={withPhoto} />);
    fireEvent.press(
      screen.getByRole('button', { name: 'Alterar foto de perfil' }),
    );
    pressSheetButton('Remover foto');
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'DELETE',
      url: '/v1/users/me/avatar',
    });
    await waitFor(() =>
      expect(queryClient.getQueryData(authQueryOptions.queryKey)).toEqual(
        saved,
      ),
    );
  });

  it('não envia nada quando o usuário cancela a galeria', async () => {
    const spy = jest.spyOn(api, 'request');
    renderWithQuery(<AvatarPicker user={makeUser()} />);
    fireEvent.press(
      screen.getByRole('button', { name: 'Alterar foto de perfil' }),
    );
    pressSheetButton('Escolher da galeria');
    await waitFor(() =>
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled(),
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('explica quando a permissão é negada', async () => {
    jest
      .mocked(ImagePicker.requestMediaLibraryPermissionsAsync)
      .mockResolvedValueOnce({ status: 'denied', granted: false } as never);
    renderWithQuery(<AvatarPicker user={makeUser()} />);
    fireEvent.press(
      screen.getByRole('button', { name: 'Alterar foto de perfil' }),
    );
    pressSheetButton('Escolher da galeria');
    await waitFor(() =>
      expect(jest.mocked(Alert.alert).mock.calls.at(-1)?.[0]).toBe(
        'Sem acesso às fotos',
      ),
    );
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('mostra a mensagem do contrato quando a API recusa a imagem', async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValueOnce({ canceled: false, assets: [asset] } as never);
    jest.spyOn(api, 'request').mockRejectedValue(
      new AxiosError('untrusted', undefined, undefined, undefined, {
        status: 415,
        data: { error: { code: 'UNSUPPORTED_IMAGE' } },
        statusText: 'error',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    );
    renderWithQuery(<AvatarPicker user={makeUser()} />);
    fireEvent.press(
      screen.getByRole('button', { name: 'Alterar foto de perfil' }),
    );
    pressSheetButton('Escolher da galeria');
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Envie uma imagem JPEG, PNG ou WebP.',
      ),
    );
  });
});
