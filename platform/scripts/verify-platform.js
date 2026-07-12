#!/usr/bin/env node
/**
 * Platform verification script — syntax, imports, startup, config, DI, migrations, env.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const PLATFORM = path.join(ROOT, "platform");

const REQUIRED_FILES = [
  "storage/LocalStorageAdapter.js",
  "storage/CloudStorageProvider.js",
  "storage/CloudinaryAdapterPlaceholder.js",
  "storage/UploadService.js",
  "storage/DeleteService.js",
  "storage/TransformationService.js",
  "storage/StorageRegistry.js",
  "storage/StorageBootstrap.js",
  "storage/index.js",
  "email/EmailProvider.js",
  "email/SMTPAdapterPlaceholder.js",
  "email/ResendAdapterPlaceholder.js",
  "email/TemplateRegistry.js",
  "email/Mailer.js",
  "email/EmailBootstrap.js",
  "email/index.js",
  "deployment/ProductionBootstrap.js",
  "deployment/StartupChecks.js",
  "deployment/DeploymentValidator.js",
  "deployment/index.js",
  "health/LivenessProbe.js",
  "health/ReadinessProbe.js",
  "health/HealthController.js",
  "health/index.js",
  "runtime/PlatformBootstrap.js",
  "runtime/registerPlatformRoutes.js",
  "runtime/index.js",
  "PlatformModule.js",
  "index.js",
  "database/index.js",
  "di/index.js",
  "scripts/verify-platform.js",
];

const REQUIRED_ENV_EXAMPLES = [
  ".env.example",
  ".env.production.example",
  ".env.staging.example",
  ".env.test.example",
];

const PLATFORM_ENV_KEYS = [
  "POSTGRES_URL",
  "STORAGE_PROVIDER",
  "EMAIL_PROVIDER",
  "LOG_LEVEL",
  "STORAGE_LOCAL_PATH",
  "STORAGE_MAX_MB",
  "EMAIL_FROM",
  "RESEND_API_KEY",
];

const results = [];
let score = 0;
const maxScore = 100;

function pass(name, detail = "") {
  results.push({ name, status: "PASS", detail });
  return true;
}

function fail(name, detail = "") {
  results.push({ name, status: "FAIL", detail });
  return false;
}

function award(points, condition, name, detail) {
  if (condition) {
    score += points;
    pass(name, detail);
  } else {
    fail(name, detail);
  }
}

function checkFileStructure() {
  let allExist = true;
  for (const rel of REQUIRED_FILES) {
    const full = path.join(PLATFORM, rel);
    if (!fs.existsSync(full)) {
      allExist = false;
      fail(`file:${rel}`, "missing");
    }
  }
  award(10, allExist, "file_structure", `${REQUIRED_FILES.length} required platform files`);
}

function checkSyntax() {
  const jsFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) jsFiles.push(full);
    }
  }
  walk(PLATFORM);

  let allOk = true;
  for (const file of jsFiles) {
    const rel = path.relative(ROOT, file);
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) {
      allOk = false;
      fail(`syntax:${rel}`, result.stderr?.trim() || "syntax error");
    }
  }
  award(15, allOk, "syntax", `${jsFiles.length} JS files checked`);
}

function checkImports() {
  const modules = [
    "../index.js",
    "../storage/index.js",
    "../email/index.js",
    "../deployment/index.js",
    "../health/index.js",
    "../runtime/index.js",
    "../database/index.js",
    "../di/index.js",
    "../environment/index.js",
    "../configuration/index.js",
    "../secrets/index.js",
  ];

  let allOk = true;
  for (const mod of modules) {
    try {
      delete require.cache[require.resolve(path.join(__dirname, mod))];
      require(path.join(__dirname, mod));
    } catch (err) {
      allOk = false;
      fail(`import:${mod}`, err.message);
    }
  }
  award(15, allOk, "imports", `${modules.length} module entry points`);
}

function checkStartup() {
  try {
    const { bootstrapPlatform } = require("../index");
    const platform = bootstrapPlatform({
      source: {
        NODE_ENV: "test",
        PORT: "5000",
        DB_URL: "mongodb://localhost:27017/test",
        JWT_SECRET_KEY: "test-secret",
        JWT_EXPIRES: "7d",
        ACTIVATION_SECRET: "test-activation",
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
        BACKEND_URL: "http://localhost:5000",
        FRONTEND_URL: "http://localhost:3000",
        CLOUDINARY_NAME: "test-cloud",
        CLOUDINARY_API_KEY: "test-key",
        CLOUDINARY_API_SECRET: "test-secret",
        STORAGE_PROVIDER: "local",
        EMAIL_PROVIDER: "placeholder",
        LOG_LEVEL: "info",
        POSTGRES_URL: "postgresql://placeholder:5432/guriraline",
      },
    });

    const hasContainer = Boolean(platform.container);
    const services = platform.container.list();
    const requiredServices = [
      "environment",
      "configuration",
      "secrets",
      "database",
      "storage",
      "email",
      "deployment",
      "healthController",
    ];
    const missing = requiredServices.filter((s) => !services.includes(s));
    const ok = hasContainer && missing.length === 0;
    award(15, ok, "startup", ok ? `${services.length} services registered` : `missing: ${missing.join(", ")}`);
    return platform;
  } catch (err) {
    award(15, false, "startup", err.message);
    return null;
  }
}

function checkConfig(platform) {
  if (!platform) {
    award(10, false, "config", "platform not bootstrapped");
    return;
  }
  const config = platform.configuration;
  const modules = ["application", "database", "storage", "email", "logging", "security"];
  const missing = modules.filter((m) => !config.has(m));
  award(10, missing.length === 0, "config", missing.length ? `missing: ${missing.join(", ")}` : modules.join(", "));
}

function checkDI(platform) {
  if (!platform) {
    award(10, false, "di", "platform not bootstrapped");
    return;
  }
  const container = platform.container;
  const storage = container.resolve("storage");
  const email = container.resolve("email");
  const ok =
    container.has("storage") &&
    container.has("email") &&
    typeof storage.uploadService?.upload === "function" &&
    typeof email.mailer?.send === "function";
  award(10, ok, "di", ok ? "storage and email wired via DI" : "DI resolution failed");
}

async function checkMigrationInfra(platform) {
  if (!platform) {
    award(10, false, "migrations", "platform not bootstrapped");
    return;
  }
  const db = platform.database;
  const ok =
    db.migrationRegistry &&
    db.migrationRunner &&
    db.seedRegistry &&
    db.seedRunner &&
    db.repositoryRegistry;
  let runnerOk = false;
  if (ok) {
    const runResult = await db.migrationRunner.runPending();
    runnerOk = runResult && typeof runResult.applied !== "undefined";
  }
  award(10, ok && runnerOk, "migrations", ok ? "migration/seed infra operational" : "missing components");
}

function checkRepositoryWiring(platform) {
  if (!platform) {
    award(5, false, "repositories", "platform not bootstrapped");
    return;
  }
  const registry = platform.database.repositoryRegistry;
  const ok = registry && typeof registry.register === "function" && typeof registry.list === "function";
  award(5, ok, "repositories", ok ? "RepositoryRegistry ready" : "registry missing");
}

function checkEnvValidation() {
  let examplesOk = true;
  for (const file of REQUIRED_ENV_EXAMPLES) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) {
      examplesOk = false;
      fail(`env:${file}`, "missing");
    }
  }

  const exampleContent = fs.existsSync(path.join(ROOT, ".env.example"))
    ? fs.readFileSync(path.join(ROOT, ".env.example"), "utf8")
    : "";
  const missingKeys = PLATFORM_ENV_KEYS.filter((k) => !exampleContent.includes(k));
  const keysOk = missingKeys.length === 0;

  const { EnvironmentLoader, EnvironmentValidator } = require("../environment");
  const loader = new EnvironmentLoader({
    NODE_ENV: "test",
    PORT: "5000",
  });
  const validator = new EnvironmentValidator();
  const result = validator.validate(loader, "test");
  const validationOk = result.valid;

  const ok = examplesOk && keysOk && validationOk;
  award(10, ok, "env_validation", ok ? "env templates and validator OK" : `missing keys: ${missingKeys.join(", ")}`);
}

function checkWiring() {
  const validateEnvPath = path.join(ROOT, "config", "validateEnv.js");
  const appPath = path.join(ROOT, "app.js");
  const serverPath = path.join(ROOT, "server.js");

  const validateContent = fs.readFileSync(validateEnvPath, "utf8");
  const appContent = fs.readFileSync(appPath, "utf8");
  const serverContent = fs.readFileSync(serverPath, "utf8");

  const validateOk = validateContent.includes("EnvironmentValidator") || validateContent.includes("platform/environment");
  const appOk = appContent.includes("registerPlatformRoutes");
  const serverOk = serverContent.includes("bootstrapPlatform") || serverContent.includes("platform");

  award(5, validateOk, "wiring:validateEnv", validateOk ? "delegates to platform" : "not wired");
  award(5, appOk, "wiring:app.js", appOk ? "registerPlatformRoutes present" : "not wired");
  award(5, serverOk, "wiring:server.js", serverOk ? "platform bootstrap present" : "not wired");
}

async function main() {
  console.log("=== Platform Verification ===\n");
  checkFileStructure();
  checkSyntax();
  checkImports();
  const platform = checkStartup();
  checkConfig(platform);
  checkDI(platform);
  await checkMigrationInfra(platform);
  checkRepositoryWiring(platform);
  checkEnvValidation();
  checkWiring();

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log("Results:");
  for (const r of results) {
    console.log(`  [${r.status}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }

  console.log(`\nScore: ${Math.min(score, maxScore)}/${maxScore}`);
  console.log(`Checks: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
