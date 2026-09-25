import { requireOptionalNativeModule } from 'expo';

export type LiveUpdate = {
  title: string;
  text: string;
  /** Texto curto do chip na barra de status (Android 16+). */
  chip: string;
  startsAt: number;
  endsAt: number;
  url: string;
};

type AceLiveUpdateModule = {
  /** Mostra ou substitui a notificação fixa; false sem permissão. */
  show(update: LiveUpdate): boolean;
  hide(): void;
};

// null no Expo Go e no iOS: quem chama trata como "sem suporte".
export default requireOptionalNativeModule<AceLiveUpdateModule>(
  'AceLiveUpdate',
);
