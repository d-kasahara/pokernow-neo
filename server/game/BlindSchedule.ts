import { BlindLevel } from '../../src/types/game';
import { DEFAULT_BLIND_SCHEDULE } from '../constants';

/**
 * ブラインドスケジュール管理
 * タイマーでレベルアップを制御
 */
export class BlindSchedule {
  private schedule: BlindLevel[];
  private currentLevelIndex: number = 0;
  private timerRemaining: number; // 残り秒数
  private levelDuration: number;  // レベルあたりの秒数
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private onLevelUp?: (level: BlindLevel) => void;

  constructor(levelDuration: number, schedule?: BlindLevel[]) {
    this.schedule = schedule || DEFAULT_BLIND_SCHEDULE;
    this.levelDuration = levelDuration;
    this.timerRemaining = levelDuration;
  }

  // 現在のブラインドレベルを取得
  get currentLevel(): BlindLevel {
    return this.schedule[this.currentLevelIndex];
  }

  // 残り秒数を取得
  get remaining(): number {
    return this.timerRemaining;
  }

  // タイマー開始
  start(onLevelUp: (level: BlindLevel) => void): void {
    this.onLevelUp = onLevelUp;
    this.timerInterval = setInterval(() => {
      this.timerRemaining--;
      if (this.timerRemaining <= 0) {
        this.levelUp();
      }
    }, 1000);
  }

  // タイマー停止
  stop(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // レベルアップ
  private levelUp(): void {
    if (this.currentLevelIndex < this.schedule.length - 1) {
      this.currentLevelIndex++;
    }
    // 最大レベルに達したらそのレベルを維持
    this.timerRemaining = this.levelDuration;
    this.onLevelUp?.(this.currentLevel);
  }

  // 手動でレベルアップ（テスト用）
  forceNextLevel(): void {
    this.levelUp();
  }

  // 状態リセット
  reset(): void {
    this.stop();
    this.currentLevelIndex = 0;
    this.timerRemaining = this.levelDuration;
  }
}
