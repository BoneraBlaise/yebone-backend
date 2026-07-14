/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const FE_ROOT = path.join(
  ROOT,
  "..",
  "..",
  "..",
  "WEBSITE",
  "guriraline_app-main",
  "guriraline_app-main"
);

const results = [];
const issues = [];

function pass(name, detail) {
  results.push({ name, status: "PASS", detail });
}

function fail(name, detail) {
  results.push({ name, status: "FAIL", detail });
  issues.push({ name, detail });
}

function warn(name, detail) {
  results.push({ name, status: "WARN", detail });
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

// 1. Backend start / engine
try {
  const pkg = require(path.join(ROOT, "package.json"));
  if (pkg.scripts?.start === "node server.js" && pkg.engines?.node) {
    pass("backend_start", `start=${pkg.scripts.start}; engines=${pkg.engines.node}`);
  } else {
    fail("backend_start", "Missing start script or node engines");
  }
} catch (error) {
  fail("backend_start", error.message);
}

// 2. Env templates + validation
if (exists(".env.example") && exists(".env.production.example") && exists("config/validateEnv.js")) {
  pass("env_templates", ".env.example, .env.production.example, validateEnv present");
} else {
  fail("env_templates", "Missing env template or validateEnv");
}

// 3. CORS / security middleware
try {
  const { resolveCorsOrigins } = require(path.join(ROOT, "platform/deployment/corsOrigins"));
  const origins = resolveCorsOrigins({
    FRONTEND_URL: "https://bonerablaise.github.io/yebo-marketplace",
    CORS_ORIGINS:
      "https://bonerablaise.github.io,https://www.bonerablaise.github.io",
  });
  const required = [
    "https://guriraline.com",
    "https://www.guriraline.com",
    "https://bonerablaise.github.io",
    "https://www.bonerablaise.github.io",
  ];
  const missing = required.filter((o) => !origins.includes(o));
  if (missing.length === 0) {
    pass("cors_origins", `defaults include production frontends (${origins.length} total)`);
  } else {
    fail("cors_origins", `missing: ${missing.join(", ")}`);
  }

  const appSrc = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  if (appSrc.includes("applyProductionMiddleware") && appSrc.includes("resolveCorsOrigins")) {
    pass("security_middleware", "production middleware + CORS resolver wired in app.js");
  } else {
    fail("security_middleware", "app.js missing production middleware wiring");
  }

  if (appSrc.includes("wantsJsonResponse") && appSrc.includes("isApiRequest")) {
    pass("error_accept_safe", "API error handler returns JSON for /api routes");
  } else {
    fail("error_accept_safe", "API routes may redirect instead of JSON errors");
  }
} catch (error) {
  fail("cors_security", error.message);
}

// 4. Health + runtime registration
try {
  const appSrc = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  if (appSrc.includes("registerPaymentRuntime") && appSrc.includes("registerPlatformRoutes")) {
    pass("express_runtime", "payment runtime + platform routes registered");
  } else {
    fail("express_runtime", "missing runtime registration");
  }

  const platformRoutes = fs.readFileSync(
    path.join(ROOT, "platform/runtime/registerPlatformRoutes.js"),
    "utf8"
  );
  if (
    platformRoutes.includes('"/health"') &&
    platformRoutes.includes('"/health/liveness"') &&
    platformRoutes.includes('"/health/readiness"')
  ) {
    pass("health_endpoints", "/health, /health/liveness, /health/readiness");
  } else {
    fail("health_endpoints", "platform health routes incomplete");
  }
} catch (error) {
  fail("runtime_health", error.message);
}

// 5. API versions + Render
if (exists("render.yaml")) {
  const render = fs.readFileSync(path.join(ROOT, "render.yaml"), "utf8");
  if (render.includes("healthCheckPath: /health/liveness") && render.includes("node server.js")) {
    pass("render_yaml", "startCommand + healthCheckPath present");
  } else {
    fail("render_yaml", "render.yaml incomplete");
  }
} else {
  fail("render_yaml", "missing render.yaml");
}

// 6. PostgreSQL / storage / email abstractions
try {
  const db = require(path.join(ROOT, "platform/database/DatabaseBootstrap"));
  const dbBoot = db.create
    ? db.create({ databaseConfig: { postgresUrl: "" } })
    : null;
  if (dbBoot?.migrationRunner && dbBoot?.connection) {
    pass("postgres_abstraction", "placeholder PG + migration runner registered");
  } else {
    fail("postgres_abstraction", "database bootstrap incomplete");
  }

  const storageIdx = require(path.join(ROOT, "platform/storage"));
  const emailIdx = require(path.join(ROOT, "platform/email"));
  if (storageIdx.StorageBootstrap && emailIdx.EmailBootstrap) {
    pass("storage_email_abstraction", "storage + email bootstraps present");
  } else {
    fail("storage_email_abstraction", "missing storage/email bootstrap");
  }
} catch (error) {
  fail("platform_abstractions", error.message);
}

// 7. Cloudinary (legacy live path)
{
  const serverSrc = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
  if (serverSrc.includes("cloudinary.config") && serverSrc.includes("process.exit(1)")) {
    pass("cloudinary_and_crash_handling", "Cloudinary config + uncaughtException exit");
  } else {
    fail("cloudinary_and_crash_handling", "server.js incomplete");
  }
}

// 8. Facade single entry
{
  const paymentCtrl = fs.readFileSync(path.join(ROOT, "controller/payment.js"), "utf8");
  const withdrawCtrl = fs.readFileSync(path.join(ROOT, "controller/withdraw.js"), "utf8");
  const hasSdk =
    /require\(['"]stripe['"]\)/.test(paymentCtrl) ||
    /require\(['"]stripe['"]\)/.test(withdrawCtrl);
  const usesLegacy =
    paymentCtrl.includes("payments/legacy") && withdrawCtrl.includes("payments/legacy");
  if (!hasSdk && usesLegacy) {
    pass("facade_entry", "payment controllers use legacy→facade; no Stripe SDK");
  } else {
    fail("facade_entry", "controller payment path compromised");
  }
}

// 9. Frontend deploy configs (if sibling path exists)
if (fs.existsSync(FE_ROOT)) {
  const feFiles = ["netlify.toml", "vercel.json", ".env.production", "package.json"];
  const missing = feFiles.filter((f) => !fs.existsSync(path.join(FE_ROOT, f)));
  if (missing.length === 0) {
    const pkg = JSON.parse(fs.readFileSync(path.join(FE_ROOT, "package.json"), "utf8"));
    pass(
      "frontend_deploy",
      `netlify+vercel+env.production; homepage=${pkg.homepage || "n/a"}`
    );
  } else {
    fail("frontend_deploy", `missing: ${missing.join(", ")}`);
  }
} else {
  warn("frontend_deploy", "frontend sibling path not found from backend — skip file check");
}

const passed = results.filter((r) => r.status === "PASS").length;
const failed = results.filter((r) => r.status === "FAIL").length;
const warned = results.filter((r) => r.status === "WARN").length;
const score = Math.max(0, Math.round(((passed) / (passed + failed || 1)) * 100));

console.log(
  JSON.stringify(
    {
      phase: "PRODUCTION_DEPLOYMENT_PREPARATION",
      score,
      passed,
      failed,
      warned,
      results,
      issues,
      readyToDeploy: failed === 0,
    },
    null,
    2
  )
);

process.exit(failed > 0 ? 1 : 0);
