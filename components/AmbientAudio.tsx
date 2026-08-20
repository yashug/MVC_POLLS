"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vc-ganesh-music";
const TRACK = "/ganpati-namah.mp3";
const VOLUME = 0.35;
const FADE_MS = 1400;

/**
 * One audio element for the whole app, deliberately outside React. The control
 * lives in the root layout, and keeping the element at module scope means the
 * music carries across navigation instead of restarting on every page.
 */
let audio: HTMLAudioElement | null = null;
let fadeTimer: number | null = null;

function stopFade() {
  if (fadeTimer !== null) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

/** Ramp the volume so it never slams in or cuts out. */
function fadeTo(target: number, onDone?: () => void) {
  if (!audio) return;
  stopFade();
  const from = audio.volume;
  const steps = Math.max(1, Math.round(FADE_MS / 50));
  let i = 0;
  fadeTimer = window.setInterval(() => {
    if (!audio) return stopFade();
    i += 1;
    audio.volume = Math.min(1, Math.max(0, from + (target - from) * (i / steps)));
    if (i >= steps) {
      stopFade();
      onDone?.();
    }
  }, 50);
}

/**
 * Ambient devotional music for the festival.
 *
 * On by default, but browsers refuse to start audio before a real gesture, so
 * playback is armed and begins on the first tap — which on the login screen is
 * the villa field. One tap mutes it and the choice is remembered.
 */
export function AmbientAudio() {
  const [on, setOn] = useState(false);
  const [available, setAvailable] = useState(true);

  const play = useCallback(() => {
    if (!audio) {
      const el = new Audio(TRACK);
      el.loop = true;
      el.preload = "auto";
      el.volume = 0;
      el.addEventListener("error", () => setAvailable(false));
      audio = el;
    }
    // Calling play() on an already-playing element resolves immediately, so this
    // doubles as "tell me the current state" without restarting the track.
    const wasPlaying = !audio.paused;
    if (!wasPlaying) audio.volume = 0;
    audio
      .play()
      .then(() => {
        setOn(true);
        if (!wasPlaying) fadeTo(VOLUME);
      })
      // Autoplay refused — stay armed and wait for a gesture.
      .catch(() => setOn(false));
  }, []);

  const toggle = () => {
    if (on) {
      fadeTo(0, () => audio?.pause());
      setOn(false);
      localStorage.setItem(STORAGE_KEY, "off");
    } else {
      play();
      localStorage.setItem(STORAGE_KEY, "on");
    }
  };

  // Armed unless explicitly muted before.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "off") return;
    if (audio && !audio.paused) {
      play(); // resolves at once and syncs the button from its callback
      return;
    }
    const resume = () => {
      play();
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [play]);

  if (!available) return null;

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
