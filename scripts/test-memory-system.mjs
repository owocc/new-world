import assert from 'node:assert';
import { db } from '../src/db/index.ts';
import * as schema from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  FORGETFULNESS_PROFILES,
  getForgetfulnessProfile,
  calculateDecayedMemory,
  formatMemoryForPrompt,
  getActiveMemoriesForCharacter,
} from '../src/server/ai/memory.ts';
import { searchAccessibleHistory } from '../src/server/ai/recall.ts';

console.log('=== Starting Human-like Memory & Recall Test Suite ===\n');

async function testMemoryDecayAndForgetfulness() {
  console.log('--- Test 1: Memory Decay & Forgetfulness Calculation ---');

  const excellent = FORGETFULNESS_PROFILES.excellent;
  const forgetful = FORGETFULNESS_PROFILES.forgetful;
  const now = new Date('2026-08-30T12:00:00Z');
  const fiveDaysAgo = new Date('2026-08-25T12:00:00Z');

  const trivialMemory = {
    id: 'm1',
    userId: 'u1',
    characterId: 'c1',
    kind: 'fact',
    content: '用户中午吃了炒面',
    strength: 0.6,
    confidence: 0.8,
    importance: 0.2, // trivial
    emotionalWeight: 0,
    reinforcementCount: 1,
    sourceType: 'dm',
    sourceId: null,
    lastReinforcedAt: fiveDaysAgo,
    createdAt: fiveDaysAgo,
    updatedAt: fiveDaysAgo,
  };

  const decayExcellent = calculateDecayedMemory(trivialMemory, excellent, 0.3, now);
  const decayForgetful = calculateDecayedMemory(trivialMemory, forgetful, 0.3, now);

  console.log(`Trivial memory 5 days later:`);
  console.log(`- Excellent AI strength: ${decayExcellent.strength.toFixed(3)}, confidence: ${decayExcellent.confidence.toFixed(3)}, isFuzzy: ${decayExcellent.isFuzzy}`);
  console.log(`- Forgetful AI strength: ${decayForgetful.strength.toFixed(3)}, confidence: ${decayForgetful.confidence.toFixed(3)}, isFuzzy: ${decayForgetful.isFuzzy}`);

  assert(decayExcellent.strength > decayForgetful.strength, 'Excellent memory retention must retain higher strength than forgetful');
  assert(decayForgetful.isFuzzy === true, 'Forgetful AI must consider 5-day unreinforced trivial memory fuzzy');

  // Test Grudge / Emotional shielding
  const grudgeMemory = {
    ...trivialMemory,
    kind: 'grudge',
    content: '用户嘲笑了TA的画作',
    importance: 0.7,
    emotionalWeight: -0.8,
    lastReinforcedAt: fiveDaysAgo,
  };

  const decayGrudgeHigh = calculateDecayedMemory(grudgeMemory, forgetful, 0.9, now); // high grudge
  const decayGrudgeLow = calculateDecayedMemory(grudgeMemory, forgetful, 0.1, now);  // low grudge

  console.log(`Grudge memory 5 days later:`);
  console.log(`- High Grudge AI (0.9) strength: ${decayGrudgeHigh.strength.toFixed(3)}, confidence: ${decayGrudgeHigh.confidence.toFixed(3)}`);
  console.log(`- Low Grudge AI (0.1) strength: ${decayGrudgeLow.strength.toFixed(3)}, confidence: ${decayGrudgeLow.confidence.toFixed(3)}`);

  assert(decayGrudgeHigh.strength > decayGrudgeLow.strength, 'High grudge trait must preserve grudge memory significantly stronger');
  console.log('✅ Memory decay and grudge profile calculations verified!\n');
}

