import { z } from 'zod';

export const levelSchema = z.enum([
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'COMPETITIVE',
]);
export const sideSchema = z.enum(['RIGHT', 'LEFT', 'BOTH']);
export const handSchema = z.enum(['RIGHT', 'LEFT', 'AMBI']);
export const genderSchema = z.enum([
  'MALE',
  'FEMALE',
  'NON_BINARY',
  'NOT_SPECIFIED',
]);
export const genderPolicySchema = z.enum(['MALE', 'FEMALE', 'MIXED', 'OPEN']);
const decimal = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)])
  .transform(Number)
  .pipe(z.number().finite());
export const categorySchema = z.object({
  code: z.string(),
  label: z.string(),
  ordinal: z.number().int(),
  normalizedSkill: z.number().min(0).max(1),
  initialRating: decimal,
  initialRd: decimal,
  initialVolatility: decimal,
  catalogVersion: z.string(),
});
export const profileVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE']);
export const userSchema = z.object({
  gender: genderSchema.nullable(),
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  city: z.string(),
  state: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  dominantHand: handSchema.nullable(),
  profileVisibility: profileVisibilitySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const sessionSchema = z.object({
  accessToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  tokenType: z.literal('Bearer'),
  expiresAt: z.string().datetime(),
  user: userSchema,
});
export const sportSchema = z.object({
  categories: z.array(categorySchema),
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  defaultTeamSize: z.number(),
  supportsSingles: z.boolean(),
  supportsDoubles: z.boolean(),
  requiresSidePreference: z.boolean(),
});
export const playerProfileSchema = z.object({
  id: z.string().uuid(),
  sportId: z.number(),
  sport: sportSchema,
  isPrincipal: z.boolean(),
  declaredLevel: levelSchema.nullable(),
  categoryCode: z.string().nullable(),
  category: categorySchema.nullable(),
  preferredSide: sideSchema.nullable(),
  yearsPracticing: z.number().nullable(),
  playFrequencyWeek: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const availabilitySchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  timeZone: z.string(),
  createdAt: z.string().datetime(),
});
// Divisões ACE (T39, ace-tiers-v1): a API decide a divisão a partir do rating
// exato e o cliente só desenha. O emblema é sempre um caminho da própria API;
// um valor fora do formato vira null e o cliente desenha o escudo vetorial.
export const tierDivisionSchema = z.enum([
  'bronze',
  'prata',
  'ouro',
  'platina',
  'esmeralda',
  'diamante',
]);
export const ratingTierDefinitionSchema = z.object({
  code: z.string(),
  label: z.string(),
  division: tierDivisionSchema,
  level: z.union([z.literal(1), z.literal(2)]),
  ordinal: z.number().int(),
  minRating: z.number().nullable(),
  maxRating: z.number().nullable(),
  imagePath: z
    .string()
    .regex(/^\/v1\/tiers\/[a-z_]+\/[a-z]+-i{1,2}\.webp\?v=[0-9a-f]+$/)
    .nullable()
    .catch(null),
});
export const ratingTierSchema = ratingTierDefinitionSchema.extend({
  version: z.string(),
  progress: z.number().min(0).max(1),
  next: z.object({ code: z.string(), label: z.string() }).nullable(),
  pointsToNext: z.number().int().nullable(),
  provisional: z.boolean(),
});
export const ratingSchema = z.object({
  rating: z.number(),
  rd: z.number(),
  volatility: z.number(),
  matchesPlayed: z.number(),
  wins: z.number(),
  losses: z.number(),
  draws: z.number(),
  algorithmVersion: z.string(),
  // 1 − RD/350, calculada pela API: é o que a interface mostra no lugar do RD.
  confidence: z.number().min(0).max(1),
  tier: ratingTierSchema,
});
// Projection of another player as seen anywhere in the app (matches, invites,
// friends, search): never more than these five fields.
export const publicUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
  city: z.string(),
  state: z.string(),
});
// Relationship between the viewer and a player (T28). REQUEST_RECEIVED means
// the player asked the viewer for friendship.
export const relationshipSchema = z.object({
  status: z.enum([
    'SELF',
    'NONE',
    'FRIENDS',
    'REQUEST_SENT',
    'REQUEST_RECEIVED',
  ]),
  requestId: z.string().uuid().nullable(),
  since: z.string().datetime().nullable(),
});
// Explicit allowlist: never copy private user fields into the public view.
// A private profile seen by a stranger is `restricted`: only the basic card
// is filled and the sport details come back null.
export const publicProfileSchema = userSchema
  .pick({
    id: true,
    fullName: true,
    avatarUrl: true,
    bio: true,
    city: true,
    state: true,
    profileVisibility: true,
  })
  .extend({
    dominantHand: handSchema.nullable(),
    restricted: z.boolean(),
    friendsCount: z.number().int(),
    relationship: relationshipSchema.nullable(),
    sportProfiles: z.array(
      playerProfileSchema
        .pick({ sportId: true, sport: true, isPrincipal: true })
        .extend({
          declaredLevel: levelSchema.nullable(),
          categoryCode: z.string().nullable(),
          category: categorySchema.nullable(),
          preferredSide: sideSchema.nullable(),
          yearsPracticing: z.number().nullable(),
          playFrequencyWeek: z.number().nullable(),
          rating: ratingSchema.nullable(),
        }),
    ),
    recentMatches: z.array(
      z.object({
        id: z.string().uuid(),
        sportId: z.number(),
        scheduledAt: z.string().datetime(),
        result: z.enum(['WIN', 'LOSS', 'DRAW']),
      }),
    ),
  });
export const apiEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ data: schema });
export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Sport = z.infer<typeof sportSchema>;
export type SportCategory = z.infer<typeof categorySchema>;
export type Gender = z.infer<typeof genderSchema>;
export type GenderPolicy = z.infer<typeof genderPolicySchema>;
export type Rating = z.infer<typeof ratingSchema>;
export type RatingTier = z.infer<typeof ratingTierSchema>;
export type RatingTierDefinition = z.infer<typeof ratingTierDefinitionSchema>;
export type TierDivision = z.infer<typeof tierDivisionSchema>;
export type PlayerProfile = z.infer<typeof playerProfileSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type ProfileVisibility = z.infer<typeof profileVisibilitySchema>;

export type BaseEntity = { id: string };
