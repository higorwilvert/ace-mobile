import {
  citiesQuery,
  isUf,
  locationShape,
  matchesCity,
  UFS,
} from './locations';

describe('locations (ported from web)', () => {
  it('knows the 27 federative units', () => {
    expect(UFS).toHaveLength(27);
    expect(isUf('SC')).toBe(true);
    expect(isUf('XX')).toBe(false);
  });
  it('matches cities ignoring accents and case', () => {
    expect(matchesCity('Florianópolis', 'florianopolis')).toBe(true);
    expect(matchesCity('São José', 'sao jo')).toBe(true);
    expect(matchesCity('Joinville', 'blumenau')).toBe(false);
  });
  it('only enables the cities query for a valid UF', () => {
    expect(citiesQuery('SC').enabled).toBe(true);
    expect(citiesQuery('').enabled).toBe(false);
    expect(citiesQuery('SC').queryKey).toEqual(['locations', 'cities', 'SC']);
  });
  it('validates state and city fields', () => {
    expect(locationShape.state.safeParse('SC').success).toBe(true);
    expect(locationShape.state.safeParse('sc').success).toBe(false);
    expect(locationShape.city.safeParse('A').success).toBe(false);
  });
});
