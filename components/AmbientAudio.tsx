"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "vc-ganesh-music";

/** Tanpura tuning: Pa, Sa, Sa, lower Sa — the drone every mandapam sits on. */
const STRINGS = [98.0, 130.81, 130.81, 65.41];
/** Struck-metal partials. Deliberately inharmonic, which is what makes it a bell. */
const BELL_PARTIALS = [1, 2.76, 5.4, 8.93];

type Engine = { stop: () => void };

/**
 * Ambient sound, synthesised in the browser rather than streamed: a plucked
 * tanpura drone with an occasional temple bell. No audio file, so it costs
 * nothing to load and works with no network.
 *
 * On by default, muted with one tap and remembered after that.
 */
export function AmbientAudio() {
  const [on, setOn] = useState(false);
  const engineRef = useRef<Engine | null>(null);

  const start = useCallback(() => {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.085, ctx.currentTime + 3);

    // Rolls the top off so the sawtooths read as strings, not a buzzer.
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1150;
    tone.Q.value = 0.6;
    tone.connect(master);
    master.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const stringGains = STRINGS.map((freq) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(tone);
      // Two slightly detuned voices per string give the shimmer a single one lacks.
      for (const cents of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = freq;
        o.detune.value = cents;
        o.connect(g);
        o.start();
        oscillators.push(o);
      }
      return g;
    });

    // A tanpura is plucked string by string, not held as a chord.
    let next = 0;
    const pluck = () => {
      const g = stringGains[next % stringGains.length];
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
      next += 1;
    };
    pluck();
    const pluckTimer = setInterval(pluck, 2400);

    const ringBell = () => {
      const t = ctx.currentTime;
      const bell = ctx.createGain();
      bell.gain.value = 0.5;
      bell.connect(master);
      BELL_PARTIALS.forEach((ratio, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 320 * ratio;
        const peak = 0.16 / (i + 1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.01);
        // Higher partials die first, the way struck metal actually behaves.
        g.gain.exponentialRampToValueAtTime(0.0001, t + 7 - i * 1.2);
        o.connect(g);
        g.connect(bell);
        o.start(t);
        o.stop(t + 8);
      });
      setTimeout(() => bell.disconnect(), 9000);
    };
    const bellTimer = setInterval(ringBell, 34000);
    const firstBell = setTimeout(ringBell, 6000);

    return {
      stop: () => {
        clearInterval(pluckTimer);
        clearInterval(bellTimer);
        clearTimeout(firstBell);
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        setTimeout(() => {
          oscillators.forEach((o) => {
            try {
              o.stop();
            } catch {
              /* already stopped */
            }
          });
          void ctx.close();
        }, 800);
      },
    };
  }, []);

  const toggle = () => {
    if (on) {
      engineRef.current?.stop();
      engineRef.current = null;
      setOn(false);
      localStorage.setItem(STORAGE_KEY, "off");
    } else {
      engineRef.current = start();
      setOn(true);
      localStorage.setItem(STORAGE_KEY, "on");
    }
  };

  // On by default. Browsers refuse to start audio without a real gesture, so the
  // best that can be done is to arm it and begin on the first tap — which on the
  // login screen is the villa field anyway. Only an explicit mute opts out.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "off") return;
    const resume = () => {
      if (!engineRef.current) {
        engineRef.current = start();
        setOn(true);
      }
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [start]);

  useEffect(() => () => engineRef.current?.stop(), []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-zari/45 bg-paper/95 px-3 py-2 text-[0.7rem] font-semibold text-leaf shadow-[0_4px_16px_-6px_rgba(0,0,0,0.5)] backdrop-blur transition-colors hover:border-zari"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {on ? <Volume2 className="size-3.5 text-zari" /> : <VolumeX className="size-3.5" />}
      {on ? "Mute" : "Play music"}
    </button>
  );
}
