import {
  createCipheriv,
  randomBytes,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

async function loadLocalEnvironment() {
  try {
    const contents = await readFile(new URL("../.dev.vars", import.meta.url), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    }
  } catch {
    // Production and CI should provide environment variables directly.
  }
}

function encrypt(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

await loadLocalEnvironment();
const input = [];
for await (const chunk of process.stdin) input.push(chunk);
const account = JSON.parse(Buffer.concat(input).toString("utf8"));
if (typeof account.email !== "string" || typeof account.password !== "string") {
  throw new Error('Expected JSON input: {"email":"...","password":"..."}');
}

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const encryptionKey = Buffer.from(process.env.GEMINI_CREDENTIALS_KEY ?? "", "base64");
if (!url || !secretKey || encryptionKey.length !== 32) {
  throw new Error("Supabase and credential encryption environment variables are required");
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error } = await supabase.from("gemini_account_inventory").insert({
  account_email_encrypted: encrypt(account.email.trim(), encryptionKey),
  account_password_encrypted: encrypt(account.password, encryptionKey),
});
if (error) throw error;
process.stdout.write("Gemini account added to available inventory.\n");
