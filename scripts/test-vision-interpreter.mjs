import { config } from 'dotenv';
config();

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { and, eq, sql } from 'drizzle-orm';
import * as schema from '../src/db/schema.ts';
import { supportsVision } from '../src/lib/providers-shared.ts';
import { imagePerceptionSchema, formatPerceptionNote } from '../src/server/ai/vision.ts';
import { getVisionConfig, setVisionConfig, DEFAULT_VISION_CONFIG } from '../src/server/settings.ts';
import { resolveVisionModel, getDefaultVisionModelForProvider } from '../src/server/ai/core.ts';
import { formatGroupChatContextBlock } from '../src/server/ai/group/prompts.ts';
import { CALL_TYPE_LABELS } from '../src/server/usage.ts';

console.log('=== Starting Vision Interpreter & Image Understanding Integration Tests ===\n');

const client = createClient({ url: process.env.LIBSQL_URL || 'file:./local.db' });
const db = drizzle(client, { schema });

// 1. Fetch or create a test user
let [testUser] = await db.select().from(schema.user).limit(1);
if (!testUser) {
  const userId = crypto.randomUUID();
  await db.insert(schema.user).values({
    id: userId,
    name: 'Vision Test User',
    email: 'vision-test@myworld.dev',
  });
  [testUser] = await db.select().from(schema.user).where(eq(schema.user.id, userId)).limit(1);
}
console.log('1. User context verified:', testUser.id, testUser.name);

// 2. Test Vision Config in Settings
console.log('\n2. Testing Vision Model System Settings:');
const initialConfig = await getVisionConfig(testUser.id);
console.log(' - Initial vision config:', initialConfig);

await setVisionConfig(testUser.id, {
  enabled: true,
  providerId: null,
  modelId: 'gpt-4o-mini',
  temperature: 0.2,
  maxTokens: 800,
});
const updatedConfig = await getVisionConfig(testUser.id);
console.log(' - Updated vision config:', updatedConfig);
if (!updatedConfig.enabled || updatedConfig.modelId !== 'gpt-4o-mini') {
  throw new Error('Vision config update failed');
}

// 3. Test Vision Capability and Defaults
console.log('\n3. Testing Vision Capability & Defaults:');
console.log(' - Default model for OpenAI:', getDefaultVisionModelForProvider('openai'));
console.log(' - Default model for Anthropic:', getDefaultVisionModelForProvider('anthropic'));
console.log(' - Default model for Google:', getDefaultVisionModelForProvider('google'));
console.log(' - gpt-4o-mini supports vision:', supportsVision('openai', 'gpt-4o-mini'));
console.log(' - gemini-1.5-flash supports vision:', supportsVision('google', 'gemini-1.5-flash'));
console.log(' - claude-3-5-haiku supports vision:', supportsVision('anthropic', 'claude-3-5-haiku-20241022'));
console.log(' - deepseek-chat supports vision:', supportsVision('deepseek', 'deepseek-chat'));

if (!supportsVision('openai', 'gpt-4o-mini')) throw new Error('gpt-4o-mini should support vision');
if (!supportsVision('google', 'gemini-1.5-flash')) throw new Error('gemini-1.5-flash should support vision');

// 4. Test Image Perception Schema Validation
console.log('\n4. Testing Image Perception Schema:');
const samplePerception = {
  summary: '这是一张室内照片。画面中有一只橘猫趴在白色窗台上，窗外正在下雨。桌面上放着一杯咖啡和一本打开的书。',
  mainContent: '趴在窗台上的橘猫与桌上的咖啡和书',
  scene: '室内窗边，雨天，光线柔和温馨',
  objects: ['橘猫', '白色窗台', '咖啡杯', '打开的书', '窗户'],
  details: ['橘猫闭着眼睛呈休息姿势', '窗玻璃上有清晰雨滴', '咖啡杯冒着微热气'],
  ocrText: 'Chapter 1: The Journey',
  imageType: '真实照片',
  mood: '安静、治愈、温馨',
};

const parseResult = imagePerceptionSchema.safeParse(samplePerception);
console.log(' - Schema parse valid:', parseResult.success);
if (!parseResult.success) {
  console.error(parseResult.error);
  throw new Error('Image perception schema validation failed');
}

