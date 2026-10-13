import test from "node:test";
import assert from "node:assert/strict";
import { TOKEN_RE, hashShareToken, newShareToken, shareExpiry, shareMessage, shareState, whatsappShareUrl, SHARE_TTL_DAYS } from "../src/lib/quote-share";

const now = new Date("2026-10-12T12:00:00Z");
const later = new Date(now.getTime() + 3_600_000);
const before = new Date(now.getTime() - 1);

test("token: 43 caracteres base64url, distinto cada vez, y solo se guarda su hash", () => {
  const a = newShareToken();
  assert.match(a, TOKEN_RE);
  assert.notEqual(a, newShareToken());
  assert.match(hashShareToken(a), /^[0-9a-f]{64}$/);
  assert.equal(hashShareToken(a), hashShareToken(a));
  assert.notEqual(hashShareToken(a), a);
});

test("token: formatos inválidos no pasan el filtro", () => {
  for (const bad of ["", "abc", "a".repeat(42), "a".repeat(44), `${"a".repeat(42)}/`, `${"a".repeat(42)} `]) assert.doesNotMatch(bad, TOKEN_RE);
});

test("vigencia: vence a los días configurados", () => {
  assert.equal(shareExpiry(now).getTime() - now.getTime(), SHARE_TTL_DAYS * 86_400_000);
});

test("estado: solo se responde con el cálculo confirmado, enlace vigente y sin respuesta previa", () => {
  assert.equal(shareState({ status: "confirmed", shareExpiresAt: later, clientDecision: null }, now), "open");
  assert.equal(shareState({ status: "confirmed", shareExpiresAt: later, clientDecision: "accepted" }, now), "decided");
  assert.equal(shareState({ status: "confirmed", shareExpiresAt: before, clientDecision: null }, now), "expired");
  assert.equal(shareState({ status: "confirmed", shareExpiresAt: now, clientDecision: null }, now), "expired");
  assert.equal(shareState({ status: "confirmed", shareExpiresAt: null, clientDecision: null }, now), "expired");
});

test("estado: aprobada, descartada o reabierta cierran el enlace aunque siga vigente", () => {
  for (const status of ["new", "contacted", "approved", "discarded"]) {
    assert.equal(shareState({ status, shareExpiresAt: later, clientDecision: null }, now), "closed", status);
  }
});

test("whatsapp manual: wa.me sin '+' y mensaje codificado con el enlace", () => {
  const url = "https://zeus.cognilab.dev/es/q/abc";
  const msg = shareMessage({ name: "Ana", url, lang: "es" });
  assert.ok(msg.includes(url) && msg.includes("Ana"));
  const wa = whatsappShareUrl("+573001112233", msg);
  assert.ok(wa.startsWith("https://wa.me/573001112233?text="));
  assert.equal(decodeURIComponent(wa.split("?text=")[1]), msg);
  assert.match(shareMessage({ name: "Ana", url, lang: "en" }), /your Zeus quote/);
});
