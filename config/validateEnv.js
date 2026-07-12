/**
 * Validates required environment variables at startup.
 * Delegates to platform EnvironmentValidator while keeping backward compatibility.
 */
const {
  EnvironmentLoader,
  EnvironmentValidator,
} = require("../platform/environment");

/** @deprecated Use platform EnvironmentSchema — kept for backward compatibility */
const REQUIRED_ENV_VARS = [
  { key: "PORT", description: "HTTP server port" },
  { key: "DB_URL", description: "MongoDB connection string" },
  { key: "JWT_SECRET_KEY", description: "Secret for signing and verifying JWT tokens" },
  { key: "JWT_EXPIRES", description: "JWT expiration duration (e.g. 7d)" },
  { key: "ACTIVATION_SECRET", description: "Secret for account activation tokens" },
  { key: "GOOGLE_CLIENT_ID", description: "Google OAuth client ID" },
  { key: "GOOGLE_CLIENT_SECRET", description: "Google OAuth client secret" },
  { key: "BACKEND_URL", description: "Public backend URL for OAuth callbacks" },
  { key: "FRONTEND_URL", description: "Frontend URL for redirects and share links" },
  { key: "CLOUDINARY_NAME", description: "Cloudinary cloud name" },
  { key: "CLOUDINARY_API_KEY", description: "Cloudinary API key" },
  { key: "CLOUDINARY_API_SECRET", description: "Cloudinary API secret" },
  { key: "STRIPE_SECRET_KEY", description: "Stripe secret key (loaded at payment module init)" },
  { key: "STRIPE_API_KEY", description: "Stripe publishable key returned to clients" },
];

function validateEnvLegacy() {
  const missing = REQUIRED_ENV_VARS.filter(({ key }) => {
    const value = process.env[key];
    return value === undefined || String(value).trim() === "";
  });

  if (missing.length === 0) {
    return { valid: true, missing: [], profile: process.env.NODE_ENV || "development" };
  }

  console.error("Startup failed: missing required environment variables.\n");
  missing.forEach(({ key, description }) => {
    console.error(`  - ${key}: ${description}`);
  });
  console.error(
    "\nCopy .env.example to `.env` or `config/.env` and set all required values."
  );
  console.error("On Render, add these variables in the service Environment tab.\n");
  process.exit(1);
}

function validateEnv() {
  const profile = process.env.NODE_ENV || "development";
  const loader = new EnvironmentLoader({ ...process.env });
  const validator = new EnvironmentValidator();
  const result = validator.validate(loader, profile);

  const resolved = loader.load();
  for (const [key, value] of Object.entries(resolved)) {
    if (process.env[key] === undefined || String(process.env[key]).trim() === "") {
      process.env[key] = value;
    }
  }

  if (!result.valid) {
    console.error("Startup failed: missing required environment variables.\n");
    result.missing.forEach(({ key, description }) => {
      console.error(`  - ${key}: ${description}`);
    });
    console.error(
      "\nCopy .env.example to `.env` or `config/.env` and set all required values."
    );
    console.error("On Render, add these variables in the service Environment tab.\n");
    process.exit(1);
  }

  if (profile === "development") {
    return result;
  }

  return result;
}

validateEnv.REQUIRED_ENV_VARS = REQUIRED_ENV_VARS;
validateEnv.legacy = validateEnvLegacy;

module.exports = validateEnv;
