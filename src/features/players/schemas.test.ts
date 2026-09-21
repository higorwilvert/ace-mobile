import { makeAvailability, makeSport } from '@/test/fixtures';

import {
  availabilityFormSchema,
  personalSchema,
  profileFormSchema,
  profilePayload,
} from './schemas';

const padel = makeSport({ id: 1, slug: 'padel', requiresSidePreference: true });
const tenis = makeSport({
  id: 2,
  slug: 'tenis',
  requiresSidePreference: false,
});

const personalBase = {
  fullName: 'Ana Clara Souza',
  gender: '',
  state: 'SC',
  city: 'Florianópolis',
  phone: '',
  bio: '',
  dominantHand: '',
};

describe('personalSchema', () => {
  it('aceita campos opcionais vazios', () => {
    expect(personalSchema.safeParse(personalBase).success).toBe(true);
  });
  it('rejeita telefone fora do formato da API', () => {
    expect(
      personalSchema.safeParse({ ...personalBase, phone: 'telefone' }).success,
    ).toBe(false);
  });
  it('limita a bio a 1000 caracteres', () => {
    expect(
      personalSchema.safeParse({ ...personalBase, bio: 'a'.repeat(1001) })
        .success,
    ).toBe(false);
  });
});

describe('profileFormSchema', () => {
  const schema = profileFormSchema([padel, tenis]);
  const base = {
    sportId: 1,
    categoryCode: 'C',
    preferredSide: 'RIGHT',
    yearsPracticing: '',
    playFrequencyWeek: '',
    isPrincipal: false,
  };
  it('exige lado quando a modalidade pede', () => {
    const result = schema.safeParse({ ...base, preferredSide: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['preferredSide']);
  });
  it('aceita sem lado quando a modalidade não pede', () => {
    expect(
      schema.safeParse({ ...base, sportId: 2, preferredSide: '' }).success,
    ).toBe(true);
  });
  it('rejeita categoria que não pertence à modalidade', () => {
    expect(schema.safeParse({ ...base, categoryCode: 'ZZZ' }).success).toBe(
      false,
    );
  });
  it('rejeita frequência acima de 14 por semana', () => {
    expect(schema.safeParse({ ...base, playFrequencyWeek: '15' }).success).toBe(
      false,
    );
  });
  it('payload converte vazio em null e omite sportId na edição', () => {
    const values = schema.parse(base);
    expect(profilePayload(values, padel, false)).toEqual({
      sportId: 1,
      categoryCode: 'C',
      preferredSide: 'RIGHT',
      yearsPracticing: null,
      playFrequencyWeek: null,
      isPrincipal: false,
    });
    expect(profilePayload(values, padel, true)).not.toHaveProperty('sportId');
  });
  it('payload zera o lado quando a modalidade não usa', () => {
    const values = schema.parse({ ...base, sportId: 2, preferredSide: '' });
    expect(profilePayload(values, tenis, false).preferredSide).toBeNull();
  });
});

describe('availabilityFormSchema', () => {
  const existing = [
    makeAvailability({
      id: 'w1',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
    }),
  ];
  const parse = (values: unknown, editingId?: string) =>
    availabilityFormSchema(existing, editingId).safeParse(values);
  const window = {
    dayOfWeek: 1,
    startTime: '10:00',
    endTime: '11:00',
    timeZone: 'America/Sao_Paulo',
  };
  it('aceita janelas encostadas', () => {
    expect(parse(window).success).toBe(true);
  });
  it('rejeita fim igual ou antes do início', () => {
    expect(
      parse({ ...window, startTime: '11:00', endTime: '11:00' }).success,
    ).toBe(false);
    expect(
      parse({ ...window, startTime: '11:00', endTime: '10:30' }).success,
    ).toBe(false);
  });
  it('rejeita sobreposição no mesmo dia', () => {
    expect(
      parse({ ...window, startTime: '09:30', endTime: '10:30' }).success,
    ).toBe(false);
  });
  it('ignora a própria janela ao editar', () => {
    expect(
      parse({ ...window, startTime: '09:00', endTime: '10:00' }, 'w1').success,
    ).toBe(true);
  });
  it('aceita o mesmo horário em outro dia', () => {
    expect(parse({ ...window, dayOfWeek: 2, startTime: '09:00' }).success).toBe(
      true,
    );
  });
  it('rejeita fuso diferente do já cadastrado', () => {
    expect(parse({ ...window, timeZone: 'America/Manaus' }).success).toBe(
      false,
    );
  });
  it('aceita qualquer fuso quando não há outra janela', () => {
    expect(
      availabilityFormSchema([]).safeParse({
        ...window,
        timeZone: 'America/Manaus',
      }).success,
    ).toBe(true);
  });
});
