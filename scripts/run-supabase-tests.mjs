#!/usr/bin/env node
/**
 * Runs P0/P1/P2/P2.1 database assertions against an already-running *local* Supabase stack.
 * The script deliberately resets the local database because the test stages a
 * legacy snapshot between migrations to verify the real backfill path.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sqlTest = resolve(root, "supabase/tests/p0_progress_rls.test.sql");
const p1SqlTest = resolve(root, "supabase/tests/p1_learning_profiles_rls.test.sql");
const p2SqlTest = resolve(root, "supabase/tests/p2_project_evidence_rls.test.sql");
const p2ReviewSqlTest = resolve(root, "supabase/tests/p2_submission_review_rls.test.sql");
const legacyMigration = "202607060001";

function fail(message) {
  console.error(`\nDB TEST BLOCKED: ${message}`);
  process.exit(1);
}

let supabasePowerShellShim;

function resolveSupabaseCommand(args) {
  if (process.platform !== "win32") {
    return { executable: "supabase", args };
  }

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

function command(commandName, args, options = {}) {
  try {
    const invocation =
      commandName === "supabase"
        ? resolveSupabaseCommand(args)
        : { executable: commandName, args };

    return execFileSync(invocation.executable, invocation.args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
  } catch (error) {
    const detail = [error.stdout, error.stderr, error.message]
      .filter(Boolean)
      .join("\n")
      .trim();
    throw new Error(`${commandName} ${args.join(" ")} failed\n${detail}`);
  }
}

function requireCommand(commandName) {
  try {
    command(commandName, ["--version"]);
  } catch {
    fail(`required command '${commandName}' is not available on PATH.`);
  }
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
      }),
  );
}

if (!existsSync(sqlTest)) fail(`SQL test file is missing: ${sqlTest}`);
if (!existsSync(p1SqlTest)) fail(`SQL test file is missing: ${p1SqlTest}`);
if (!existsSync(p2SqlTest)) fail(`SQL test file is missing: ${p2SqlTest}`);
if (!existsSync(p2ReviewSqlTest)) fail(`SQL test file is missing: ${p2ReviewSqlTest}`);
requireCommand("supabase");
requireCommand("psql");

let status;
try {
  status = parseEnv(command("supabase", ["status", "--output", "env"]));
} catch (error) {
  fail(`local Supabase is not healthy. Run 'pnpm exec supabase start' first.\n${error.message}`);
}

if (!status.DB_URL) {
  fail("'supabase status --output env' did not provide DB_URL; a local Supabase stack is required.");
}

console.log("Resetting local database through the legacy migration...");
try {
  command("supabase", ["db", "reset", "--local", "--no-seed", "--version", legacyMigration]);
  console.log("Staging legacy snapshot fixture...");
  command("psql", [status.DB_URL, "-v", "legacy_fixture=1", "-f", sqlTest], { stdio: "inherit" });
  console.log("Applying progress migrations...");
  command("supabase", ["migration", "up", "--local"]);
  console.log("Running P0 progress RLS assertions...");
  command("psql", [status.DB_URL, "-v", "ON_ERROR_STOP=1", "-f", sqlTest], { stdio: "inherit" });
  console.log("Running P1 learning profile RLS assertions...");
  command("psql", [status.DB_URL, "-v", "ON_ERROR_STOP=1", "-f", p1SqlTest], { stdio: "inherit" });
  console.log("Running P2 project evidence RLS assertions...");
  command("psql", [status.DB_URL, "-v", "ON_ERROR_STOP=1", "-f", p2SqlTest], { stdio: "inherit" });
  console.log("Running P2.1 submission/reviewer RLS assertions...");
  command("psql", [status.DB_URL, "-v", "ON_ERROR_STOP=1", "-f", p2ReviewSqlTest], { stdio: "inherit" });
} catch (error) {
  console.error(`\nDB TEST FAILED\n${error.message}`);
  process.exit(1);
}

console.log("DB TEST PASSED: P0 progress, P1 learning profile, P2 project evidence, and P2.1 submission/reviewer RLS/migration assertions.");
