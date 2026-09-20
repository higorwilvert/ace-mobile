import type { Friend, FriendRequest } from '@/features/friends/api';
import type { Invite, MyInvite } from '@/features/invites/api';
import type {
  Application,
  MatchDetail,
  MatchSummary,
  MyApplication,
} from '@/features/matches/api';
import type { UserSearchItem } from '@/features/players/api';
import type {
  MatchRecommendations,
  PlayerRecommendations,
  RecommendationMeta,
  RecommendedMatch,
  RecommendedPlayer,
} from '@/features/recommendations/api';
import type {
  HistoryEntry,
  MatchResult,
  SportTotals,
} from '@/features/results/api';
import type {
  Availability,
  PlayerProfile,
  PublicProfile,
  Relationship,
  Session,
  Sport,
  User,
} from '@/types/api';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '2f7f6d0a-5d4b-4e8a-9b8e-0a1b2c3d4e5f',
    fullName: 'Ana Clara Souza',
    email: 'ana@exemplo.com',
    city: 'Florianópolis',
    state: 'SC',
    gender: 'FEMALE',
    phone: null,
    avatarUrl: null,
    bio: null,
    dominantHand: null,
    profileVisibility: 'PUBLIC',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'a'.repeat(43),
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    user: makeUser(),
    ...overrides,
  };
}

export function makeSport(overrides: Partial<Sport> = {}): Sport {
  return {
    id: 1,
    slug: 'padel',
    name: 'Padel',
    defaultTeamSize: 2,
    supportsSingles: false,
    supportsDoubles: true,
    requiresSidePreference: true,
    categories: [
      {
        code: 'D',
        label: 'Categoria D',
        ordinal: 1,
        normalizedSkill: 0.25,
        initialRating: 1500,
        initialRd: 350,
        initialVolatility: 0.06,
        catalogVersion: '2026.1',
      },
      {
        code: 'C',
        label: 'Categoria C',
        ordinal: 2,
        normalizedSkill: 0.5,
        initialRating: 1500,
        initialRd: 350,
        initialVolatility: 0.06,
        catalogVersion: '2026.1',
      },
    ],
    ...overrides,
  };
}

export function makePlayerProfile(
  overrides: Partial<PlayerProfile> = {},
): PlayerProfile {
  const sport = overrides.sport ?? makeSport();
  return {
    id: '8f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f',
    sportId: sport.id,
    sport,
    isPrincipal: true,
    declaredLevel: null,
    categoryCode: 'C',
    category: sport.categories[1] ?? null,
    preferredSide: 'RIGHT',
    yearsPracticing: 3,
    playFrequencyWeek: 2,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

export function makeAvailability(
  overrides: Partial<Availability> = {},
): Availability {
  return {
    id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    dayOfWeek: 1,
    startTime: '19:00',
    endTime: '21:00',
    timeZone: 'America/Sao_Paulo',
    createdAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

export function makePublicProfile(
  overrides: Partial<PublicProfile> = {},
): PublicProfile {
  const profile = makePlayerProfile();
  return {
    id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
    fullName: 'Bruno Alves',
    avatarUrl: null,
    bio: 'Jogo desde 2019.',
    city: 'Florianópolis',
    state: 'SC',
    profileVisibility: 'PUBLIC',
    dominantHand: 'RIGHT',
    restricted: false,
    friendsCount: 4,
    relationship: null,
    sportProfiles: [
      {
        sportId: profile.sportId,
        sport: profile.sport,
        isPrincipal: true,
        declaredLevel: null,
        categoryCode: 'C',
        category: profile.category,
        preferredSide: 'RIGHT',
        yearsPracticing: 3,
        playFrequencyWeek: 2,
        rating: {
          rating: 1512,
          rd: 180,
          volatility: 0.06,
          matchesPlayed: 8,
          wins: 5,
          losses: 3,
          draws: 0,
        },
      },
    ],
    recentMatches: [
      {
        id: '9f8e7d6c-5b4a-3c2d-1e0f-9a8b7c6d5e4f',
        sportId: profile.sportId,
        scheduledAt: '2026-09-10T22:00:00.000Z',
        result: 'WIN',
      },
    ],
    ...overrides,
  };
}

// ---- Partidas e candidaturas (T30)

const creator = {
  id: makeUser().id,
  fullName: makeUser().fullName,
  avatarUrl: null as string | null,
};
export const otherPlayer = {
  id: '44444444-4444-4444-8444-444444444444',
  fullName: 'Bruno Lima',
  avatarUrl: null as string | null,
  city: 'Florianópolis',
  state: 'SC',
};
export function makeMatch(overrides: Partial<MatchSummary> = {}): MatchSummary {
  const sport = overrides.sport ?? makeSport();
  return {
    id: '33333333-3333-4333-8333-333333333333',
    sportId: sport.id,
    sport,
    teamSize: 2,
    visibility: 'PUBLIC',
    status: 'OPEN',
    title: 'Padel de sábado',
    genderPolicy: 'FEMALE',
    minCategoryCode: 'C',
    maxCategoryCode: null,
    minLevel: null,
    maxLevel: null,
    scheduledAt: '2999-09-19T21:00:00.000Z',
    durationMinutes: 90,
    arena: null,
    locationText: 'Quadra 2 do Parque Ramiro Ruediger',
    city: 'Florianópolis',
    state: 'SC',
    creator,
    capacity: { teamSize: 2, total: 4, confirmed: 1, available: 3 },
    createdAt: '2026-09-12T12:00:00.000Z',
    updatedAt: '2026-09-12T12:00:00.000Z',
    ...overrides,
  };
}
/** Criador (Ana) no Time 1, Time 2 vazio; visto pela própria criadora. */
export function makeMatchDetail(
  overrides: Partial<MatchDetail> = {},
): MatchDetail {
  return {
    ...makeMatch(),
    description: null,
    cancelledReason: null,
    teams: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        teamIndex: 1,
        label: null,
        participants: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            user: { ...creator, city: 'Florianópolis', state: 'SC' },
            isCreator: true,
            joinedAt: '2026-09-12T12:00:00.000Z',
          },
        ],
      },
      {
        id: '77777777-7777-4777-8777-777777777777',
        teamIndex: 2,
        label: null,
        participants: [],
      },
    ],
    result: null,
    viewer: { isCreator: true, participation: null, invite: null },
    ...overrides,
  };
}
export function makeApplication(
  overrides: Partial<Application> = {},
): Application {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    matchId: makeMatch().id,
    status: 'PENDING',
    teamIndex: 2,
    joinedAt: '2026-09-12T13:00:00.000Z',
    updatedAt: '2026-09-12T13:00:00.000Z',
    user: otherPlayer,
    sportProfile: {
      declaredLevel: null,
      category: makeSport().categories[1],
      rating: 1500,
    },
    ...overrides,
  };
}
export function makeMyApplication(
  overrides: Partial<MyApplication> = {},
): MyApplication {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    status: 'PENDING',
    teamIndex: 2,
    joinedAt: '2026-09-12T13:00:00.000Z',
    updatedAt: '2026-09-12T13:00:00.000Z',
    match: makeMatch({ creator: { ...otherPlayer } }),
    ...overrides,
  };
}
export const makePage = <T>(data: T[], nextCursor: string | null = null) => ({
  data,
  meta: { nextCursor },
});

