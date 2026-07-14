const nodemailer = require("nodemailer");
const isSmtpConfigured = require("./isSmtpConfigured");

const sendMail = async (options) => {
  if (!isSmtpConfigured()) {
    console.warn(
      "[sendMail] SMTP not configured — skipping email to",
      options?.email || "(unknown)"
    );
    return { skipped: true, reason: "SMTP not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMPT_HOST,
    port: Number(process.env.SMPT_PORT || 587),
    secure: Number(process.env.SMPT_PORT) === 465,
    auth: {
      user: process.env.SMPT_MAIL,
      pass: process.env.SMPT_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.SMPT_MAIL,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
  return { skipped: false, sent: true };
};

module.exports = sendMail;
