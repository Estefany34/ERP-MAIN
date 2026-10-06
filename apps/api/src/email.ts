import { Resend } from 'resend';

export interface WelcomeEmailInput {
  email: string;
  name: string;
  companyName: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character] ?? character));
}

export async function sendWelcomeEmail(input: WelcomeEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY is not configured; welcome email skipped.');
    return { sent: false as const, reason: 'not_configured' as const };
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'Fanix Global <onboarding@resend.dev>';
  const appUrl = process.env.WEB_APP_URL ?? 'https://erp-fanixglobal.pages.dev';
  const resend = new Resend(apiKey);
  const name = escapeHtml(input.name);
  const companyName = escapeHtml(input.companyName);
  const safeAppUrl = escapeHtml(appUrl);

  const { data, error } = await resend.emails.send({
    from,
    to: [input.email],
    subject: 'Bienvenido a Fanix Global',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#0f172a">
        <h1 style="margin-bottom:8px">Bienvenido a Fanix Global</h1>
        <p>Hola, ${name}.</p>
        <p>Tu cuenta y la empresa <strong>${companyName}</strong> se registraron correctamente.</p>
        <p>Ya puedes comenzar a utilizar los módulos incluidos en tu plan.</p>
        <p style="margin:32px 0">
          <a href="${safeAppUrl}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">Ingresar a Fanix Global</a>
        </p>
        <p style="color:#64748b;font-size:13px">Este es un correo automático de Fanix Global.</p>
      </div>
    `,
    text: `Bienvenido a Fanix Global, ${input.name}. Tu cuenta y la empresa ${input.companyName} se registraron correctamente. Ingresa en ${appUrl}`
  });

  if (error) throw new Error(`Resend welcome email failed: ${error.message}`);
  return { sent: true as const, id: data?.id };
}
