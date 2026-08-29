import type { aiCharacters } from '@/db/schema';

export type AiCharacter = typeof aiCharacters.$inferSelect;
