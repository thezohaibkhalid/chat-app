import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendLoginOTPEmail({ to, name, code }) {
    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f2; padding: 40px 24px; color: #1f2937;">
      <table style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding: 32px 24px; text-align: center; background: linear-gradient(to right, #16a34a, #22c55e);">
            <h1 style="margin: 0; font-size: 28px; color: white;">BitBuilders Chat</h1>
            <p style="margin-top: 4px; color: #d1fae5; font-size: 14px;">Talk. Connect. Share.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 24px;">
            <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">Verify your login</h2>
            <p style="font-size: 16px; margin-bottom: 24px;">
              Hi ${name || "there"},<br/>
              Use the code below to finish signing in to <strong>BitBuilders Chat</strong> and start connecting with people who share your interests:
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; letter-spacing: 10px; font-weight: bold; color: #16a34a;">${code}</span>
            </div>
            <p style="font-size: 14px; color: #6b7280;">
              This code will expire in <strong>10 minutes</strong>. If you didn’t request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px; text-align: center; background-color: #f9fafb; font-size: 12px; color: #9ca3af;">
            &copy; ${new Date().getFullYear()} BitBuilders. All rights reserved.
          </td>
        </tr>
      </table>
    </div>
    `;
  
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: "Your BitBuilders verification code",
      html,
    });
  }
  