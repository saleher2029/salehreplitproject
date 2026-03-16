import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM = process.env.SMTP_FROM || "امتحانات توجيهي <noreply@tawjihi.com>";

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string,
): Promise<{ sent: boolean; devLink?: string }> {
  const transporter = createTransport();

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">امتحانات توجيهي</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">منصتك الأولى للاستعداد لامتحانات الثانوية العامة</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#111827;font-size:20px;margin:0 0 12px;">إعادة تعيين كلمة المرور</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 8px;">مرحباً <strong>${name}</strong>،</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك على منصة <strong>امتحانات توجيهي</strong>.
        إذا لم تطلب ذلك يمكنك تجاهل هذه الرسالة.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetLink}"
           style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:16px;letter-spacing:0.3px;">
          إعادة تعيين كلمة المرور
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;text-align:center;margin:0 0 8px;">
        ⏳ هذا الرابط صالح لمدة <strong>ساعة واحدة</strong> فقط.
      </p>
      <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">
        إذا لم يعمل الزر، انسخ الرابط التالي في متصفحك:<br/>
        <span style="color:#10b981;word-break:break-all;font-size:12px;">${resetLink}</span>
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        © 2024 امتحانات توجيهي — جميع الحقوق محفوظة
      </p>
    </div>
  </div>
</body>
</html>`;

  if (!transporter) {
    console.warn("[Email] SMTP not configured — returning reset link for dev.");
    return { sent: false, devLink: resetLink };
  }

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "إعادة تعيين كلمة المرور — امتحانات توجيهي",
    html,
  });

  return { sent: true };
}
