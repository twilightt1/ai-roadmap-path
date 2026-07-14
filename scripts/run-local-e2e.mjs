#!/usr/bin/env node
/** Runs the complete browser smoke suite against a disposable local Supabase user. */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);

let supabasePowerShellShim;

function resolveSupabaseCommand(args) {
  if (process.platform !== "win32") return { executable: "supabase", args };

  if (!supabasePowerShellShim) {
    const matches = execFileSync("where.exe", ["supabase.ps1"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!matches[0]) throw new Error("supabase.ps1 was not found on PATH");
    supabasePowerShellShim = matches[0];
  }

  return {
    executable: "powershell.exe",
    args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", supabasePowerShellShim, ...args],
  };
}

function supabaseStatus() {
  const invocation = resolveSupabaseCommand(["status", "--output", "env"]);
  return execFileSync(invocation.executable, invocation.args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseEnv(output) {
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
      })
  );
}

function requireLocalUrl(value) {
  const url = new URL(value);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    throw new Error("Local E2E refuses to create a smoke user outside a loopback Supabase URL.");
  }
  return url.origin;
}

async function adminRequest(apiUrl, serviceRoleKey, path, init) {
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

async function main() {
  const status = parseEnv(supabaseStatus());
  const required = ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"];
  const missing = required.filter((name) => !status[name]);
  if (missing.length) {
    throw new Error(`Local Supabase status is missing: ${missing.join(", ")}`);
  }

  const apiUrl = requireLocalUrl(status.API_URL);
  const email = `local-smoke-${randomUUID()}@example.test`;
  const password = `Aa9!${randomUUID()}`;
  const createResponse = await adminRequest(apiUrl, status.SERVICE_ROLE_KEY, "/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!createResponse.ok) {
    throw new Error(`Unable to create local smoke user (HTTP ${createResponse.status}).`);
  }

  const user = await createResponse.json();
  if (!user?.id) throw new Error("Local Supabase did not return a smoke-user id.");

  try {
    const playwrightCli = require.resolve("@playwright/test/cli");
    const requestedTests = process.argv.slice(2);
    execFileSync(process.execPath, [playwrightCli, "test", ...requestedTests, "--project=chromium"], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: apiUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
        PLAYWRIGHT_SMOKE_USER_EMAIL: email,
        PLAYWRIGHT_SMOKE_USER_PASSWORD: password,
        PLAYWRIGHT_RUN_EXTERNAL_RUNTIME: "true",
      },
    });
  } finally {
    const deleteResponse = await adminRequest(
      apiUrl,
      status.SERVICE_ROLE_KEY,
      `/auth/v1/admin/users/${encodeURIComponent(user.id)}`,
      { method: "DELETE" }
    );
    if (!deleteResponse.ok) {
      console.error(`Local smoke-user cleanup failed (HTTP ${deleteResponse.status}).`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = typeof error?.status === "number" ? error.status : 1;
});
