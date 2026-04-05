import { Pot } from '../../src/types/game';

// ベット情報
interface PlayerBet {
  playerId: string;
  amount: number;
}

/**
 * ポット管理クラス
 * メインポットとサイドポットの計算を行う
 */
export class PotManager {
  private pots: Pot[] = [];
  private playerBets: Map<string, number> = new Map(); // 現在のハンド全体でのベット累計

  // ポットをリセット
  reset(): void {
    this.pots = [];
    this.playerBets.clear();
  }

  // プレイヤーのベットを記録
  addBet(playerId: string, amount: number): void {
    const current = this.playerBets.get(playerId) || 0;
    this.playerBets.set(playerId, current + amount);
  }

  // 現在のポット一覧を取得
  getPots(): Pot[] {
    return [...this.pots];
  }

  // 合計ポット額
  getTotalPot(): number {
    return this.pots.reduce((sum, pot) => sum + pot.amount, 0);
  }

  /**
   * ベッティングラウンド終了時にポットを計算
   * サイドポットが必要な場合は分割する
   *
   * @param bets 各プレイヤーのこのラウンドでのベット額
   * @param activePlayerIds フォールドしていないプレイヤーID
   */
  calculatePots(bets: PlayerBet[], activePlayerIds: string[]): void {
    if (bets.length === 0) return;

    // ベット額でソート（昇順）
    const sortedBets = [...bets]
      .filter(b => b.amount > 0)
      .sort((a, b) => a.amount - b.amount);

    if (sortedBets.length === 0) return;

    let previousAmount = 0;

    for (let i = 0; i < sortedBets.length; i++) {
      const currentAmount = sortedBets[i].amount;
      const layerAmount = currentAmount - previousAmount;

      if (layerAmount <= 0) continue;

      // この層に貢献するプレイヤー数
      const contributingPlayers = sortedBets.filter(b => b.amount >= currentAmount);
      // 全員が同額以上ベットしているプレイヤーの人数
      const totalContributors = sortedBets.filter(b => b.amount >= currentAmount).length
        + bets.filter(b => b.amount === 0 || !sortedBets.find(sb => sb.playerId === b.playerId)).length;

      // このポットに参加できるプレイヤー
      const eligiblePlayerIds = sortedBets
        .filter(b => b.amount >= currentAmount)
        .map(b => b.playerId)
        .filter(id => activePlayerIds.includes(id));

      // フォールドしたプレイヤーのベットも含めた合計
      const potAmount = layerAmount * sortedBets.filter(b => b.amount > previousAmount).length;

      if (potAmount > 0 && eligiblePlayerIds.length > 0) {
        // 既存のポットに対象プレイヤーが同じものがあればマージ
        const existingPot = this.pots.find(p =>
          p.eligiblePlayerIds.length === eligiblePlayerIds.length &&
          p.eligiblePlayerIds.every(id => eligiblePlayerIds.includes(id))
        );

        if (existingPot) {
          existingPot.amount += potAmount;
        } else {
          this.pots.push({
            amount: potAmount,
            eligiblePlayerIds: [...eligiblePlayerIds],
          });
        }
      }

      previousAmount = currentAmount;
    }
  }

  /**
   * シンプルなポット計算（オールインなしの場合）
   * 全ベットをメインポットに追加
   */
  addToMainPot(amount: number, activePlayerIds: string[]): void {
    if (this.pots.length === 0) {
      this.pots.push({
        amount,
        eligiblePlayerIds: [...activePlayerIds],
      });
    } else {
      // メインポットを更新
      this.pots[0].amount += amount;
      this.pots[0].eligiblePlayerIds = [...activePlayerIds];
    }
  }

  /**
   * ポット獲得者を決定し、各プレイヤーの獲得額を返す
   *
   * @param winnersByPot 各ポットの勝者ID配列（ポットのインデックスに対応）
   * @returns 各プレイヤーの獲得チップ額
   */
  distributePots(
    determineWinners: (eligiblePlayerIds: string[]) => string[]
  ): Map<string, number> {
    const winnings = new Map<string, number>();

    for (const pot of this.pots) {
      const winners = determineWinners(pot.eligiblePlayerIds);
      if (winners.length === 0) continue;

      // スプリットポット：均等分配（端数は最初の勝者に）
      const share = Math.floor(pot.amount / winners.length);
      const remainder = pot.amount % winners.length;

      for (let i = 0; i < winners.length; i++) {
        const playerId = winners[i];
        const amount = share + (i === 0 ? remainder : 0);
        winnings.set(playerId, (winnings.get(playerId) || 0) + amount);
      }
    }

    return winnings;
  }
}
