import { ActionType, AvailableActions, PlayerAction } from '../../src/types/action';
import { ServerPlayer } from '../../src/types/player';

/**
 * ベッティングラウンド管理
 * プリフロップ/フロップ/ターン/リバーの各ラウンドを管理
 */
export class BettingRound {
  private players: ServerPlayer[];
  private currentIndex: number;
  private currentBet: number = 0;
  private lastRaiserIndex: number = -1;
  private actedPlayers: Set<string> = new Set();
  private roundBets: Map<string, number> = new Map(); // このラウンドでの各プレイヤーのベット額
  private minRaiseAmount: number;
  private isPreflop: boolean;

  constructor(
    players: ServerPlayer[],
    startIndex: number,
    bigBlind: number,
    isPreflop: boolean = false
  ) {
    this.players = players;
    this.currentIndex = startIndex;
    this.minRaiseAmount = bigBlind;
    this.isPreflop = isPreflop;

    // 各プレイヤーのラウンドベットを初期化
    for (const player of players) {
      this.roundBets.set(player.id, 0);
    }
  }

  // アクティブプレイヤー（フォールド・オールイン・脱落以外）
  private getActivePlayers(): ServerPlayer[] {
    return this.players.filter(
      p => p.status === 'active' && p.chips > 0
    );
  }

  // ハンドに参加中のプレイヤー（フォールド・脱落以外）
  private getInHandPlayers(): ServerPlayer[] {
    return this.players.filter(
      p => p.status === 'active' || p.status === 'allIn'
    );
  }

  // 現在のプレイヤーを取得（状態を変更しない）
  getCurrentPlayer(): ServerPlayer | null {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 0) return null;

