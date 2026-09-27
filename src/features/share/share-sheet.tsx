import { useQuery } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { Share2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { toast } from 'sonner-native';

import { FormError } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import type { MatchDetail } from '@/features/matches/api';
import { formatWhen, matchTitle } from '@/features/matches/schemas';

import {
  authHeaders,
  cardUrl,
  downloadCard,
  shareInfoQuery,
  shareKind,
  type ShareKind,
} from './api';

function cardAlt(match: MatchDetail, kind: ShareKind) {
  const place = match.arena?.name ?? match.locationText ?? match.city;
  return kind === 'INVITE'
    ? `Convite ACE: ${matchTitle(match)}, ${formatWhen(match.scheduledAt)}, ${place}.`
    : `Resultado ACE: ${matchTitle(match)}, ${place}.`;
}

export function ShareButton({
  match,
  autoOpen = false,
}: {
  match: MatchDetail;
  autoOpen?: boolean;
}) {
  const kind = shareKind(match);
  const [open, setOpen] = useState(autoOpen && kind === 'INVITE');
  if (!kind) return null;
  return (
    <>
      <Button
        variant='secondary'
        label={
          kind === 'INVITE' ? 'Compartilhar convite' : 'Compartilhar resultado'
        }
        icon={<Share2 size={17} color={palette.colors.brand} />}
        onPress={() => setOpen(true)}
      />
      {open && (
        <ShareSheet match={match} kind={kind} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ShareSheet({
  match,
  kind,
  onClose,
}: {
  match: MatchDetail;
  kind: ShareKind;
  onClose: () => void;
}) {
  const info = useQuery(shareInfoQuery(match.id));
  // undefined = ainda não escolheu: a foto mais recente vem marcada.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const photoId =
    picked === undefined ? (info.data?.photos[0]?.id ?? null) : picked;
  const [busy, setBusy] = useState(false);

  async function shareImage() {
    setBusy(true);
    try {
      const file = await downloadCard(match.id, photoId);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Compartilhar imagem',
      });
    } catch {
      toast.error('Não foi possível gerar a imagem. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  const frame = (selected: boolean) => ({
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden' as const,
    borderColor: selected ? palette.colors.brand : palette.colors.border,
  });

  return (
    <Sheet
      visible
      title={
        kind === 'INVITE' ? 'Compartilhar convite' : 'Compartilhar resultado'
      }
      onClose={onClose}
    >
      <View className='gap-4'>
        {info.data ? (
          <Image
            source={{ uri: cardUrl(match.id, photoId), headers: authHeaders() }}
            accessibilityLabel={cardAlt(match, kind)}
            style={{
              width: 180,
              height: 320,
              alignSelf: 'center',
              borderRadius: 10,
            }}
          />
        ) : info.isError ? (
          <FormError error={info.error} />
        ) : (
          <ActivityIndicator color={palette.colors.brand} />
        )}
        {info.data && info.data.photos.length > 0 && (
          <ScrollView
            horizontal
            accessibilityLabel='Foto do card'
            contentContainerStyle={{ gap: 8 }}
          >
            {info.data.photos.map((photo, index) => (
              <Pressable
                key={photo.id}
                accessibilityRole='button'
                accessibilityLabel={`Foto ${index + 1}`}
                accessibilityState={{ selected: photoId === photo.id }}
                onPress={() => setPicked(photo.id)}
                style={frame(photoId === photo.id)}
              >
                <Image
                  source={{ uri: photo.url }}
                  style={{ width: 52, height: 52 }}
                />
              </Pressable>
            ))}
            <Pressable
              accessibilityRole='button'
              accessibilityState={{ selected: photoId === null }}
              onPress={() => setPicked(null)}
              style={[
                frame(photoId === null),
                {
                  width: 56,
                  height: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Text variant='muted'>Sem foto</Text>
            </Pressable>
          </ScrollView>
        )}
        {info.data?.url && (
          <Button
            label='Enviar link'
            onPress={() => void Share.share({ message: info.data?.text ?? '' })}
          />
        )}
        <Button
          variant={info.data?.url ? 'secondary' : 'primary'}
          label='Compartilhar imagem'
          busy={busy}
          busyLabel='Gerando a imagem…'
          disabled={!info.data}
          onPress={() => void shareImage()}
        />
      </View>
    </Sheet>
  );
}
