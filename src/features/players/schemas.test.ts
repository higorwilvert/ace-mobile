import { makeSport } from '@/test/fixtures';

import { personalSchema, profileFormSchema, profilePayload } from './schemas';

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
  searchRadiusKm: '50',
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
