/* Generates the app icons as real PNGs with zero dependencies.
   Run: node tools/make-icons.js
   Output: assets/icons/icon-192.png, icon-512.png, icon-maskable-512.png, icon.svg */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets', 'icons');
const ACCENT = [0x2f, 0x5d, 0x50];
const INK = [0xff, 0xff, 0xff];

/* ---------------------------------------------------------------- png */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type RGBA
  ihdr[10] = 0;  // deflate
  ihdr[11] = 0;  // adaptive filtering
  ihdr[12] = 0;  // no interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------------------------------------------------------------- draw */

function canvas(size) {
  const px = Buffer.alloc(size * size * 4);
  return {
    size,
    px,
    set(x, y, rgb, alpha) {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      const i = (y * size + x) * 4;
      const a = alpha == null ? 1 : alpha;
      if (a >= 1) {
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255;
      } else if (a > 0) {
        const ea = px[i + 3] / 255;
        const na = a + ea * (1 - a);
        px[i] = Math.round((rgb[0] * a + px[i] * ea * (1 - a)) / na);
        px[i + 1] = Math.round((rgb[1] * a + px[i + 1] * ea * (1 - a)) / na);
        px[i + 2] = Math.round((rgb[2] * a + px[i + 2] * ea * (1 - a)) / na);
        px[i + 3] = Math.round(na * 255);
      }
    }
  };
}

function roundRect(c, x0, y0, w, h, r, rgb, alpha) {
  const x1 = x0 + w, y1 = y0 + h;
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      const cx = Math.min(Math.max(x + 0.5, x0 + r), x1 - r);
      const cy = Math.min(Math.max(y + 0.5, y0 + r), y1 - r);
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      // antialiased edge
      const cov = Math.min(1, Math.max(0, r - d + 0.5));
      if (cov > 0) c.set(x, y, rgb, cov * (alpha == null ? 1 : alpha));
    }
  }
}

function buildIcon(size, maskable) {
  const c = canvas(size);
  const pad = maskable ? size * 0.16 : 0;   // keep art inside the safe zone
  const scale = maskable ? 0.68 : 1;

  // background: full bleed (OS applies its own mask)
  roundRect(c, 0, 0, size, size, maskable ? 0 : size * 0.22, ACCENT, 1);

  // mark: three stacked bars, decreasing width, centred
  const content = size * scale;
  const cx = size / 2;
  const left = (size - content) / 2;
  const barH = content * 0.115;
  const gap = content * 0.088;
  const radius = barH / 2;

  const widths = [content * 0.86, content * 0.62, content * 0.40];
  let y = (size - (barH * 3 + gap * 2)) / 2;

  widths.forEach((w) => {
    roundRect(c, left + (content - w) / 2, y, w, barH, radius, INK, 1);
    y += barH + gap;
  });

  return c.px;
}

/* ---------------------------------------------------------------- svg */

function svgIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Second Brain OS">
  <rect width="512" height="512" rx="112" fill="#2f5d50"/>
  <g fill="#ffffff">
    <rect x="61" y="168" width="390" height="52" rx="26"/>
    <rect x="106" y="248" width="300" height="52" rx="26"/>
    <rect x="151" y="328" width="210" height="52" rx="26"/>
  </g>
</svg>
`;
}

/* ---------------------------------------------------------------- main */

fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true]
];

jobs.forEach(([name, size, maskable]) => {
  const px = buildIcon(size, maskable);
  fs.writeFileSync(path.join(OUT, name), encodePNG(size, size, px));
  console.log('wrote', name);
});

fs.writeFileSync(path.join(OUT, 'icon.svg'), svgIcon());
console.log('wrote icon.svg');
