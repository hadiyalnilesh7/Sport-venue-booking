const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = env.smtpHost
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: env.smtpUser
        ? {
            user: env.smtpUser,
            pass: env.smtpPass
          }
        : undefined
    })
  : nodemailer.createTransport({ jsonTransport: true });

const sendMail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: `${env.smtpFromName} <${env.smtpFromEmail}>`,
    to,
    subject,
    html
  });
};

module.exports = { sendMail };