/** Client-safe provider metadata (no server-only imports). */
export const PROVIDER_TYPES = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'openai-compatible',
] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  deepseek: 'DeepSeek',
  'openai-compatible': '自定义 (OpenAI 兼容)',
};

/**
 * Determine whether a given provider and modelId supports multimodal / vision input.
 */
export function supportsVision(providerType: ProviderType | string, modelId: string): boolean {
  const id = modelId.toLowerCase();

  switch (providerType) {
    case 'openai':
      // gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4-vision, o1, o3, etc.
      if (id.includes('4o') || id.includes('vision') || id.includes('4-turbo') || id.includes('4.5') || id.startsWith('o1') || id.startsWith('o3')) {
        return true;
      }
      return false;

    case 'anthropic':
      // Claude 3, 3.5, 3.7 families all support vision
      if (id.includes('claude-3') || id.includes('claude-sonnet') || id.includes('claude-opus') || id.includes('claude-haiku')) {
        return true;
      }
      return false;

    case 'google':
      // All Gemini models support vision / multimodal input
      if (id.includes('gemini') || id.includes('gemma-3')) {
        return true;
      }
      return false;

    case 'deepseek':
      // Standard deepseek-chat / deepseek-reasoner are text-only
      if (id.includes('vl') || id.includes('vision')) {
        return true;
      }
      return false;

    case 'openai-compatible':
    default:
      // Check common multimodal model keywords
      if (
        id.includes('vision') ||
        id.includes('vl') ||
        id.includes('4o') ||
        id.includes('gemini') ||
        id.includes('claude') ||
        id.includes('llava') ||
        id.includes('internvl') ||
        id.includes('pixtral') ||
        id.includes('qwen-vl') ||
        id.includes('qwen2-vl') ||
        id.includes('qwen2.5-vl') ||
        id.includes('minicpm-v') ||
        id.includes('qvq')
      ) {
        return true;
      }
      return false;
  }
}
