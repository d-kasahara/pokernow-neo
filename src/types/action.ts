// プレイヤーが取れるアクション
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'allIn';

// プレイヤーアクション
export interface PlayerAction {
  type: ActionType;
  amount?: number; // raiseの場合のみ
}

// クライアントに送信する利用可能アクション
export interface AvailableActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaise: number;
  maxRaise: number; // = プレイヤーのチップ残高
  canAllIn: boolean;
  allInAmount: number;
}
