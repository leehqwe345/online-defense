import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
for (const file of ['assets/champions-v3.png', 'assets/effects-v3.png']) {
  const bytes = readFileSync(file), width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (bytes[24] !== 8 || bytes[25] !== 6) throw Error('Expected RGBA PNG');
  const chunks = [];
  for (let i = 8; i < bytes.length;) {
    const length = bytes.readUInt32BE(i), type = bytes.toString('ascii', i + 4, i + 8);
    if (type === 'IDAT') chunks.push(bytes.subarray(i + 8, i + 8 + length));
    i += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const data = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  let transparent = 0, partial = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, a = x >= 4 ? data[i - 4] : 0, b = y ? data[i - stride] : 0, c = x >= 4 && y ? data[i - stride - 4] : 0;
      data[i] = (raw[y * (stride + 1) + x + 1] + [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter]) & 255;
      if (x % 4 === 3) { if (!data[i]) transparent++; else if (data[i] < 255) partial++; }
    }
  }
  console.log({ file, width, height, transparent, partial, corner: [...data.subarray(0, 4)] });
}
