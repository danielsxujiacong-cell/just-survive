let ctx: AudioContext | undefined;
function context() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
export function sound(kind = "click") {
  const c = context(),
    t = c.currentTime;
  const combat = kind === "combat",
    mechanism = kind === "tile",
    chop = kind === "explore" || kind === "craft",
    alarm = kind === "gmDay";
  const osc = c.createOscillator(),
    gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = combat
    ? "sawtooth"
    : chop
      ? "square"
      : mechanism
        ? "sine"
        : "triangle";
  osc.frequency.setValueAtTime(
    combat ? 130 : mechanism ? 520 : chop ? 180 : alarm ? 880 : 330,
    t,
  );
  osc.frequency.exponentialRampToValueAtTime(alarm ? 440 : 60, t + 0.16);
  gain.gain.setValueAtTime(0.035, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.start();
  osc.stop(t + 0.23);
  if (combat || chop || mechanism)
    ambience(combat ? "hit" : chop ? "chop" : "crank");
}
export function ambience(kind: string) {
  const c = context(),
    duration = kind === "fire" || kind === "sea" ? 1.4 : 0.2,
    length = Math.floor(c.sampleRate * duration),
    buffer = c.createBuffer(1, length, c.sampleRate),
    data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const crackle = kind === "fire" && Math.random() > 0.995 ? 5 : 1;
    data[i] =
      (Math.random() * 2 - 1) *
      Math.sin((i / length) * Math.PI) *
      0.035 *
      crackle;
  }
  const source = c.createBufferSource(),
    filter = c.createBiquadFilter();
  filter.type = kind === "crank" ? "bandpass" : "lowpass";
  filter.frequency.value =
    kind === "fire"
      ? 900
      : kind === "hit"
        ? 1800
        : kind === "chop"
          ? 2500
          : kind === "crank"
            ? 650
            : 300;
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(c.destination);
  source.start();
}
let ambientSource: AudioBufferSourceNode | undefined,
  ambientGain: GainNode | undefined,
  ambientTimer: ReturnType<typeof setInterval> | undefined;
export function setAmbient(enabled: boolean, scene = "sea") {
  ambientSource?.stop();
  ambientSource = undefined;
  ambientGain?.disconnect();
  ambientGain = undefined;
  if (ambientTimer) clearInterval(ambientTimer);
  ambientTimer = undefined;
  if (!enabled) return;
  const c = context(),
    buffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate),
    data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < data.length; i++) {
    brown = (brown + (Math.random() * 2 - 1) * 0.025) / 1.025;
    data[i] = brown * (0.5 + 0.5 * Math.sin((i / data.length) * Math.PI));
  }
  const source = c.createBufferSource(),
    gain = c.createGain(),
    filter = c.createBiquadFilter();
  source.buffer = buffer;
  source.loop = true;
  filter.type = "lowpass";
  filter.frequency.value =
    scene === "camp" ? 650 : scene === "night" ? 1100 : 400;
  gain.gain.value = scene === "night" ? 0.11 : 0.18;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  source.start();
  ambientSource = source;
  ambientGain = gain;
  ambientTimer = setInterval(
    () => {
      if (scene === "camp") ambience("fire");
      else if (scene === "night") {
        const t = c.currentTime,
          o = c.createOscillator(),
          g = c.createGain();
        o.type = "sine";
        o.frequency.value = 2100 + Math.random() * 1500;
        g.gain.setValueAtTime(0.004, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        o.connect(g);
        g.connect(c.destination);
        o.start();
        o.stop(t + 0.16);
      }
    },
    scene === "camp" ? 900 : 1300,
  );
}