    // currentIndexから探索して最初のアクティブプレイヤーを返す
    for (let i = 0; i < this.players.length; i++) {
      const idx = (this.currentIndex + i) % this.players.length;
      const player = this.players[idx];
      if (player.status === 'active' && player.chips > 0) {
        return player;
      }
    }
    return null;
  }

  // 現在のプレイヤーインデックスを取得（状態を変更しない）
  getCurrentPlayerIndex(): number {
    for (let i = 0; i < this.players.length; i++) {
      const idx = (this.currentIndex + i) % this.players.length;
      const player = this.players[idx];
      if (player.status === 'active' && player.chips > 0) {
        return idx;
      }
    }
    return this.currentIndex;
  }

  // 現在のベット額
  getCurrentBet(): number {
    return this.currentBet;
  }

  // ラウンド内のベット情報を取得
  getRoundBets(): Map<string, number> {
    return new Map(this.roundBets);
  }

  // プレイヤーが取れるアクションを計算
  getAvailableActions(player: ServerPlayer): AvailableActions {
    const playerBet = this.roundBets.get(player.id) || 0;
    const toCall = this.currentBet - playerBet;
    const canAffordCall = player.chips >= toCall;
    const chipsAfterCall = player.chips - toCall;
    // レイズ可能: コール後にまだチップが残っていて、ミニマムレイズ以上出せる場合
    const canRaise = canAffordCall && chipsAfterCall > 0;
    const minRaiseTotal = Math.min(this.currentBet + this.minRaiseAmount, player.chips + playerBet);

    return {
      canFold: true,
      canCheck: toCall === 0,
      canCall: toCall > 0 && canAffordCall,
      callAmount: Math.min(toCall, player.chips),
      canRaise,
      minRaise: minRaiseTotal,
      maxRaise: player.chips + playerBet, // 全チップ＝最大レイズ額
      canAllIn: player.chips > 0,
      allInAmount: player.chips,
    };
  }

  // アクションを処理
  processAction(playerId: string, action: PlayerAction): boolean {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return false;

    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    // currentIndexを現在のプレイヤーの位置に同期
    this.currentIndex = this.getCurrentPlayerIndex();

    const available = this.getAvailableActions(player);
    const playerBet = this.roundBets.get(player.id) || 0;

    switch (action.type) {
      case 'fold':
        player.status = 'folded';
        player.lastAction = 'フォールド';
        this.actedPlayers.add(playerId);
        break;

      case 'check':
        if (!available.canCheck) return false;
        player.lastAction = 'チェック';
        this.actedPlayers.add(playerId);
        break;

      case 'call': {
        if (!available.canCall) return false;
        const callAmount = Math.min(this.currentBet - playerBet, player.chips);
        player.chips -= callAmount;
        player.bet += callAmount;
        this.roundBets.set(player.id, playerBet + callAmount);

        if (player.chips === 0) {
          player.status = 'allIn';
          player.lastAction = `オールイン ${callAmount}`;
        } else {
          player.lastAction = `コール ${callAmount}`;
        }
        this.actedPlayers.add(playerId);
        break;
      }

      case 'raise': {
        if (!available.canRaise || action.amount === undefined) return false;
        const raiseTotal = action.amount; // レイズ後の合計ベット額
        const additionalBet = raiseTotal - playerBet;
        const isBet = this.currentBet === 0; // ベットかレイズか

        if (additionalBet <= 0 || additionalBet > player.chips) return false;

        // ミニマムレイズチェック（オールインの場合は免除）
        if (raiseTotal < this.currentBet + this.minRaiseAmount && additionalBet !== player.chips) {
          return false;
        }

        // 最小レイズ額を更新（直前のレイズ差分）
        const raiseDiff = raiseTotal - this.currentBet;
        if (raiseDiff >= this.minRaiseAmount) {
          this.minRaiseAmount = raiseDiff;
        }

        player.chips -= additionalBet;
        player.bet += additionalBet;
        this.roundBets.set(player.id, raiseTotal);
        this.currentBet = raiseTotal;
        this.lastRaiserIndex = this.currentIndex;

        // レイズ/ベットしたので、他のプレイヤーのacted状態をリセット
        this.actedPlayers.clear();
        this.actedPlayers.add(playerId);

        if (player.chips === 0) {
          player.status = 'allIn';
          player.lastAction = `オールイン ${additionalBet}`;
        } else {
          player.lastAction = isBet ? `ベット ${raiseTotal}` : `レイズ ${raiseTotal}`;
        }
        break;
      }

      case 'allIn': {
        const allInAmount = player.chips;
        const newTotal = playerBet + allInAmount;

        player.chips = 0;
        player.bet += allInAmount;
        this.roundBets.set(player.id, newTotal);
        player.status = 'allIn';
        player.lastAction = `オールイン ${allInAmount}`;

        if (newTotal > this.currentBet) {
          // レイズとして扱う
          const raiseDiff = newTotal - this.currentBet;
          // ミニマムレイズ以上の場合のみレイズ扱い（他プレイヤーの再アクション要求）
          if (raiseDiff >= this.minRaiseAmount) {
            this.minRaiseAmount = raiseDiff;
            this.actedPlayers.clear();
          }
          this.currentBet = newTotal;
          this.lastRaiserIndex = this.currentIndex;
        }
        this.actedPlayers.add(playerId);
        break;
      }

      default:
        return false;
    }

    this.advanceToNextPlayer();
    return true;
  }

  // 次のプレイヤーに進む
  private advanceToNextPlayer(): void {
    for (let i = 1; i <= this.players.length; i++) {
      const idx = (this.currentIndex + i) % this.players.length;
      const player = this.players[idx];
      if (player.status === 'active' && player.chips > 0) {
        this.currentIndex = idx;
        return;
      }
    }
    // アクティブプレイヤーがいない場合はそのまま
  }

  // ラウンドが終了したか判定
  isRoundComplete(): boolean {
    const activePlayers = this.getActivePlayers();
    const inHandPlayers = this.getInHandPlayers();

    // ハンドに残っているプレイヤーが1人以下
    if (inHandPlayers.length <= 1) return true;

    // アクション可能なプレイヤーが0人（全員オールインかフォールド）
    if (activePlayers.length === 0) return true;

    // アクション可能なプレイヤーが1人で、ベットが揃っている
    if (activePlayers.length === 1) {
      const player = activePlayers[0];
      const playerBet = this.roundBets.get(player.id) || 0;
      // チェック可能な状態 or 既にアクション済み
      if (playerBet >= this.currentBet && this.actedPlayers.has(player.id)) return true;
      // まだアクションしておらず、ベットが揃っていない場合は続行
      if (!this.actedPlayers.has(player.id)) return false;
      return true;
    }

    // 全アクティブプレイヤーがアクション済みで、ベット額が一致
    for (const player of activePlayers) {
      if (!this.actedPlayers.has(player.id)) return false;
      const playerBet = this.roundBets.get(player.id) || 0;
      if (playerBet < this.currentBet) return false;
    }

    return true;
  }

  // 全員フォールドして1人だけ残ったか
  isEveryoneFolded(): boolean {
    return this.getInHandPlayers().length <= 1;
  }

  // 残っているプレイヤーを取得
  getRemainingPlayer(): ServerPlayer | null {
    const remaining = this.getInHandPlayers();
    return remaining.length === 1 ? remaining[0] : null;
  }

  // ブラインドをポスト
  postBlinds(
    smallBlindIndex: number,
    bigBlindIndex: number,
    smallBlind: number,
    bigBlind: number
  ): void {
    const sbPlayer = this.players[smallBlindIndex];
    const bbPlayer = this.players[bigBlindIndex];

    if (sbPlayer && (sbPlayer.status === 'active' || sbPlayer.status === 'allIn')) {
      const sbAmount = Math.min(smallBlind, sbPlayer.chips);
      sbPlayer.chips -= sbAmount;
      sbPlayer.bet += sbAmount;
      this.roundBets.set(sbPlayer.id, sbAmount);
      sbPlayer.lastAction = `SB ${sbAmount}`;
      if (sbPlayer.chips === 0) sbPlayer.status = 'allIn';
    }

    if (bbPlayer && (bbPlayer.status === 'active' || bbPlayer.status === 'allIn')) {
      const bbAmount = Math.min(bigBlind, bbPlayer.chips);
      bbPlayer.chips -= bbAmount;
      bbPlayer.bet += bbAmount;
      this.roundBets.set(bbPlayer.id, bbAmount);
      this.currentBet = bbAmount;
      bbPlayer.lastAction = `BB ${bbAmount}`;
      if (bbPlayer.chips === 0) bbPlayer.status = 'allIn';
    }
  }

  // アンテを徴収
  collectAntes(ante: number): number {
    let totalAntes = 0;
    for (const player of this.players) {
      if (player.status !== 'active' && player.status !== 'allIn') continue;

      const anteAmount = Math.min(ante, player.chips);
      player.chips -= anteAmount;
      player.bet += anteAmount;
      totalAntes += anteAmount;
      if (player.chips === 0 && player.status !== 'allIn') {
        player.status = 'allIn';
      }
    }
    return totalAntes;
  }
}
