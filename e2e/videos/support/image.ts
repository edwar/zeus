import { deflateSync } from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type: string, data: Buffer) => { const t = Buffer.concat([Buffer.from(type), data]); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(t)); return Buffer.concat([len, t, c]); };

/** Una foto de demostración (PNG) con un techo y paneles dibujados: para subir una «foto de obra» en los videos sin usar fotos reales. */
export function demoPhoto(w = 640, h = 480): Buffer {
  const rows: Buffer[] = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3);
    for (let x = 0; x < w; x++) {
      let r = 135 + Math.round((y / h) * 60), g = 190 + Math.round((y / h) * 30), b = 235; // cielo
      if (y > h * 0.35) { r = 150; g = 82; b = 62; } // techo de teja
      const px = x - 120, py = y - h * 0.45;
      if (px >= 0 && px < 400 && py >= 0 && py < 210) {
        const cx = px % 100, cy = Math.round(py) % 105;
        const line = cx < 4 || cy < 4;
        r = line ? 200 : 18; g = line ? 205 : 42; b = line ? 215 : 92; // paneles
      }
      row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}
