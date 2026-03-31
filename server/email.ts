import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

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
  try {
    const gmail = await getUncachableGmailClient();
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; }
          .content { background: white; padding: 40px; border-radius: 8px; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo-text { font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          h1 { color: #1a202c; margin-bottom: 20px; font-size: 24px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #718096; font-size: 14px; }
          .warning { background: #fff5f5; border-left: 4px solid #fc8181; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div class="logo">
              <div class="logo-text">QuoteLearn</div>
            </div>
            
            <h1>Welcome to QuoteLearn, ${username}! 🎉</h1>
            
            <p>Thank you for joining QuoteLearn, where you can discover, learn, and master inspiring quotes from great minds across history.</p>
            
            <p>To get started, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>
            
            <p style="color: #718096; font-size: 14px; margin-top: 20px;">
              Or copy and paste this link into your browser:<br>
              <a href="${verificationLink}" style="color: #667eea; word-break: break-all;">${verificationLink}</a>
            </p>
            
            <div class="warning">
              <strong>⏱️ This link expires in 24 hours.</strong><br>
              If you didn't create an account with QuoteLearn, you can safely ignore this email.
            </div>
            
            <div class="footer">
              <p>QuoteLearn - Learn. Memorize. Inspire.</p>
              <p style="font-size: 12px; margin-top: 10px;">
                This is an automated email. Please do not reply to this message.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const raw = createEmailMessage(to, 'Verify your QuoteLearn account', htmlBody);
    
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: raw,
      },
    });
    
    console.log(`[EMAIL] Verification email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendPasswordResetEmail(to: string, username: string, resetLink: string) {
  try {
    const gmail = await getUncachableGmailClient();
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; }
          .content { background: white; padding: 40px; border-radius: 8px; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo-text { font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          h1 { color: #1a202c; margin-bottom: 20px; font-size: 24px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #718096; font-size: 14px; }
          .warning { background: #fff5f5; border-left: 4px solid #fc8181; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .info { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div class="logo">
              <div class="logo-text">QuoteLearn</div>
            </div>
            
            <h1>Password Reset Request 🔒</h1>
            
            <p>Hello ${username},</p>
            
            <p>We received a request to reset your password for your QuoteLearn account. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            
            <p style="color: #718096; font-size: 14px; margin-top: 20px;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
            </p>
            
            <div class="warning">
              <strong>⏱️ This link expires in 1 hour.</strong><br>
              For security reasons, this password reset link can only be used once.
            </div>
            
            <div class="info">
              <strong>🔐 Security Tip:</strong><br>
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </div>
            
            <div class="footer">
              <p>QuoteLearn - Learn. Memorize. Inspire.</p>
              <p style="font-size: 12px; margin-top: 10px;">
                This is an automated email. Please do not reply to this message.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const raw = createEmailMessage(to, 'Reset your QuoteLearn password', htmlBody);
    
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: raw,
      },
    });
    
    console.log(`[EMAIL] Password reset email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

export async function sendPasswordResetConfirmationEmail(to: string, username: string) {
  try {
    const gmail = await getUncachableGmailClient();
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; }
          .content { background: white; padding: 40px; border-radius: 8px; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo-text { font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          h1 { color: #1a202c; margin-bottom: 20px; font-size: 24px; }
          .success { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; margin-top: 30px; color: #718096; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div class="logo">
              <div class="logo-text">QuoteLearn</div>
            </div>
            
            <h1>Password Successfully Changed ✅</h1>
            
            <p>Hello ${username},</p>
            
            <p>This email confirms that your QuoteLearn account password was successfully changed.</p>
            
            <div class="success">
              <strong>✓ Your account is secure</strong><br>
              You can now log in with your new password.
            </div>
            
            <p>If you did not make this change, please contact support immediately.</p>
            
            <div class="footer">
              <p>QuoteLearn - Learn. Memorize. Inspire.</p>
              <p style="font-size: 12px; margin-top: 10px;">
                This is an automated email. Please do not reply to this message.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const raw = createEmailMessage(to, 'QuoteLearn password changed', htmlBody);
    
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: raw,
      },
    });
    
    console.log(`[EMAIL] Password reset confirmation email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset confirmation email:', error);
    throw new Error('Failed to send confirmation email');
  }
}
