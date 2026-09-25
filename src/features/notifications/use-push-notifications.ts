import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import {
  markRead,
  registerPushDevice,
  targetHref,
  targetSchema,
  unreadCountQuery,
} from './api';

// Com o app aberto o push também aparece como banner.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
});

/**
 * Pede permissão, registra o token Expo deste aparelho na sessão atual e
 * devolve se deu certo. Falha em silêncio no Expo Go (Android), sem
 * `eas init` (sem projectId) ou com permissão negada: sobra o polling.
 */
async function register(): Promise<boolean> {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notificações',
      importance: Notifications.AndroidImportance.HIGH,
    });
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted')
    ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return false;
  const projectId = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  )?.eas?.projectId;
  if (!projectId) return false;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerPushDevice(data, Platform.OS === 'ios' ? 'ios' : 'android');
  return true;
}

function openFromPush(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  // Consumido: o próximo boot não reabre o mesmo alvo.
  Notifications.clearLastNotificationResponse();
  const data = response.notification.request.content.data ?? {};
  const target = targetSchema.safeParse(data.target);
  if (typeof data.notificationId === 'string')
    void markRead(data.notificationId).catch(() => {});
  const href = target.success ? targetHref(target.data) : null;
  if (href) router.push(href);
}

/** Push (T41) enquanto há sessão: registro, toque → tela, badge do ícone. */
export function usePushNotifications(enabled: boolean) {
  const queryClient = useQueryClient();
  const unread = useQuery({ ...unreadCountQuery, enabled }).data;

  useEffect(() => {
    if (!enabled) return;
    register().catch(() => {});
    // Toque que abriu o app fechado; depois, os toques com o app vivo.
    openFromPush(Notifications.getLastNotificationResponse());
    const tapped =
      Notifications.addNotificationResponseReceivedListener(openFromPush);
    // Um push quer dizer que algo mudou (convite, vaga, placar): as telas
    // abertas se atualizam, inclusive o contador.
    const received = Notifications.addNotificationReceivedListener(
      () => void queryClient.invalidateQueries({ queryKey: ['private'] }),
    );
    return () => {
      tapped.remove();
      received.remove();
    };
  }, [enabled, queryClient]);

  useEffect(() => {
    if (enabled && unread !== undefined)
      Notifications.setBadgeCountAsync(unread).catch(() => {});
  }, [enabled, unread]);
}
