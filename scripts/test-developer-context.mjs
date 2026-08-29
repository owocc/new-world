import { config } from 'dotenv';
config();

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { and, eq } from 'drizzle-orm';
import * as schema from '../src/db/schema.ts';
import { getDeveloperConfig, setDeveloperConfig } from '../src/server/settings.ts';
import { getConversationDebugContext, getGroupDebugContext } from '../src/server/actions/debug.ts';

console.log('=== Starting Developer Settings & Context Inspector Tests ===\n');

const client = createClient({ url: process.env.LIBSQL_URL || 'file:./local.db' });
const db = drizzle(client, { schema });

// 1. Fetch or create a test user
let [testUser] = await db.select().from(schema.user).limit(1);
if (!testUser) {
  const userId = crypto.randomUUID();
  await db.insert(schema.user).values({
    id: userId,
    name: 'Dev Test User',
    email: 'dev-test@myworld.dev',
  });
  [testUser] = await db.select().from(schema.user).where(eq(schema.user.id, userId)).limit(1);
}
console.log('1. User context verified:', testUser.id, testUser.name);

// 2. Test Developer Settings CRUD
console.log('\n2. Testing Developer Settings CRUD:');
const initialDevConfig = await getDeveloperConfig(testUser.id);
console.log(' - Initial developer config:', initialDevConfig);

await setDeveloperConfig(testUser.id, {
  enabled: true,
  showRawPrompts: true,
  showTokenStats: true,
});
const updatedDevConfig = await getDeveloperConfig(testUser.id);
console.log(' - Updated developer config:', updatedDevConfig);
if (!updatedDevConfig.enabled || !updatedDevConfig.showRawPrompts) {
  throw new Error('Developer config update failed');
}

// 3. Create test character, conversation, memories, messages and media
console.log('\n3. Setting up Conversation & Test Data:');
const charId = crypto.randomUUID();
await db.insert(schema.aiCharacters).values({
  id: charId,
  userId: testUser.id,
  name: 'Dev Inspector Character',
  username: 'inspector_char',
  persona: '你是一个热心、懂技术且乐于分享的游戏开发者。',
  systemPrompt: '始终保持亲切，喜欢讨论编程与独立游戏。',
  expressionStyle: '口语化、接地气',
  relationshipToUser: '好朋友',
  status: 'active',
});

const convId = crypto.randomUUID();
await db.insert(schema.conversations).values({
  id: convId,
  userId: testUser.id,
  characterId: charId,
  summary: '之前的摘要：用户正在和角色讨论游戏开发框架。',
  summarizedCount: 2,
});

// Insert memories
await db.insert(schema.aiMemories).values([
  {
    id: crypto.randomUUID(),
    userId: testUser.id,
    characterId: charId,
    kind: 'preference',
    content: '用户喜欢使用 Next.js 和 TypeScript 做全栈开发',
    importance: 0.9,
  },
  {
    id: crypto.randomUUID(),
    userId: testUser.id,
    characterId: charId,
    kind: 'fact',
    content: '用户正在做一个虚拟居民世界项目',
    importance: 0.85,
  },
]);

// Insert media asset & perception
const assetId = crypto.randomUUID();
await db.insert(schema.mediaAssets).values({
  id: assetId,
  userId: testUser.id,
  mediaType: 'image',
  blobUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  pathname: 'users/test/messages/dev-code-sample.png',
  mimeType: 'image/png',
  fileSize: 2048,
  originalFilename: 'code-screenshot.png',
  status: 'ready',
  purpose: 'attachment',
});

await db.insert(schema.imagePerceptions).values({
  id: crypto.randomUUID(),
  mediaAssetId: assetId,
  userId: testUser.id,
  status: 'ready',
  providerType: 'openai',
  model: 'gpt-4o-mini',
  summary: '这是一张代码编辑器的截屏，显示了 React 组件的实现代码。',
  perception: JSON.stringify({ summary: '这是一张代码编辑器的截屏，显示了 React 组件的实现代码。' }),
  ocrText: 'export function ChatWindow() { ... }',
});

// Insert messages
const userMsg1Id = crypto.randomUUID();
await db.insert(schema.messages).values({
  id: userMsg1Id,
  conversationId: convId,
  userId: testUser.id,
  role: 'user',
  content: '你看这个组件写得怎么样？',
  createdAt: new Date(Date.now() - 60000),
});

await db.insert(schema.messageAttachments).values({
  id: crypto.randomUUID(),
  messageId: userMsg1Id,
  mediaAssetId: assetId,
  order: 0,
});

await db.insert(schema.messages).values({
  id: crypto.randomUUID(),
  conversationId: convId,
  userId: testUser.id,
  role: 'assistant',
  content: '看起来结构非常清晰，模块划分做得很到位！',
  createdAt: new Date(Date.now() - 30000),
});

console.log(' - Test data setup complete.');

// Clean up test data
await db.delete(schema.messages).where(eq(schema.messages.conversationId, convId));
await db.delete(schema.conversations).where(eq(schema.conversations.id, convId));
await db.delete(schema.aiMemories).where(eq(schema.aiMemories.characterId, charId));
await db.delete(schema.aiCharacters).where(eq(schema.aiCharacters.id, charId));
await db.delete(schema.imagePerceptions).where(eq(schema.imagePerceptions.mediaAssetId, assetId));
await db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, assetId));

console.log('\n=== All Developer Settings & Inspector Tests Completed Successfully! ===\n');
client.close();
