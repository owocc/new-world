const collator = new Intl.Collator('zh-Hans-CN-u-co-pinyin', {sensitivity: 'base'});

// Lower-bound hanzi for each pinyin initial (GB2312 level-1 pinyin partitions).
const PINYIN_BOUNDS: [letter: string, bound: string][] = [
  ['A', '阿'], ['B', '八'], ['C', '擦'], ['D', '搭'], ['E', '蛾'],
  ['F', '发'], ['G', '噶'], ['H', '哈'], ['J', '击'], ['K', '喀'],
  ['L', '垃'], ['M', '妈'], ['N', '拿'], ['O', '哦'], ['P', '啪'],
  ['Q', '七'], ['R', '然'], ['S', '撒'], ['T', '他'], ['W', '挖'],
  ['X', '西'], ['Y', '压'], ['Z', '匝'],
];

export function pinyinInitial(value: string): string {
  const ch = value.trim().charAt(0);
  if (!ch) return '#';
  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
  const code = ch.codePointAt(0)!;
  if (code < 0x4e00 || code > 0x9fff) return '#';
  for (let i = PINYIN_BOUNDS.length - 1; i >= 0; i--) {
    if (collator.compare(ch, PINYIN_BOUNDS[i][1]) >= 0) return PINYIN_BOUNDS[i][0];
  }
  return 'A';
}

export function comparePinyin(a: string, b: string): number {
  return collator.compare(a, b);
}

export function groupByInitial<T>(items: T[], getName: (item: T) => string): {letter: string; items: T[]}[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const letter = pinyinInitial(getName(item));
    const bucket = map.get(letter);
    if (bucket) bucket.push(item);
    else map.set(letter, [item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
    .map(([letter, group]) => ({
      letter,
      items: [...group].sort((x, y) => comparePinyin(getName(x), getName(y))),
    }));
}
