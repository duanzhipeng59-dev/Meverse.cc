declare module "cloudflare:workers" {
  // This module only exists in the Cloudflare runtime. The legacy D1 adapter is
  // not used by the Vercel/Supabase application, but Next.js still type-checks it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const env: { DB?: any };
}
