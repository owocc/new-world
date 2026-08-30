import { tool } from 'ai';
import { z } from 'zod';
import { generateCharacterImage, resolveImageModel, type GeneratedImage } from './image';

/**
 * AI 生图工具：只有生图配置启用时才注入给模型（未配置时完全不提供该工具，
 * 模型无从调用）。工具内部完成「生成图片 -> 落库 media asset」，
 * 生成结果通过 collected 数组带回调用方（帖子/消息的媒体列表）。
 */
export async function createImageGenTool(args: {
  userId: string;
  characterId: string | null;
  collected: GeneratedImage[];
}) {
  const resolved = await resolveImageModel(args.userId);
  if (!resolved.enabled) {
    return {};
  }

  return {
    generate_image: tool({
      description:
        '生成一张图片并发送。适合你想分享生活瞬间、看到的东西、创作、表情包等场景。调用后图片会随你的消息一起发出。',
      inputSchema: z.object({
        prompt: z
          .string()
          .min(1)
          .max(800)
          .describe('对图片的完整描述：主体、场景、风格、氛围。用具体的画面语言描述。'),
      }),
      execute: async ({ prompt }) => {
        try {
          const image = await generateCharacterImage({
            userId: args.userId,
            characterId: args.characterId,
            prompt,
          });
          args.collected.push(image);
          return {
            ok: true as const,
            message: '图片已生成并将随消息发出。请继续输出配文（不要在配文里复述图片描述）。',
          };
        } catch (err) {
          return {
            ok: false as const,
            message: `图片生成失败：${err instanceof Error ? err.message : String(err)}。请只输出文字内容。`,
          };
        }
      },
    }),
  };
}
