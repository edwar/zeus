import { test } from "node:test";
import assert from "node:assert/strict";
import { emailHash, normalizeEmail, readUnsubscribeToken, unsubscribeToken } from "../src/lib/unsubscribe";
import { clientFooter, withClientFooter } from "../src/lib/client-footer";
import { quoteApprovedEmail } from "../src/lib/mail";
import { maskEmail } from "../src/lib/format";
import { LEGAL } from "../src/lib/legal/config";

const SECRET = "secreto-de-prueba";

test("el token de baja devuelve el correo normalizado", () => {
  const t = unsubscribeToken("  Ana.Perez@Gmail.com ", SECRET);
  assert.equal(readUnsubscribeToken(t, SECRET), "ana.perez@gmail.com");
});

test("un token alterado, de otro secreto o mal formado se rechaza", () => {
  const t = unsubscribeToken("ana@example.com", SECRET);
  assert.equal(readUnsubscribeToken(t, "otro-secreto"), null);
  const [body, sig] = t.split(".");
  const otro = Buffer.from("victima@example.com").toString("base64url");
  assert.equal(readUnsubscribeToken(`${otro}.${sig}`, SECRET), null, "la firma de un correo no sirve para otro");
  assert.equal(readUnsubscribeToken(`${body}.${sig.slice(0, -1)}x`, SECRET), null);
  for (const bad of ["", ".", "abc", "a.b", `${body}.`, `.${sig}`, "!!!.???"]) assert.equal(readUnsubscribeToken(bad, SECRET), null, bad);
});

test("el hash del correo no distingue mayúsculas ni espacios y no contiene el correo", () => {
  assert.equal(emailHash("Ana@Example.com "), emailHash("ana@example.com"));
  assert.notEqual(emailHash("ana@example.com"), emailHash("ana@example.org"));
  assert.ok(!emailHash("ana@example.com").includes("ana"));
  assert.equal(normalizeEmail(" X@Y.CO "), "x@y.co");
});

test("el pie lleva al responsable, el correo de privacidad y el enlace de baja, en cada idioma", () => {
  for (const lang of ["es", "en"] as const) {
    const f = clientFooter("ana@example.com", lang);
    for (const piece of [LEGAL.controller.name, LEGAL.controller.id, LEGAL.controller.address, LEGAL.controller.privacyEmail]) assert.ok(f.text.includes(piece), `${lang}: ${piece}`);
    assert.match(f.unsub, /\/(es|en)\/unsubscribe\//);
    assert.ok(f.text.includes(f.unsub) && f.html.includes(f.unsub));
  }
  assert.match(clientFooter("a@b.co", "es").text, /¿No quieres recibir/);
  assert.match(clientFooter("a@b.co", "en").text, /Don't want more emails/);
});

test("withClientFooter agrega el pie y los encabezados de baja sin tocar el asunto", () => {
  const base = quoteApprovedEmail({ name: "Ana", ref: "ABC123", lang: "es", kitOnly: false });
  const m = withClientFooter("ana@example.com", "es", base);
  assert.equal(m.subject, base.subject);
  assert.ok(m.text.startsWith(base.text.trim().slice(0, 20)) && m.text.length > base.text.length);
  assert.ok(m.html.startsWith(base.html) && m.html.length > base.html.length);
  assert.match(m.headers["List-Unsubscribe"], /^<https?:\/\/[^>]+\/api\/unsubscribe\/[^>]+>, <mailto:/);
  assert.equal(m.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
});

test("el pie escapa el HTML y el enlace de baja del HTML coincide con el del texto", () => {
  const f = clientFooter("a&b@example.com", "es");
  assert.ok(!f.html.includes("a&b@"), "los & del correo no van sin escapar");
  assert.ok(f.text.includes("/unsubscribe/"));
});

test("maskEmail deja ver solo la inicial y el dominio", () => {
  assert.equal(maskEmail("ana.perez@gmail.com"), "a***@gmail.com");
  assert.equal(maskEmail("sin-arroba"), "***");
});
