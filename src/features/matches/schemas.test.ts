import {
  makeMatch,
  makeMatchDetail,
  makePlayerProfile,
  makeSport,
  makeUser,
} from '@/test/fixtures';

import type { MatchDetail } from './api';
import {
  activeFilterChips,
  activeFilterCount,
  dateOptions,
  durationLabel,
  formatLabel,
  formatWhen,
  formatWhenLong,
  fromScheduledAt,
  hasAnySearch,
  matchesSearchSchema,
  matchFormDefaults,
  matchFormSchema,
  matchPayload,
  matchPermissions,
  matchStatusLabel,
  matchTitle,
  mineActiveFilters,
  mineSearchSchema,
  placeLabel,
  timeOptions,
  toScheduledAt,
} from './schemas';

const now = new Date('2026-09-13T12:00:00.000Z');
const user = makeUser();
const padel = makeSport();
const tenis = makeSport({
  id: 2,
  slug: 'tenis',
  name: 'Tênis',
  defaultTeamSize: 1,
  supportsSingles: true,
  supportsDoubles: true,
  requiresSidePreference: false,
});
const sports = [padel, tenis];
const matchDetail = makeMatchDetail();
const full = { teamSize: 2 as const, total: 4, confirmed: 4, available: 0 };
const outsider = (patch: Partial<MatchDetail> = {}): MatchDetail => ({
  ...matchDetail,
  viewer: { isCreator: false, participation: null, invite: null },
  ...patch,
});
const withParticipation = (
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'REMOVED',
): MatchDetail =>
  outsider({
    viewer: {
      isCreator: false,
      invite: null,
      participation: {
        id: matchDetail.teams[0].participants[0].id,
        status,
        teamIndex: 2,
      },
    },
  });

