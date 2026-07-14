import { capturePlatformError, emitPlatformEvent } from "../lib/observability/client";
import { buildContentInventory } from "../lib/content-validation/inventory";
import {
  formatContentIssue,
  formatContentSummary,
  validateContentInventory,
} from "../lib/content-validation/validate";

async function main() {
  const inventory = await buildContentInventory(process.cwd());
  const issues = await validateContentInventory(inventory);

  if (issues.length > 0) {
    emitPlatformEvent({ name: "content.validation_failed", outcome: "failed", metadata: { resultCount: issues.length } });
    capturePlatformError({ code: "CONTENT_INVALID", metadata: { resultCount: issues.length } });
    console.error(issues.map(formatContentIssue).join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(formatContentSummary(inventory));
}

void main();
