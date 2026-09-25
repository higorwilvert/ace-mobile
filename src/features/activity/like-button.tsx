import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ThumbsUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { toast } from 'sonner-native';

import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { errorMessage } from '@/lib/api-client';

import { refreshActivity, setLike, type LikeState } from './api';

const brand = palette.colors.brand;
const muted = palette.colors['muted-foreground'];
const plural = (n: number) => `${n} ${n === 1 ? 'curtida' : 'curtidas'}`;

/** Curtida otimista: o número muda no toque e volta se a API recusar. */
export function LikeButton({
  matchId,
  state,
  canLike = true,
}: {
  matchId: string;
  state: LikeState;
  canLike?: boolean;
}) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<LikeState | null>(null);
  const shown = local ?? state;
  const mutation = useMutation({
    mutationFn: (liked: boolean) => setLike(matchId, liked),
    onMutate: (liked) =>
      setLocal({
        likedByMe: liked,
        likeCount: Math.max(0, shown.likeCount + (liked ? 1 : -1)),
      }),
    onError: (error) => {
      setLocal(null);
      toast.error(errorMessage(error));
    },
    onSuccess: async (next) => {
      setLocal(next);
      await refreshActivity(queryClient, matchId);
      setLocal(null);
    },
  });
  const content = (
    <>
      <ThumbsUp
        size={18}
        color={shown.likedByMe ? brand : muted}
        fill={shown.likedByMe ? brand : 'none'}
      />
      <Text
        className={
          shown.likedByMe
            ? 'font-inter-semibold text-sm text-brand'
            : 'font-inter-semibold text-sm text-muted-foreground'
        }
      >
        {String(shown.likeCount)}
      </Text>
    </>
  );
  if (!canLike)
    return (
      <View
        className='min-h-10 flex-row items-center gap-1.5'
        accessible
        accessibilityLabel={plural(shown.likeCount)}
      >
        {content}
      </View>
    );
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`Curtir, ${plural(shown.likeCount)}`}
      accessibilityState={{ selected: shown.likedByMe }}
      disabled={mutation.isPending}
      hitSlop={8}
      className='min-h-10 flex-row items-center gap-1.5 active:opacity-70'
      onPress={() => mutation.mutate(!shown.likedByMe)}
    >
      {content}
    </Pressable>
  );
}