describe('matchPermissions', () => {
  it('permite ao criador editar, publicar e cancelar só nos estados certos', () => {
    const draft = matchPermissions({ ...matchDetail, status: 'DRAFT' }, now);
    expect(draft).toMatchObject({
      viewerRole: 'creator',
      canEdit: true,
      canPublish: true,
      canCancel: true,
      canManage: false,
      canApply: false,
      lockedReason: null,
    });
    expect(matchPermissions(matchDetail, now)).toMatchObject({
      canEdit: true,
      canPublish: false,
      canManage: true,
      canChangeFormat: true,
      canInvite: true,
    });
    const confirmed = matchPermissions(
      { ...matchDetail, status: 'CONFIRMED', capacity: full },
      now,
    );
    expect(confirmed).toMatchObject({
      canEdit: false,
      canManage: true,
      canCancel: true,
      canChangeFormat: false,
      canInvite: false,
    });
    expect(confirmed.lockedReason).toMatch(/Times completos/);
    for (const status of ['COMPLETED', 'CANCELLED'] as const) {
      const terminal = matchPermissions({ ...matchDetail, status }, now);
      expect(terminal).toMatchObject({
        canEdit: false,
        canCancel: false,
        canManage: false,
      });
      expect(terminal.lockedReason).not.toBeNull();
    }
  });
  it('trava modalidade e formato quando outro jogador já está confirmado', () => {
    const withPlayer = matchPermissions(
      {
        ...matchDetail,
        capacity: { teamSize: 2, total: 4, confirmed: 2, available: 2 },
      },
      now,
    );
    expect(withPlayer.canEdit).toBe(true);
    expect(withPlayer.canChangeFormat).toBe(false);
  });
  it('deixa um terceiro se candidatar só a partida pública, aberta, futura e com vaga', () => {
    expect(matchPermissions(outsider(), now)).toMatchObject({
      viewerRole: 'outsider',
      canApply: true,
      canWithdraw: false,
      applyBlockedReason: null,
    });
    const cases: [Partial<MatchDetail>, RegExp][] = [
      [{ visibility: 'PRIVATE' }, /privada/],
      [{ status: 'CANCELLED' }, /cancelada/],
      [{ status: 'COMPLETED' }, /já aconteceu/],
      [{ status: 'IN_PROGRESS' }, /em andamento/],
      [{ status: 'CONFIRMED', capacity: full }, /completos/],
      [{ capacity: full }, /completos/],
      [{ scheduledAt: '2020-01-01T10:00:00.000Z' }, /já passou/],
    ];
    for (const [patch, reason] of cases) {
      const result = matchPermissions(outsider(patch), now);
      expect(result.canApply).toBe(false);
      expect(result.applyBlockedReason).toMatch(reason);
    }
  });
  it('mapeia a participação para o papel e o direito de retirar', () => {
    expect(matchPermissions(withParticipation('PENDING'), now)).toMatchObject({
      viewerRole: 'pending',
      canApply: false,
      canWithdraw: true,
    });
    expect(matchPermissions(withParticipation('CONFIRMED'), now)).toMatchObject(
      { viewerRole: 'confirmed', canApply: false, canWithdraw: false },
    );
    for (const status of ['DECLINED', 'REMOVED'] as const) {
      const result = matchPermissions(withParticipation(status), now);
      expect(result.viewerRole).toBe(status.toLowerCase());
      expect(result.canApply).toBe(false);
      expect(result.applyBlockedReason).toBeNull();
    }
  });
  it('trata convidado pendente como invited: aceita numa vaga, não se candidata', () => {
    const invited = outsider({
      visibility: 'PRIVATE',
      viewer: {
        isCreator: false,
        participation: null,
        invite: { id: matchDetail.id, status: 'PENDING', teamIndex: 2 },
      },
    });
    expect(matchPermissions(invited, now)).toMatchObject({
      viewerRole: 'invited',
      canApply: false,
      canAcceptInvite: true,
      applyBlockedReason: null,
    });
  });
  it('libera o placar para criador ou confirmado só com a partida confirmada e passada', () => {
    const past = '2026-09-13T10:00:00.000Z';
    const played = matchPermissions(
      {
        ...matchDetail,
        status: 'CONFIRMED',
        scheduledAt: past,
        capacity: full,
      },
      now,
    );
    expect(played).toMatchObject({
      canRecordResult: true,
      resultBlockedReason: null,
    });
    const future = matchPermissions(
      { ...matchDetail, status: 'CONFIRMED', capacity: full },
      now,
    );
    expect(future.canRecordResult).toBe(false);
    expect(future.resultBlockedReason).toMatch(/depois do horário/);
    expect(
      matchPermissions(
        {
          ...outsider(),
          status: 'CONFIRMED',
          scheduledAt: past,
          capacity: full,
        },
        now,
      ),
    ).toMatchObject({ canRecordResult: false, resultBlockedReason: null });
  });
  it('trata visitante anônimo como terceiro', () => {
    expect(
      matchPermissions({ ...matchDetail, viewer: null }, now),
    ).toMatchObject({ viewerRole: 'outsider', canEdit: false, canApply: true });
  });
});

