import { z } from 'zod';

const CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}]/u;

export const plainText = ({
  min = 1,
  max,
  requiredMessage = 'Obrigatório',
}: {
  min?: number;
  max: number;
  requiredMessage?: string;
}) =>
  z
    .string()
    .transform((value) => value.normalize('NFC').trim())
    .pipe(
      z
        .string()
        .min(min, requiredMessage)
        .max(max)
        .refine((value) => !CONTROL_OR_FORMAT.test(value), 'Texto inválido'),
    );

export const emailInput = z
  .string()
  .transform((value) => value.normalize('NFC').trim().toLowerCase())
  .pipe(
    z
      .string()
      .email('Email inválido')
      .max(254)
      .refine((value) => !CONTROL_OR_FORMAT.test(value), 'Email inválido'),
  );

// Espelha PasswordService.assertAllowed da API: 8–128 com as quatro classes.
export const passwordInput = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .max(128, 'A senha deve ter no máximo 128 caracteres')
  .refine(
    (value) => !CONTROL_OR_FORMAT.test(value),
    'A senha contém caracteres inválidos',
  )
  .refine((value) => /\p{Ll}/u.test(value), 'Inclua uma letra minúscula')
  .refine((value) => /\p{Lu}/u.test(value), 'Inclua uma letra maiúscula')
  .refine((value) => /\p{Nd}/u.test(value), 'Inclua um número')
  .refine(
    (value) => /[^\p{L}\p{N}]/u.test(value),
    'Inclua um caractere especial (ex.: ! @ # -)',
  );

export const currentPasswordInput = z
  .string()
  .min(1, 'Informe a senha atual')
  .max(128, 'A senha deve ter no máximo 128 caracteres')
  .refine(
    (value) => !CONTROL_OR_FORMAT.test(value),
    'A senha contém caracteres inválidos',
  );
