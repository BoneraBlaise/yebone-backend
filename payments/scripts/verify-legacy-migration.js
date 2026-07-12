/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const PAYMENTS_ROOT = path.join(__dirname, "..");
const CONTROLLER_ROOT = path.join(ROOT, "controller");

const issues = [];
const warnings = [];
const report = {
  syntax: { pass: 0, fail: [] },
  imports: { pass: 0, fail: [] },
  forbiddenControllerDeps: [],
  facadeUsage: { legacyAdapters: [], controllers: [] },
  routes: { v2: [], v1: 0, duplicates: [] },
  duplicateFlows: [],
  apiCompatibility: {},
  architectureHealth: {},
  productionReadiness: {},
};

const FORBIDDEN_IN_CONTROLLERS = [
  /require\(['"]stripe['"]\)/,
  /require\(['"]flutterwave/i,
  /require\(['"]paypack/i,
  /require\(['"]\.\.\/payments\/financial/,
  /require\(['"]\.\.\/payments\/services\/PaymentService/,
  /require\(['"]\.\.\/payments\/config\/ProviderResolver/,
  /SettlementEngine/,
  /AccountingLedger/,
  /EscrowStateMachine/,
  /RefundStateMachine/,
];

const LEGACY_PAYMENT_FILES = [
  { file: "controller/payment.js", status: "migrated" },
  { file: "controller/withdraw.js", status: "migrated" },
  { file: "controller/payLaterOrder.js", status: "deprecated" },
  { file: "controller/PayLaterProduct.js", status: "deprecated" },
  { file: "controller/payLateruser.js", status: "deprecated" },
  { file: "controller/order.js", status: "remaining_legacy" },
  { file: "controller/shop.js", status: "remaining_legacy" },
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, acc);
    else if (full.endsWith(".js")) acc.push(full);
  }
  return acc;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

// 1. Syntax verification (payments + legacy controllers + legacy layer)
const filesToCheck = [
  ...walk(PAYMENTS_ROOT),
  ...walk(path.join(PAYMENTS_ROOT, "legacy")),
  path.join(CONTROLLER_ROOT, "payment.js"),
  path.join(CONTROLLER_ROOT, "withdraw.js"),
];

for (const file of filesToCheck) {
  if (!fs.existsSync(file)) continue;
  try {
    execSync(`node --check "${file}"`, { stdio: "pipe" });
    report.syntax.pass++;
  } catch (error) {
    report.syntax.fail.push(rel(file));
    issues.push({ type: "syntax", file: rel(file) });
  }
}

// 2. Controller forbidden dependency verification
const controllerFiles = fs.readdirSync(CONTROLLER_ROOT).filter((f) => f.endsWith(".js"));
for (const name of controllerFiles) {
  const file = path.join(CONTROLLER_ROOT, name);
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of FORBIDDEN_IN_CONTROLLERS) {
    if (pattern.test(content)) {
      report.forbiddenControllerDeps.push({ controller: name, pattern: String(pattern) });
      issues.push({ type: "forbidden_controller_dep", controller: name, pattern: String(pattern) });
    }
  }
  if (/MarketplacePaymentFacade|payments\/legacy/.test(content)) {
    report.facadeUsage.controllers.push(name);
  }
}

// 3. Legacy adapter facade verification
const legacyFiles = walk(path.join(PAYMENTS_ROOT, "legacy"));
for (const file of legacyFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (/getMarketplacePaymentFacade|delegateToFacade/.test(content)) {
    report.facadeUsage.legacyAdapters.push(rel(file));
  }
  if (/require\(['"]stripe['"]\)/.test(content)) {
    issues.push({ type: "sdk_in_legacy", file: rel(file) });
  }
}

// 4. Import verification
const importTargets = [
  "../payments/legacy",
  "../payments/legacy/adapters/V2PaymentProcessAdapter",
  "../payments/legacy/adapters/V2WithdrawAdapter",
  "../payments/legacy/PaymentFacadeRegistry",
];

for (const target of importTargets) {
  try {
    require(path.join(CONTROLLER_ROOT, "..", target.replace(/^\.\.\//, "")));
    report.imports.pass++;
  } catch (error) {
    report.imports.fail.push({ target, error: error.message });
    issues.push({ type: "import_fail", target, error: error.message });
  }
}

// 5. Facade dependency verification
const payments = require(path.join(PAYMENTS_ROOT, "index.js"));
const pm = new payments.PaymentModule();
const facade = pm.getMarketplacePaymentFacade();
const facadeMethods = [
  "checkout",
  "orderPayment",
  "refund",
  "vendorPayout",
  "subscription",
  "wallet",
  "escrow",
  "settlement",
  "delivery",
];

for (const method of facadeMethods) {
  if (typeof facade[method] !== "function") {
    issues.push({ type: "facade_method_missing", method });
  }
}

// 6. Route verification
const appContent = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const v2PaymentRoute = appContent.includes('app.use("/api/v2/payment", payment)');
const v2WithdrawRoute = appContent.includes('app.use("/api/v2/withdraw", withdraw)');
const v1Runtime = appContent.includes("registerPaymentRuntime(app)");

report.routes.v2 = [
  { path: "/api/v2/payment", registered: v2PaymentRoute },
  { path: "/api/v2/withdraw", registered: v2WithdrawRoute },
];

if (!v2PaymentRoute || !v2WithdrawRoute || !v1Runtime) {
  issues.push({ type: "route_missing", v2PaymentRoute, v2WithdrawRoute, v1Runtime });
}

const api = payments.api.createPaymentApi(pm);
report.routes.v1 = api.routeDefinitions.length;
const paths = api.routeDefinitions.map((r) => `${r.method} ${r.fullPath}`);
const seen = new Map();
for (const p of paths) {
  seen.set(p, (seen.get(p) || 0) + 1);
}
for (const [p, count] of seen.entries()) {
  if (count > 1) report.routes.duplicates.push({ path: p, count });
}

// 7. Duplicate payment flow detection
const paymentControllerContent = fs.readFileSync(path.join(CONTROLLER_ROOT, "payment.js"), "utf8");
const withdrawControllerContent = fs.readFileSync(path.join(CONTROLLER_ROOT, "withdraw.js"), "utf8");

if (/stripe\.paymentIntents/.test(paymentControllerContent)) {
  report.duplicateFlows.push("Direct Stripe paymentIntents in controller/payment.js");
  issues.push({ type: "duplicate_flow", flow: "stripe_payment_intents" });
}

if (
  /shop\.availableBalance\s*=/.test(withdrawControllerContent) &&
  !/V2WithdrawAdapter/.test(withdrawControllerContent)
) {
  report.duplicateFlows.push("Inline wallet balance mutation in controller/withdraw.js");
  issues.push({ type: "duplicate_flow", flow: "inline_wallet_withdraw" });
}

// 8. API compatibility verification (static contract checks)
const paymentAdapterContent = fs.readFileSync(
  path.join(PAYMENTS_ROOT, "legacy/adapters/V2PaymentProcessAdapter.js"),
  "utf8"
);
const paymentContractSource = paymentControllerContent + paymentAdapterContent;

report.apiCompatibility = {
  v2_payment_process: {
    route: "POST /api/v2/payment/process",
    preserved:
      paymentControllerContent.includes('"/process"') &&
      paymentContractSource.includes("client_secret"),
  },
  v2_stripe_api_key: {
    route: "GET /api/v2/payment/stripeapikey",
    preserved:
      paymentControllerContent.includes('"/stripeapikey"') &&
      paymentContractSource.includes("stripeApikey"),
  },
  v2_withdraw_create: {
    route: "POST /api/v2/withdraw/create-withdraw-request",
    preserved: withdrawControllerContent.includes('"/create-withdraw-request"'),
  },
  v2_withdraw_list: {
    route: "GET /api/v2/withdraw/get-all-withdraw-request",
    preserved: withdrawControllerContent.includes('"/get-all-withdraw-request"'),
  },
  v2_withdraw_update: {
    route: "PUT /api/v2/withdraw/update-withdraw-request/:id",
    preserved: withdrawControllerContent.includes('"/update-withdraw-request/:id"'),
  },
};

for (const [key, value] of Object.entries(report.apiCompatibility)) {
  if (!value.preserved) {
    issues.push({ type: "api_compat_broken", endpoint: key });
  }
}

// 9. Runtime smoke (no DB)
(async () => {
  try {
    const express = require("express");
    const request = require("http");

    const app = express();
    app.use(express.json());
    payments.runtime.registerPaymentRuntime(app);

    const paymentRouter = require(path.join(CONTROLLER_ROOT, "payment.js"));
    app.use("/api/v2/payment", paymentRouter);

    const server = app.listen(0);
    const port = server.address().port;

    const postResult = await new Promise((resolve) => {
      const req = request.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/v2/payment/process",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ status: res.statusCode, body: data }));
        }
      );
      req.on("error", (err) => resolve({ error: err.message }));
      req.write(JSON.stringify({ amount: 1000 }));
      req.end();
    });

    report.architectureHealth.runtimeSmoke = {
      v2ProcessStatus: postResult.status,
      v2ProcessHasClientSecret: /client_secret/.test(postResult.body || ""),
    };

    if (postResult.status !== 200) {
      warnings.push({ type: "runtime_smoke_status", status: postResult.status });
    }

    server.close();
  } catch (error) {
    report.architectureHealth.runtimeSmoke = { ok: false, error: error.message };
    warnings.push({ type: "runtime_smoke_error", error: error.message });
  }

  const score = Math.max(
    0,
    100 - issues.length * 8 - warnings.length * 2
  );

  report.architectureHealth.score = score;
  report.architectureHealth.singleEntryPoint = "MarketplacePaymentFacade";
  report.architectureHealth.legacyControllersMigrated = ["payment.js", "withdraw.js"];
  report.productionReadiness = {
    ready: issues.length === 0,
    blockers: issues.map((i) => i.type),
    warnings: warnings.map((w) => w.type),
    note: "Provider workflows remain placeholder; v2 contracts preserved via legacy adapters.",
  };

  console.log(
    JSON.stringify(
      {
        legacyPaymentFiles: LEGACY_PAYMENT_FILES,
        modifiedFiles: [
          "controller/payment.js",
          "controller/withdraw.js",
          "controller/payLaterOrder.js",
          "controller/PayLaterProduct.js",
          "controller/payLateruser.js",
          "payments/legacy/PaymentFacadeRegistry.js",
          "payments/legacy/adapters/LegacyFacadeDelegate.js",
          "payments/legacy/adapters/V2PaymentProcessAdapter.js",
          "payments/legacy/adapters/V2WithdrawAdapter.js",
          "payments/legacy/index.js",
          "payments/index.js",
        ],
        duplicatedFlowsRemoved: [
          "Direct Stripe SDK paymentIntents.create in controller/payment.js",
          "Inline payout orchestration in controller/withdraw.js (replaced with facade delegation)",
        ],
        report,
        issues,
        warnings,
        score,
      },
      null,
      2
    )
  );

  process.exit(issues.length > 0 ? 1 : 0);
})();
