import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

console.log('Testing SMTP configuration:');
console.log('Host:', smtpHost);
console.log('Port:', smtpPort);
console.log('User:', smtpUser);
console.log('Password length:', smtpPass ? smtpPass.length : 0);

if (!smtpUser || !smtpPass) {
  console.error('❌ Error: SMTP_USER or SMTP_PASS is missing in .env');
  process.exit(1);
}

try {
  const isGmail = smtpHost.includes('gmail');
  console.log(`✉️ Initializing transporter using: ${isGmail ? 'Gmail Service' : smtpHost}...`);

  const transportConfig = isGmail
    ? {
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      }
    : {
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      };

  const transporter = nodemailer.createTransport(transportConfig);

  console.log('Verifying transporter connection...');
  await transporter.verify();
  console.log('✅ SMTP Connection verified successfully!');
  
  console.log('Sending test email to', smtpUser, '...');
  const info = await transporter.sendMail({
    from: `"SilentSOS Test" <${smtpUser}>`,
    to: smtpUser,
    subject: '🚨 SilentSOS Gmail SMTP Test 🚨',
    text: 'If you receive this email, your SilentSOS Gmail SMTP transporter is working 100% correctly!',
    html: '<div style="font-family: Arial; padding: 20px; background: #0f172a; color: #fff; border-radius: 12px;"><h2>🚨 SilentSOS Gmail SMTP Verified 🚨</h2><p>Your Gmail App Password &amp; SMTP transporter are configured and working 100%!</p></div>'
  });
  console.log('✅ Email sent successfully! MessageID:', info.messageId);
} catch (err) {
  console.error('❌ SMTP verification/sending failed:', err.message);
  if (err.message.includes('ETIMEDOUT')) {
    console.log('\n💡 Notice: Port 465/587 is firewalled on your current Wi-Fi/network. Please switch your PC connection to Mobile Hotspot or standard Home Wi-Fi.');
  }
}
