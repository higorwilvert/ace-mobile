import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ApiError } from '@/lib/api-client';
import { sessionEnded } from '@/lib/events';
import { queryClient } from '@/lib/react-query';
import { sessionToken } from '@/lib/token';
import type { Session, User } from '@/types/api';

import { authQueryOptions, fetchCurrentUser, logout } from './api';

export type SessionStatus = 'loading' | 'signed-out' | 'signed-in';
type SessionState = {
  status: SessionStatus;
  user: User | null;
  /** A sessão terminou por expiração ou 401 (o login mostra um aviso). */
  expired: boolean;
  /** Falha de rede ao validar a sessão salva no boot (o token continua salvo). */
  bootError: ApiError | null;
};
type SessionContextValue = SessionState & {
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const authQueryHash = JSON.stringify(authQueryOptions.queryKey);
const signedOut = (extra: Partial<SessionState> = {}): SessionState => ({
  status: 'signed-out',
  user: null,
  expired: false,
  bootError: null,
  ...extra,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    status: 'loading',
    user: null,
    expired: false,
    bootError: null,
  });

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const token = await sessionToken.load();
      if (!token) {
        if (!cancelled) setState(signedOut());
        return;
      }
      try {
        // Direto no cliente HTTP: um 401 aqui dispara `sessionEnded`, que
        // limpa o cache do React Query e cancelaria um `fetchQuery` em voo.
        const user = await fetchCurrentUser();
        if (cancelled) return;
        queryClient.setQueryData(authQueryOptions.queryKey, user);
        setState({
          status: 'signed-in',
          user,
          expired: false,
          bootError: null,
        });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          // apiRequest já limpou o token e emitiu `sessionEnded`.
          setState(signedOut({ expired: true }));
        } else {
          setState(
            signedOut({ bootError: error instanceof ApiError ? error : null }),
          );
        }
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      sessionEnded.subscribe(() => {
        queryClient.clear();
        setState(signedOut({ expired: true }));
      }),
    [],
  );

  // Quem edita o usuário grava em `['private','me']`; a sessão acompanha o
  // cache para que saudação e menu mostrem o dado novo sem refetch.
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.query.queryHash !== authQueryHash) return;
        const user = event.query.state.data as User | undefined;
        if (!user) return;
        setState((prev) =>
          prev.status === 'signed-in' && prev.user !== user
            ? { ...prev, user }
            : prev,
        );
      }),
    [],
  );

  const signIn = useCallback(async (session: Session) => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await sessionToken.set(session.accessToken, session.expiresAt);
    queryClient.setQueryData(authQueryOptions.queryKey, session.user);
    setState({
      status: 'signed-in',
      user: session.user,
      expired: false,
      bootError: null,
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      // 401: a sessão já não existe no servidor; encerrar localmente é o
      // resultado desejado. Qualquer outra falha mantém a sessão.
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    await sessionToken.clear();
    await queryClient.cancelQueries();
    queryClient.clear();
    setState(signedOut());
  }, []);

  const value = useMemo(
    () => ({ ...state, signIn, signOut }),
    [state, signIn, signOut],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession precisa de <SessionProvider>');
  return context;
}
