import "server-only";

/** Wrap raw PCM (s16le mono) as a WAV buffer for browser playback / storage. */
export function pcmToWav(
  pcm: Buffer,
  options: { sampleRate?: number; channels?: number; bitDepth?: number } = {},
): Buffer {
  const sampleRate = options.sampleRate ?? 24_000;
  const channels = options.channels ?? 1;
  const bitDepth = options.bitDepth ?? 16;
  const blockAlign = (channels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // audio format PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

export function estimatePcmDurationMs(
  byteLength: number,
  sampleRate = 24_000,
  channels = 1,
  bitDepth = 16,
): number {
  const bytesPerSecond = sampleRate * channels * (bitDepth / 8);
  if (bytesPerSecond <= 0 || byteLength <= 0) return 0;
  return Math.max(250, Math.round((byteLength / bytesPerSecond) * 1000));
}
