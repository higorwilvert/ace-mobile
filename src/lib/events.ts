type Listener = () => void;

// Sinal único "sessão encerrada" (expiração local ou 401), sem `window`.
function createSignal() {
  const listeners = new Set<Listener>();
  return {
    emit() {
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const sessionEnded = createSignal();
