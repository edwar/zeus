import assert from "node:assert/strict";
import { test } from "node:test";
import { safeFileName, sniffDocument } from "../src/lib/documents";

const bytes = (...n: number[]) => new Uint8Array([...n, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

test("el tipo se decide por los bytes: PDF e imágenes sí, lo demás no", () => {
  assert.equal(sniffDocument(new TextEncoder().encode("%PDF-1.7\n..."))?.type, "application/pdf");
  assert.equal(sniffDocument(bytes(0xff, 0xd8, 0xff))?.type, "image/jpeg");
  assert.equal(sniffDocument(bytes(0x89, 0x50, 0x4e, 0x47))?.type, "image/png");
  assert.equal(sniffDocument(new TextEncoder().encode("<html><script>alert(1)</script>")), null);
  assert.equal(sniffDocument(new TextEncoder().encode("%PDF")), null); // sin versión no es un PDF completo
  assert.equal(sniffDocument(new Uint8Array()), null);
});

test("el nombre de descarga no puede traer rutas ni caracteres de cabecera", () => {
  assert.equal(safeFileName("../../etc/passwd", "doc"), "passwd");
  assert.equal(safeFileName('plano "final"\r\nX-Evil: 1.pdf', "doc"), "plano finalX-Evil 1.pdf");
  assert.equal(safeFileName("Planó eléctrico.pdf", "doc"), "Plano electrico.pdf");
  assert.equal(safeFileName("...", "doc"), "doc");
  assert.ok(safeFileName("a".repeat(300) + ".pdf", "doc").length <= 100);
});
