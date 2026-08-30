import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/icons');
mkdirSync(OUT_DIR, { recursive: true });

const C = {
  tile: [27, 94, 32, 255],
  sun: [255, 179, 0, 255],
  ring: [255, 224, 130, 255],
  leafLight: [165, 214, 167, 255],
  leaf: [102, 187, 106, 255],
  stem: [76, 175, 80, 255],
  furrow1: [232, 245, 233, 255],
  furrow2: [161, 136, 127, 255],
  wire: [129, 212, 250, 255],
  node: [79, 195, 247, 255],
  nodeCore: [225, 245, 254, 255],
};

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([len, typeBytes, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, y * width * 4 + width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inRoundedRect(x, y, w, h, r) {
  const cx = Math.min(Math.max(x, r), w - r);
  const cy = Math.min(Math.max(y, r), h - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}
function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}
function inEllipse(x, y, cx, cy, rx, ry, rotDeg) {
  const cos = Math.cos((-rotDeg * Math.PI) / 180);
  const sin = Math.sin((-rotDeg * Math.PI) / 180);
  const dx = x - cx;
  const dy = y - cy;
  const ex = dx * cos - dy * sin;
  const ey = dx * sin + dy * cos;
  return (ex * ex) / (rx * rx) + (ey * ey) / (ry * ry) <= 1;
}
function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1)));
  const dx = px - (ax + abx * t);
  const dy = py - (ay + aby * t);
  return Math.sqrt(dx * dx + dy * dy);
}
function sampleQuadratic(ax, ay, bx, by, cx, cy, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([u * u * ax + 2 * u * t * bx + t * t * cx, u * u * ay + 2 * u * t * by + t * t * cy]);
  }
  return pts;
}
function distToPolyline(px, py, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const dd = distToSegment(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (dd < d) d = dd;
  }
  return d;
}

function drawIcon(size) {
  const S = size / 512;
  const px = Buffer.alloc(size * size * 4);

  const stem = sampleQuadratic(262, 408, 250, 340, 262, 264, 40);
  const fur1 = sampleQuadratic(96, 424, 256, 384, 416, 424, 32);
  const fur2 = sampleQuadratic(112, 452, 256, 414, 400, 452, 32);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const X = x / S;
      const Y = y / S;
      let color = [247, 245, 241, 0];

      if (inRoundedRect(X, Y, 512, 512, 96)) {
        color = C.tile;

        if (inCircle(X, Y, 150, 134, 44)) color = C.sun;
        if (Math.abs(Math.sqrt((X - 150) ** 2 + (Y - 134) ** 2) - 26) <= 3.5) color = C.ring;

        if (inEllipse(X, Y, 212, 236, 56, 32, 40)) color = C.leafLight;
        if (inEllipse(X, Y, 328, 232, 56, 34, -40)) color = C.leaf;

        if (distToPolyline(X, Y, stem) <= 8) color = C.stem;

        if (distToPolyline(X, Y, fur1) <= 4) color = C.furrow1;
        if (distToPolyline(X, Y, fur2) <= 4) color = C.furrow2;

        if (distToSegment(X, Y, 386, 200, 386, 152) <= 4.5) color = C.wire;
        if (inCircle(X, Y, 386, 128, 18)) color = C.node;
        if (inCircle(X, Y, 386, 128, 7)) color = C.nodeCore;
      }

      px.set(color, i);
    }
  }
  return px;
}

for (const size of [192, 512]) {
  const png = encodePNG(size, size, drawIcon(size));
  writeFileSync(resolve(OUT_DIR, `icon-${size}.png`), png);
  console.log(`generated icon-${size}.png`);
}
