// T49: destino pedido por deep link (ace://matches/:id) antes do login. O
// onboarding (para onde o grupo (auth) manda quem acabou de entrar) usa e limpa.
const MATCH_PATH =
  /^\/matches\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
let pending: string | null = null;

export function rememberPendingLink(path: string) {
  if (MATCH_PATH.test(path)) pending = path;
}
export const peekPendingLink = () => pending;
export function clearPendingLink() {
  pending = null;
}
