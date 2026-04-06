'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Web Audio API を使ったシンセ効果音生成フック
 * - 音声ファイルなし（バンドルサイズ小）
 * - ユーザー操作後に自動で初期化
 */

type SoundType =
  | 'check'       // チェック：テーブルをノックする音
  | 'fold'        // フォールド：カードを伏せる音
  | 'bet'         // ベット：チップを1つ置く音
  | 'call'        // コール：チップを揃える音
  | 'raise'       // レイズ：チップを積む音
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
      // touchstartも削除対象
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };

    // スマホ対応: touchstartでも初期化
    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);
    window.addEventListener('touchstart', initAudio);

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('poker_sound_enabled', String(next));
      return next;
    });
  }, []);

  // トーン生成
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

  // ノイズバースト
  const playNoise = useCallback(
    (duration: number, filterFreq: number = 2000, volume: number = 0.2, filterType: BiquadFilterType = 'bandpass') => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
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
          // テーブルをノックする音（低い木の音 2回）
          playTone(180, 0.06, 'sine', 0.35, 0.003, 0.04);
          playNoise(0.04, 800, 0.12, 'lowpass');
          setTimeout(() => {
            playTone(160, 0.05, 'sine', 0.25, 0.003, 0.03);
            playNoise(0.03, 700, 0.08, 'lowpass');
          }, 80);
          break;

        case 'fold':
          // カードを伏せる/スライドする音（シュッ）
          playNoise(0.15, 1200, 0.12, 'bandpass');
          playTone(300, 0.06, 'sine', 0.08, 0.005, 0.04);
          break;

        case 'bet':
          // チップを1つ置く音（コトン）
          playNoise(0.04, 3500, 0.18, 'highpass');
          playTone(1200, 0.03, 'sine', 0.1, 0.002, 0.02);
          break;

        case 'call':
          // チップを揃える音（チャリン）
          playNoise(0.04, 4000, 0.18, 'highpass');
          playTone(1400, 0.04, 'sine', 0.12, 0.002, 0.02);
          setTimeout(() => {
            playNoise(0.03, 3800, 0.14, 'highpass');
            playTone(1300, 0.03, 'sine', 0.08, 0.002, 0.02);
          }, 50);
          break;

        case 'raise':
          // チップを複数積む音（チャリチャリチャリ）
          for (let i = 0; i < 4; i++) {
            const delay = i * 45;
            const vol = 0.2 - i * 0.03;
            const freq = 3800 + (i % 2) * 400;
            setTimeout(() => {
              playNoise(0.04, freq, vol, 'highpass');
              playTone(1300 + i * 100, 0.03, 'sine', vol * 0.5, 0.002, 0.02);
            }, delay);
          }
          break;

        case 'allIn':
          // ドラマティックな上昇音 + 大量チップ
          playTone(200, 0.3, 'sawtooth', 0.12, 0.01, 0.1);
          setTimeout(() => playTone(400, 0.3, 'sawtooth', 0.12, 0.01, 0.1), 100);
          setTimeout(() => playTone(800, 0.4, 'sawtooth', 0.18, 0.01, 0.2), 200);
          // チップ大量投入音
          for (let i = 0; i < 6; i++) {
            setTimeout(() => {
              playNoise(0.03, 3500 + Math.random() * 1500, 0.15, 'highpass');
            }, 300 + i * 30);
          }
          break;

        case 'win':
          // 勝利ファンファーレ（C-E-G-C major）
          playTone(523.25, 0.15, 'triangle', 0.25); // C5
          setTimeout(() => playTone(659.25, 0.15, 'triangle', 0.25), 120); // E5
          setTimeout(() => playTone(783.99, 0.15, 'triangle', 0.25), 240); // G5
          setTimeout(() => playTone(1046.5, 0.35, 'triangle', 0.3), 360); // C6
          break;

        case 'deal':
          // カード配布音（シュッ）
          playNoise(0.06, 2500, 0.1, 'bandpass');
          break;

        case 'timerWarn':
          // 警告ビープ
          playTone(880, 0.1, 'square', 0.12, 0.005, 0.05);
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
