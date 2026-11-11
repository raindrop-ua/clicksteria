import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Original effects: one binary oscillator, without sampled recordings or borrowed music.
// Sinclair's service manual §1.10 describes the 48K speaker's port 254 / data-bit-4 drive:
// https://spectrumforeveryone.com/wp-content/uploads/2017/08/ZX-Spectrum-Service-Manual.pdf
// Pitch is quantized to 3.5 MHz CPU ticks. Short gain ramps and DC removal only
// condition the rendered WAV for browser playback; this is not a cycle-accurate emulator.
const SAMPLE_RATE = 22_050;
const CLOCK_HZ = 3_500_000;
const DEFAULT_OUTPUT = fileURLToPath(new URL('../public/audio/', import.meta.url));
const BANKS = ['small', 'medium', 'large', 'single'];

function notesFor(bank, variation) {
  const pitch = [0.94, 1.025, 1.11][variation];
  const extra = variation * 0.0015;
  const note = (from, to, duration) => ({
    from: from * pitch,
    to: to * pitch,
    duration: duration + extra,
  });
  switch (bank) {
    case 'small':
      return [note(1580, 980, 0.048), note(1200, 740, 0.058)];
    case 'medium':
      return [note(700, 780, 0.044), note(1040, 1150, 0.044), note(1510, 980, 0.072)];
    case 'large':
      return [
        note(740, 800, 0.042),
        note(1100, 1190, 0.042),
        note(1570, 1710, 0.042),
        note(2180, 1330, 0.074),
      ];
    case 'single':
      return [note(620, 240, 0.064)];
    default:
      throw new Error(`Unknown sound bank: ${bank}`);
  }
}

export function renderSpectrumSample(bank, variation = 0) {
  const notes = notesFor(bank, variation);
  const gap = Math.round(0.0015 * SAMPLE_RATE);
  const lengths = notes.map((note) => Math.round(note.duration * SAMPLE_RATE));
  const length = lengths.reduce((sum, count) => sum + count, 0) + gap * (notes.length + 1);
  const values = new Float64Array(length);
  const envelope = new Float64Array(length);
  let offset = gap;
  let phase = 0;
  for (let index = 0; index < notes.length; index++) {
    const note = notes[index];
    const frames = lengths[index];
    for (let frame = 0; frame < frames; frame++) {
      const progress = frame / Math.max(1, frames - 1);
      const frequency = note.from * (note.to / note.from) ** progress;
      const halfPeriodTicks = Math.max(1, Math.round(CLOCK_HZ / (2 * frequency)));
      phase = (phase + CLOCK_HZ / (2 * halfPeriodTicks * SAMPLE_RATE)) % 1;
      const edge = Math.min(
        1,
        frame / (SAMPLE_RATE * 0.0015),
        (frames - 1 - frame) / (SAMPLE_RATE * 0.006),
      );
      const gain = Math.max(0, edge) * (1 - progress * 0.14);
      const position = offset + frame;
      envelope[position] = gain;
      values[position] = (phase < 0.5 ? -1 : 1) * gain;
    }
    offset += frames + gap;
  }

  const sum = values.reduce((total, value) => total + value, 0);
  const weight = envelope.reduce((total, value) => total + value, 0);
  let peak = 0;
  for (let index = 0; index < length; index++) {
    values[index] -= (sum / weight) * envelope[index];
    peak = Math.max(peak, Math.abs(values[index]));
  }
  const pcm = new Int16Array(length);
  const targetPeak = bank === 'single' ? 0.42 : 0.62;
  for (let index = 0; index < length; index++) {
    pcm[index] = Math.round((values[index] / peak) * targetPeak * 32_767);
  }
  // Remove the final integer-quantization residual without disturbing silent ends.
  let residual = pcm.reduce((total, value) => total + value, 0);
  const correction = residual > 0 ? -1 : 1;
  for (let index = 1; residual !== 0 && index < length - 1; index++) {
    if (pcm[index] === 0) continue;
    pcm[index] += correction;
    residual += correction;
  }
  if (residual !== 0) throw new Error('Could not remove PCM DC offset');

  const wav = Buffer.alloc(44 + length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(length * 2, 40);
  for (let index = 0; index < length; index++) wav.writeInt16LE(pcm[index], 44 + index * 2);
  return wav;
}

export function generateSpectrumSounds(outputDirectory = DEFAULT_OUTPUT, check = false) {
  if (!check) mkdirSync(outputDirectory, { recursive: true });
  let totalBytes = 0;
  for (const bank of BANKS) {
    for (let variation = 0; variation < (bank === 'single' ? 1 : 3); variation++) {
      const name =
        bank === 'single'
          ? 'spectrum-single-block.wav'
          : `spectrum-pop-${bank}-${variation + 1}.wav`;
      const path = resolve(outputDirectory, name);
      const wav = renderSpectrumSample(bank, variation);
      if (check) {
        if (!readFileSync(path).equals(wav)) throw new Error(`Regeneration mismatch: ${name}`);
      } else {
        writeFileSync(path, wav);
      }
      totalBytes += wav.length;
    }
  }
  return totalBytes;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const check = process.argv.includes('--check');
  const bytes = generateSpectrumSounds(DEFAULT_OUTPUT, check);
  console.log(
    `${check ? 'Verified' : 'Generated'} 10 original Spectrum beeper WAVs (${bytes} bytes).`,
  );
}
