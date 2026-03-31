// Email sending via Gmail API.
// Requires GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN env vars.
// If not configured, emails are logged to console only (registration still works).

import { google } from 'googleapis';

function getGmailClient() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function createEmailMessage(to: string, subject: string, body: string): string {
  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
  ];
  const email = emailLines.join('\r\n');
  return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendVerificationEmail(to: string, username: string, verificationLink: string) {
  const gmail = getGmailClient();
  if (!gmail) {
    console.log(`[EMAIL] Verification link for ${to}: ${verificationLink}`);
    return;
  }

  const htmlBody = `
    <!DOCTYPE html><html><body>
    <h1>Welcome to QuoteLearn, ${username}!</h1>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="${verificationLink}">Verify Email Address</a>
    <p>Or copy and paste: ${verificationLink}</p>
    <p>This link expires in 24 hours.</p>
    </body></html>
  `;

  const raw = createEmailMessage(to, 'Verify your QuoteLearn account', htmlBody);
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  console.log(`[EMAIL] Verification email sent to ${to}`);
}

export async function sendPasswordResetEmail(to: string, username: string, resetLink: string) {
  const gmail = getGmailClient();
  if (!gmail) {
    console.log(`[EMAIL] Password reset link for ${to}: ${resetLink}`);
    return;
  }

  const htmlBody = `
    <!DOCTYPE html><html><body>
    <h1>Password Reset Request</h1>
    <p>Hello ${username},</p>
    <p>Click below to reset your password (expires in 1 hour):</p>
    <a href="${resetLink}">Reset Password</a>
    <p>Or copy and paste: ${resetLink}</p>
    </body></html>
  `;

  const raw = createEmailMessage(to, 'Reset your QuoteLearn password', htmlBody);
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  console.log(`[EMAIL] Password reset email sent to ${to}`);
}

export async function sendPasswordResetConfirmationEmail(to: string, username: string) {
  const gmail = getGmailClient();
  if (!gmail) {
    console.log(`[EMAIL] Password changed confirmation for ${to}`);
    return;
  }

  const htmlBody = `
    <!DOCTYPE html><html><body>
    <h1>Password Successfully Changed</h1>
    <p>Hello ${username}, your QuoteLearn password was successfully changed.</p>
    <p>If you did not make this change, please contact support immediately.</p>
    </body></html>
  `;

  const raw = createEmailMessage(to, 'QuoteLearn password changed', htmlBody);
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  console.log(`[EMAIL] Password reset confirmation sent to ${to}`);
}