// ---- Convites, resultados e histórico (T31)

/** Ana (criadora) convida Bruno para o Time 2, pendente. */
export function makeInvite(overrides: Partial<Invite> = {}): Invite {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    matchId: makeMatch().id,
    status: 'PENDING',
    teamIndex: 2,
    message: 'Bora?',
    inviter: { ...creator, city: 'Florianópolis', state: 'SC' },
    invitee: {
      ...otherPlayer,
      sportProfile: {
        declaredLevel: null,
        category: makeSport().categories[1],
        rating: 1500,
      },
    },
    createdAt: '2026-09-12T14:00:00.000Z',
    respondedAt: null,
    updatedAt: '2026-09-12T14:00:00.000Z',
    ...overrides,
  };
}
export function makeMyInvite(overrides: Partial<MyInvite> = {}): MyInvite {
  return { ...makeInvite(), match: makeMatch(), ...overrides };
}
/** Time 1 vence por 2 sets a 0 (6-4, 6-3); rating ainda não processado. */
export function makeMatchResult(
  overrides: Partial<MatchResult> = {},
): MatchResult {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    isDraw: false,
    winnerTeamIndex: 1,
    totalSets: 2,
    setsWon: { team1: 2, team2: 0 },
    sets: [
      { setNumber: 1, team1: 6, team2: 4, tiebreak: null },
      { setNumber: 2, team1: 6, team2: 3, tiebreak: null },
    ],
    notes: null,
    recordedAt: '2026-09-13T00:00:00.000Z',
    recordedBy: creator,
    ratingsProcessedAt: null,
    ...overrides,
  };
}
/** Vitória de Ana (Time 1) por 2-0 contra Bruno, com rating 1500 → 1512,3. */
export function makeHistoryEntry(
  overrides: Partial<HistoryEntry> = {},
): HistoryEntry {
  return {
    match: makeMatch({
      status: 'COMPLETED',
      scheduledAt: '2026-09-12T21:00:00.000Z',
    }),
    teamIndex: 1,
    outcome: 'WIN',
    setsWon: 2,
    setsLost: 0,
    sets: [
      { setNumber: 1, own: 6, opponent: 4, tiebreak: null },
      { setNumber: 2, own: 6, opponent: 3, tiebreak: null },
    ],
    teammates: [],
    opponents: [otherPlayer],
    result: {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      isDraw: false,
      winnerTeamIndex: 1,
      recordedAt: '2026-09-13T00:00:00.000Z',
    },
    ratingChange: {
      ratingBefore: 1500,
      ratingAfter: 1512.3,
      rdBefore: 350,
      rdAfter: 290.5,
      volatilityBefore: 0.06,
      volatilityAfter: 0.06,
      algorithmVersion: 'glicko2-v1',
      processedAt: '2026-09-13T00:00:01.000Z',
    },
    ...overrides,
  };
}
export function makeTotals(overrides: Partial<SportTotals> = {}): SportTotals {
  const sport = makeSport();
  return {
    sportId: sport.id,
    sport,
    matches: 3,
    wins: 2,
    losses: 1,
    draws: 0,
    ...overrides,
  };
}

