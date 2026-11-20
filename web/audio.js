// Âm thanh tổng hợp bằng WebAudio (không dùng file asset ngoài): nhạc nền đêm + hiệu ứng. Chỉ chạy ở trình duyệt.
export class GameAudio {
  constructor() { this.ctx = null; this.vol = 0.7; this.timer = null; this.step = 0; }
  ensure() {
    try {
      if (!this.ctx) { this.ctx = new AudioContext(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination); this.setVolume(this.vol); }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { /* không có âm thanh cũng chơi được */ }
    return !!this.ctx;
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  tone(f, dur = 0.15, type = 'sine', gain = 0.2, to = null, delay = 0) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur = 0.4, gain = 0.15, freq = 800) {
    if (!this.ensure()) return;
    const n = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = gain; s.buffer = buf; s.connect(f).connect(g).connect(this.master); s.start();
  }
  sfx(name) {
    switch (name) {
      case 'pick': this.tone(740, 0.1, 'sine', 0.15, 1100); break;
      case 'deposit': this.tone(440, 0.15, 'triangle', 0.18); break;
      case 'light': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.16, null, i * 0.09)); break;
      case 'pulse': this.tone(300, 0.5, 'sine', 0.22, 900); this.noise(0.3, 0.06, 2500); break;
      case 'hit': this.tone(160, 0.35, 'sawtooth', 0.2, 60); break;
      case 'jump': this.tone(300, 0.15, 'square', 0.07, 600); break;
      case 'dash': this.noise(0.18, 0.12, 3000); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.18, null, i * 0.14)); break;
      case 'lose': [330, 262, 196, 147].forEach((f, i) => this.tone(f, 0.6, 'sine', 0.2, null, i * 0.22)); break;
      case 'spawn': this.tone(110, 0.6, 'sawtooth', 0.1, 70); break;
      case 'tick': this.tone(880, 0.08, 'square', 0.08); break;
      case 'wind': this.noise(1.6, 0.1, 600); break;
      case 'charm': this.tone(660, 0.3, 'sine', 0.2, 1320); break;
      case 'steal': this.tone(500, 0.3, 'sawtooth', 0.12, 200); break;
      default: break;
    }
  }
  startMusic() {
    if (this.timer || !this.ensure()) return;
    const notes = [196, 220, 262, 294, 330, 392, 330, 294]; // thang âm ngũ cung ấm, chậm
    this.timer = setInterval(() => {
      this.tone(notes[this.step % notes.length] / 2, 1.4, 'sine', 0.07);
      if (this.step % 4 === 0) this.tone(notes[(this.step * 3) % notes.length], 1.2, 'triangle', 0.04);
      this.step++;
    }, 700);
  }
  stopMusic() { clearInterval(this.timer); this.timer = null; }
}
