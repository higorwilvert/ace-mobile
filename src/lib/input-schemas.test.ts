import {
  currentPasswordInput,
  emailInput,
  passwordInput,
  plainText,
} from './input-schemas';

describe('input schemas (ported from web)', () => {
  it('normalizes e-mail to NFC, trimmed, lower-case', () => {
    expect(emailInput.parse('  Ana@Exemplo.COM ')).toBe('ana@exemplo.com');
    expect(emailInput.safeParse('nope').success).toBe(false);
  });
  it('trims plain text and rejects control characters', () => {
    const name = plainText({ min: 2, max: 10, requiredMessage: 'Nome' });
    expect(name.parse('  Ana ')).toBe('Ana');
    expect(name.safeParse('A').success).toBe(false);
    expect(name.safeParse(`Ana${String.fromCharCode(0)}`).success).toBe(false);
  });
  it('enforces password length and composition rules', () => {
    expect(passwordInput.safeParse('Ab1!abc').success).toBe(false);
    expect(passwordInput.safeParse('a'.repeat(12)).success).toBe(false);
    expect(passwordInput.safeParse('Raquete1!').success).toBe(true);
    expect(passwordInput.safeParse('Sênha-Ok9').success).toBe(true);
    expect(currentPasswordInput.safeParse('').success).toBe(false);
    expect(currentPasswordInput.safeParse('x').success).toBe(true);
  });
  it.each([
    ['raquete2026!', 'maiúscula'],
    ['RAQUETE2026!', 'minúscula'],
    ['Raquete!!!!', 'número'],
    ['Raquete2026', 'especial'],
  ])('new password %p names the missing rule (%s)', (value, rule) => {
    const result = passwordInput.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(rule);
  });
});
