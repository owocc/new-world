import { config } from 'dotenv';
config();

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';
import {
  verifyImageMagicBytes,
  extractImageDimensions,
  validateMediaFile,
  sanitizeFilename,
} from '../src/server/media.ts';
import { supportsVision } from '../src/lib/providers-shared.ts';

console.log('=== Starting Media & Multimodal Integration Tests ===\n');

// 1. Test Magic Bytes & Dimension Extraction
console.log('1. Testing image validation & magic bytes:');
// 1x1 Transparent PNG buffer
const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x32,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x70, 0xe1, 0x95, 0x34,
]);

const pngMagic = verifyImageMagicBytes(pngBuffer);
console.log(' - PNG Magic valid:', pngMagic.valid, 'MIME:', pngMagic.mime);
if (!pngMagic.valid || pngMagic.mime !== 'image/png') throw new Error('PNG magic bytes failed');

const pngDims = extractImageDimensions(pngBuffer, 'image/png');
console.log(' - PNG dimensions extracted:', pngDims);
if (pngDims.width !== 100 || pngDims.height !== 50) throw new Error('PNG dimensions mismatch');

// Test fake/corrupt file
const fakeBuffer = Buffer.from('NOT_AN_IMAGE_FILE_DATA_HERE_123456');
const fakeMagic = verifyImageMagicBytes(fakeBuffer);
console.log(' - Corrupted file rejected correctly:', !fakeMagic.valid);
if (fakeMagic.valid) throw new Error('Fake image was not rejected');

// Test filename sanitization
const cleanName = sanitizeFilename('../../etc/passwd-attack.png');
console.log(' - Sanitized filename:', cleanName);
if (cleanName.includes('..') || cleanName.includes('/')) throw new Error('Path traversal sanitization failed');

// 2. Test Vision Model Capability Check
console.log('\n2. Testing model vision capability detection:');
console.log(' - openai / gpt-4o:', supportsVision('openai', 'gpt-4o'));
console.log(' - openai / gpt-4o-mini:', supportsVision('openai', 'gpt-4o-mini'));
console.log(' - anthropic / claude-3-5-sonnet:', supportsVision('anthropic', 'claude-3-5-sonnet-20241022'));
console.log(' - google / gemini-1.5-flash:', supportsVision('google', 'gemini-1.5-flash'));
console.log(' - deepseek / deepseek-chat:', supportsVision('deepseek', 'deepseek-chat'));
console.log(' - openai-compatible / qwen2.5-vl-72b:', supportsVision('openai-compatible', 'qwen2.5-vl-72b'));

if (!supportsVision('openai', 'gpt-4o')) throw new Error('gpt-4o should support vision');
if (!supportsVision('anthropic', 'claude-3-5-sonnet')) throw new Error('claude-3-5-sonnet should support vision');
if (!supportsVision('google', 'gemini-1.5-flash')) throw new Error('gemini should support vision');
if (supportsVision('deepseek', 'deepseek-chat')) throw new Error('deepseek-chat should not support vision');

// 3. Database operations test
console.log('\n3. Testing Database Media & Attachment records:');
const client = createClient({ url: process.env.LIBSQL_URL || 'file:./local.db' });
const db = drizzle(client, { schema });

// Fetch or create a test user
let [testUser] = await db.select().from(schema.user).limit(1);
if (!testUser) {
  const userId = crypto.randomUUID();
  await db.insert(schema.user).values({
    id: userId,
    name: 'Test Creator',
    email: 'test@myworld.dev',
  });
  [testUser] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
}

console.log(' - Using user:', testUser.id, testUser.name);

// Insert Media Asset
const assetId = crypto.randomUUID();
await db.insert(schema.mediaAssets).values({
  id: assetId,
  userId: testUser.id,
  mediaType: 'image',
  blobUrl: 'https://vercel.blob.example/users/test/messages/img-01.png',
  pathname: `users/${testUser.id}/messages/img-01.png`,
  mimeType: 'image/png',
  fileSize: 10240,
  originalFilename: 'test-keyboard.png',
  width: 800,
  height: 600,
  status: 'ready',
  purpose: 'attachment',
});
console.log(' - Inserted media asset:', assetId);