// ---- Recomendações (T32)

export function makeRecommendationMeta(
  overrides: Partial<RecommendationMeta> = {},
): RecommendationMeta {
  return {
    generationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    generatedAt: '2026-09-20T12:00:00.000Z',
    algorithmVersion: 'ace-player-v1',
    implementationVersion: 'ace-player-api-v1',
    weights: { level: 0.5, distance: 0.25, activity: 0.15, preferences: 0.1 },
    sportId: 1,
    teamSize: 2,
    mode: 'SAME_GENDER',
    limit: 10,
    ...overrides,
  };
}
/** Bruno, rank 1: 1,0 / 1,0 / 0,5 / 0,0 → 0,825 (a evidência real do T21). */
export function makeRecommendedPlayer(
  overrides: Partial<RecommendedPlayer> = {},
): RecommendedPlayer {
  return {
    recommendationId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    rank: 1,
    totalScore: 0.825,
    scoreBreakdown: { level: 1, distance: 1, activity: 0.5, preferences: 0 },
    coldStart: true,
    distanceMethod: 'CITY_STATE',
    player: otherPlayer,
    ...overrides,
  };
}
export function makePlayerRecommendations(
  data: RecommendedPlayer[] = [makeRecommendedPlayer()],
  meta: Partial<PlayerRecommendations['meta']> = {},
): PlayerRecommendations {
  return {
    data,
    meta: {
      ...makeRecommendationMeta(),
      scheduledAt: null,
      durationMinutes: null,
      availability: 'NOT_REQUESTED',
      ...meta,
    },
  };
}
/** "Padel de sábado" com Time 2 sugerido: 0,8 / 0,6 / 0,2 / 1,0 → 0,68 (exemplo didático do T21). */
export function makeRecommendedMatch(
  overrides: Partial<RecommendedMatch> = {},
): RecommendedMatch {
  const m = makeMatch();
  return {
    recommendationId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    rank: 1,
    totalScore: 0.68,
    scoreBreakdown: {
      level: 0.8,
      distance: 0.6,
      activity: 0.2,
      preferences: 1,
    },
    coldStart: false,
    distanceMethod: 'COORDINATES',
    suggestedTeamIndex: 2,
    match: {
      id: m.id,
      sportId: m.sportId,
      title: m.title,
      teamSize: 2,
      genderPolicy: 'OPEN',
      status: 'OPEN',
      visibility: 'PUBLIC',
      scheduledAt: m.scheduledAt,
      durationMinutes: m.durationMinutes,
      city: m.city,
      state: m.state,
      locationText: m.locationText,
      arenaId: null,
      minCategoryCode: 'C',
      maxCategoryCode: null,
      minRating: null,
      maxRating: null,
      capacity: { teamSize: 2, total: 4, confirmed: 2, available: 2 },
    },
    ...overrides,
  };
}
export function makeMatchRecommendations(
  data: RecommendedMatch[] = [makeRecommendedMatch()],
  meta: Partial<MatchRecommendations['meta']> = {},
): MatchRecommendations {
  return {
    data,
    meta: {
      ...makeRecommendationMeta({
        algorithmVersion: 'ace-match-v1',
        implementationVersion: 'ace-match-api-v1',
      }),
      dateFrom: null,
      dateTo: null,
      latestStartAt: '2026-10-04T12:00:00.000Z',
      availability: 'CHECKED',
      emptyMatchPolicy: 'EXCLUDE_NO_ROSTER',
      ...meta,
    },
  };
}

// ---- Rede social (T33)

export function makeRelationship(
  overrides: Partial<Relationship> = {},
): Relationship {
  return { status: 'NONE', requestId: null, since: null, ...overrides };
}
export function makeFriend(overrides: Partial<Friend> = {}): Friend {
  return {
    user: { ...otherPlayer },
    since: '2026-09-19T15:00:00.000Z',
    ...overrides,
  };
}
export function makeFriendRequest(
  overrides: Partial<FriendRequest> = {},
): FriendRequest {
  const me = makeUser();
  return {
    id: 'abababab-abab-4bab-8bab-abababababab',
    status: 'PENDING',
    requester: { ...otherPlayer },
    addressee: {
      id: me.id,
      fullName: me.fullName,
      avatarUrl: null,
      city: me.city,
      state: me.state,
    },
    createdAt: '2026-09-19T15:00:00.000Z',
    respondedAt: null,
    ...overrides,
  };
}
export function makeSearchItem(
  overrides: Partial<UserSearchItem> = {},
): UserSearchItem {
  return {
    ...otherPlayer,
    profileVisibility: 'PUBLIC',
    sports: [{ id: 1, slug: 'padel', name: 'Padel' }],
    relationship: makeRelationship(),
    ...overrides,
  };
}
