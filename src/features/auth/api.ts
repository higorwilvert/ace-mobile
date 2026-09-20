import { queryOptions, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/lib/api-client';
import {
  currentPasswordInput,
  emailInput,
  passwordInput,
  plainText,
} from '@/lib/input-schemas';
import { locationShape } from '@/lib/locations';
import {
  apiEnvelope,
  genderSchema,
  type Session,
  sessionSchema,
  type User,
  userSchema,
} from '@/types/api';

export const loginSchema = z.object({
  email: emailInput,
  password: currentPasswordInput,
});
export type LoginValues = z.output<typeof loginSchema>;

export const recoverySchema = z.object({ email: emailInput });
export type RecoveryValues = z.output<typeof recoverySchema>;

// Cadastro em duas etapas: cada etapa valida o seu pedaço; o envio reúne os
// dois. A regra de senhas iguais vive na etapa da conta.
export const accountSchema = z
  .object({
    email: emailInput,
    password: passwordInput,
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas precisam ser iguais',
  });
export type AccountValues = z.output<typeof accountSchema>;

export const personalStepSchema = z.object({
  fullName: plainText({
    min: 2,
    max: 150,
    requiredMessage: 'Informe seu nome',
  }),
  gender: z.union([genderSchema, z.literal('')]),
  ...locationShape,
});
export type PersonalStepValues = z.output<typeof personalStepSchema>;

export type RegisterValues = AccountValues & PersonalStepValues;

/** Usuário da sessão atual (`GET /v1/users/me`). */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<User> {
  const { data } = await apiRequest(
    'GET',
    '/v1/users/me',
    apiEnvelope(userSchema),
    undefined,
    { signal },
  );
  return data;
}

export const authQueryOptions = queryOptions({
  queryKey: ['private', 'me'],
  queryFn: ({ signal }) => fetchCurrentUser(signal),
  staleTime: 30_000,
  retry: false,
});
export const useUser = () => useQuery(authQueryOptions);

export async function login(values: LoginValues): Promise<Session> {
  const { data } = await apiRequest(
    'POST',
    '/v1/auth/login',
    apiEnvelope(sessionSchema),
    loginSchema.parse(values),
    { public: true },
  );
  return data;
}

export async function register(values: RegisterValues): Promise<User> {
  // A confirmação pertence só ao formulário; o payload é o contrato exato.
  const { data } = await apiRequest(
    'POST',
    '/v1/auth/register',
    apiEnvelope(userSchema),
    {
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      city: values.city,
      state: values.state,
      ...(values.gender ? { gender: values.gender } : {}),
    },
    { public: true },
  );
  return data;
}

/** A API responde 202 com `{ message }` fora do envelope `{ data }`. */
export function forgotPassword(values: RecoveryValues) {
  return apiRequest(
    'POST',
    '/v1/auth/forgot-password',
    z.object({ message: z.string() }),
    recoverySchema.parse(values),
    { public: true },
  );
}

export function logout(): Promise<void> {
  return apiRequest('POST', '/v1/auth/logout', z.void());
}
