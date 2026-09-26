import { z } from 'zod';

import { plainText } from '@/lib/input-schemas';
import { locationShape } from '@/lib/locations';
import { genderSchema, handSchema, sideSchema, type Sport } from '@/types/api';

const optionalText = (max: number) =>
  z.union([z.literal(''), plainText({ min: 1, max })]);
const phoneInput = z.union([
  z.literal(''),
  z.string().regex(/^\+?[0-9 ()-]{8,20}$/, 'Telefone inválido'),
]);
export const personalSchema = z.object({
  fullName: plainText({
    min: 2,
    max: 150,
    requiredMessage: 'Informe seu nome',
  }),
  gender: z.union([genderSchema, z.literal('')]),
  ...locationShape,
  phone: phoneInput,
  bio: optionalText(1000),
  dominantHand: z.union([handSchema, z.literal('')]),
});
export type PersonalValues = z.output<typeof personalSchema>;

/** Etapa opcional do onboarding: só os campos que não vêm do cadastro. */
export const personalExtrasSchema = personalSchema.pick({
  phone: true,
  bio: true,
  dominantHand: true,
});
export type PersonalExtrasValues = z.output<typeof personalExtrasSchema>;

// Entrada de texto ("3") vira inteiro; vazio segue vazio e vira `null` no payload.
const optionalInt = (max: number) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === '') return '' as const;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Use um número inteiro',
        });
        return z.NEVER;
      }
      if (parsed > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `No máximo ${max}`,
        });
        return z.NEVER;
      }
      return parsed;
    });

export const profileFormSchema = (sports: Sport[]) =>
  z
    .object({
      // O PickerField trabalha com string; a API espera número.
      sportId: z
        .union([z.string(), z.number()])
        .pipe(z.coerce.number().int().positive('Escolha uma modalidade')),
      categoryCode: z.string().min(1, 'Escolha a categoria'),
      preferredSide: z.union([sideSchema, z.literal('')]),
      yearsPracticing: optionalInt(32767),
      playFrequencyWeek: optionalInt(14),
      isPrincipal: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const sport = sports.find((item) => item.id === values.sportId);
      if (!sport) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sportId'],
          message: 'Escolha uma modalidade',
        });
        return;
      }
      if (!sport.categories.some((c) => c.code === values.categoryCode))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['categoryCode'],
          message: 'Escolha uma categoria desta modalidade',
        });
      if (sport.requiresSidePreference && !values.preferredSide)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['preferredSide'],
          message: 'Escolha o lado em que prefere jogar',
        });
    });
export type ProfileValues = z.output<ReturnType<typeof profileFormSchema>>;
export type ProfileInput = z.input<ReturnType<typeof profileFormSchema>>;

export type ProfilePayload = {
  sportId?: number;
  categoryCode: string;
  preferredSide: 'RIGHT' | 'LEFT' | 'BOTH' | null;
  yearsPracticing: number | null;
  playFrequencyWeek: number | null;
  isPrincipal: boolean;
};

/** Corpo exato do contrato: sem `sportId` na edição (a API não troca modalidade). */
export const profilePayload = (
  values: ProfileValues,
  sport: Sport,
  editing: boolean,
): ProfilePayload => ({
  ...(editing ? {} : { sportId: values.sportId }),
  categoryCode: values.categoryCode,
  preferredSide:
    sport.requiresSidePreference && values.preferredSide
      ? values.preferredSide
      : null,
  yearsPracticing:
    values.yearsPracticing === '' ? null : values.yearsPracticing,
  playFrequencyWeek:
    values.playFrequencyWeek === '' ? null : values.playFrequencyWeek,
  isPrincipal: values.isPrincipal,
});
