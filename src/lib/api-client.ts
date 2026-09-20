import Axios, { type AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import { env } from '@/config/env';

import { sessionToken } from './token';

const messages: Record<string, string> = {
  RATING_INITIALIZATION_REQUIRED:
    'Defina sua categoria nesta modalidade para inicializar o rating e receber recomendações.',
  CATEGORY_RANGE_INVALID:
    'A faixa de categorias não é válida nesta modalidade. Confira a categoria mínima e a máxima.',
  CATEGORY_INCOMPATIBLE:
    'A categoria declarada não atende à faixa desta partida.',
  GENDER_INCOMPATIBLE:
    'A composição da partida não é compatível com o gênero informado no perfil.',
  GENDER_REQUIRED:
    'Informe seu gênero no perfil ou escolha composição livre nesta busca.',
  GENDER_POLICY_REQUIRED:
    'Escolha a composição da partida. Composição livre aceita qualquer gênero.',
  MIXED_GENDER_REQUIRED:
    'Duplas mistas exigem gênero masculino ou feminino informado no perfil.',
  MIXED_REQUIRES_DOUBLES: 'Escolha duplas (2v2) para buscar composição mista.',
  UNSUPPORTED_FORMAT:
    'O formato escolhido não está disponível nesta modalidade.',
  SPORT_CATEGORY_INVALID: 'Escolha uma categoria válida para esta modalidade.',
  CATEGORY_FILTER_INVALID:
    'Selecione a modalidade antes de filtrar por categoria.',
  GENDER_COMPOSITION_LOCKED:
    'A composição não pode mudar com os participantes atuais. Revise os times.',
  SCHEDULE_REQUIRED: 'Informe a data e o horário para verificar a agenda.',
  SCHEDULE_MUST_BE_FUTURE: 'Escolha uma data e um horário futuros.',
  DATE_WINDOW_REQUIRED: 'Informe o início e o fim do intervalo de busca.',
  INVALID_DATE_WINDOW:
    'Revise o intervalo: o fim precisa ser depois do início, com início nos próximos 14 dias.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos. Confira e tente novamente.',
  AUTHENTICATION_REQUIRED:
    'Sua sessão terminou. Entre novamente para continuar.',
  EMAIL_UNAVAILABLE:
    'Este e-mail já está em uso. Entre na sua conta ou recupere a senha.',
  EMAIL_ALREADY_IN_USE: 'Este e-mail já está em uso.',
  RESOURCE_CONFLICT:
    'Já existe um registro com esses dados. Confira antes de tentar novamente.',
  RESET_TOKEN_INVALID:
    'Este link expirou ou já foi utilizado. Solicite um novo link.',
  VALIDATION_FAILED: 'Confira os campos preenchidos e tente novamente.',
  CITY_NOT_IN_STATE:
    'A cidade escolhida não pertence ao estado selecionado. Escolha novamente.',
  STATE_NOT_FOUND: 'Escolha um estado válido.',
  PROFILE_ALREADY_EXISTS: 'Você já tem um perfil nesta modalidade.',
  PROFILE_NOT_FOUND: 'Este perfil não está mais disponível. Atualize a página.',
  SPORT_INACTIVE: 'Esta modalidade não está disponível no momento.',
  SPORT_NOT_FOUND: 'Modalidade não encontrada. Atualize a lista.',
  SIDE_REQUIRED: 'Escolha o lado em que prefere jogar.',
  SIDE_NOT_APPLICABLE: 'Esta modalidade não utiliza preferência de lado.',
  AVAILABILITY_INVALID_ORDER:
    'O horário final deve ser depois do horário inicial, no mesmo dia.',
  AVAILABILITY_OVERLAP:
    'Esse horário se sobrepõe a outro período. Ajuste o intervalo.',
  AVAILABILITY_TIME_ZONE_CONFLICT:
    'Todos os seus horários precisam usar o mesmo fuso.',
  AVAILABILITY_NOT_FOUND:
    'Esse horário não está mais disponível. Atualize a página.',
  TIME_ZONE_INVALID: 'Escolha um fuso horário válido.',
  USER_NOT_FOUND: 'Este jogador não está disponível.',
  RESOURCE_NOT_FOUND: 'O conteúdo que você procura não está disponível.',
  RATE_LIMITED:
    'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',
  ORIGIN_INVALID:
    'Não foi possível conectar este endereço à API. Confira a configuração da aplicação.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  EMAIL_DELIVERY_UNAVAILABLE:
    'Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.',
  NETWORK_ERROR:
    'Não foi possível conectar ao ACE. Confira sua conexão e tente novamente.',
  TIMEOUT: 'A conexão demorou mais que o esperado. Tente novamente.',
  CONTRACT_ERROR:
    'Recebemos uma resposta inesperada. Tente novamente em instantes.',
  // Partidas e candidaturas (T06/T07)
  MATCH_FORMAT_UNSUPPORTED:
    'Esta modalidade não aceita esse formato. Escolha 1v1 ou 2v2 conforme o esporte.',
  MATCH_SCHEDULE_PAST:
    'O horário desta partida já passou. Escolha um horário no futuro.',
  MATCH_LEVEL_RANGE: 'O nível mínimo não pode passar do máximo.',
  MATCH_LOCATION_REQUIRED:
    'Informe onde a partida vai acontecer: local, cidade e estado.',
  CURSOR_INVALID: 'Não foi possível continuar a lista. Recarregue a busca.',
  DATE_RANGE_INVALID: 'A data final precisa ser depois da inicial.',
  NOT_MATCH_CREATOR: 'Só quem criou a partida pode fazer isso.',
  MATCH_NOT_FOUND: 'Esta partida não está disponível.',
  ARENA_NOT_FOUND: 'A arena escolhida não está disponível.',
  APPLICATION_NOT_FOUND:
    'Esta candidatura não está mais disponível. A lista foi atualizada.',
  PARTICIPANT_NOT_FOUND:
    'Este jogador não está mais na partida. A quadra foi atualizada.',
  MATCH_NOT_EDITABLE: 'Esta partida não pode mais ser editada.',
  MATCH_INVALID_TRANSITION:
    'Esta ação não está disponível no estado atual da partida.',
  MATCH_HAS_PARTICIPANTS:
    'Modalidade e formato não mudam depois que outros jogadores entram.',
  MATCH_NOT_OPEN: 'Esta partida não está aberta a candidaturas.',
  MATCH_NOT_PUBLIC: 'Esta partida é privada e não recebe candidaturas.',
  MATCH_FULL: 'A partida acabou de lotar. A quadra foi atualizada.',
  TEAM_FULL: 'Esse time acabou de ficar completo. Escolha o outro time.',
  ALREADY_APPLIED: 'Você já se candidatou a esta partida.',
  CREATOR_CANNOT_APPLY: 'Você organiza esta partida e já está confirmado nela.',
  APPLICATION_NOT_PENDING: 'Esta candidatura já foi decidida.',
  SPORT_PROFILE_REQUIRED:
    'Adicione esta modalidade ao seu perfil para continuar.',
  PARTICIPANT_NOT_CONFIRMED: 'Só jogadores confirmados podem ser removidos.',
  MATCH_ROSTER_LOCKED: 'Os times desta partida não podem mais mudar.',
  // Convites (T08)
  INVITE_SELF: 'Você já participa da própria partida.',
  INVITE_NOT_FOUND:
    'Este convite não está mais disponível. A lista foi atualizada.',
  INVITE_NOT_PENDING: 'Este convite já foi respondido ou cancelado.',
  INVITE_ALREADY_PENDING: 'Este jogador já tem um convite pendente.',
  ALREADY_PARTICIPANT: 'Este jogador já está na partida.',
  PARTICIPANT_INELIGIBLE:
    'Este jogador foi recusado ou removido desta partida e não pode voltar.',
  NOT_INVITEE: 'Só quem recebeu o convite pode responder.',
  NOT_INVITER: 'Só quem enviou o convite pode cancelar.',
  // Rede social (T28)
  FRIEND_REQUEST_SELF: 'Você não pode adicionar a si mesmo.',
  ALREADY_FRIENDS: 'Vocês já são amigos.',
  FRIEND_REQUEST_PENDING: 'Seu pedido já está aguardando resposta.',
  FRIEND_REQUEST_RECEIVED:
    'Esta pessoa já pediu sua amizade. Aceite o pedido recebido.',
  FRIEND_REQUEST_NOT_FOUND:
    'Este pedido não está mais disponível. A lista foi atualizada.',
  FRIEND_REQUEST_NOT_PENDING: 'Este pedido já foi respondido ou cancelado.',
  NOT_ADDRESSEE: 'Só quem recebeu o pedido pode responder.',
  NOT_REQUESTER: 'Só quem enviou o pedido pode cancelar.',
  PROFILE_PRIVATE: 'Este perfil é privado. Só amigos veem amigos e histórico.',
  // Resultados e histórico (T09)
  NOT_MATCH_MEMBER:
    'Só o criador ou um jogador confirmado pode registrar o resultado.',
  MATCH_INCOMPLETE:
    'Os times ainda não estão completos. O resultado só entra com a partida confirmada.',
  MATCH_CANCELLED: 'Esta partida foi cancelada e não recebe resultado.',
  MATCH_NOT_STARTED:
    'A partida ainda não aconteceu. Registre o placar depois do horário marcado.',
  RESULT_ALREADY_RECORDED:
    'O resultado desta partida já foi registrado. A página foi atualizada.',
  RESULT_SET_TIED: 'Um set não pode terminar empatado. Confira os placares.',
  RESULT_TIEBREAK_INVALID:
    'O tiebreak precisa ter o mesmo vencedor do set e não pode empatar.',
  RESULT_OUTCOME_REQUIRED: 'Informe o vencedor ou marque empate.',
  RESULT_OUTCOME_AMBIGUOUS:
    'Uma partida não pode ter vencedor e empate ao mesmo tempo.',
  RESULT_NOT_A_DRAW:
    'Os sets ganhos são diferentes: há um vencedor, não um empate.',
  RESULT_WINNER_MISMATCH: 'O vencedor precisa ser o time com mais sets ganhos.',
  RESULT_INCONSISTENT:
    'O placar não passou na verificação final. Confira os sets e tente novamente.',
};
export class ApiError extends Error {
  constructor(
    public code: string,
    public status?: number,
    public requestId?: string,
  ) {
    super(
      messages[code] ??
        'Não foi possível concluir a solicitação. Tente novamente.',
    );
    this.name = 'ApiError';
  }
}
export const api = Axios.create({
  baseURL: env.API_URL,
  allowAbsoluteUrls: false,
  withCredentials: false,
  timeout: 15000,
});
export function validateApiPath(path: string) {
  if (!/^\/v1\/[a-z0-9/_-]+$/i.test(path) || path.includes('//'))
    throw new Error('Invalid API path');
  return path;
}
export async function apiRequest<T extends z.ZodTypeAny>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  schema: T,
  data?: unknown,
  options: {
    /** Atalho para `auth: 'none'`. */
    public?: boolean;
    /**
     * `required` (padrão) exige sessão; `optional` envia o token se houver e
     * segue anônimo sem ele (perfil de jogador); `none` nunca envia token.
     */
    auth?: 'required' | 'optional' | 'none';
    signal?: AbortSignal;
    params?: Record<string, string | number | undefined>;
  } = {},
): Promise<z.infer<T>> {
  validateApiPath(path);
  const auth = options.auth ?? (options.public ? 'none' : 'required');
  const token = auth === 'none' ? null : sessionToken.get();
  if (auth === 'required' && !token) {
    void sessionToken.clear(true);
    throw new ApiError('AUTHENTICATION_REQUIRED', 401);
  }
  // Query string only carries defined, non-empty filters.
  const params = options.params
    ? Object.fromEntries(
        Object.entries(options.params).filter(
          ([, value]) => value !== undefined && value !== '',
        ),
      )
    : undefined;
  const config: AxiosRequestConfig = {
    method,
    url: path,
    data,
    params,
    signal: options.signal,
    headers: {
      Accept: 'application/json',
      ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  try {
    const response = await api.request(config);
    const parsed = schema.safeParse(
      response.status === 204 ? undefined : response.data,
    );
    if (!parsed.success) throw new ApiError('CONTRACT_ERROR', response.status);
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError || Axios.isCancel(error)) throw error;
    if (!Axios.isAxiosError(error)) throw new ApiError('NETWORK_ERROR');
    const status = error.response?.status;
    // An old in-flight response must never clear a newer identity.
    if (status === 401 && token && sessionToken.get() === token)
      void sessionToken.clear(true);
    const body = error.response?.data;
    const code =
      typeof body?.error?.code === 'string'
        ? body.error.code
        : status === 429
          ? 'RATE_LIMITED'
          : status === 401
            ? 'AUTHENTICATION_REQUIRED'
            : error.code === 'ECONNABORTED'
              ? 'TIMEOUT'
              : !status
                ? 'NETWORK_ERROR'
                : 'REQUEST_FAILED';
    throw new ApiError(
      code,
      status,
      typeof body?.requestId === 'string' ? body.requestId : undefined,
    );
  }
}
