import { ClientGameState, GamePhase, TournamentSettings, DEFAULT_TOURNAMENT_SETTINGS, ShowdownResult } from '../../src/types/game';
import { ServerPlayer, ClientPlayer } from '../../src/types/player';
import { PlayerAction, AvailableActions } from '../../src/types/action';
import { Tournament, TournamentEvents } from './Tournament';

/**
 * ゲームルーム管理クラス
 * プレイヤーの参加/離脱、トーナメントの開始/進行を管理
 */
export class GameRoom {
  readonly roomId: string;
  private players: ServerPlayer[] = [];
  private phase: GamePhase = 'waiting';
  private tournament: Tournament | null = null;
  private settings: TournamentSettings;
  private hostId: string | null = null;
  private lastActivity: number = Date.now();
  private showdownResults: ShowdownResult[] | null = null;
  private winnerId: string | null = null;

  // 外部イベントハンドラ
  onStateChange?: () => void;
  onPlayerAction?: (playerId: string, action: string, amount?: number) => void;
  onNewHand?: (handNumber: number) => void;
  onShowdown?: (results: ShowdownResult[]) => void;
  onPlayerEliminated?: (playerId: string, position: number) => void;
  onTournamentEnd?: (winnerId: string) => void;

  constructor(roomId: string, settings?: Partial<TournamentSettings>) {
    this.roomId = roomId;
    this.settings = { ...DEFAULT_TOURNAMENT_SETTINGS, ...settings };
  }

  // プレイヤー参加
  addPlayer(id: string, nickname: string): ServerPlayer | null {
    // 重複チェック
    if (this.players.find(p => p.id === id)) return null;

    // 満員チェック
    if (this.players.length >= this.settings.maxPlayers) return null;

    // ゲーム中は参加不可
    if (this.phase !== 'waiting') return null;

    const player: ServerPlayer = {
      id,
      nickname,
      seatIndex: -1, // 未着席
      chips: 0,
      bet: 0,
      holeCards: [],
      status: 'waiting',
      isHost: this.players.length === 0, // 最初のプレイヤーがホスト
      isConnected: true,
      timeBankRemaining: this.settings.timeBankCount,
    };

    this.players.push(player);

    if (player.isHost) {
      this.hostId = id;
    }

    this.updateActivity();
    return player;
  }

  // プレイヤー退出
  removePlayer(playerId: string): void {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    if (this.phase === 'waiting') {
      // ロビー中は完全に削除
      this.players.splice(playerIndex, 1);

      // ホスト移譲
      if (this.hostId === playerId && this.players.length > 0) {
        this.players[0].isHost = true;
        this.hostId = this.players[0].id;
      }
    } else {
      // ゲーム中は切断扱い
      const player = this.players[playerIndex];
      player.isConnected = false;
      this.tournament?.handlePlayerDisconnect(playerId);
    }

    this.updateActivity();
  }

  // 座席選択
  sitPlayer(playerId: string, seatIndex: number): boolean {
    if (seatIndex < 0 || seatIndex >= 9) return false;
    if (this.phase !== 'waiting') return false;

    // 座席が空いているか確認
    if (this.players.some(p => p.seatIndex === seatIndex && p.id !== playerId)) return false;

    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    player.seatIndex = seatIndex;
    this.updateActivity();
    return true;
  }

  // 自動着席（空いている席に座る）
  autoSitPlayer(playerId: string): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;
    if (player.seatIndex >= 0) return true; // 既に着席済み