describe('rótulos e datas', () => {
  it('descreve formato, duração e local', () => {
    expect(formatLabel(1)).toBe('1v1 · Simples');
    expect(formatLabel(2)).toBe('2v2 · Duplas');
    expect(durationLabel(45)).toBe('45 min');
    expect(durationLabel(60)).toBe('1 hora');
    expect(durationLabel(90)).toBe('1h30');
    expect(durationLabel(120)).toBe('2 horas');
    const match = makeMatch();
    expect(placeLabel(match)).toBe('Quadra 2 do Parque Ramiro Ruediger');
    expect(
      placeLabel({
        locationText: null,
        arena: {
          id: match.id,
          name: 'Arena Vila Nova',
          city: 'Blumenau',
          state: 'SC',
          address: null,
        },
      }),
    ).toBe('Arena Vila Nova');
    expect(placeLabel({ arena: null, locationText: null })).toBe(
      'Local a combinar',
    );
  });
  it('mostra "Aguardando placar" para confirmada que já aconteceu', () => {
    const past = '2026-09-13T10:00:00.000Z';
    expect(
      matchStatusLabel({ status: 'CONFIRMED', scheduledAt: past }, now),
    ).toBe('Aguardando placar');
    expect(
      matchStatusLabel(
        { status: 'CONFIRMED', scheduledAt: '2026-09-13T14:00:00.000Z' },
        now,
      ),
    ).toBe('Confirmada');
    expect(matchStatusLabel({ status: 'OPEN', scheduledAt: past }, now)).toBe(
      'Aberta',
    );
  });
  it('usa modalidade e formato quando a partida não tem título', () => {
    expect(
      matchTitle({ title: null, sport: { name: 'Padel' }, teamSize: 2 }),
    ).toBe('Padel · 2v2');
    expect(
      matchTitle({ title: 'Rachão', sport: { name: 'Tênis' }, teamSize: 1 }),
    ).toBe('Rachão');
  });
  it('formata datas locais e faz a ida e volta dos campos do formulário', () => {
    const local = new Date(2026, 8, 19, 18, 0); // sábado
    const iso = local.toISOString();
    expect(formatWhen(iso, new Date(2026, 0, 1))).toBe('Sáb, 19 set · 18:00');
    expect(formatWhen(iso, new Date(2027, 0, 1))).toBe(
      'Sáb, 19 set 2026 · 18:00',
    );
    expect(formatWhenLong(iso, 90)).toBe(
      'Sábado, 19 de setembro · 18:00–19:30',
    );
    expect(fromScheduledAt(iso)).toEqual({ date: '2026-09-19', time: '18:00' });
    expect(toScheduledAt('2026-09-19', '18:00')).toBe(iso);
    expect(toScheduledAt('2026-13-45', '18:00')).toBeNull();
    expect(toScheduledAt('2026-09-19', '25:00')).toBeNull();
  });
  it('monta as opções dos seletores de data e hora', () => {
    const base = new Date(2026, 8, 19, 12, 0);
    const dates = dateOptions(base);
    expect(dates).toHaveLength(60);
    expect(dates[0]).toEqual({
      value: '2026-09-19',
      label: 'Hoje · Sáb, 19 set',
    });
    expect(dates[1].label).toBe('Amanhã · Dom, 20 set');
    // Data antiga (edição) entra no topo em vez de sumir do seletor.
    expect(dateOptions(base, '2026-01-05')[0]).toEqual({
      value: '2026-01-05',
      label: 'Seg, 5 jan',
    });
    const times = timeOptions();
    expect(times[0].value).toBe('06:00');
    expect(times.at(-1)?.value).toBe('23:00');
    expect(times).toHaveLength(69);
    expect(timeOptions('18:05')[0].value).toBe('18:05');
  });
});

