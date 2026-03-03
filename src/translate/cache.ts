import { ExtensionContext } from 'vscode';

interface CacheEntry {
  source: string;
  target: string;
  engine: string;
  targetLang: string;
  timestamp: number;
}

const CACHE_KEY = 'varTranslation.translateCache';
const MAX_CACHE_SIZE = 500;

let context: ExtensionContext | undefined;
let memoryCache: CacheEntry[] = [];

export function initCache(extensionContext: ExtensionContext) {
  context = extensionContext;
  memoryCache = context.globalState.get<CacheEntry[]>(CACHE_KEY) || [];
}

function buildCacheKey(source: string, engine: string, targetLang: string): string {
  return `${engine}:${targetLang}:${source}`;
}

export function getCached(source: string, engine: string, targetLang: string): string | undefined {
  const key = buildCacheKey(source, engine, targetLang);
  const index = memoryCache.findIndex(
    (entry) => buildCacheKey(entry.source, entry.engine, entry.targetLang) === key
  );

  if (index === -1) {
    return undefined;
  }

  // LRU: 移到末尾
  const [entry] = memoryCache.splice(index, 1);
  entry.timestamp = Date.now();
  memoryCache.push(entry);

  return entry.target;
}

export function setCache(source: string, target: string, engine: string, targetLang: string) {
  const key = buildCacheKey(source, engine, targetLang);

  // 去重：如果已存在则先移除
  const existingIndex = memoryCache.findIndex(
    (entry) => buildCacheKey(entry.source, entry.engine, entry.targetLang) === key
  );
  if (existingIndex !== -1) {
    memoryCache.splice(existingIndex, 1);
  }

  memoryCache.push({
    source,
    target,
    engine,
    targetLang,
    timestamp: Date.now(),
  });

  // 超过上限时淘汰最旧的
  while (memoryCache.length > MAX_CACHE_SIZE) {
    memoryCache.shift();
  }

  persistCache();
}

export function getHistory(): CacheEntry[] {
  // 返回按时间倒序的副本
  return [...memoryCache].reverse();
}

export function clearCache() {
  memoryCache = [];
  persistCache();
}

function persistCache() {
  if (context) {
    context.globalState.update(CACHE_KEY, memoryCache);
  }
}
