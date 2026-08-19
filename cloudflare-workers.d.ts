declare module "cloudflare:workers" {
  // This module only exists in the Cloudflare runtime. The legacy D1 adapter is
  // not used by the Vercel/Supabase application, but Next.js still type-checks it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const env: { DB?: any };
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

// The live application uses Supabase. This placeholder only keeps the legacy
// Cloudflare worker entry point type-safe when Vercel checks the whole repo.
interface D1Database {
  readonly __d1DatabaseBrand?: never;
}
