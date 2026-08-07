/**
 * Sprint 4 Phase 6 — API auth journey verification (API-only).
 * Run: node scripts/auth-certification-journey.js
 */
require("dotenv").config();

const API = process.env.CERT_API_BASE || "http://127.0.0.1:5000/api/v2";
const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function main() {
  const email = `cert-journey-${Date.now()}@yebone.test`;
  const password = "Cert1!pass";
  const avatar =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  const reg = await api("/user/create-user", {
    method: "POST",
    body: JSON.stringify({ name: "Cert User", email, password, avatar }),
  });
  record("Guest register", reg.status === 201 && reg.body.success, `status=${reg.status}`);

  const login = await api("/user/login-user", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const token = login.body?.token;
  record(
    "Guest login",
    [200, 201].includes(login.status) && !!token,
    `status=${login.status}`
  );

  const me = await api("/user/getuser", {
    headers: { Authorization: `Bearer ${token}` },
  });
  record("JWT accepted", me.status === 200 && me.body?.user?.email === email);

  const logout = await api("/user/logout", { method: "GET" });
  record("Logout", logout.status === 200 && logout.body?.success);

  const forgot = await api("/user/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  record(
    "Forgot password generic response",
    forgot.status === 200 && /If an account exists/i.test(forgot.body?.message || "")
  );

  const wrongOtp = await api("/user/verify-reset-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp: "000000" }),
  });
  record("Wrong OTP rejected", wrongOtp.status === 400);

  const weakReset = await api("/user/reset-password", {
    method: "POST",
    body: JSON.stringify({ resetSessionToken: "invalid", newPassword: "weak" }),
  });
  record("Weak password rejected on reset", [400, 401].includes(weakReset.status));

  const relogin = await api("/user/login-user", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const token2 = relogin.body?.token;
  record("Re-login after logout", [200, 201].includes(relogin.status) && !!token2);

  const failed = results.filter((r) => !r.pass);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
