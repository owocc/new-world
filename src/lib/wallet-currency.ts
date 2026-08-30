/**
 * 钱包货币类型注册表（client-safe）。
 *
 * 当前仅启用 'nw'（New World 平台余额）。金额一律以最小货币单位（分）的
 * 整数存储与运算，展示时按 decimals 换算，避免浮点误差。
 * 未来接入数字钱包 / 第三方平台统一钱包时，在此注册新的货币类型即可，
 * 账户、流水、红包表均按 currency 字段天然支持多货币并存。
 */

export type WalletCurrencyCode = 'nw';

export type WalletCurrencyMeta = {
  code: WalletCurrencyCode;
  /** 展示名 */
  label: string;
  /** 金额符号前缀 */
  symbol: string;
  /** 小数位数（最小货币单位换算） */
  decimals: number;
  /** 该货币是否已启用 */
  enabled: boolean;
  /** 备注（预留货币显示「即将支持」等） */
  description?: string;
};

export const WALLET_CURRENCIES: Record<WalletCurrencyCode, WalletCurrencyMeta> = {
  nw: {
    code: 'nw',
    label: 'New World 平台余额',
    symbol: 'N$',
    decimals: 2,
    enabled: true,
    description: 'New World 平台内通用货币，居民之间可转账、发红包',
  },
};

/** 预留货币：仅用于设置页展示「即将支持」，不参与任何记账 */
export const RESERVED_WALLET_CURRENCIES: Array<WalletCurrencyMeta & { status: string }> = [
  {
    code: 'nw',
    label: '通用数字钱包',
    symbol: '₿',
    decimals: 8,
    enabled: false,
    description: '预留：接入去中心化数字资产钱包',
    status: '即将支持',
  },
  {
    code: 'nw',
    label: '第三方平台统一钱包',
    symbol: '◎',
    decimals: 2,
    enabled: false,
    description: '预留：通过统一钱包接口接入外部平台余额',
    status: '接口预留',
  },
];

export const DEFAULT_WALLET_CURRENCY: WalletCurrencyCode = 'nw';

export function getWalletCurrency(code: string): WalletCurrencyMeta {
  return WALLET_CURRENCIES[code as WalletCurrencyCode] ?? WALLET_CURRENCIES.nw;
}

/** 最小货币单位 → 展示字符串（如 12345 → "123.45"） */
export function formatWalletAmount(minorUnits: number, code: string = DEFAULT_WALLET_CURRENCY): string {
  const meta = getWalletCurrency(code);
  return (minorUnits / 10 ** meta.decimals).toFixed(meta.decimals);
}

/** 最小货币单位 → 带符号展示字符串（如 12345 → "N$123.45"） */
export function formatWalletMoney(minorUnits: number, code: string = DEFAULT_WALLET_CURRENCY): string {
  const meta = getWalletCurrency(code);
  return `${meta.symbol}${formatWalletAmount(minorUnits, code)}`;
}

/**
 * 用户输入（元）→ 最小货币单位整数。非法或非正数返回 null。
 */
export function parseWalletAmountToMinor(input: string | number, code: string = DEFAULT_WALLET_CURRENCY): number | null {
  const meta = getWalletCurrency(code);
  const n = typeof input === 'number' ? input : Number(String(input).trim().replace(meta.symbol, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  const minor = Math.round(n * 10 ** meta.decimals);
  return minor > 0 ? minor : null;
}
