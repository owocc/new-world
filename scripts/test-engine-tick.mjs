import { config } from 'dotenv';
config();

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { scheduleGroupMessageAttention } from '../src/server/ai/group/attention.ts';
import { tickGroupAttention } from '../src/server/ai/group/engine.ts';

const client = createClient({ url: process.env.LIBSQL_URL ?? 'file:./local.db' });
const db = drizzle(client, { schema });

async function testEngineTick() {
  console.log('Testing Attention Scheduler & tickGroupAttention...');

  const [testUser] = await db.select().from(schema.user).limit(1);
  const [testGroup] = await db.select().from(schema.groups).where(eq(schema.groups.userId, testUser.id)).limit(1);

  // Send a message mentioning all AIs
  const msgId = `tick-msg-${Date.now()}`;
  await db.insert(schema.groupMessages).values({
    id: msgId,
    groupId: testGroup.id,
    userId: testUser.id,
    senderType: 'user',
    content: '@所有人 晚饭吃什么？@何以晴 你觉得呢？',
    createdAt: new Date(),
  });

  await scheduleGroupMessageAttention(testUser.id, testGroup.id, msgId, null, '@所有人 晚饭吃什么？@何以晴 你觉得呢？');

  // Immediately make scheduledFor = past so tick can process
  await db
    .update(schema.groupAttentionEvents)
    .set({ scheduledFor: new Date(Date.now() - 1000) })
    .where(eq(schema.groupAttentionEvents.groupId, testGroup.id));

  const tickRes = await tickGroupAttention(testUser.id, testGroup.id, 5);
  console.log(`Tick result: processed ${tickRes.processed} events`, tickRes.events);

  if (tickRes.processed > 0) {
    console.log('✅ tickGroupAttention successfully processed due attention events!');
  } else {
    console.error('❌ tickGroupAttention did not process any events');
    process.exit(1);
  }
}

testEngineTick().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
