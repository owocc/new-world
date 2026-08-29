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
