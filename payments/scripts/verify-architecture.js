/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const PAYMENTS_ROOT = path.join(__dirname, "..");
const issues = [];
const fixed = [];
const warnings = [];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, acc);
    else if (full.endsWith(".js")) acc.push(full);
  }
  return acc;
}

const files = walk(PAYMENTS_ROOT);
const report = {
  filesChecked: files.length,
  syntax: { pass: 0, fail: [] },
  imports: { pass: 0, fail: [] },
  duplicates: { classes: [], exports: [] },
  routes: { total: 0, duplicates: [] },
  sdkImports: [],
  processEnv: [],
  initialization: {},
  di: {},
};

// 1. Syntax check
for (const file of files) {
  try {
    execSync(`node --check "${file}"`, { stdio: "pipe" });
    report.syntax.pass++;
  } catch (error) {
    report.syntax.fail.push(file);
    issues.push({ type: "syntax", file });
  }
}

// 2. Scan for SDK / env usage in payments (excluding placeholder providers)
const sdkPattern = /require\(['"](stripe|flutterwave|@flutterwave|paypack|winston|pino|redis|bull|ioredis)/i;
const envPattern = /process\.env/;

for (const file of files) {
  const rel = path.relative(PAYMENTS_ROOT, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  if (sdkPattern.test(content)) {
    report.sdkImports.push(rel);
    issues.push({ type: "sdk_import", file: rel });
  }
  if (/process\.env/.test(content) && !/no process\.env/i.test(content)) {
    report.processEnv.push(rel);
    warnings.push({ type: "process_env", file: rel });
  }
}

// 3. Duplicate class names
const classNames = new Map();
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const matches = content.matchAll(/class\s+([A-Za-z0-9_]+)/g);
  for (const match of matches) {
    const name = match[1];
    if (!classNames.has(name)) classNames.set(name, []);
    classNames.get(name).push(path.relative(PAYMENTS_ROOT, file));
  }
}
for (const [name, locations] of classNames.entries()) {
  if (locations.length > 1) {
    report.duplicates.classes.push({ name, locations });
    warnings.push({ type: "duplicate_class", name, locations });
  }
}

// 4. Module initialization
function assertInit(name, fn) {
  try {
    const result = fn();
    report.initialization[name] = { ok: true };
    return result;
  } catch (error) {
    report.initialization[name] = { ok: false, error: error.message };
    issues.push({ type: "init_fail", name, error: error.message });
    return null;
  }
}

const payments = require(path.join(PAYMENTS_ROOT, "index.js"));

assertInit("payments_index", () => Boolean(payments.PaymentModule));

const pm = assertInit("PaymentModule", () => new payments.PaymentModule());

if (pm) {
  assertInit("MarketplacePaymentFacade", () => Boolean(pm.getMarketplacePaymentFacade()));
  assertInit("InfrastructureModule", () => Boolean(pm.getInfrastructureModule()));
  assertInit("SettlementEngine", () => Boolean(pm.getSettlementEngine()));
  assertInit("TransactionCoordinator", () => Boolean(pm.getTransactionCoordinator()));

  const diChecks = [
    ["orderPaymentWorkflow", () => pm.getOrderPaymentWorkflow()],
    ["escrowOrchestrator", () => pm.getEscrowOrchestrator()],
    ["settlementOrchestrator", () => pm.getSettlementOrchestrator()],
    ["idempotencyService", () => pm.getIdempotencyService()],
    ["infrastructureRegistry", () => pm.getInfrastructureModule().getRegistry()],
    ["infrastructureHealth", () => pm.getInfrastructureModule().getHealth()],
    ["infrastructureMonitoring", () => pm.getInfrastructureModule().getMonitoring()],
  ];

  for (const [key, fn] of diChecks) {
    try {
      const value = fn();
      report.di[key] = Boolean(value);
      if (!value) issues.push({ type: "di_missing", key });
    } catch (error) {
      report.di[key] = false;
      issues.push({ type: "di_error", key, error: error.message });
    }
  }
}

const api = assertInit("api_layer", () => payments.api.createPaymentApi(pm));
if (api) {
  report.routes.total = api.routeDefinitions.length;
  const paths = api.routeDefinitions.map((r) => `${r.method} ${r.fullPath}`);
  const seen = new Map();
  for (const p of paths) {
    seen.set(p, (seen.get(p) || 0) + 1);
  }
  for (const [p, count] of seen.entries()) {
    if (count > 1) {
      report.routes.duplicates.push({ path: p, count });
      issues.push({ type: "duplicate_route", path: p, count });
    }
  }
}

const runtime = assertInit("runtime_layer", () => {
  const { registerPaymentRuntime } = payments.runtime;
  const express = require("express");
  const app = express();
  app.use(express.json());
  return registerPaymentRuntime(app);
});

if (runtime?.result) {
  report.initialization.runtime_registration = { ok: runtime.result.registered };
}

// 5. Circular dependency probe via repeated requires
try {
  delete require.cache[require.resolve(path.join(PAYMENTS_ROOT, "index.js"))];
  require(path.join(PAYMENTS_ROOT, "index.js"));
  report.initialization.circular_reload = { ok: true };
} catch (error) {
  report.initialization.circular_reload = { ok: false, error: error.message };
  issues.push({ type: "circular_or_reload", error: error.message });
}

// 6. Infrastructure health async
(async () => {
  if (pm) {
    try {
      const health = await pm.getInfrastructureModule().runHealthChecks();
      report.initialization.infrastructure_health = { ok: health.healthy, count: health.results.length };
      if (!health.healthy) issues.push({ type: "health_fail", health });
    } catch (error) {
      report.initialization.infrastructure_health = { ok: false, error: error.message };
      issues.push({ type: "health_error", error: error.message });
    }
  }

  const score = Math.max(
    0,
    100 -
      issues.filter((i) => i.type !== "duplicate_class").length * 10 -
      warnings.length * 2
  );

  console.log(JSON.stringify({ report, issues, fixed, warnings, score }, null, 2));
  process.exit(issues.filter((i) => !["duplicate_class"].includes(i.type)).length > 0 ? 1 : 0);
})();
