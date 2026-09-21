import { useState } from 'react';
import { Image, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { env } from '@/config/env';
import { cn, getFirstAndLastLetter } from '@/lib/utils';

// https de qualquer origem, ou a própria API no modo local de dev — como no web.
const mediaBase = new URL('/v1/media/', env.API_URL).href;
function isSafeImageUrl(url: string) {
  try {
    return new URL(url).protocol === 'https:' || url.startsWith(mediaBase);
  } catch {
    return false;
  }
}

export function Avatar({
  name,
  url,
  size = 56,
  className,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  // Imagem quebrada cai nas iniciais, como no web.
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(url && isSafeImageUrl(url)) && !failed;
  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full bg-brand-light',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          source={{ uri: url ?? undefined }}
          accessibilityLabel={`Foto de ${name}`}
          style={{ width: size, height: size }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          className='font-inter-bold text-brand'
          // O `leading` padrão do Text é menor que a fonte aqui e cortaria
          // as iniciais dentro do círculo.
          style={{ fontSize: size * 0.36, lineHeight: size * 0.5 }}
          accessibilityLabel={name}
        >
          {getFirstAndLastLetter(name)}
        </Text>
      )}
    </View>
  );
}
