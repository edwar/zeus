import { test } from "node:test";
import assert from "node:assert/strict";
import { money, num } from "../src/lib/format";

// Con el idioma «es», Intl no agrupa los números de 4 cifras ("4000" pero "98.500"). En una lista de precios parece un
// error: money() y num() fuerzan la agrupación.
const clean = (s: string) => s.replace(/ /g, " ");

test("los precios llevan separador de miles desde 4 cifras", () => {
  assert.equal(clean(money("es", 4000)), "$ 4.000");
  assert.equal(clean(money("es", 2100)), "$ 2.100");
  assert.equal(clean(money("es", 98500)), "$ 98.500");
  assert.equal(clean(money("es", 4036800)), "$ 4.036.800");
});

test("los precios de 3 cifras o menos no cambian", () => {
  assert.equal(clean(money("es", 950)), "$ 950");
  assert.equal(clean(money("es", 0)), "$ 0");
});

test("en español el peso va con el símbolo «$»; en inglés, con el código para no confundirlo con dólares", () => {
  assert.match(clean(money("es", 98500)), /^\$ /);
  assert.equal(clean(money("en", 98500)), "COP 98,500");
});

test("la tarifa admite decimales sin forzar ceros", () => {
  assert.equal(clean(money("es", 912.5, "COP", 2)), "$ 912,5");
  assert.equal(clean(money("es", 1250, "COP", 2)), "$ 1.250");
});

test("en inglés se mantiene la coma", () => {
  assert.equal(clean(money("en", 4000)), "COP 4,000");
  assert.equal(num("en", 1297), "1,297");
});

test("los conteos también se agrupan: 1.297 productos", () => {
  assert.equal(num("es", 1297), "1.297");
  assert.equal(num("es", 999), "999");
  assert.equal(num("es", 4.5, { maximumFractionDigits: 1 }), "4,5");
  assert.equal(num("es", 1250.25, { maximumFractionDigits: 2 }), "1.250,25");
});
