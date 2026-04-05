'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Web Audio API を使ったシンセ効果音生成フック
 * - 音声ファイルなし（バンドルサイズ小）
 * - ユーザー操作後に自動で初期化
 */

type SoundType =
  | 'check'       // チェック：短い木製クリック
  | 'fold'        // フォールド：カードを置く音
  | 'chip'        // コール/ベット：チップ音
  | 'raise'       // レイズ：強いチップ音
  | 'allIn'       // オールイン：ドラマティックな音
  | 'win'         // 勝利音
  | 'deal'        // カード配布
  | 'timerWarn'   // タイマー警告
  | 'yourTurn';   // 自分のターン

interface UseSoundEffectsReturn {
  play: (type: SoundType) => void;
  enabled: boolean;
  toggleEnabled: () => void;
}

export function useSoundEffects(): UseSoundEffectsReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(true);

  // 初回ユーザー操作でAudioContextを初期化（ブラウザの制約）
  useEffect(() => {
    const savedEnabled = localStorage.getItem('poker_sound_enabled');
    if (savedEnabled !== null) {
      setEnabled(savedEnabled === 'true');
    }

    const initAudio = () => {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
          console.warn('AudioContext init failed', e);
        }
      }
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };

    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('poker_sound_enabled', String(next));
      return next;
    });
  }, []);

  // シンプルなトーン生成
  const playTone = useCallback(
    (
      frequency: number,
      duration: number,
      type: OscillatorType = 'sine',
      volume: number = 0.3,
      attack: number = 0.01,
      release: number = 0.1
    ) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration - release);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    },
    []
  );

  // ノイズバースト（チップ音やカード音用）
  const playNoise = useCallback(
    (duration: number, filterFreq: number = 2000, volume: number = 0.2) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq;
      filter.Q.value = 1;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      source.stop(ctx.currentTime + duration);
    },
    []
  );

  const play = useCallback(
    (type: SoundType) => {
      if (!enabled) return;
      const ctx = audioContextRef.current;
      if (!ctx) return;

      // AudioContextが中断されている場合は再開
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      switch (type) {
        case 'check':
          // 木製の「コンッ」という音
          playTone(800, 0.08, 'sine', 0.25, 0.005, 0.05);
          break;

        case 'fold':
          // カードを置く音（低めのノイズ）
          playNoise(0.12, 600, 0.15);
          break;

        case 'chip':
          // チップの音（高めのノイズ2回）
          playNoise(0.05, 4000, 0.2);
          setTimeout(() => playNoise(0.05, 3500, 0.18), 40);
          break;

        case 'raise':
          // 強めのチップ音（3回）
          playNoise(0.05, 4500, 0.25);
          setTimeout(() => playNoise(0.05, 4000, 0.22), 40);
          setTimeout(() => playNoise(0.05, 3500, 0.2), 80);
          break;

        case 'allIn':
          // ドラマティックな上昇音
          playTone(200, 0.3, 'sawtooth', 0.15, 0.01, 0.1);
          setTimeout(() => playTone(400, 0.3, 'sawtooth', 0.15, 0.01, 0.1), 100);
          setTimeout(() => playTone(800, 0.4, 'sawtooth', 0.2, 0.01, 0.2), 200);
          break;

        case 'win':
          // 勝利ファンファーレ（C-E-G-C major）
          playTone(523.25, 0.15, 'triangle', 0.25); // C5
          setTimeout(() => playTone(659.25, 0.15, 'triangle', 0.25), 120); // E5
          setTimeout(() => playTone(783.99, 0.15, 'triangle', 0.25), 240); // G5
          setTimeout(() => playTone(1046.5, 0.35, 'triangle', 0.3), 360); // C6
          break;

        case 'deal':
          // カード配布音（シューッという音）
          playNoise(0.08, 3000, 0.12);
          break;

        case 'timerWarn':
          // 警告ビープ
          playTone(880, 0.1, 'square', 0.15, 0.005, 0.05);
          break;

        case 'yourTurn':
          // 自分のターン通知音（2音）
          playTone(523.25, 0.1, 'sine', 0.2);
          setTimeout(() => playTone(783.99, 0.15, 'sine', 0.22), 100);
          break;
      }
    },
    [enabled, playTone, playNoise]
  );

  return { play, enabled, toggleEnabled };
}
