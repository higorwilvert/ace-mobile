import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, MessageCircle, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type StyleProp,
  type ImageStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { Avatar, imageUri } from '@/components/ace/avatar';
import { ErrorState, FormError, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import palette from '@/config/palette.json';
import { generatedLabel } from '@/features/home/schemas';
import { errorMessage } from '@/lib/api-client';

import {
  activityKeys,
  activityQuery,
  addComment,
  commentsQuery,
  deleteComment,
  deleteMatchPhoto,
  MAX_MATCH_PHOTOS,
  refreshActivity,
  uploadMatchPhoto,
  type MatchActivity,
  type MatchPhoto,
} from './api';
import { LikeButton } from './like-button';

const brand = palette.colors.brand;
const muted = palette.colors['muted-foreground'];
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** Foto da API (mesma regra de origem do avatar); URL estranha não aparece. */
export function MatchImage({
  url,
  label,
  style,
  contentFit = 'cover',
}: {
  url: string;
  label: string;
  style: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain';
}) {
  const uri = imageUri(url);
  if (!uri) return null;
  return (
    <Image
      source={{ uri }}
      accessibilityLabel={label}
      style={style}
      contentFit={contentFit}
      transition={150}
    />
  );
}

/**
 * Depois do jogo (T36): fotos, curtidas e comentários da partida concluída.
 * O que cada um pode fazer vem da API (`viewer` e `canDelete`).
 */
export function MatchSocial({ matchId }: { matchId: string }) {
  const activity = useQuery(activityQuery(matchId));
  return (
    <View className='gap-4 rounded-panel border border-border bg-card p-4'>
      <Text variant='subtitle'>Fotos e comentários</Text>
      {activity.isPending ? (
        <LoadingState label='Carregando fotos e comentários…' />
      ) : activity.isError ? (
        <ErrorState error={activity.error} retry={() => activity.refetch()} />
      ) : (
        <>
          <PhotoStrip matchId={matchId} activity={activity.data} />
          <View className='flex-row items-center gap-5'>
            <LikeButton
              matchId={matchId}
              state={activity.data}
              canLike={activity.data.viewer?.canInteract ?? false}
            />
            <View className='flex-row items-center gap-1.5'>
              <MessageCircle size={18} color={muted} />
              <Text variant='muted'>
                {plural(
                  activity.data.commentCount,
                  'comentário',
                  'comentários',
                )}
              </Text>
            </View>
          </View>
          <Comments
            matchId={matchId}
            canComment={activity.data.viewer?.canInteract ?? false}
          />
        </>
      )}
    </View>
  );
}

function PhotoStrip({
  matchId,
  activity,
}: {
  matchId: string;
  activity: MatchActivity;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<number | null>(null);
  const upload = useMutation({
    mutationFn: (asset: { uri: string; mimeType: string }) =>
      uploadMatchPhoto(matchId, asset),
    onSuccess: async () => {
      await refreshActivity(queryClient, matchId);
      toast.success('Foto adicionada.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
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
    // quality força JPEG (resolve HEIC do iPhone); a API re-codifica em WebP.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    upload.mutate({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  };
  const { photos, viewer } = activity;
  return (
    <View className='gap-3'>
      {photos.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName='gap-2'
        >
          {photos.map((photo, index) => (
            <Pressable
              key={photo.id}
              accessibilityRole='imagebutton'
              accessibilityLabel={`Abrir foto ${index + 1} de ${photos.length}, enviada por ${photo.uploadedBy.fullName}`}
              className='overflow-hidden rounded-card bg-muted active:opacity-80'
              onPress={() => setOpen(index)}
            >
              <MatchImage
                url={photo.url}
                label={`Foto ${index + 1}`}
                style={{ width: 112, height: 112 }}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text variant='muted'>
          {viewer?.canAddPhoto
            ? 'Ninguém enviou fotos ainda. Que tal a primeira?'
            : 'Nenhuma foto desta partida.'}
        </Text>
      )}
      {viewer?.canAddPhoto && (
        <View className='gap-1'>
          <Button
            variant='secondary'
            label='Adicionar foto'
            busy={upload.isPending}
            busyLabel='Enviando…'
            icon={<ImagePlus size={17} color={brand} />}
            onPress={() => void pick()}
          />
          <Text variant='muted' className='text-center'>
            {`${photos.length} de ${MAX_MATCH_PHOTOS} fotos`}
          </Text>
        </View>
      )}
      {open !== null && photos[open] && (
        <PhotoViewer
          matchId={matchId}
          photos={photos}
          initialIndex={open}
          onClose={() => setOpen(null)}
        />
      )}
    </View>
  );
}

// Tela cheia com deslize entre as fotos (FlatList paginada).
function PhotoViewer({
  matchId,
  photos,
  initialIndex,
  onClose,
}: {
  matchId: string;
  photos: MatchPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];
  const remove = useMutation({
    mutationFn: () => deleteMatchPhoto(matchId, photo.id),
    onSuccess: async () => {
      onClose();
      await refreshActivity(queryClient, matchId);
      toast.success('Foto removida.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const confirmRemove = () =>
    Alert.alert('Remover esta foto?', 'Ela sai da partida para todos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => remove.mutate(),
      },
    ]);
  return (
    <Modal
      visible
      animationType='fade'
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View className='flex-1 bg-navy' style={{ paddingTop: insets.top }}>
        <View className='flex-row items-center gap-3 px-4 py-3'>
          <View className='flex-1'>
            <Text className='font-inter-semibold text-base text-white'>
              {`Foto ${index + 1} de ${photos.length}`}
            </Text>
            <Text className='text-sm text-white/70'>
              {`${photo.uploadedBy.fullName} · ${generatedLabel(photo.createdAt)}`}
            </Text>
          </View>
          {photo.canDelete && (
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Remover foto'
              disabled={remove.isPending}
              hitSlop={10}
              onPress={confirmRemove}
            >
              <Trash2 size={22} color='#fff' />
            </Pressable>
          )}
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Fechar'
            hitSlop={10}
            onPress={onClose}
          >
            <X size={24} color='#fff' />
          </Pressable>
        </View>
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item, index: i }) => (
            <View style={{ width }} className='flex-1 justify-center'>
              <MatchImage
                url={item.url}
                label={`Foto ${i + 1} de ${photos.length}`}
                contentFit='contain'
                style={{ width, height: height * 0.75 }}
              />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

function Comments({
  matchId,
  canComment,
}: {
  matchId: string;
  canComment: boolean;
}) {
  const queryClient = useQueryClient();
  const comments = useInfiniteQuery(commentsQuery(matchId));
  const [draft, setDraft] = useState('');
  const settle = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: activityKeys.comments(matchId),
      }),
      refreshActivity(queryClient, matchId),
    ]);
  const add = useMutation({
    mutationFn: () => addComment(matchId, draft.trim()),
    onSuccess: async () => {
      setDraft('');
      await settle();
    },
  });
  const remove = useMutation({
    mutationFn: (commentId: string) => deleteComment(matchId, commentId),
    onSuccess: settle,
    onError: (error) => toast.error(errorMessage(error)),
  });
  const items = comments.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <View className='gap-3 border-t border-border pt-4'>
      {comments.isError && <FormError error={comments.error} />}
      {items.map((comment) => (
        <View key={comment.id} className='flex-row items-start gap-2.5'>
          <Avatar
            name={comment.author.fullName}
            url={comment.author.avatarUrl}
            size={32}
          />
          <View className='flex-1 gap-0.5'>
            <Text variant='label'>
              {comment.author.fullName}
              <Text variant='muted'>{`  ${generatedLabel(comment.createdAt)}`}</Text>
            </Text>
            <Text>{comment.body}</Text>
          </View>
          {comment.canDelete && (
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={`Remover comentário de ${comment.author.fullName}`}
              disabled={remove.isPending}
              hitSlop={10}
              onPress={() =>
                Alert.alert('Remover comentário?', undefined, [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => remove.mutate(comment.id),
                  },
                ])
              }
            >
              <Trash2 size={18} color={muted} />
            </Pressable>
          )}
        </View>
      ))}
      {comments.hasNextPage && (
        <Button
          variant='ghost'
          label='Carregar mais comentários'
          busy={comments.isFetchingNextPage}
          onPress={() => void comments.fetchNextPage()}
        />
      )}
      {canComment ? (
        <View className='gap-2'>
          <TextField
            label='Comentário'
            placeholder='Escreva um comentário…'
            multiline
            maxLength={500}
            value={draft}
            editable={!add.isPending}
            onChangeText={setDraft}
          />
          <FormError error={add.error} />
          <Button
            label='Comentar'
            busy={add.isPending}
            busyLabel='Enviando…'
            disabled={!draft.trim()}
            onPress={() => add.mutate()}
          />
        </View>
      ) : (
        <Text variant='muted'>
          Só quem jogou e os amigos de quem jogou podem curtir e comentar.
        </Text>
      )}
    </View>
  );
}
