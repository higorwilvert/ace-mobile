import { cn, firstName, formatPhone, getFirstAndLastLetter } from './utils';

describe('utils', () => {
  it('merges conflicting tailwind classes keeping the last one', () => {
    expect(cn('px-2', 'px-4', false && 'hidden')).toBe('px-4');
  });
  it('extracts the first name', () => {
    expect(firstName('  Ana Clara Souza ')).toBe('Ana');
    expect(firstName('')).toBe('');
  });
  it('builds initials from first and last name', () => {
    expect(getFirstAndLastLetter('Ana Clara Souza')).toBe('AS');
    expect(getFirstAndLastLetter('Ana')).toBe('A');
    expect(getFirstAndLastLetter('   ')).toBe('');
  });
});

describe('formatPhone', () => {
  it('formata celular e fixo enquanto digita', () => {
    expect(formatPhone('4')).toBe('(4');
    expect(formatPhone('48')).toBe('(48');
    expect(formatPhone('489')).toBe('(48) 9');
    expect(formatPhone('4833330000')).toBe('(48) 3333-0000');
    expect(formatPhone('48999990000')).toBe('(48) 99999-0000');
    expect(formatPhone('(48) 99999-0000x')).toBe('(48) 99999-0000');
  });
  it('limita a 11 dígitos e aceita internacional sem formatar', () => {
    expect(formatPhone('489999900001234')).toBe('(48) 99999-0000');
    expect(formatPhone('+55 48 99999-0000')).toBe('+55 48 99999-0000');
    expect(formatPhone('')).toBe('');
  });
});
