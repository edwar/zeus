import { test } from "node:test";
import assert from "node:assert/strict";
import { mailConfigured, resetPasswordEmail } from "../src/lib/mail";

const base = { name: "Ana <script>", url: "https://zeus.cognilab.dev/api/auth/reset-password/abc?callbackURL=%2Fes%2Freset-password", minutes: 30 };

test("el correo de restablecimiento sale en el idioma pedido", () => {
  assert.match(resetPasswordEmail({ ...base, lang: "es" }).subject, /Restablece/);
  assert.match(resetPasswordEmail({ ...base, lang: "en" }).subject, /Reset your/);
});

test("el enlace va en el texto y en el HTML, con la vigencia", () => {
  const m = resetPasswordEmail({ ...base, lang: "es" });
  assert.ok(m.text.includes(base.url));
  assert.ok(m.html.includes(base.url.replace(/&/g, "&amp;")));
  assert.ok(m.text.includes("30 minutos"));
});

test("el nombre se escapa en el HTML", () => {
  const html = resetPasswordEmail({ ...base, lang: "es" }).html;
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("sin RESEND_API_KEY y MAIL_FROM el correo no está configurado", () => {
  const saved = { k: process.env.RESEND_API_KEY, f: process.env.MAIL_FROM };
  try {
    delete process.env.RESEND_API_KEY;
    process.env.MAIL_FROM = "Zeus <no-reply@example.com>";
    assert.equal(mailConfigured(), false);
    process.env.RESEND_API_KEY = "re_test";
    assert.equal(mailConfigured(), true);
  } finally {
    if (saved.k === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = saved.k;
    if (saved.f === undefined) delete process.env.MAIL_FROM; else process.env.MAIL_FROM = saved.f;
  }
});

test("aviso de respuesta del cliente: asunto, comentario escapado y enlace", async () => {
  const { quoteDecisionEmail } = await import("../src/lib/mail");
  const url = "https://zeus.cognilab.dev/es/app/quotes/abc";
  const yes = quoteDecisionEmail({ client: "Ana <b>", decision: "accepted", url });
  assert.match(yes.subject, /aceptó/);
  assert.ok(yes.text.includes(url) && yes.text.includes("Falta tu aprobación"));
  assert.ok(!yes.html.includes("<b>"), "el nombre se escapa");
  const no = quoteDecisionEmail({ client: "Ana", decision: "declined", note: "muy caro <script>", url });
  assert.match(no.subject, /no aceptó/);
  assert.ok(no.text.includes("muy caro") && !no.html.includes("<script>"));
});
