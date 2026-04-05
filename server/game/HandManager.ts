import { Card } from '../../src/types/card';
import { BettingRound as BettingRoundType, BlindLevel, Pot, ShowdownResult } from '../../src/types/game';
import { ServerPlayer } from '../../src/types/player';
import { AvailableActions, PlayerAction } from '../../src/types/action';
import { Deck } from './Deck';
import { BettingRound } from './BettingRound';
import { PotManager } from './PotManager';
import { HandEvaluator } from './HandEvaluator';

// ハンドイベントコールバック
export interface HandEvents {
  onStateChange: () => void;
  onShowdown: (results: ShowdownResult[]) => void;
  onHandComplete: (winnings: Map<string, number>) => void;
  onPlayerAction: (playerId: string, action: string, amount?: number) => void;
}

/**
 * 1つのハンドを管理するクラス
 * ディール → プリフロップ → フロップ → ターン → リバー → ショーダウン
 */
export class HandManager {
  private deck: Deck;
  private players: ServerPlayer[];
  private communityCards: Card[] = [];
  private round: BettingRoundType = 'preflop';
  private bettingRound: BettingRound | null = null;
  private potManager: PotManager;
  private dealerIndex: number;
  private blindLevel: BlindLevel;
  private events: HandEvents;
  private isComplete: boolean = false;
  private actionTimeout: number;
  private timeBankSeconds: number;
  private actionTimer: ReturnType<typeof setTimeout> | null = null;
  private actionTimerStart: number = 0;
  private actionTimerTotal: number = 0; // タイムバンク含む合計秒数
  private actionTimerInterval: ReturnType<typeof setInterval> | null = null;
  private showdownResults: ShowdownResult[] | null = null;
  private currentTimerRemaining: number = 0;

  constructor(
    players: ServerPlayer[],
    dealerIndex: number,
    blindLevel: BlindLevel,
    actionTimeout: number,
    timeBankSeconds: number,
    events: HandEvents
  ) {
    this.deck = new Deck();
    this.players = players;
    this.dealerIndex = dealerIndex;
    this.blindLevel = blindLevel;
    this.actionTimeout = actionTimeout;
    this.timeBankSeconds = timeBankSeconds;
    this.events = events;
    this.potManager = new PotManager();
  }

  // ハンド開始
  start(): void {
    // プレイヤーのハンド状態をリセット
    for (const player of this.players) {
      if (player.status !== 'eliminated') {
        player.status = 'active';
        player.bet = 0;
        player.holeCards = [];
        player.lastAction = undefined;
      }
    }

    this.deck.reset();
    this.communityCards = [];
    this.round = 'preflop';
    this.potManager.reset();

    // アクティブプレイヤー数を確認
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) {
      this.isComplete = true;
      return;
    }

    // アンテ徴収
    if (this.blindLevel.ante > 0) {
      this.collectAntes();
    }

    // ホールカード配布
    this.dealHoleCards();

