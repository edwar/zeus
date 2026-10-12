/**
 * Envío de correo transaccional (hoy solo el enlace para restablecer la contraseña) con la API de Resend.
 * Sin dependencias: un `fetch`. Si faltan RESEND_API_KEY o MAIL_FROM, `mailConfigured()` es false y no se envía nada.
 */
export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendMail(msg: { to: string; subject: string; html: string; text: string }) {
  if (!mailConfigured()) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, ...msg }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
  return true;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Correo de restablecimiento en el idioma de la página desde la que se pidió (es por defecto). */
export function resetPasswordEmail(opts: { name: string; url: string; lang: "es" | "en"; minutes: number }) {
  const es = opts.lang === "es";
  const subject = es ? "Restablece tu contraseña de Zeus" : "Reset your Zeus password";
  const intro = es ? `Hola ${opts.name}, pediste restablecer tu contraseña.` : `Hi ${opts.name}, you asked to reset your password.`;
  const action = es ? "Crear una contraseña nueva" : "Choose a new password";
  const note = es
    ? `El enlace vale ${opts.minutes} minutos y solo sirve una vez. Si no lo pediste, ignora este correo: tu contraseña no cambia.`
    : `The link is valid for ${opts.minutes} minutes and works once. If you didn't ask for it, ignore this email: your password stays the same.`;
  const text = `${intro}\n\n${action}: ${opts.url}\n\n${note}\n`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:auto;padding:24px;color:#0b1f18">
<p style="font-size:16px">${esc(intro)}</p>
<p><a href="${esc(opts.url)}" style="display:inline-block;background:#ffc21a;color:#0b1f18;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;border:2px solid #0b1f18">${esc(action)}</a></p>
<p style="font-size:14px;color:#3d544b">${esc(note)}</p></div>`;
  return { subject, text, html };
}
