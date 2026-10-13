import test from "node:test";
import assert from "node:assert/strict";
import { NOTICE_STAGES, portalLinkEmail, projectStageEmail, quoteApprovedEmail, quoteLinkEmail } from "../src/lib/mail";
import { NOTICE_KINDS, deliver, isForward, isNoticeStage } from "../src/lib/notice-core";

const base = { name: "Ana <b>", ref: "ZEUS-ABCD1234" };
const msg = { subject: "s", html: "<p>h</p>", text: "t" };

test("enlace por correo: idioma, referencia, vigencia y enlace en texto y HTML; el nombre se escapa", () => {
  const url = "https://zeus.cognilab.dev/es/q/abc?x=1&y=2";
  const validUntil = new Date("2026-10-27T12:00:00Z");
  const es = quoteLinkEmail({ ...base, lang: "es", url, validUntil });
  assert.match(es.subject, /cotización de Zeus está lista/);
  assert.ok(es.text.includes(url) && es.text.includes("ZEUS-ABCD1234") && es.text.includes("27 de octubre de 2026"));
  assert.ok(es.html.includes("x=1&amp;y=2"), "el enlace se escapa en el HTML");
  assert.ok(!es.html.includes("<b>"), "el nombre se escapa");
  const en = quoteLinkEmail({ ...base, lang: "en", url, validUntil });
  assert.match(en.subject, /Your Zeus quote is ready/);
  assert.ok(en.text.includes("October 27, 2026") && en.text.includes("You are receiving this email"));
});

test("aprobación: con instalación habla de la visita técnica; solo kit, de la entrega", () => {
  assert.match(quoteApprovedEmail({ ...base, lang: "es", kitOnly: false }).text, /visita técnica/);
  assert.match(quoteApprovedEmail({ ...base, lang: "es", kitOnly: true }).text, /entrega del kit/);
  assert.doesNotMatch(quoteApprovedEmail({ ...base, lang: "es", kitOnly: true }).text, /visita técnica/);
  assert.match(quoteApprovedEmail({ ...base, lang: "en", kitOnly: false }).text, /technical visit/);
});

test("etapas: cada una tiene asunto y texto en los dos idiomas, sin dejar variables sin llenar", () => {
  for (const stage of NOTICE_STAGES) {
    for (const lang of ["es", "en"] as const) {
      const m = projectStageEmail({ ...base, lang, stage });
      assert.ok(m.subject.length > 10 && m.text.length > 50, `${stage}/${lang}`);
      assert.doesNotMatch(m.text + m.html, /undefined|\{\w+\}/);
    }
  }
  assert.match(projectStageEmail({ ...base, lang: "es", stage: "install" }).subject, /Instalación/);
  assert.match(projectStageEmail({ ...base, lang: "en", stage: "install" }).subject, /Installation/);
});

test("tipos de aviso: enlace, portal, aprobación y una por etapa; 'lead' no avisa", () => {
  assert.deepEqual([...NOTICE_KINDS].sort(), ["approved", "link", "portal", "stage_design", "stage_install", "stage_monitor", "stage_visit"].sort());
  assert.ok(!isNoticeStage("lead") && isNoticeStage("visit") && isNoticeStage("monitor"));
});

test("solo avisa al avanzar: retroceder, repetir o quedarse en la misma etapa no", () => {
  assert.ok(isForward("lead", "visit") && isForward("visit", "monitor") && isForward("lead", "design"));
  assert.ok(!isForward("install", "design") && !isForward("monitor", "lead"));
  assert.ok(!isForward("design", "design"));
});

test("deliver: sin configuración no envía; con ella devuelve sent o failed según Resend, sin lanzar nunca", async () => {
  const saved = { key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM, reply: process.env.MAIL_REPLY_TO, fetch: globalThis.fetch };
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const stub = (ok: boolean) => (async (url: string, init: { body: string }) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok, status: ok ? 200 : 500 }; }) as unknown as typeof fetch;
  try {
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
    globalThis.fetch = stub(true);
    assert.equal(await deliver("a@b.co", msg), "skipped");
    assert.equal(calls.length, 0, "sin configurar no se llama a Resend");

    process.env.RESEND_API_KEY = "k";
    process.env.MAIL_FROM = "Zeus <no-reply@cognilab.dev>";
    process.env.MAIL_REPLY_TO = "asesor@cognilab.dev";
    assert.equal(await deliver("a@b.co", msg), "sent");
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    assert.equal(calls[0].body.to, "a@b.co");
    assert.equal(calls[0].body.reply_to, "asesor@cognilab.dev");

    globalThis.fetch = stub(false);
    assert.equal(await deliver("a@b.co", msg), "failed");
    globalThis.fetch = (async () => { throw new Error("red caída"); }) as typeof fetch;
    assert.equal(await deliver("a@b.co", msg), "failed");
  } finally {
    for (const [k, v] of [["RESEND_API_KEY", saved.key], ["MAIL_FROM", saved.from], ["MAIL_REPLY_TO", saved.reply]] as const) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    globalThis.fetch = saved.fetch;
  }
});

test("portal en los correos: aprobación y etapas llevan el botón; solo kit no (no hay proyecto)", () => {
  const portalUrl = "https://zeus.cognilab.dev/es/p/q-1.abc?x=1&y=2";
  const ok = quoteApprovedEmail({ ...base, lang: "es", kitOnly: false, portalUrl });
  assert.ok(ok.text.includes(portalUrl) && ok.text.includes("Ver mi proyecto") && ok.text.includes("página privada"));
  assert.ok(ok.html.includes("x=1&amp;y=2"), "el enlace se escapa");
  const kit = quoteApprovedEmail({ ...base, lang: "es", kitOnly: true, portalUrl });
  assert.ok(!kit.text.includes(portalUrl) && !kit.html.includes("Ver mi proyecto"));
  assert.ok(!quoteApprovedEmail({ ...base, lang: "es", kitOnly: false }).text.includes("Ver mi proyecto"), "sin portal no hay botón");
  for (const stage of NOTICE_STAGES) {
    assert.ok(projectStageEmail({ ...base, lang: "en", stage, portalUrl }).text.includes("View my project"), stage);
    assert.ok(!projectStageEmail({ ...base, lang: "en", stage }).text.includes("View my project"), stage);
  }
});

test("correo del portal: idioma, enlace y aviso de no compartirlo", () => {
  const url = "https://zeus.cognilab.dev/en/p/q-1.abc";
  const es = portalLinkEmail({ ...base, lang: "es", url });
  assert.match(es.subject, /Sigue tu proyecto solar/);
  assert.ok(es.text.includes(url) && es.text.includes("no compartas el enlace") && es.html.includes(url));
  const en = portalLinkEmail({ ...base, lang: "en", url });
  assert.match(en.subject, /Follow your solar project/);
  assert.ok(!en.html.includes("<b>"), "el nombre se escapa");
});