    // ブラインドポスト & ベッティング開始
    this.startPreflop();
  }

  // BBアンティ徴収（BBの人だけが支払う）
  private collectAntes(): void {
    const { bbIndex } = this.getBlindPositions();
    const bbPlayer = this.players[bbIndex];
    if (!bbPlayer || bbPlayer.status === 'eliminated' || bbPlayer.chips <= 0) return;

    const ante = Math.min(this.blindLevel.ante, bbPlayer.chips);
    bbPlayer.chips -= ante;
    bbPlayer.bet += ante;
    this.potManager.addBet(bbPlayer.id, ante);
    if (bbPlayer.chips === 0) bbPlayer.status = 'allIn';
  }

  // ホールカード配布
  private dealHoleCards(): void {
    for (const player of this.players) {
      if (player.status !== 'eliminated') {
        player.holeCards = this.deck.dealMultiple(2);
      }
    }
  }

  // SBとBBのインデックスを計算
  private getBlindPositions(): { sbIndex: number; bbIndex: number; utgIndex: number } {
    const activePlayers = this.getActivePlayerIndices();

    if (activePlayers.length === 2) {
      // ヘッズアップ: ディーラーがSB
      const sbIndex = this.dealerIndex;
      const bbIndex = activePlayers.find(i => i !== sbIndex) ?? activePlayers[0];
      return { sbIndex, bbIndex, utgIndex: sbIndex };
    }

    // 3人以上: ディーラーの左がSB、その左がBB
    const dealerPos = activePlayers.indexOf(this.dealerIndex);
    const sbPos = (dealerPos + 1) % activePlayers.length;
    const bbPos = (dealerPos + 2) % activePlayers.length;
    const utgPos = (dealerPos + 3) % activePlayers.length;

    return {
      sbIndex: activePlayers[sbPos],
      bbIndex: activePlayers[bbPos],
      utgIndex: activePlayers[utgPos],
    };
  }

  // アクティブプレイヤーのシートインデックス一覧
  private getActivePlayerIndices(): number[] {
    return this.players
      .filter(p => p.status !== 'eliminated')
      .map(p => p.seatIndex)
      .sort((a, b) => a - b);
  }

  // アクティブプレイヤー
  private getActivePlayers(): ServerPlayer[] {
    return this.players.filter(p => p.status === 'active' || p.status === 'allIn');
  }

  // プレイ可能プレイヤー（チップあり & フォールドしていない）
  private getPlayablePlayers(): ServerPlayer[] {
    return this.players.filter(p => p.status === 'active' && p.chips > 0);
  }

  // プリフロップ開始
  private startPreflop(): void {
    const { sbIndex, bbIndex, utgIndex } = this.getBlindPositions();

    this.bettingRound = new BettingRound(
      this.players,
      utgIndex,
      this.blindLevel.bigBlind,
      true
    );

    this.bettingRound.postBlinds(sbIndex, bbIndex, this.blindLevel.smallBlind, this.blindLevel.bigBlind);
    this.events.onStateChange();
    this.startActionTimer();
  }

  // フロップ開始
  private startFlop(): void {
    this.round = 'flop';
    this.resetPlayerBets();
    this.deck.deal(); // バーン
    this.communityCards.push(...this.deck.dealMultiple(3));
    this.startPostflopRound();
  }

  // ターン開始
  private startTurn(): void {
    this.round = 'turn';
    this.resetPlayerBets();
    this.deck.deal(); // バーン
    this.communityCards.push(this.deck.deal());
    this.startPostflopRound();
  }

  // リバー開始
  private startRiver(): void {
    this.round = 'river';
    this.resetPlayerBets();
    this.deck.deal(); // バーン
    this.communityCards.push(this.deck.deal());
    this.startPostflopRound();
  }

  // ポストフロップのベッティングラウンド開始
  private startPostflopRound(): void {
    const activeIndices = this.getActivePlayerIndices();
    const dealerPos = activeIndices.indexOf(this.dealerIndex);
    const startPos = (dealerPos + 1) % activeIndices.length;
    const startIndex = activeIndices[startPos];

    this.bettingRound = new BettingRound(
      this.players,
      startIndex,
      this.blindLevel.bigBlind,
      false
    );

    // プレイ可能なプレイヤーが1人以下ならスキップ
    if (this.getPlayablePlayers().length <= 1) {
      this.advanceRound();
      return;
    }

    this.events.onStateChange();
    this.startActionTimer();
  }

  // プレイヤーベットをリセット（ラウンド間）
  private resetPlayerBets(): void {
    for (const player of this.players) {
      player.bet = 0;
    }
  }

  // ベッティングラウンドのベットをポットに集約
  private collectBetsIntoPots(): void {
    const bets = this.players
      .filter(p => p.status !== 'eliminated')
      .map(p => ({ playerId: p.id, amount: p.bet }));

    const activeIds = this.getActivePlayers().map(p => p.id);

    const hasAllIn = this.players.some(p => p.status === 'allIn' && p.bet > 0);

    if (hasAllIn) {
      this.potManager.calculatePots(bets, activeIds);
    } else {
      const totalBets = bets.reduce((sum, b) => sum + b.amount, 0);
      if (totalBets > 0) {
        this.potManager.addToMainPot(totalBets, activeIds);
      }
    }
  }

  // アクションタイマー開始
  private startActionTimer(): void {
    this.clearActionTimer();
    this.actionTimerStart = Date.now();
    this.actionTimerTotal = this.actionTimeout;
    this.currentTimerRemaining = this.actionTimeout;

    // 毎秒状態を更新（タイマー表示用）
    this.actionTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.actionTimerStart) / 1000);
      this.currentTimerRemaining = Math.max(0, this.actionTimerTotal - elapsed);
      this.events.onStateChange();
    }, 1000);

    this.actionTimer = setTimeout(() => {
      // タイムアウト: 自動フォールド
      const currentPlayer = this.bettingRound?.getCurrentPlayer();
      if (currentPlayer) {
        this.processAction(currentPlayer.id, { type: 'fold' });
      }
    }, this.actionTimeout * 1000);
  }

  // アクションタイマークリア
  private clearActionTimer(): void {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = null;
    }
    if (this.actionTimerInterval) {
      clearInterval(this.actionTimerInterval);
      this.actionTimerInterval = null;
    }
  }

  // タイムバンク使用
  useTimeBank(playerId: string): boolean {
    const currentPlayer = this.bettingRound?.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return false;

    const player = this.players.find(p => p.id === playerId);
    if (!player || player.timeBankRemaining <= 0) return false;

    // タイムバンク消費
    player.timeBankRemaining--;

    // 既存タイマーをクリアして延長
    this.clearActionTimer();
    this.actionTimerTotal = this.currentTimerRemaining + this.timeBankSeconds;
    this.actionTimerStart = Date.now();
    this.currentTimerRemaining = this.actionTimerTotal;

    // 新しいタイマーを設定
    this.actionTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.actionTimerStart) / 1000);
      this.currentTimerRemaining = Math.max(0, this.actionTimerTotal - elapsed);
      this.events.onStateChange();
    }, 1000);

    this.actionTimer = setTimeout(() => {
      const cp = this.bettingRound?.getCurrentPlayer();
      if (cp) {
        this.processAction(cp.id, { type: 'fold' });
      }
    }, this.actionTimerTotal * 1000);

    this.events.onStateChange();
    return true;
  }

  // プレイヤーアクションを処理
  processAction(playerId: string, action: PlayerAction): boolean {
    if (!this.bettingRound || this.isComplete) return false;

    const success = this.bettingRound.processAction(playerId, action);
    if (!success) return false;

    this.clearActionTimer();
    this.events.onPlayerAction(playerId, action.type, action.amount);

    // 全員フォールドチェック
    if (this.bettingRound.isEveryoneFolded()) {
      this.handleEveryoneFolded();
      return true;
    }

    // ラウンド終了チェック
    if (this.bettingRound.isRoundComplete()) {
      this.collectBetsIntoPots();
      this.advanceRound();
    } else {
      this.events.onStateChange();
      this.startActionTimer();
    }

    return true;
  }

  // 全員フォールド時の処理
  private handleEveryoneFolded(): void {
    this.collectBetsIntoPots();
    const winner = this.bettingRound!.getRemainingPlayer();
    if (!winner) return;

    const totalPot = this.potManager.getTotalPot();
    const winnings = new Map<string, number>([[winner.id, totalPot]]);
    winner.chips += totalPot;

    this.isComplete = true;
    this.events.onHandComplete(winnings);
  }

  // 次のラウンドへ進む
  private advanceRound(): void {
    this.resetPlayerBets();

    switch (this.round) {
      case 'preflop':
        this.startFlop();
        break;
      case 'flop':
        this.startTurn();
        break;
      case 'turn':
        this.startRiver();
        break;
      case 'river':
        this.handleShowdown();
        break;
    }
  }

  // ショーダウン処理
  private handleShowdown(): void {
    this.round = 'showdown';
    const activePlayers = this.getActivePlayers();

    const winnings = this.potManager.distributePots((eligibleIds) => {
      const eligiblePlayers = activePlayers
        .filter(p => eligibleIds.includes(p.id))
        .map(p => ({ id: p.id, holeCards: p.holeCards }));

      if (eligiblePlayers.length === 0) return [];
      if (eligiblePlayers.length === 1) return [eligiblePlayers[0].id];

      const winners = HandEvaluator.determineWinners(eligiblePlayers, this.communityCards);
      return winners.map(w => w.playerId);
    });

    // チップを配分
    for (const [playerId, amount] of winnings) {
      const player = this.players.find(p => p.id === playerId);
      if (player) {
        player.chips += amount;
      }
    }

    // ショーダウン結果を生成
    const results: ShowdownResult[] = activePlayers.map(player => {
      const hand = HandEvaluator.evaluate(player.holeCards, this.communityCards);
      return {
        playerId: player.id,
        cards: player.holeCards,
        handName: hand.descr,
        potWon: winnings.get(player.id) || 0,
      };
    });

    this.showdownResults = results;
    this.isComplete = true;
    this.events.onShowdown(results);
    this.events.onHandComplete(winnings);
  }

  // ── ゲッター ──

  getRound(): BettingRoundType {
    return this.round;
  }

  getCommunityCards(): Card[] {
    return [...this.communityCards];
  }

  getPots(): Pot[] {
    return this.potManager.getPots();
  }

  getTotalPot(): number {
    const potTotal = this.potManager.getTotalPot();
    const currentBets = this.players.reduce((sum, p) => sum + p.bet, 0);
    return potTotal + currentBets;
  }

  getCurrentPlayerIndex(): number {
    return this.bettingRound?.getCurrentPlayerIndex() ?? -1;
  }

  getCurrentBet(): number {
    return this.bettingRound?.getCurrentBet() ?? 0;
  }

  getAvailableActions(playerId: string): AvailableActions | null {
    if (!this.bettingRound) return null;
    const currentPlayer = this.bettingRound.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return null;

    return this.bettingRound.getAvailableActions(currentPlayer);
  }

  getShowdownResults(): ShowdownResult[] | null {
    return this.showdownResults;
  }

  getIsComplete(): boolean {
    return this.isComplete;
  }

  getActionTimerRemaining(): number {
    return this.currentTimerRemaining;
  }

  getActionTimerTotal(): number {
    return this.actionTimerTotal;
  }

  // クリーンアップ
  cleanup(): void {
    this.clearActionTimer();
  }
}