    const occupiedSeats = new Set(this.players.filter(p => p.seatIndex >= 0).map(p => p.seatIndex));
    for (let i = 0; i < 9; i++) {
      if (!occupiedSeats.has(i)) {
        player.seatIndex = i;
        return true;
      }
    }
    return false;
  }

  // トーナメント開始
  startGame(requesterId: string): boolean {
    if (this.phase !== 'waiting') return false;
    if (requesterId !== this.hostId) return false;

    // 着席済みプレイヤーのみ
    const seatedPlayers = this.players.filter(p => p.seatIndex >= 0);
    if (seatedPlayers.length < 2) return false;

    // 未着席プレイヤーを自動着席
    for (const player of this.players) {
      if (player.seatIndex < 0) {
        this.autoSitPlayer(player.id);
      }
    }

    this.phase = 'playing';
    this.showdownResults = null;
    this.winnerId = null;

    const tournamentEvents: TournamentEvents = {
      onStateChange: () => {
        this.showdownResults = null; // 新しい状態変更でリセット
        this.onStateChange?.();
      },
      onNewHand: (handNumber) => {
        this.showdownResults = null;
        this.onNewHand?.(handNumber);
      },
      onShowdown: (results) => {
        this.showdownResults = results;
        this.onShowdown?.(results);
      },
      onPlayerEliminated: (playerId, position) => {
        this.onPlayerEliminated?.(playerId, position);
      },
      onPlayerAction: (playerId, action, amount) => {
        this.onPlayerAction?.(playerId, action, amount);
      },
      onTournamentEnd: (winnerId) => {
        this.phase = 'finished';
        this.winnerId = winnerId;
        this.onTournamentEnd?.(winnerId);
      },
    };

    this.tournament = new Tournament(this.players, this.settings, tournamentEvents);
    this.tournament.start();
    this.updateActivity();
    return true;
  }

  // プレイヤーアクション処理
  processAction(playerId: string, action: PlayerAction): boolean {
    if (!this.tournament || this.phase !== 'playing') return false;
    this.updateActivity();
    return this.tournament.processAction(playerId, action);
  }

  // タイムバンク使用
  useTimeBank(playerId: string): boolean {
    if (!this.tournament || this.phase !== 'playing') return false;
    return this.tournament.useTimeBank(playerId);
  }

  // プレイヤー再接続
  reconnectPlayer(playerId: string, newSocketId: string): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    player.isConnected = true;
    this.tournament?.handlePlayerReconnect(playerId);
    return true;
  }

  // クライアント向け状態を生成
  getClientState(playerId: string): ClientGameState {
    const hand = this.tournament?.getCurrentHand();

    // プレイヤー情報をフィルタ
    const clientPlayers: ClientPlayer[] = this.players.map(p => ({
      id: p.id,
      nickname: p.nickname,
      seatIndex: p.seatIndex,
      chips: p.chips,
      bet: p.bet,
      hasCards: p.holeCards.length > 0 && p.status !== 'folded' && p.status !== 'eliminated',
      status: p.status,
      isHost: p.isHost,
      isConnected: p.isConnected,
      lastAction: p.lastAction,
      timeBankRemaining: p.timeBankRemaining,
    }));

    // 自分のカード
    const myPlayer = this.players.find(p => p.id === playerId);
    const myCards = myPlayer?.holeCards ?? null;

    return {
      roomId: this.roomId,
      phase: this.phase,
      players: clientPlayers,
      myPlayerId: playerId,
      myCards: myCards && myCards.length > 0 ? myCards : null,
      communityCards: hand?.getCommunityCards() ?? [],
      pots: hand ? [{ amount: hand.getTotalPot(), eligiblePlayerIds: [] }] : [],
      dealerIndex: this.tournament?.getDealerIndex() ?? -1,
      currentPlayerIndex: hand?.getCurrentPlayerIndex() ?? -1,
      currentBet: hand?.getCurrentBet() ?? 0,
      round: hand?.getRound() ?? 'preflop',
      blindLevel: this.tournament?.getBlindLevel() ?? { level: 1, smallBlind: 10, bigBlind: 20, ante: 0 },
      blindTimerRemaining: this.tournament?.getBlindTimerRemaining() ?? 0,
      handNumber: this.tournament?.getHandNumber() ?? 0,
      settings: this.settings,
      availableActions: hand?.getAvailableActions(playerId) ?? null,
      showdownResults: this.showdownResults,
      winners: this.winnerId ? [this.winnerId] : null,
      actionTimerRemaining: hand?.getActionTimerRemaining() ?? 0,
      actionTimerTotal: hand?.getActionTimerTotal() ?? this.settings.actionTimeout,
      myTimeBankRemaining: myPlayer?.timeBankRemaining ?? 0,
    };
  }

  // ── ゲッター ──

  getPhase(): GamePhase {
    return this.phase;
  }

  getPlayers(): ServerPlayer[] {
    return this.players;
  }

  getPlayerCount(): number {
    return this.players.length;
  }

  getHostId(): string | null {
    return this.hostId;
  }

  getLastActivity(): number {
    return this.lastActivity;
  }

  isEmpty(): boolean {
    return this.players.length === 0 || this.players.every(p => !p.isConnected);
  }

  private updateActivity(): void {
    this.lastActivity = Date.now();
  }

  // クリーンアップ
  cleanup(): void {
    this.tournament?.cleanup();
  }
}