describe('formulário de partida', () => {
  const schema = matchFormSchema(sports, () => now);
  const valid = {
    sportId: '1',
    teamSize: '2',
    date: '2026-09-19',
    time: '18:00',
    durationMinutes: '90',
    state: 'SC',
    city: 'Florianópolis',
    locationText: 'Quadra 2',
    title: '',
    description: '',
    genderPolicy: 'FEMALE',
    minCategoryCode: '',
    maxCategoryCode: '',
    visibility: 'PUBLIC',
  };
  const errorsOf = (value: unknown) => {
    const result = schema.safeParse(value);
    return result.success
      ? []
      : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  };
  it('aceita uma partida completa e converte os números', () => {
    expect(schema.parse(valid)).toMatchObject({
      sportId: 1,
      teamSize: 2,
      durationMinutes: 90,
    });
  });
  it('recusa formatos que a modalidade não suporta', () => {
    expect(errorsOf({ ...valid, teamSize: '1' })).toEqual([
      'teamSize: Padel não aceita o formato 1v1',
    ]);
    expect(errorsOf({ ...valid, sportId: '2', teamSize: '1' })).toEqual([]);
  });
  it('recusa horário passado, categorias invertidas, título curto e local vazio', () => {
    expect(errorsOf({ ...valid, date: '2026-09-13', time: '08:00' })).toEqual([
      'time: Escolha um horário no futuro',
    ]);
    expect(
      errorsOf({ ...valid, minCategoryCode: 'C', maxCategoryCode: 'D' }),
    ).toEqual([
      'maxCategoryCode: A categoria máxima precisa ser igual ou acima da mínima',
    ]);
    expect(errorsOf({ ...valid, title: 'ab' })).toEqual([
      'title: Use ao menos 3 caracteres no título',
    ]);
    expect(errorsOf({ ...valid, locationText: '' })).toEqual([
      'locationText: Informe o local da partida',
    ]);
    expect(errorsOf({ ...valid, sportId: '99' })).toEqual([
      'sportId: Escolha uma modalidade disponível',
    ]);
    expect(
      errorsOf({
        ...valid,
        genderPolicy: 'MIXED',
        sportId: '2',
        teamSize: '1',
      }),
    ).toEqual(['genderPolicy: Partidas mistas precisam ser em duplas']);
  });
  it('monta o payload completo de criação com o status escolhido', () => {
    const values = schema.parse({
      ...valid,
      title: 'Padel de sábado',
      minCategoryCode: 'D',
    });
    expect(matchPayload(values, { status: 'DRAFT' })).toEqual({
      sportId: 1,
      teamSize: 2,
      scheduledAt: new Date(2026, 8, 19, 18, 0).toISOString(),
      durationMinutes: 90,
      visibility: 'PUBLIC',
      status: 'DRAFT',
      title: 'Padel de sábado',
      description: null,
      minCategoryCode: 'D',
      maxCategoryCode: null,
      genderPolicy: 'FEMALE',
      locationText: 'Quadra 2',
      city: 'Florianópolis',
      state: 'SC',
    });
  });
  it('envia só os campos alterados na edição', () => {
    const defaults = matchFormDefaults({
      user,
      profiles: [],
      sports,
      match: matchDetail,
    });
    const untouched = schema.parse(defaults);
    expect(matchPayload(untouched, { original: matchDetail })).toEqual({});
    const edited = schema.parse({
      ...defaults,
      title: 'Novo título',
      maxCategoryCode: 'C',
    });
    expect(matchPayload(edited, { original: matchDetail })).toEqual({
      title: 'Novo título',
      maxCategoryCode: 'C',
    });
    expect(
      matchPayload(untouched, {
        original: { ...matchDetail, minLevel: 'BEGINNER' },
      }),
    ).toEqual({ minLevel: null, maxLevel: null });
  });
  it('começa pela modalidade principal, amanhã às 18:00 e a cidade do usuário', () => {
    const defaults = matchFormDefaults({
      user,
      sports,
      now,
      profiles: [
        makePlayerProfile({
          sport: tenis,
          sportId: tenis.id,
          isPrincipal: true,
        }),
      ],
    });
    expect(defaults).toMatchObject({
      sportId: 2,
      teamSize: 1,
      date: '2026-09-14',
      time: '18:00',
      durationMinutes: '90',
      city: 'Florianópolis',
      state: 'SC',
      visibility: 'PUBLIC',
      genderPolicy: 'FEMALE',
    });
  });
});

describe('parâmetros de busca', () => {
  it('mantém filtros válidos e descarta inválidos em vez de falhar', () => {
    expect(
      matchesSearchSchema.parse({
        sportId: '1',
        teamSize: '2',
        state: 'SC',
        city: 'Blumenau',
        categoryCode: 'C',
        dateFrom: '2026-09-19',
      }),
    ).toEqual({
      sportId: 1,
      teamSize: 2,
      state: 'SC',
      city: 'Blumenau',
      categoryCode: 'C',
      dateFrom: '2026-09-19',
    });
    const parsed = matchesSearchSchema.parse({
      sportId: 'abc',
      teamSize: '3',
      state: 'XX',
      genderPolicy: 'PRO',
      dateTo: '19/09/2026',
    });
    expect(activeFilterCount(parsed)).toBe(0);
  });
  it('valida a situação de "minhas" conforme a visão', () => {
    expect(mineSearchSchema.parse({})).toEqual({
      view: 'matches',
      role: 'all',
      box: 'received',
      status: undefined,
    });
    expect(
      mineSearchSchema.parse({
        view: 'matches',
        status: 'DRAFT',
        role: 'creator',
      }),
    ).toMatchObject({ view: 'matches', role: 'creator', status: 'DRAFT' });
    expect(
      mineSearchSchema.parse({ view: 'applications', status: 'DRAFT' }),
    ).toMatchObject({ view: 'applications', role: 'all', status: undefined });
    expect(
      mineSearchSchema.parse({ view: 'applications', status: 'PENDING' })
        .status,
    ).toBe('PENDING');
    expect(mineSearchSchema.parse({ view: 'nope', role: 'x' })).toMatchObject({
      view: 'matches',
      role: 'all',
    });
  });
  it('valida caixa e situação dos convites (T31)', () => {
    expect(
      mineSearchSchema.parse({
        view: 'invites',
        box: 'sent',
        status: 'ACCEPTED',
      }),
    ).toEqual({
      view: 'invites',
      role: 'all',
      box: 'sent',
      status: 'ACCEPTED',
    });
    expect(mineSearchSchema.parse({ view: 'invites', box: 'x' }).box).toBe(
      'received',
    );
    expect(
      mineSearchSchema.parse({ view: 'invites', status: 'OPEN' }).status,
    ).toBeUndefined();
  });
});

