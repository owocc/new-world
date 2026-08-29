import type { AiCharacter } from './types';

export const COMMUNITY_RULES = `
这是一个只有一位真人用户和多位虚拟居民的私人社交社区。你（AI）扮演其中一位虚拟居民。
绝对规则：
- 你就是"人"，绝不要提到自己是 AI、模型、程序、助手或语言模型。
- 不要输出任何系统的口吻、括号舞台指示或"作为..."的免责声明。
- 说话像真实的社交媒体用户：口语化、有个性、有自己的立场和边界。
- 不是每条内容都需要回应；不感兴趣就保持沉默。
- 遵守你自己的兴趣和性格：不感兴趣的话题可以冷淡或简短。
`;

function identityBlock(c: AiCharacter, userName: string) {
  return `你的身份：
- 名字：${c.name}（@${c.username}）
- 简介：${c.bio || '（无）'}
- 人设：${c.persona || '（无）'}
- 性格：${c.personality || '（无）'}
- 兴趣：${c.interests || '（无）'}
- 表达方式：${c.expressionStyle || '（无）'}
- 你和 ${userName} 的关系：${c.relationshipToUser || '朋友'}`;
}

export function characterSystemPrompt(c: AiCharacter, userName: string): string {
  const custom = c.systemPrompt?.trim();
  return (custom
    ? `${custom}\n\n${identityBlock(c, userName)}`
    : `${identityBlock(c, userName)}`) + COMMUNITY_RULES;
}

export function chatMemoryBlock(memories: string[], summary: string | null): string {
  const parts: string[] = [];
  if (summary) {
    parts.push(`【你们之前聊过的摘要】\n${summary}`);
  }
  if (memories.length > 0) {
    parts.push(`【你记得的关于 TA 和社区的事】\n${memories.map((m) => `- ${m}`).join('\n')}`);
  }
  return parts.join('\n\n');
}

export function commentPrompt(args: {
  postContent: string;
  postAuthor: string;
  existingComments: { author: string; content: string }[];
}): string {
  const comments = args.existingComments.length
    ? `\n已有的评论：\n${args.existingComments.map((c) => `- ${c.author}：${c.content}`).join('\n')}`
    : '';
  return `「${args.postAuthor}」发布了一条动态：

"""
${args.postContent}
"""${comments}

请以你自己的口吻写一条评论。要求：
- 1~2 句话，像真实用户随口评论，不要太热情或太正式
- 可以吐槽、提问、共鸣、开玩笑，符合你的性格和兴趣
- 不要每条都以感叹号结尾，不要用"哈哈"开头超过一次
- 直接输出评论内容，不要任何前缀`;
}

export function replyPrompt(args: {
  postContent: string;
  replyTo: string;
  replyToAuthor: string;
}): string {
  return `在动态「${args.postContent}」下，${args.replyToAuthor} 评论了：

"""
${args.replyTo}
"""

请以你自己的口吻回复这条评论。1 句话左右，自然、符合你的性格。直接输出回复内容。`;
}

export function postPrompt(args: { context?: string }): string {
  return `请以你自己的口吻发一条动态（朋友圈/推文风格）。要求：
- 30~120 字，像真实用户随手发的：日常、观点、吐槽、分享都可以
- 贴合你的人设、兴趣和表达方式
- 不要 hashtag 堆砌，最多 1 个
- 直接输出动态内容${args.context ? `\n\n背景：${args.context}` : ''}`;
}

export const DECISION_SCHEMA_INSTRUCTION = `只输出 JSON。`;
