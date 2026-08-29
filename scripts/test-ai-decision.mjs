import { config } from 'dotenv';
config();

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { buildPerceptionContext } from '../src/server/ai/group/perception.ts';
import { makeGroupDecision } from '../src/server/ai/group/decision.ts';
import { executeGroupDecision } from '../src/server/ai/group/action.ts';
import { processGroupAttentionEvent } from '../src/server/ai/group/engine.ts';

const client = createClient({ url: process.env.LIBSQL_URL ?? 'file:./local.db' });
const db = drizzle(client, { schema });

async function testPipeline() {
  console.log('Testing full end-to-end Perception -> Decision -> Action pipeline...');

  const [testUser] = await db.select().from(schema.user).limit(1);
  const [testGroup] = await db.select().from(schema.groups).where(eq(schema.groups.userId, testUser.id)).limit(1);
  const [character] = await db.select().from(schema.aiCharacters).where(eq(schema.aiCharacters.userId, testUser.id)).limit(1);

  const [member] = await db
    .select()
    .from(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, testGroup.id), eq(schema.groupMembers.characterId, character.id)))
    .limit(1);

  console.log(`Testing with user "${testUser.name}", group "${testGroup.name}", character "${character.name}"`);

  // 1. Perception
  const ctx = await buildPerceptionContext(testUser.id, testGroup.id, character, member);
  console.log('Perception context built:');
  console.log(`- Current time: ${ctx.currentTimeFormatted}`);
  console.log(`- Last read: ${ctx.lastReadAtFormatted} (${ctx.timeSinceLastRead})`);
  console.log(`- Unread count: ${ctx.unreadCount}`);
  console.log(`- Is mentioned: ${ctx.isMentioned}`);

  // 2. Decision
  const decision = await makeGroupDecision(testUser.id, character, ctx, { forceEngage: true });
  console.log('Decision generated:', decision);

  // 3. Execution
  const actionRes = await executeGroupDecision(testUser.id, character, member, ctx, decision);
  console.log('Action executed:', actionRes);

  // 4. Verify updated reading state
  const [updatedMember] = await db
    .select()
    .from(schema.groupMembers)
    .where(eq(schema.groupMembers.id, member.id));

  console.log('Updated member state:', {
    lastReadAt: updatedMember.lastReadAt,
    lastReadMessageId: updatedMember.lastReadMessageId,
    nextCheckAt: updatedMember.nextCheckAt,
  });

  if (updatedMember.lastReadAt) {
    console.log('✅ Member lastReadAt successfully advanced!');
  } else {
    console.error('❌ Member lastReadAt was not updated');
    process.exit(1);
  }

  console.log('✅ End-to-end decision pipeline verified successfully!');
}

testPipeline().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
