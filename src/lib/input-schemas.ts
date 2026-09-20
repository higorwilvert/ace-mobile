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

export const passwordInput = z
  .string()
  .min(12, 'A senha deve ter no mínimo 12 caracteres')
  .max(128, 'A senha deve ter no máximo 128 caracteres')
  .refine(
    (value) => !CONTROL_OR_FORMAT.test(value),
    'A senha contém caracteres inválidos',
  );

export const currentPasswordInput = z
  .string()
  .min(1, 'Informe a senha atual')
  .max(128, 'A senha deve ter no máximo 128 caracteres')
  .refine(
    (value) => !CONTROL_OR_FORMAT.test(value),
    'A senha contém caracteres inválidos',
  );
