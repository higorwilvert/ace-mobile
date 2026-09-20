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
  it('enforces password length rules', () => {
    expect(passwordInput.safeParse('short').success).toBe(false);
    expect(passwordInput.safeParse('a'.repeat(12)).success).toBe(true);
    expect(currentPasswordInput.safeParse('').success).toBe(false);
    expect(currentPasswordInput.safeParse('x').success).toBe(true);
  });
});
