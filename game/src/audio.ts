// All sound is synthesised in the browser, so there are no audio files to license.
export class Sound {
  private ctx: AudioContext | null = null;
  private wind!: GainNode; private river!: GainNode; private fire!: GainNode; private night!: GainNode; private master!: GainNode;
  private nextBird = 2; private stepT = 0;

  private vol = 1;
  setVolume(v: number) { this.vol = v; if (this.ctx) this.master.gain.value = 0.7 * v; }

  start() {
    if (this.ctx) return;
    const C = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!C) return;
    const ctx = (this.ctx = new C() as AudioContext);
    this.master = ctx.createGain(); this.master.gain.value = 0.7 * this.vol; this.master.connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 + w * 0.15; }
    const loop = (type: BiquadFilterType, freq: number, q: number) => {
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master); src.start(Math.random());
      return g;
    };
    this.wind = loop('lowpass', 420, 0.4);
    this.river = loop('bandpass', 1400, 0.5);
    this.fire = loop('highpass', 2500, 0.8);
    // Night insects: a fast pulsing high tone.
    const osc = ctx.createOscillator(); osc.frequency.value = 4300;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 19; lfo.type = 'square';
    const lg = ctx.createGain(); lg.gain.value = 0.5; const pulse = ctx.createGain(); pulse.gain.value = 0.5;
    this.night = ctx.createGain(); this.night.gain.value = 0;
    lfo.connect(lg); lg.connect(pulse.gain); osc.connect(pulse); pulse.connect(this.night); this.night.connect(this.master);
    osc.start(); lfo.start();
  }

  private tone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = 'sine', delay = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  private thud(freq: number, dur: number, vol: number) {
    const c = this.ctx; if (!c) return;
    const n = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
    const s = c.createBufferSource(); s.buffer = n;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(this.master); s.start();
  }

  /** Called every frame with what the listener is near. */
  update(dt: number, o: { day: number; windy: number; riverDist: number; fallDist: number; fireDist: number; speed: number; surface: 'grass' | 'rock' | 'water'; time: number }) {
    const c = this.ctx; if (!c) return;
    const set = (g: GainNode, v: number) => g.gain.setTargetAtTime(v, c.currentTime, 0.4);
    set(this.wind, 0.05 + o.windy * 0.1);
    set(this.river, Math.min(0.5, 0.32 / (1 + o.riverDist * 0.09) + 1.4 / (1 + o.fallDist * 0.05) * 0.3));
    set(this.fire, 0.22 / (1 + o.fireDist * 0.35));
    set(this.night, (1 - o.day) * 0.012);
    this.nextBird -= dt;
    if (this.nextBird <= 0) {
      if (o.day > 0.5) { // birdsong, busiest at dawn
        const dawn = Math.exp(-Math.pow((o.time - 0.27) / 0.06, 2));
        this.nextBird = 0.6 + Math.random() * (5 - 4 * dawn);
        const base = 1800 + Math.random() * 2600, n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) this.tone(base * (1 + Math.random() * 0.3), base * (0.8 + Math.random() * 0.5), 0.09 + Math.random() * 0.08, 0.035, 'sine', i * 0.13);
      } else { this.nextBird = 9 + Math.random() * 14; this.tone(420, 330, 0.5, 0.04, 'sine'); this.tone(400, 320, 0.7, 0.04, 'sine', 0.7); } // owl
    }
    if (o.speed > 0.5) {
      this.stepT -= dt * (0.9 + o.speed * 0.42);
      if (this.stepT <= 0) { this.stepT = 1; this.thud(o.surface === 'rock' ? 900 : o.surface === 'water' ? 2200 : 350, o.surface === 'water' ? 0.22 : 0.1, o.surface === 'water' ? 0.16 : 0.1); }
    }
  }

  event(e: string, dist: number) {
    const v = 1 / (1 + dist * 0.08);
    if (e === 'chop') this.thud(260, 0.16, 0.6 * v);
    else if (e === 'fall') { this.thud(120, 0.9, 0.8 * v); this.thud(700, 0.5, 0.3 * v); }
    else if (e === 'knap') { this.thud(3200, 0.05, 0.4 * v); setTimeout(() => this.thud(2800, 0.05, 0.35 * v), 180); }
    else if (e === 'ignite') { this.thud(3000, 0.6, 0.4 * v); }
    else if (e === 'pick' || e === 'build') this.thud(500, 0.08, 0.2 * v);
    else if (e === 'drink' || e === 'eat') this.thud(1500, 0.25, 0.15 * v);
    else if (e === 'howl') { this.tone(330, 520, 1.1, 0.12 * v + 0.03, 'sawtooth'); this.tone(520, 300, 1.6, 0.1 * v + 0.03, 'sawtooth', 1.0); }
    else if (e === 'alarm') this.tone(900, 600, 0.18, 0.08 * v, 'square');
    else if (e === 'bite' || e === 'hurt') this.thud(600, 0.2, 0.5 * v);
    else if (e === 'throw') this.thud(1200, 0.12, 0.2 * v);
    else if (e === 'cooked') this.tone(660, 880, 0.3, 0.06 * v);
  }
}
