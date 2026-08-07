const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildWelcomeEmail } = require("../email/welcomeEmail");

describe("welcomeEmail", () => {
  it("builds branded welcome email with Start Shopping CTA", () => {
    process.env.FRONTEND_URL = "https://yebone.example.com";
    const email = buildWelcomeEmail({ userName: "Jane" });

    assert.equal(email.subject, "Welcome to YEBONE");
    assert.match(email.html, /Welcome to YEBONE/);
    assert.match(email.html, /Hi Jane/);
    assert.match(email.html, /Start Shopping/);
    assert.match(email.html, /logo512\.png/);
    assert.match(email.text, /Start shopping/i);
  });
});
