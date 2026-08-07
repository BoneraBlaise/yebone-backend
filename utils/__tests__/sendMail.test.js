const { describe, it, mock } = require("node:test");
const assert = require("node:assert/strict");

describe("sendMail error handling", () => {
  it("returns sent:false when transporter throws", async () => {
    const nodemailer = require("nodemailer");
    const originalCreate = nodemailer.createTransport;

    nodemailer.createTransport = mock.fn(() => ({
      sendMail: mock.fn(async () => {
        throw new Error("SMTP connection refused");
      }),
    }));

    process.env.SMPT_HOST = "smtp.gmail.com";
    process.env.SMPT_MAIL = "yeboneapp@gmail.com";
    process.env.SMPT_PASSWORD = "app-password-test";
    process.env.SMPT_SERVICE = "gmail";

    delete require.cache[require.resolve("../isSmtpConfigured")];
    delete require.cache[require.resolve("../sendMail")];
    const sendMail = require("../sendMail");

    const result = await sendMail({
      email: "user@example.com",
      subject: "Test",
      message: "Hello",
    });

    assert.equal(result.sent, false);
    assert.match(result.error, /SMTP connection refused/);

    nodemailer.createTransport = originalCreate;
    delete require.cache[require.resolve("../sendMail")];
  });
});