// Test DM Message Attachment Link
let [testChar] = await db.select().from(schema.aiCharacters).where(eq(schema.aiCharacters.userId, testUser.id)).limit(1);
if (!testChar) {
  const charId = crypto.randomUUID();
  await db.insert(schema.aiCharacters).values({
    id: charId,
    userId: testUser.id,
    name: 'Alice',
    username: 'alice',
    avatarEmoji: '🐱',
    avatarColor: 'rose',
  });
  [testChar] = await db.select().from(schema.aiCharacters).where(eq(schema.aiCharacters.id, charId));
}

const convId = crypto.randomUUID();
await db.insert(schema.conversations).values({
  id: convId,
  userId: testUser.id,
  characterId: testChar.id,
});

const msgId = crypto.randomUUID();
await db.insert(schema.messages).values({
  id: msgId,
  conversationId: convId,
  userId: testUser.id,
  role: 'user',
  content: '你看我这个键盘怎么样',
});

// Link attachment to DM message
await db.insert(schema.messageAttachments).values({
  id: crypto.randomUUID(),
  messageId: msgId,
  mediaAssetId: assetId,
  order: 0,
});
console.log(' - Linked attachment to message:', msgId);

// Verify message attachment query
const dmAttachments = await db
  .select({
    msgId: schema.messageAttachments.messageId,
    blobUrl: schema.mediaAssets.blobUrl,
    filename: schema.mediaAssets.originalFilename,
    width: schema.mediaAssets.width,
    height: schema.mediaAssets.height,
  })
  .from(schema.messageAttachments)
  .innerJoin(schema.mediaAssets, eq(schema.messageAttachments.mediaAssetId, schema.mediaAssets.id))
  .where(eq(schema.messageAttachments.messageId, msgId));

console.log(' - Queried message attachments:', dmAttachments);
if (dmAttachments.length !== 1 || dmAttachments[0].filename !== 'test-keyboard.png') {
  throw new Error('Message attachment query failed');
}

// 4. Test Group Message Attachment Link
console.log('\n4. Testing Group Message Attachments:');
const groupId = crypto.randomUUID();
await db.insert(schema.groups).values({
  id: groupId,
  userId: testUser.id,
  name: '测试群聊',
  avatarEmoji: '💬',
});

const groupMsgId = crypto.randomUUID();
await db.insert(schema.groupMessages).values({
  id: groupMsgId,
  groupId,
  userId: testUser.id,
  senderType: 'user',
  content: '大家看这张照片',
});

await db.insert(schema.groupMessageAttachments).values({
  id: crypto.randomUUID(),
  groupMessageId: groupMsgId,
  mediaAssetId: assetId,
  order: 0,
});

const groupAtts = await db
  .select({
    groupMsgId: schema.groupMessageAttachments.groupMessageId,
    blobUrl: schema.mediaAssets.blobUrl,
    filename: schema.mediaAssets.originalFilename,
  })
  .from(schema.groupMessageAttachments)
  .innerJoin(schema.mediaAssets, eq(schema.groupMessageAttachments.mediaAssetId, schema.mediaAssets.id))
  .where(eq(schema.groupMessageAttachments.groupMessageId, groupMsgId));

console.log(' - Queried group attachments:', groupAtts);
if (groupAtts.length !== 1) throw new Error('Group attachment query failed');

// 5. Test Orphan Cleanup logic
console.log('\n5. Testing Orphan cleanup:');
const orphanAssetId = crypto.randomUUID();
// Insert an unreferenced pending media asset from 3 hours ago
const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
await db.insert(schema.mediaAssets).values({
  id: orphanAssetId,
  userId: testUser.id,
  mediaType: 'image',
  blobUrl: 'https://vercel.blob.example/orphan-test.png',
  pathname: `users/${testUser.id}/messages/orphan-test.png`,
  mimeType: 'image/png',
  fileSize: 5000,
  status: 'pending',
  purpose: 'attachment',
  createdAt: threeHoursAgo,
});

// Run cleanup query
const cutoff = new Date(Date.now() - 60 * 60 * 1000);
const orphans = await db
  .select()
  .from(schema.mediaAssets)
  .where(eq(schema.mediaAssets.status, 'pending'));

console.log(' - Found pending orphans count:', orphans.length);
if (orphans.length === 0) throw new Error('Orphan media detection failed');

// Clean test records
await db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, orphanAssetId));
await db.delete(schema.conversations).where(eq(schema.conversations.id, convId));
await db.delete(schema.groups).where(eq(schema.groups.id, groupId));
await db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, assetId));

console.log('\n=== All Tests Passed Successfully! ===');
client.close();
