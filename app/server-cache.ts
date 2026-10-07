// 服务端公共数据缓存原语:同实例 TTL 缓存 + 并发 Promise 去重 + 查询超时 + 失败降级。
// 供功能开关、公开人物列表等跨请求只读数据复用,避免各自复制一套缓存实现。
// Worker 多实例下这是每实例缓存;数据库故障时靠 onError 兜底保证公开页面仍能快速返回。

export async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type ServerCacheOptions<T> = {
  name: string;
  ttlMs: number;
  timeoutMs: number;
  load: () => Promise<T>;
  // 数据库失败/超时时立即返回:优先传入最近一次成功值(stale),没有则给安全兜底。
  onError: (error: unknown, stale: T | null) => T;
};

export type ServerCache<T> = {
  get: () => Promise<T>;
  peek: () => T | null;
  set: (value: T) => void;
};

export function createServerCache<T>({ name, ttlMs, timeoutMs, load, onError }: ServerCacheOptions<T>): ServerCache<T> {
  let value: T | null = null;
  let loadedAt = 0;
  let inflight: Promise<T> | null = null;

  async function refresh(): Promise<T> {
    try {
      const fresh = await withTimeout(load(), timeoutMs, name);
      value = fresh;
      loadedAt = Date.now();
      return fresh;
    } catch (error) {
      console.error(`Server cache refresh failed: ${name}`, error);
      const fallback = onError(error, value);
      // 缓存兜底值，避免数据库故障期间每个请求都重复吃满超时。
      value = fallback;
      loadedAt = Date.now();
      return fallback;
    } finally {
      inflight = null;
    }
  }

  return {
    get() {
      if (value !== null && Date.now() - loadedAt < ttlMs) return Promise.resolve(value);
      // 并发穿透去重:同一时刻只有一个刷新在跑,其余请求复用同一 Promise。
      inflight ??= refresh();
      return inflight;
    },
    peek() {
      return value;
    },
    set(next: T) {
      value = next;
      loadedAt = Date.now();
    },
  };
}
