import { Howl } from 'howler';

/** Genera un "blip" WAV en memoria (sonido de prueba, sin archivos). */
function blipDataUri(freq: number, ms: number): string {
  const rate = 22050;
  const n = Math.floor((rate * ms) / 1000);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const env = 1 - i / n;
    v.setInt16(44 + i * 2, Math.sin((2 * Math.PI * freq * i) / rate) * env * 9000, true);
  }
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

export const sfx = {
  tap: new Howl({ src: [blipDataUri(660, 60)], format: ['wav'], volume: 0.4 }),
  zoom: new Howl({ src: [blipDataUri(880, 110)], format: ['wav'], volume: 0.4 }),
};
