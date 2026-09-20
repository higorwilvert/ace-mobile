import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Refaz a consulta quando a tela volta ao foco (ex.: voltar do detalhe para
 * a lista). A primeira montagem já busca sozinha; só as voltas refazem.
 */
export function useRefetchOnFocus(refetch: () => unknown) {
  const mounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (mounted.current) void refetch();
      mounted.current = true;
    }, [refetch]),
  );
}
