import {splitCharacterPixels} from './art.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
for (const file of [...Array.from({length:15},(_,i)=>`assets/champion-${i}-walk-v1.png`),...Array.from({length:5},(_,i)=>`assets/champion-${15+i}-motion-v1.png`)]) {
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
  const expected=file.includes("motion")?16:8;const frames=splitCharacterPixels({data,width,height},expected);assert.equal(frames.length,expected);const counts=frames.map(f=>{let n=0;for(let i=3;i<f.data.length;i+=4)if(f.data[i]>=32)n++;return n;});assert.ok(Math.min(...counts)>=Math.max(...counts)*.2, file+': each frame must contain a full character, not a detached effect');let original=0,result=0;for(let i=3;i<data.length;i+=4)if(data[i]>=32)original++;for(const f of frames){assert.equal(f.width,frames[0].width);assert.equal(f.height,frames[0].height);for(let i=3;i<f.data.length;i+=4)if(f.data[i]>=32)result++;for(let x=0;x<f.width;x++){assert.equal(f.data[x*4+3],0);assert.equal(f.data[((f.height-1)*f.width+x)*4+3],0);}for(let y=0;y<f.height;y++){assert.equal(f.data[y*f.width*4+3],0);assert.equal(f.data[(y*f.width+f.width-1)*4+3],0);}}assert.equal(result,original,'Every opaque weapon/body pixel survives extraction');console.log(file,'8 frames, no lost opaque pixels, padded edges',frames[0].width,frames[0].height);
}
