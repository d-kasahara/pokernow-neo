import { BlindLevel, ShowdownResult, TournamentSettings, DEFAULT_TOURNAMENT_SETTINGS } from '../../src/types/game';
import { ServerPlayer } from '../../src/types/player';
import { PlayerAction } from '../../src/types/action';
import { HandManager, HandEvents } from './HandManager';
import { BlindSchedule } from './BlindSchedule';

// トーナメントイベント
export interface TournamentEvents {
  onStateChange: () => void;
  onNewHand: (handNumber: number) => void;
  onShowdown: (results: ShowdownResult[]) => void;
  onPlayerEliminated: (playerId: string, position: number) => void;
  onPlayerAction: (playerId: string, action: string, amount?: number) => void;
  onTournamentEnd: (winnerId: string) => void;
}

/**
 * トーナメント管理クラス
 * 複数のハンドを順に進行し、脱落者を管理
 */
export class Tournament {
  private players: ServerPlayer[];
  private settings: TournamentSettings;
  private blindSchedule: BlindSchedule;
  private currentHand: HandManager | null = null;
  private dealerIndex: number = 0;
  private handNumber: number = 0;
  private events: TournamentEvents;
  private isRunning: boolean = false;
  private eliminationOrder: string[] = [];
  private handCompleteTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    players: ServerPlayer[],
    settings: Partial<TournamentSettings> = {},
    events: TournamentEvents
  ) {
    this.players = players;
    this.settings = { ...DEFAULT_TOURNAMENT_SETTINGS, ...settings };
    this.events = events;

    // カスタムブラインドスケジュールがあれば使用
    const customSchedule = this.settings.blindSchedule.length > 0
      ? this.settings.blindSchedule
      : undefined;
    this.blindSchedule = new BlindSchedule(this.settings.blindLevelDuration, customSchedule);
  }

  // トーナメント開始
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // 初期チップ・タイムバンクを配布
    for (const player of this.players) {
      player.chips = this.settings.startingChips;
      player.status = 'active';
      player.timeBankRemaining = this.settings.timeBankCount;
    }

    // ランダムにディーラーを決定
    const activePlayers = this.getActivePlayers();
    this.dealerIndex = activePlayers[Math.floor(Math.random() * activePlayers.length)].seatIndex;

    // ブラインドタイマー開始
    this.blindSchedule.start((level) => {
      this.events.onStateChange();
    });

    // 最初のハンド開始
    this.startNextHand();
  }

  // 次のハンドを開始
  private startNextHand(): void {
    this.handNumber++;

    // ディーラーボタンを移動
    if (this.handNumber > 1) {
      this.advanceDealer();
    }

    const handEvents: HandEvents = {
      onStateChange: () => this.events.onStateChange(),
      onShowdown: (results) => this.events.onShowdown(results),
      onHandComplete: (winnings) => this.handleHandComplete(winnings),
      onPlayerAction: (playerId, action, amount) =>
        this.events.onPlayerAction(playerId, action, amount),
    };

    this.currentHand = new HandManager(
      this.players,
      this.dealerIndex,
      this.blindSchedule.currentLevel,
      this.settings.actionTimeout,
      this.settings.timeBankSeconds,
      handEvents
    );

    this.events.onNewHand(this.handNumber);
    this.currentHand.start();
  }

  // ハンド完了処理
  private handleHandComplete(winnings: Map<string, number>): void {
    // 脱落者チェック
    for (const player of this.players) {
      if (player.status === 'eliminated') continue;
      if (player.chips <= 0) {
        player.status = 'eliminated';
        player.chips = 0;
        this.eliminationOrder.push(player.id);

        const remaining = this.getActivePlayers().length;
        const position = remaining + 1;
        this.events.onPlayerEliminated(player.id, position);
      }
    }

    // 勝者チェック
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length <= 1) {
      const winner = activePlayers[0];
      if (winner) {
        this.isRunning = false;
        this.blindSchedule.stop();
        this.events.onTournamentEnd(winner.id);
      }
      return;
    }

    // 次のハンドを少し遅延して開始（ショーダウン表示のため）
    this.handCompleteTimeout = setTimeout(() => {
      if (this.isRunning) {
        this.currentHand?.cleanup();
        this.startNextHand();
      }
    }, 3000);
  }

  // ディーラーボタンを次のアクティブプレイヤーに移動
  private advanceDealer(): void {
    const activePlayers = this.getActivePlayers()
      .sort((a, b) => a.seatIndex - b.seatIndex);

    if (activePlayers.length === 0) return;

    const currentPos = activePlayers.findIndex(p => p.seatIndex === this.dealerIndex);
    const nextPos = (currentPos + 1) % activePlayers.length;
    this.dealerIndex = activePlayers[nextPos].seatIndex;
  }

  // アクティブプレイヤー（脱落していないプレイヤー）
  private getActivePlayers(): ServerPlayer[] {
    return this.players.filter(p => p.status !== 'eliminated');
  }

  // プレイヤーアクション処理
  processAction(playerId: string, action: PlayerAction): boolean {
    if (!this.currentHand || !this.isRunning) return false;
    return this.currentHand.processAction(playerId, action);
  }

  // タイムバンク使用
  useTimeBank(playerId: string): boolean {
    if (!this.currentHand || !this.isRunning) return false;
    return this.currentHand.useTimeBank(playerId);
  }

  // プレイヤー切断処理
  handlePlayerDisconnect(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.status === 'eliminated') return;

    player.isConnected = false;

    if (this.currentHand) {
      const currentIdx = this.currentHand.getCurrentPlayerIndex();
      if (this.players[currentIdx]?.id === playerId) {
        this.currentHand.processAction(playerId, { type: 'fold' });
      }
    }
  }

  // プレイヤー再接続処理
  handlePlayerReconnect(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isConnected = true;
    }
  }

  // ── ゲッター ──

  getCurrentHand(): HandManager | null {
    return this.currentHand;
  }

  getDealerIndex(): number {
    return this.dealerIndex;
  }

  getHandNumber(): number {
    return this.handNumber;
  }

  getBlindLevel(): BlindLevel {
    return this.blindSchedule.currentLevel;
  }

  getBlindTimerRemaining(): number {
    return this.blindSchedule.remaining;
  }

  getSettings(): TournamentSettings {
    return this.settings;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  // クリーンアップ
  cleanup(): void {
    this.isRunning = false;
    this.blindSchedule.stop();
    this.currentHand?.cleanup();
    if (this.handCompleteTimeout) {
      clearTimeout(this.handCompleteTimeout);
    }
  }
}
