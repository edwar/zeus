import test from "node:test";
import assert from "node:assert/strict";
import { safeHttpUrl } from "../src/lib/url";
import { manufacturerSchema, createProductSchema } from "../src/lib/products";

test("safeHttpUrl: solo http(s); resuelve relativas y descarta esquemas peligrosos", () => {
  assert.equal(safeHttpUrl("https://cdn.autosolar.co/pdf/a.pdf"), "https://cdn.autosolar.co/pdf/a.pdf");
  assert.equal(safeHttpUrl("http://example.com/x"), "http://example.com/x");
  assert.equal(safeHttpUrl("../../../pdf/Ficha%20x.pdf", "https://autosolar.co/cat/prod"), "https://autosolar.co/pdf/Ficha%20x.pdf");
  for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x", "file:///etc/passwd", "//", ""]) {
    assert.equal(safeHttpUrl(bad), null, `debe rechazar ${JSON.stringify(bad)}`);
  }
  assert.equal(safeHttpUrl(null), null);
});

test("los formularios rechazan javascript: en website, logoUrl y ficha técnica", () => {
  assert.equal(manufacturerSchema.safeParse({ name: "X", website: "javascript:alert(1)" }).success, false);
  assert.equal(manufacturerSchema.safeParse({ name: "X", logoUrl: "data:image/svg+xml;base64,AAA" }).success, false);
  assert.equal(manufacturerSchema.safeParse({ name: "X", website: "https://ok.example" }).success, true);
  const base = { name: "P", manufacturerId: "m", price: 10 };
  assert.equal(createProductSchema.safeParse({ ...base, datasheetUrl: "javascript:alert(1)" }).success, false);
  assert.equal(createProductSchema.safeParse({ ...base, datasheetUrl: "https://ok.example/f.pdf" }).success, true);
});
