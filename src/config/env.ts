import Constants from 'expo-constants';

const DEFAULT_API_PORT = 3001;
// protocolo, host (nome, IPv4 ou [IPv6]), porta opcional, barra final opcional.
const ORIGIN_PATTERN =
  /^(?<protocol>https?):\/\/(?<host>[a-z0-9.-]+|\[[0-9a-f:.]+\])(?::(?<port>\d{1,5}))?\/?$/i;

type Issue = string;

/** Valida e normaliza uma origem (mesmas regras do web: só a origem). */
export function parseApiOrigin(
  value: string,
  production: boolean,
): { origin: string } | { issues: Issue[] } {
  const trimmed = value.trim();
  const match = ORIGIN_PATTERN.exec(trimmed);
  if (!match?.groups) {
    if (/^[a-z]+:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed))
      return { issues: ['A URL da API deve usar HTTP ou HTTPS'] };
    if (/[@?#]/.test(trimmed) || /^https?:\/\/[^/]+\/./i.test(trimmed))
      return { issues: ['A URL da API deve conter somente a origem'] };
    return { issues: ['A URL da API é inválida'] };
  }
  const { protocol, host, port } = match.groups;
  if (port !== undefined && Number(port) > 65_535)
    return { issues: ['A URL da API é inválida'] };
  if (production && protocol.toLowerCase() !== 'https')
    return { issues: ['HTTPS é obrigatório em produção'] };
  const origin = `${protocol.toLowerCase()}://${host.toLowerCase()}${
    port !== undefined ? `:${port}` : ''
  }`;
  return { origin };
}

/**
 * Resolve a origem da API. Em desenvolvimento, sem `EXPO_PUBLIC_API_URL`,
 * usa o host do Metro (`hostUri`) na porta padrão da API: cobre simulador
 * iOS, emulador Android e celular físico na mesma rede. Fora de
 * desenvolvimento não há fallback.
 */
export function resolveApiUrl(input: {
  value: string | undefined;
  hostUri: string | undefined;
  dev: boolean;
}): string {
  const explicit = input.value?.trim() || undefined;
  const fallback =
    input.dev && input.hostUri
      ? `http://${input.hostUri.split(':')[0]}:${DEFAULT_API_PORT}`
      : undefined;
  const result = parseApiOrigin(explicit ?? fallback ?? '', !input.dev);
  if ('issues' in result)
    throw new Error(
      `EXPO_PUBLIC_API_URL inválida: ${result.issues.join('; ')}`,
    );
  return result.origin;
}

export const env = {
  API_URL: resolveApiUrl({
    // Referência literal: o Expo substitui EXPO_PUBLIC_* no bundle em build.
    value: process.env.EXPO_PUBLIC_API_URL,
    hostUri: Constants.expoConfig?.hostUri,
    dev: __DEV__,
  }),
};