describe('activeFilterChips', () => {
  it('não conta a modalidade, que já aparece selecionada nos chips', () => {
    expect(activeFilterChips({ sportId: 1 })).toEqual([]);
    expect(activeFilterCount({ sportId: 1 })).toBe(0);
    expect(hasAnySearch({ sportId: 1 })).toBe(true);
  });

  it('junta cidade e estado num chip só, que limpa os dois', () => {
    const chips = activeFilterChips({ city: 'Blumenau', state: 'SC' });
    expect(chips).toHaveLength(1);
    expect(chips[0]).toMatchObject({
      key: 'city',
      label: 'Blumenau · SC',
      clear: { city: undefined, state: undefined },
    });
  });

  it('mostra o estado sozinho quando não há cidade', () => {
    expect(activeFilterChips({ state: 'SC' })).toEqual([
      { key: 'state', label: 'SC', clear: { state: undefined } },
    ]);
  });

  it('usa os rótulos de formato, composição e data', () => {
    const chips = activeFilterChips({
      teamSize: 2,
      genderPolicy: 'MIXED',
      dateFrom: '2026-09-22',
      dateTo: '2026-09-30',
    });
    expect(chips.map((c) => c.label)).toEqual([
      '2v2',
      'Mista',
      'De 22/09',
      'Até 30/09',
    ]);
    expect(activeFilterCount({ teamSize: 2, genderPolicy: 'MIXED' })).toBe(2);
  });

  it('cai no código da categoria quando a modalidade não veio', () => {
    expect(activeFilterChips({ categoryCode: 'X9' })[0].label).toBe('X9');
  });

  it('hasAnySearch distingue busca vazia de busca sem chips', () => {
    expect(hasAnySearch({})).toBe(false);
  });
});

describe('mineActiveFilters', () => {
  it('não mostra chip no estado padrão de cada segmento', () => {
    expect(
      mineActiveFilters({ view: 'matches', role: 'all', box: 'received' }),
    ).toEqual([]);
    expect(
      mineActiveFilters({ view: 'invites', role: 'all', box: 'received' }),
    ).toEqual([]);
  });

  it('mostra papel e situação da partida, cada um com seu reset', () => {
    expect(
      mineActiveFilters({
        view: 'matches',
        role: 'creator',
        box: 'received',
        status: 'OPEN',
      }),
    ).toEqual([
      { key: 'role', label: 'Que eu organizo', clear: { role: 'all' } },
      { key: 'status', label: 'Aberta', clear: { status: undefined } },
    ]);
  });

  it('em candidaturas ignora o papel e usa o rótulo de participante', () => {
    expect(
      mineActiveFilters({
        view: 'applications',
        role: 'creator',
        box: 'received',
        status: 'PENDING',
      }),
    ).toEqual([
      { key: 'status', label: 'Pendente', clear: { status: undefined } },
    ]);
  });

  it('em convites mostra a caixa enviada e o rótulo de convite', () => {
    expect(
      mineActiveFilters({
        view: 'invites',
        role: 'all',
        box: 'sent',
        status: 'ACCEPTED',
      }),
    ).toEqual([
      { key: 'box', label: 'Enviados', clear: { box: 'received' } },
      { key: 'status', label: 'Aceito', clear: { status: undefined } },
    ]);
  });
});
