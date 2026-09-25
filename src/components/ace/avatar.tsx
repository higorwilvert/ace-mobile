import { useState } from 'react';
import { Image, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { env } from '@/config/env';
import { cn, getFirstAndLastLetter } from '@/lib/utils';

// https de qualquer origem, ou a mídia local da API em dev. No modo local a
// API grava a origem que ela conhece (ex.: localhost), que o celular não
// alcança: o caminho /v1/media/ é reapontado para a origem que o app usa.
export function imageUri(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return url;
    if (parsed.protocol === 'http:' && parsed.pathname.startsWith('/v1/media/'))
      return new URL(parsed.pathname, env.API_URL).href;
  } catch {
    /* Iniciais. */
  }
  return null;
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
  // Imagem quebrada cai nas iniciais, como no web; uma URL nova tenta de novo.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = url ? imageUri(url) : null;
  const showImage = uri !== null && uri !== failedUri;
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
          source={{ uri }}
          accessibilityLabel={`Foto de ${name}`}
          style={{ width: size, height: size }}
          onError={() => setFailedUri(uri)}
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