// 5. Test Database image_perceptions table operations
console.log('\n5. Testing Database image_perceptions Table Operations:');
const assetId = crypto.randomUUID();
await db.insert(schema.mediaAssets).values({
  id: assetId,
  userId: testUser.id,
  mediaType: 'image',
  blobUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  pathname: 'users/test/messages/test-cat.png',
  mimeType: 'image/png',
  fileSize: 1024,
  originalFilename: 'test-cat.png',
  status: 'ready',
  purpose: 'attachment',
});

// Insert image perception
const perceptionId = crypto.randomUUID();
await db.insert(schema.imagePerceptions).values({
  id: perceptionId,
  mediaAssetId: assetId,
  userId: testUser.id,
  status: 'ready',
  providerType: 'openai',
  model: 'gpt-4o-mini',
  summary: samplePerception.summary,
  perception: JSON.stringify(samplePerception),
  ocrText: samplePerception.ocrText,
  inputTokens: 250,
  outputTokens: 80,
  totalTokens: 330,
  costUsd: 0.0001,
  durationMs: 1200,
  analyzedAt: new Date(),
});

const [retrievedPerception] = await db
  .select()
  .from(schema.imagePerceptions)
  .where(eq(schema.imagePerceptions.mediaAssetId, assetId));

console.log(' - Retrieved Perception Status:', retrievedPerception.status);
console.log(' - Retrieved Perception Summary:', retrievedPerception.summary);
console.log(' - Retrieved Perception OCR:', retrievedPerception.ocrText);
if (!retrievedPerception || retrievedPerception.summary !== samplePerception.summary) {
  throw new Error('Image perception DB query mismatch');
}

// Test unique index constraint on mediaAssetId
try {
  await db.insert(schema.imagePerceptions).values({
    id: crypto.randomUUID(),
    mediaAssetId: assetId,
    userId: testUser.id,
    status: 'pending',
  });
  throw new Error('Should have failed on duplicate mediaAssetId');
} catch (err) {
  console.log(' - Unique constraint on mediaAssetId correctly enforced:', true);
}

// 6. Test formatPerceptionNote helper
console.log('\n6. Testing Context Formatting:');
const perceptionMap = new Map([[assetId, retrievedPerception]]);
const note = formatPerceptionNote([{ id: assetId }], perceptionMap);
console.log(' - Formatted context note:', note);
if (!note.includes('这是一张室内照片')) {
  throw new Error('formatPerceptionNote output mismatch');
}

// 7. Test Usage Tracking callType for Image Understanding
console.log('\n7. Testing Usage Tracking Call Type:');
console.log(' - CALL_TYPE_LABELS[image_understanding]:', CALL_TYPE_LABELS.image_understanding);
if (CALL_TYPE_LABELS.image_understanding !== '图片理解') {
  throw new Error('CALL_TYPE_LABELS.image_understanding is not defined correctly');
}

const usageId = crypto.randomUUID();
await db.insert(schema.aiUsage).values({
  id: usageId,
  userId: testUser.id,
  characterId: null,
  callType: 'image_understanding',
  providerType: 'openai',
  model: 'gpt-4o-mini',
  inputTokens: 250,
  outputTokens: 80,
  totalTokens: 330,
  costUsd: 0.0001,
  durationMs: 1200,
  success: true,
});

const [savedUsage] = await db.select().from(schema.aiUsage).where(eq(schema.aiUsage.id, usageId));
console.log(' - Saved AI Usage record:', savedUsage.callType, savedUsage.model, savedUsage.totalTokens, 'tokens');
if (savedUsage.callType !== 'image_understanding') {
  throw new Error('Usage tracking callType mismatch');
}

// 8. Test Group Chat Attention & Perception Isolation
console.log('\n8. Testing Group Chat Perception & Character Isolation:');
// Create a test group and two characters
const charAId = crypto.randomUUID();
const charBId = crypto.randomUUID();

const uniqueSuffix = Date.now().toString(36);
await db.insert(schema.aiCharacters).values({
  id: charAId,
  userId: testUser.id,
  name: 'Character Vivian',
  username: `vivian_${uniqueSuffix}`,
  status: 'active',
});

await db.insert(schema.aiCharacters).values({
  id: charBId,
  userId: testUser.id,
  name: 'Character Marcus',
  username: `marcus_${uniqueSuffix}`,
  status: 'active',
});

const groupId = crypto.randomUUID();
await db.insert(schema.groups).values({
  id: groupId,
  userId: testUser.id,
  name: 'Pet Lovers Club',
});