async function testPromptFormatting() {
  console.log('--- Test 2: Natural Prompt Recollection Formatting ---');

  const mockMem = {
    id: 'm2',
    userId: 'u1',
    characterId: 'c1',
    kind: 'fact',
    content: '用户下周去深圳出差',
    strength: 0.3,
    confidence: 0.35,
    importance: 0.5,
    emotionalWeight: 0,
    reinforcementCount: 1,
    sourceType: 'dm',
    sourceId: null,
    lastReinforcedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const fuzzyText = formatMemoryForPrompt(mockMem, { strength: 0.3, confidence: 0.35, isFuzzy: true });
  console.log('Fuzzy formatted text:', fuzzyText);
  assert(fuzzyText.includes('模糊') || fuzzyText.includes('印象'), 'Fuzzy memory must have natural hazy qualifier in prompt');

  const solidText = formatMemoryForPrompt({ ...mockMem, reinforcementCount: 3, importance: 0.9 }, { strength: 0.9, confidence: 0.95, isFuzzy: false });
  console.log('Solid formatted text:', solidText);
  assert(solidText.includes('牢固') || solidText.includes('清晰'), 'Reinforced memory must reflect solid knowledge');
  console.log('✅ Natural prompt formatting verified!\n');
}

async function testHistoryRecallAndPrivacyIsolation() {
  console.log('--- Test 3: History Recall Tool & Privacy Isolation ---');

  const testUserId = `test-user-${Date.now()}`;
  const charAliceId = `char-alice-${Date.now()}`;
  const charBobId = `char-bob-${Date.now()}`;
  const charCharlieId = `char-charlie-${Date.now()}`; // Not in group

  const convAliceId = `conv-alice-${Date.now()}`;
  const convBobId = `conv-bob-${Date.now()}`;
  const groupId = `group-${Date.now()}`;

  // 1. Seed test user & characters
  await db.insert(schema.user).values({
    id: testUserId,
    name: '测试开发者',
    email: `${testUserId}@example.com`,
  });

  await db.insert(schema.aiCharacters).values([
    {
      id: charAliceId,
      userId: testUserId,
      name: '爱丽丝',
      username: `alice_${Date.now()}`,
      memoryRetention: 'excellent',
    },
    {
      id: charBobId,
      userId: testUserId,
      name: '鲍勃',
      username: `bob_${Date.now()}`,
      memoryRetention: 'forgetful',
    },
    {
      id: charCharlieId,
      userId: testUserId,
      name: '查理',
      username: `charlie_${Date.now()}`,
      memoryRetention: 'normal',
    },
  ]);

  // 2. Seed conversations & messages
  await db.insert(schema.conversations).values([
    { id: convAliceId, userId: testUserId, characterId: charAliceId },
    { id: convBobId, userId: testUserId, characterId: charBobId },
  ]);

  await db.insert(schema.messages).values([
    {
      id: `msg-alice-1-${Date.now()}`,
      conversationId: convAliceId,
      userId: testUserId,
      role: 'user',
      content: '爱丽丝，我昨天去面试了那家前端外企，感觉还不错。',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000), // yesterday
    },
    {
      id: `msg-bob-1-${Date.now()}`,
      conversationId: convBobId,
      userId: testUserId,
      role: 'user',
      content: '鲍勃这是属于我们两个人的绝对绝密信息：秘密代码是 9527。',
      createdAt: new Date(Date.now() - 12 * 3600 * 1000),
    },
  ]);

  // 3. Seed group and membership (Alice and Bob in group, Charlie NOT in group)
  await db.insert(schema.groups).values({
    id: groupId,
    userId: testUserId,
    name: '周末徒步小分队',
  });

  await db.insert(schema.groupMembers).values([
    { id: `gm-alice-${Date.now()}`, groupId, userId: testUserId, memberType: 'ai', characterId: charAliceId },
    { id: `gm-bob-${Date.now()}`, groupId, userId: testUserId, memberType: 'ai', characterId: charBobId },
  ]);

  await db.insert(schema.groupMessages).values([
    {
      id: `gmsg-1-${Date.now()}`,
      groupId,
      userId: testUserId,
      senderType: 'user',
      senderId: testUserId,
      content: '这周六大家一起去西山徒步，记得带水和防晒！',
      createdAt: new Date(Date.now() - 6 * 3600 * 1000),
    },
  ]);

  // TEST A: Alice searches her own DMs and accessible groups
  console.log('Testing Alice search for 面试...');
  const aliceRecall = await searchAccessibleHistory({
    userId: testUserId,
    characterId: charAliceId,
    currentConversationId: convAliceId,
    search: { scope: 'all_accessible', query: '面试' },
  });

  console.log(`Alice search for '面试': found ${aliceRecall.results.length} records`);
  assert(aliceRecall.results.length === 1, 'Alice should find her DM about interview');
  assert(aliceRecall.results[0].content.includes('前端外企'), 'Alice DM content match');

  // TEST B: Alice tries to search for Bob's secret DM (Privacy Boundary Test)
  console.log('Testing Alice privacy boundary on Bob secret...');
  const aliceSecretSearch = await searchAccessibleHistory({
    userId: testUserId,
    characterId: charAliceId,
    search: { scope: 'all_accessible', query: '9527' },
  });

  console.log(`Alice search for Bob secret '9527': found ${aliceSecretSearch.results.length} records`);
  assert(aliceSecretSearch.results.length === 0, 'PRIVACY BREACH PREVENTED: Alice cannot access Bob private conversation!');

  // TEST C: Group membership isolation: Charlie tries to recall group message
  console.log('Testing Charlie group isolation...');
  const charlieGroupRecall = await searchAccessibleHistory({
    userId: testUserId,
    characterId: charCharlieId,
    search: { scope: 'all_accessible', query: '徒步' },
  });

  console.log(`Charlie (non-member) search for '徒步': found ${charlieGroupRecall.results.length} records`);
  assert(charlieGroupRecall.results.length === 0, 'GROUP ISOLATION: Non-member Charlie cannot search group messages');

  // TEST D: Alice (group member) searches group message
  console.log('Testing Alice group message search...');
  const aliceGroupRecall = await searchAccessibleHistory({
    userId: testUserId,
    characterId: charAliceId,
    search: { scope: 'group', query: '徒步' },
  });

  console.log(`Alice (member) search for '徒步': found ${aliceGroupRecall.results.length} records`);
  assert(aliceGroupRecall.results.length === 1, 'Alice should find group message about hiking');
  assert(aliceGroupRecall.results[0].content.includes('西山徒步'), 'Group message content match');

  // Cleanup test entities
  await db.delete(schema.groupMessages).where(eq(schema.groupMessages.groupId, groupId));
  await db.delete(schema.groupMembers).where(eq(schema.groupMembers.groupId, groupId));
  await db.delete(schema.groups).where(eq(schema.groups.id, groupId));
  await db.delete(schema.messages).where(eq(schema.messages.conversationId, convAliceId));
  await db.delete(schema.messages).where(eq(schema.messages.conversationId, convBobId));
  await db.delete(schema.conversations).where(eq(schema.conversations.userId, testUserId));
  await db.delete(schema.aiCharacters).where(eq(schema.aiCharacters.userId, testUserId));
  await db.delete(schema.user).where(eq(schema.user.id, testUserId));

  console.log('✅ History recall and permission filtering fully verified!\n');
}

async function run() {
  try {
    await testMemoryDecayAndForgetfulness();
    await testPromptFormatting();
    await testHistoryRecallAndPrivacyIsolation();
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

run();
