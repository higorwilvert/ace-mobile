import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Pressable, View } from 'react-native';
import { toast } from 'sonner-native';

import { Avatar } from '@/components/ace/avatar';
import { Text } from '@/components/ui/text';
import { authQueryOptions } from '@/features/auth/api';
import { errorMessage } from '@/lib/api-client';
import type { User } from '@/types/api';

import { deleteAvatar, uploadAvatar } from './api';

/** Toque no avatar abre a folha nativa: galeria (com recorte 1:1) ou remover. */
export function AvatarPicker({
  user,
  size = 88,
}: {
  user: User;
  size?: number;
}) {
  const queryClient = useQueryClient();
  const settle = (updated: User) =>
    queryClient.setQueryData(authQueryOptions.queryKey, updated);
  const upload = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (updated) => {
      settle(updated);
      toast.success('Foto atualizada.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: (updated) => {
      settle(updated);
      toast.success('Foto removida.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const busy = upload.isPending || remove.isPending;

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Sem acesso às fotos',
        'Libere o acesso à galeria nos ajustes do aparelho para escolher uma foto.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }
    // quality força JPEG (resolve HEIC do iPhone) e allowsEditing dá o recorte 1:1.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    upload.mutate({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  };
  const open = () =>
    Alert.alert('Foto de perfil', undefined, [
      { text: 'Escolher da galeria', onPress: () => void pick() },
      ...(user.avatarUrl
        ? [
            {
              text: 'Remover foto',
              style: 'destructive' as const,
              onPress: () => remove.mutate(),
            },
          ]
        : []),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);

  return (
    <View className='items-center gap-2'>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Alterar foto de perfil'
        disabled={busy}
        onPress={open}
      >
        <Avatar name={user.fullName} url={user.avatarUrl} size={size} />
      </Pressable>
      <Text variant='muted'>
        {busy
          ? 'Enviando…'
          : user.avatarUrl
            ? 'Toque para trocar ou remover a foto'
            : 'Toque para escolher uma foto'}
      </Text>
    </View>
  );
}
