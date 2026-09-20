# ACE Mobile

Aplicativo mobile do **ACE Matchmaking** (Expo SDK 57 / React Native). A base do T23 trouxe identidade de projeto, navegação autenticada, cliente HTTP com contrato Zod e sessão segura contra a API real (`../my-base-api`). O T24 acrescentou recuperação de senha, cadastro em assistente de cinco etapas com o primeiro perfil esportivo, dados pessoais, perfis esportivos, disponibilidade semanal, perfil público, privacidade e desativação de conta. O T30 trouxe partidas e candidaturas (busca com filtros e cursor, detalhe com a quadra, criar/editar/cancelar, candidatar, aprovar/recusar, minhas partidas e candidaturas). O T31 trouxe convites (enviar do detalhe ou do perfil, aceitar pela vaga, recusar, cancelar, caixa em Minhas com badge de pendências), registro de placar set a set com desfecho derivado e histórico com totais por modalidade. O T32 trouxe a aba **Para você** (recomendações de jogadores e partidas geradas pela API, com motivo curto, explicação por fator e modo técnico; convidar/candidatar-se direto da sugestão) e a tela **Rating e evolução** (Glicko-2 por modalidade, RD/σ e a variação por partida com os valores registrados pela API). Amigos chegam em T33.

## Começar

Node 24 e pnpm 11 (declarados em `package.json`). Xcode (simulador iOS) e/ou Android Studio (emulador) com o app **Expo Go 57** — o Expo CLI instala/atualiza sozinho.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local   # opcional em desenvolvimento
pnpm ios                     # ou pnpm android / pnpm dev (QR code no celular)
```

A API precisa estar rodando na pasta irmã (`npm run dev` em `../my-base-api`). Sem `EXPO_PUBLIC_API_URL`, em desenvolvimento o app usa o host do Metro na porta 3001 (`http://<ip-do-mac>:3001`), o que funciona no simulador iOS, no emulador Android e em um celular na mesma rede. Fora de desenvolvimento a variável é obrigatória e precisa ser HTTPS; não existe fallback. Clientes nativos não enviam `Origin`, então a API aceita o app sem alterar `FRONTEND_URL`.

Em shells não interativos rode o pnpm com `CI=1` (evita o prompt de `approve-builds`). Na primeira abertura no simulador o Expo Go mostra um tutorial do menu de desenvolvimento; para pular: `xcrun simctl spawn booted defaults write host.exp.Exponent EXDevMenuIsOnboardingFinished -bool true`.

## Scripts

| Script                                   | O que faz                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev` / `pnpm ios` / `pnpm android` | Metro + Expo Go                                                         |
| `pnpm lint`                              | ESLint 9 (config Expo + import/order + camadas + kebab-case + Prettier) |
| `pnpm typecheck`                         | `tsc --noEmit` (TypeScript 6, strict; rotas tipadas geradas pelo Expo)  |
| `pnpm test`                              | Jest (`jest-expo`) + Testing Library                                    |
| `pnpm check`                             | lint + typecheck + test                                                 |
| `pnpm doctor`                            | `expo-doctor`                                                           |

## Arquitetura

```
app/            rotas (Expo Router)  ≈ src/routes do web
  (auth)/       login, register (etapas 1-2), forgot-password → sem sessão; logado vai para /onboarding
  (app)/        Stack com guarda de sessão
    (tabs)/     index (Início), matches (Partidas: busca pública), mine (Minhas: partidas | candidaturas), profile (menu do Perfil)
    onboarding  etapas 3-5 do assistente (sem header; redireciona para / se já há perfil esportivo)
    personal, sports, availability, account, search, players/[userId]  → telas empilhadas com header nativo
    matches/new, matches/[matchId]/index, matches/[matchId]/edit         → nova partida, detalhe, edição