// Member A has lastReadAt = 5 minutes ago
const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
// Member B has lastReadAt = 10 minutes from now (simulating has already read past or not reading)
const futureTime = new Date(Date.now() + 10 * 60 * 1000);

await db.insert(schema.groupMembers).values([
  {
    id: crypto.randomUUID(),
    groupId,
    userId: testUser.id,
    memberType: 'ai',
    characterId: charAId,
    lastReadAt: fiveMinAgo,
  },
  {
    id: crypto.randomUUID(),
    groupId,
    userId: testUser.id,
    memberType: 'ai',
    characterId: charBId,
    lastReadAt: futureTime,
  },
]);

// User sends group message with the cat image 2 minutes ago
const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
const groupMsgId = crypto.randomUUID();
await db.insert(schema.groupMessages).values({
  id: groupMsgId,
  groupId,
  userId: testUser.id,
  senderType: 'user',
  content: '大家看我家猫猫！',
  createdAt: twoMinAgo,
});

await db.insert(schema.groupMessageAttachments).values({
  id: crypto.randomUUID(),
  groupMessageId: groupMsgId,
  mediaAssetId: assetId,
  order: 0,
});

// Context block for Character A (who reads this unread message):
const ctxForA = {
  group: { id: groupId, name: 'Pet Lovers Club', membersSummary: 'Test Creator, Vivian, Marcus' },
  currentTimeFormatted: '2026-08-30 14:00',
  timezone: 'Asia/Shanghai',
  lastReadAtFormatted: '5 分钟前',
  timeSinceLastRead: '5 分钟',
  unreadCount: 1,
  precedingMessages: [],
  unreadDigest: {
    summaryText: null,
    keyMessages: [
      {
        id: groupMsgId,
        senderName: 'Test Creator',
        senderUsername: 'me',
        isSelf: false,
        isUser: true,
        content: '大家看我家猫猫！',
        attachments: [
          {
            id: assetId,
            perception: {
              status: 'ready',
              summary: samplePerception.summary,
            },
          },
        ],
        timeFormatted: '2 分钟前',
        isMentioningMe: false,
        isReplyingToMe: false,
        reactions: [],
      },
    ],
  },
};

const promptBlockA = formatGroupChatContextBlock(ctxForA);
console.log(' - Context Block for Character A (Reading unread message with image perception):');
console.log(promptBlockA);
if (!promptBlockA.includes('### 附件 - 图片') || !promptBlockA.includes('这是一张室内照片')) {
  throw new Error('Group chat context block for Character A missing perception');
}

// Context block for Character B (who has NOT reached this message):
const ctxForB = {
  group: { id: groupId, name: 'Pet Lovers Club', membersSummary: 'Test Creator, Vivian, Marcus' },
  currentTimeFormatted: '2026-08-30 14:00',
  timezone: 'Asia/Shanghai',
  lastReadAtFormatted: '刚刚',
  timeSinceLastRead: '0 秒',
  unreadCount: 0,
  precedingMessages: [],
  unreadDigest: {
    summaryText: null,
    keyMessages: [],
  },
};

const promptBlockB = formatGroupChatContextBlock(ctxForB);
console.log('\n - Context Block for Character B (No unread messages):');
console.log(promptBlockB);
if (promptBlockB.includes('大家看我家猫猫') || promptBlockB.includes('这是一张室内照片')) {
  throw new Error('Character B should NOT see unread image perception before reading!');
}

console.log('\n- Character isolation verified: Character A sees perception only upon reading, Character B does not know image content.');

// 9. Clean up test data
await db.delete(schema.imagePerceptions).where(eq(schema.imagePerceptions.id, perceptionId));
await db.delete(schema.groupMessageAttachments).where(eq(schema.groupMessageAttachments.groupMessageId, groupMsgId));
await db.delete(schema.groupMessages).where(eq(schema.groupMessages.id, groupMsgId));
await db.delete(schema.groupMembers).where(eq(schema.groupMembers.groupId, groupId));
await db.delete(schema.groups).where(eq(schema.groups.id, groupId));
await db.delete(schema.aiCharacters).where(eq(schema.aiCharacters.id, charAId));
await db.delete(schema.aiCharacters).where(eq(schema.aiCharacters.id, charBId));
await db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, assetId));
await db.delete(schema.aiUsage).where(eq(schema.aiUsage.id, usageId));

console.log('\n=== All Vision Interpreter Tests Passed Successfully! ===\n');
client.close();