src/
  components/ui    Text, Button, TextField, PickerField, Chips, Screen, Sheet (NativeWind + cva)
  components/ace   estados, campos de formulário (RHF), Avatar, StepProgress, SportIcon
  config/          env.ts (EXPO_PUBLIC_API_URL), palette.json (cores, raios e cores por modalidade)
  features/auth    api.ts, session.tsx, login, cadastro (assistente), esqueci-senha
  features/onboarding  etapas 3-5 e conclusão
  features/players api.ts, schemas.ts, labels.ts, sport-form + telas de pessoal, esportes,
                   disponibilidade, conta, busca e perfil público
  features/matches api.ts (contrato + queries por cursor), schemas.ts (matchPermissions, formulário,
                   payload diff, search params), use-match-mutation, match-card, court-board + telas
                   explorar, detalhe (+ applications-panel), formulário e minhas (paged-list)
  features/invites api.ts, schemas.ts (invitePermissions), use-invite-mutation, invite-card,
                   invites-view (segmento de Minhas), invite-composer, invite-sheet (do detalhe),
                   invite-to-match-sheet (do perfil), match-invites-panel (criador)
  features/results api.ts (histórico, totais, resultado), schemas.ts (resultFormSchema,
                   deriveOutcome, scoreline…), use-result-mutation, result-screen, result-panel,
                   totals-tiles, history-entry, history-screen
  features/recommendations api.ts (contrato T13/T14 + generateRecommendations), schemas.ts (motivos,
                   reconstrução, formulário, payload, textos), recommendation-form, score-details
                   (ScoreHeader/ScoreDetails/GenerationDetails), player-suggestion, match-suggestion,
                   recommendations-screen (aba Para você)
  features/players + rating-card, rating-screen (Perfil › Rating e evolução)
  features/home    home-screen (Para você, rating do esporte principal, próximas partidas,
                   convites pendentes), profile-menu-screen
  hooks/           use-refetch-on-focus, use-inbox-count (badge da aba Minhas)
  lib/             api-client, token (SecureStore), react-query, input-schemas, locations, utils
  types/api.ts     contrato Zod (portado do web)
```

URLs: `/` (Início), `/for-you` (Para você), `/rating`, `/matches` (filtros nos query params), `/matches/new`, `/matches/:id`, `/matches/:id/edit`, `/matches/:id/result`, `/mine?view&role&box&status`, `/history?sportId&userId`, `/profile`, `/onboarding`, `/personal`, `/sports`, `/availability`, `/account`, `/search`, `/players/:userId`, `/login`, `/register`, `/forgot-password`. `(app)` e `(tabs)` são grupos e não entram na URL; não existe `app/index.tsx`. O Stack de `(app)` redireciona quem não tem sessão para `/login`; o grupo `(auth)` manda quem já está logado para `/onboarding`, que decide entre o assistente e o Início.

Regras de camada (ESLint): `features/` não importa `app/`; `components|hooks|lib|types` não importam `features/`. Novos domínios entram como `src/features/<dominio>/` com `api.ts` + telas, como no web.

Tokens visuais em `src/config/palette.json` (azuis do web convertidos de oklch, fundo, texto, raios 12/10/8/6 e `pill`, mais `sports.<slug>` com fundo/traço por modalidade) alimentam o `tailwind.config.js` e as props nativas. Fonte Inter (400–700) via `@expo-google-fonts/inter`; classes `font-inter`, `font-inter-medium`, `font-inter-semibold`, `font-inter-bold`. Como no web autenticado: sem modo escuro, sem sombras (superfícies brancas com borda de 1 px) e a diagonal só sobrevive como a faixa navy no topo do Perfil.

## Sessão e segurança

A API usa **Bearer opaco** com TTL de 60 minutos e sem refresh. O token fica em memória e é persistido no **`expo-secure-store`** (Keychain no iOS, Keystore no Android, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Ao abrir o app, `SessionProvider` restaura o token e o valida em `GET /v1/users/me`; 401 limpa tudo e volta ao login com aviso; falha de rede mantém o token e mostra a mensagem no login. Reabrir o app dentro do TTL não pede senha; depois dele, sim — limitação do contrato atual, não contornada no cliente.

Requisições privadas só saem com token válido; um 401 só encerra a sessão se o token da resposta ainda for o atual. Logout revoga na API antes de limpar localmente. Respostas são validadas com Zod; erros chegam à interface só pelo mapa de códigos → mensagens em `src/lib/api-client.ts`. Nada além de `EXPO_PUBLIC_API_URL` entra no bundle; não há segredos no cliente.

Limitações do escopo atual: a recuperação de senha só dispara o e-mail — a troca acontece no link, que abre no navegador; o avatar é uma URL HTTPS (não há upload na API); os horários de disponibilidade usam faixas de 30 minutos. Fora do escopo: push, offline, build nativa/EAS e publicação em loja.

## Verificação

```sh
pnpm check
CI=1 pnpm exec expo export --platform ios --output-dir dist && rm -rf dist
```

Evidências em `docs/entrega-t23.md` e `docs/entrega-t24.md` (capturas, roteiro manual e roteiro contra a API em `docs/evidencias/`); specs e planos em `docs/superpowers/`.
