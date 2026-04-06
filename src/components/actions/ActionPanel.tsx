'use client';

import { useState, useMemo } from 'react';
import { ClientGameState } from '../../types/game';
import { PlayerAction } from '../../types/action';
import { CardComponent } from '../table/Card';

interface ActionPanelProps {
  gameState: ClientGameState;
  onAction: (action: PlayerAction) => void;
  onUseTimeBank: () => void;
}

// BB単位でフォーマット
function formatBB(amount: number, bigBlind: number): string {
  if (bigBlind === 0) return amount.toLocaleString();
  const bb = amount / bigBlind;
  return bb % 1 === 0 ? `${bb}` : `${bb.toFixed(1)}`;
}

export function ActionPanel({ gameState, onAction, onUseTimeBank }: ActionPanelProps) {
  const { availableActions, currentBet, pots, actionTimerRemaining, actionTimerTotal, myTimeBankRemaining, blindLevel, myCards } = gameState;
  const bigBlind = blindLevel.bigBlind;
  const [customRaiseAmount, setCustomRaiseAmount] = useState(0);
  const [showRaisePanel, setShowRaisePanel] = useState(false);

  const isMyTurn = !!availableActions;

  // タイマーの割合計算
  const timerPercent = actionTimerTotal > 0
    ? Math.round((actionTimerRemaining / actionTimerTotal) * 100)
    : 100;

  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);

  // currentBet === 0 のときは「ベット」、それ以外は「レイズ」
  const isBetAction = currentBet === 0;
  const raiseLabel = isBetAction ? 'BET' : 'RAISE';

  // レイズパネル用プリセット
  const raisePresets = useMemo(() => {
    if (!availableActions?.canRaise) return [];
    const { minRaise, maxRaise } = availableActions;
    const presets: { label: string; amount: number }[] = [];

    if (isBetAction) {
      const multiples = [2, 2.5, 3, 4, 5];
      for (const mult of multiples) {
        const amount = Math.floor(bigBlind * mult);
        if (amount >= minRaise && amount < maxRaise) {
          presets.push({ label: `${mult}BB`, amount });
        }
      }
    } else {
      const raise25 = Math.floor(currentBet * 2.5);
      const raise3 = currentBet * 3;
      const halfPot = currentBet + Math.floor(totalPot / 2);
      const potSize = currentBet + totalPot;

      const candidates = [
        { label: '2.5x', amount: raise25 },
        { label: '3x', amount: raise3 },
        { label: '½ Pot', amount: halfPot },
        { label: 'Pot', amount: potSize },
      ];
      const seen = new Set<number>();
      for (const c of candidates) {
        if (c.amount >= minRaise && c.amount < maxRaise && !seen.has(c.amount)) {
          seen.add(c.amount);
          presets.push(c);
        }
      }
    }

    return presets;
  }, [availableActions, currentBet, totalPot, isBetAction, bigBlind]);

  // 自分のターンでない場合
  if (!isMyTurn) {
    return (
      <div className="bg-gray-900/90 border-t border-gray-800">
        {/* 自分のカード表示（ターンでなくても表示） */}
        {myCards && myCards.length === 2 && (
          <div className="flex items-center justify-center gap-1.5 py-2 sm:py-3">
            <CardComponent card={myCards[0]} size="md" />
            <CardComponent card={myCards[1]} size="md" />
            <span className="text-gray-500 text-xs sm:text-sm ml-3">相手のアクションを待っています...</span>
          </div>
        )}
        {(!myCards || myCards.length === 0) && (
          <div className="h-10 sm:h-12 flex items-center justify-center">
            <span className="text-gray-500 text-xs sm:text-sm">相手のアクションを待っています...</span>
          </div>
        )}
      </div>
    );
  }

  const handleRaise = (amount: number) => {
    if (amount >= availableActions.maxRaise) {
      onAction({ type: 'allIn' });
    } else {
      onAction({ type: 'raise', amount });
    }
    setShowRaisePanel(false);
  };

  return (
    <div className="bg-gray-900/95 border-t border-gray-800">
      {/* === スマホ版 === */}
      <div className="sm:hidden">
        {/* YOUR TURN + タイマー + 自分のカード */}
        <div className="flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-2">
            {/* 自分のカード */}
            {myCards && myCards.length === 2 && (
              <div className="flex gap-0.5">
                <CardComponent card={myCards[0]} size="sm" />
                <CardComponent card={myCards[1]} size="sm" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-yellow-400 text-[10px] font-black tracking-wider">YOUR TURN</span>
              </div>
              <span className={`text-xs font-mono font-black ${
                actionTimerRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white/70'
              }`}>
                {actionTimerRemaining}s
              </span>
            </div>
          </div>
          {myTimeBankRemaining > 0 && (
            <button
              onClick={onUseTimeBank}
              className="px-2 py-1 bg-gray-700 text-gray-300 text-[10px] font-bold rounded border border-gray-600 active:bg-gray-600"
            >
              EXTRA TIME ({myTimeBankRemaining})
            </button>
          )}
        </div>

        {/* レイズパネル（展開時） */}
        {showRaisePanel && availableActions.canRaise && (
          <div className="px-3 pb-2">
            <div className="bg-gray-800 rounded-xl p-3">
              {/* プリセットボタン */}
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {raisePresets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => setCustomRaiseAmount(preset.amount)}
                    className={`px-2.5 py-1.5 text-[11px] rounded-lg font-bold ${
                      customRaiseAmount === preset.amount
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => setCustomRaiseAmount(availableActions.maxRaise)}
                  className={`px-2.5 py-1.5 text-[11px] rounded-lg font-bold ${
                    customRaiseAmount === availableActions.maxRaise
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                  }`}
                >
                  All In
                </button>
              </div>

              {/* スライダー */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] text-gray-500 w-8">{formatBB(availableActions.minRaise, bigBlind)}</span>
                <input
                  type="range"
                  min={availableActions.minRaise}
                  max={availableActions.maxRaise}
                  value={customRaiseAmount}
                  onChange={(e) => setCustomRaiseAmount(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="text-[9px] text-gray-500 w-8 text-right">{formatBB(availableActions.maxRaise, bigBlind)}</span>
              </div>

              {/* 確定ボタン */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRaisePanel(false)}
                  className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-xs font-bold active:bg-gray-600"
                >
                  戻る
                </button>
                <button
                  onClick={() => handleRaise(customRaiseAmount)}
                  className="flex-[2] py-2 bg-emerald-600 text-white font-black rounded-lg text-sm active:bg-emerald-500"
                >
                  {customRaiseAmount >= availableActions.maxRaise
                    ? `ALL IN ${formatBB(customRaiseAmount, bigBlind)}BB`
                    : `${raiseLabel} ${formatBB(customRaiseAmount, bigBlind)}BB`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* メインアクションボタン（PokerNow風1行） */}
        {!showRaisePanel && (
          <div className="flex gap-1.5 px-2 pb-4 pt-0.5">
            {availableActions.canCall && (
              <button
                onClick={() => onAction({ type: 'call' })}
                className="flex-1 py-3 bg-gradient-to-b from-blue-600 to-blue-800 text-white font-black rounded-xl text-xs active:from-blue-500 active:to-blue-700 shadow-lg border border-blue-400/30"
              >
                CALL {formatBB(availableActions.callAmount, bigBlind)}
              </button>
            )}

            {availableActions.canCheck && (
              <button
                onClick={() => onAction({ type: 'check' })}
                className="flex-1 py-3 bg-gradient-to-b from-gray-500 to-gray-700 text-white font-black rounded-xl text-xs active:from-gray-400 active:to-gray-600 shadow-lg border border-gray-400/30"
              >
                CHECK
              </button>
            )}

            {availableActions.canRaise && (
              <button
                onClick={() => {
                  setCustomRaiseAmount(availableActions.minRaise);
                  setShowRaisePanel(true);
                }}
                className="flex-1 py-3 bg-gradient-to-b from-emerald-600 to-emerald-800 text-white font-black rounded-xl text-xs active:from-emerald-500 active:to-emerald-700 shadow-lg border border-emerald-400/30"
              >
                {raiseLabel}
              </button>
            )}

            {availableActions.canAllIn && !availableActions.canRaise && !availableActions.canCall && (
              <button
                onClick={() => onAction({ type: 'allIn' })}
                className="flex-1 py-3 bg-gradient-to-b from-red-500 to-red-700 text-white font-black rounded-xl text-xs active:from-red-400 active:to-red-600 shadow-lg border border-red-300/30"
              >
                ALL IN
              </button>
            )}

            {availableActions.canAllIn && availableActions.canRaise && (
              <button
                onClick={() => onAction({ type: 'allIn' })}
                className="flex-1 py-3 bg-gradient-to-b from-red-500 to-red-700 text-white font-black rounded-xl text-xs active:from-red-400 active:to-red-600 shadow-lg border border-red-300/30"
              >
                ALL IN
              </button>
            )}

            {availableActions.canFold && (
              <button
                onClick={() => onAction({ type: 'fold' })}
                className="flex-1 py-3 bg-gradient-to-b from-red-800 to-red-950 text-red-300 font-black rounded-xl text-xs active:from-red-700 active:to-red-900 shadow-lg border border-red-700/30"
              >
                FOLD
              </button>
            )}
          </div>
        )}
      </div>

      {/* === PC版 === */}
      <div className="hidden sm:block">
        {/* タイマーバー */}
        {isMyTurn && (
          <div className="h-1.5 bg-gray-800 w-full">
            <div
              className={`h-full ${
                timerPercent < 25 ? 'bg-red-500' : timerPercent < 50 ? 'bg-yellow-500' : 'bg-emerald-500'
              } transition-all duration-1000 ease-linear`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}

        <div className="px-4 py-3">
          {/* 自分のカード + タイマー行 */}
          <div className="flex items-center justify-between mb-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              {/* 自分のカード */}
              {myCards && myCards.length === 2 && (
                <div className="flex gap-1.5">
                  <CardComponent card={myCards[0]} size="md" />
                  <CardComponent card={myCards[1]} size="md" />
                </div>
              )}
              <span className={`text-lg font-mono font-black ${
                actionTimerRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
              }`}>
                {actionTimerRemaining}秒
              </span>
            </div>
            {myTimeBankRemaining > 0 && (
              <button
                onClick={onUseTimeBank}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-400 text-white text-sm font-bold rounded-lg transition flex items-center gap-2 shadow-lg"
              >
                <span>+30秒</span>
                <span className="bg-yellow-800 px-1.5 py-0.5 rounded text-xs">
                  残り{myTimeBankRemaining}回
                </span>
              </button>
            )}
          </div>

          {/* レイズパネル（PC展開時） */}
          {showRaisePanel && availableActions.canRaise && (
            <div className="mb-3 bg-gray-800 rounded-xl p-4 max-w-4xl mx-auto">
              <div className="flex gap-2 mb-3 flex-wrap">
                {raisePresets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => setCustomRaiseAmount(preset.amount)}
                    className={`px-3 py-2 text-sm rounded-lg transition font-semibold ${
                      customRaiseAmount === preset.amount
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {preset.label}
                    <span className="ml-1.5 opacity-70 text-xs">{formatBB(preset.amount, bigBlind)}BB</span>
                  </button>
                ))}
                <button
                  onClick={() => setCustomRaiseAmount(availableActions.maxRaise)}
                  className={`px-3 py-2 text-sm rounded-lg transition font-semibold ${
                    customRaiseAmount === availableActions.maxRaise
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All In
                  <span className="ml-1.5 opacity-70 text-xs">{formatBB(availableActions.maxRaise, bigBlind)}BB</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16">{formatBB(availableActions.minRaise, bigBlind)}BB</span>
                <input
                  type="range"
                  min={availableActions.minRaise}
                  max={availableActions.maxRaise}
                  value={customRaiseAmount}
                  onChange={(e) => setCustomRaiseAmount(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="text-xs text-gray-400 w-16 text-right">{formatBB(availableActions.maxRaise, bigBlind)}BB</span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="text-white font-mono font-black text-xl">
                  {formatBB(customRaiseAmount, bigBlind)} BB
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRaisePanel(false)}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => handleRaise(customRaiseAmount)}
                    className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg text-sm hover:bg-emerald-500 transition"
                  >
                    {customRaiseAmount >= availableActions.maxRaise
                      ? `オールイン ${formatBB(customRaiseAmount, bigBlind)}BB`
                      : `${isBetAction ? 'ベット' : 'レイズ'} ${formatBB(customRaiseAmount, bigBlind)}BB`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* クイックBBプリセット（PC用） */}
          {availableActions.canRaise && !showRaisePanel && raisePresets.length > 0 && (
            <div className="flex gap-2 justify-center mb-3 flex-wrap max-w-4xl mx-auto">
              {raisePresets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handleRaise(preset.amount)}
                  className="px-4 py-2 bg-emerald-700/80 hover:bg-emerald-600 active:bg-emerald-500 text-white font-bold rounded-lg transition text-sm shadow-md min-w-[70px]"
                >
                  <div className="text-[10px] opacity-80">{isBetAction ? 'ベット' : 'レイズ'}</div>
                  <div className="font-black">{preset.label}</div>
                </button>
              ))}
              <button
                onClick={() => {
                  setCustomRaiseAmount(availableActions.minRaise);
                  setShowRaisePanel(true);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold rounded-lg transition text-sm shadow-md"
              >
                <div className="text-[10px] opacity-80">カスタム</div>
                <div className="font-black">⋯</div>
              </button>
            </div>
          )}

          {/* メインアクションボタン（PC） */}
          <div className="flex gap-3 justify-center max-w-4xl mx-auto">
            {availableActions.canFold && (
              <button
                onClick={() => onAction({ type: 'fold' })}
                className="flex-none px-5 py-3 bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 active:from-red-500 active:to-red-700 text-white font-black rounded-xl transition min-w-[100px] text-sm shadow-lg border border-red-500/30"
              >
                フォールド
              </button>
            )}

            {availableActions.canCheck && (
              <button
                onClick={() => onAction({ type: 'check' })}
                className="flex-none px-5 py-3 bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 active:from-blue-400 active:to-blue-600 text-white font-black rounded-xl transition min-w-[100px] text-sm shadow-lg border border-blue-400/30"
              >
                チェック
              </button>
            )}

            {availableActions.canCall && (
              <button
                onClick={() => onAction({ type: 'call' })}
                className="flex-none px-5 py-3 bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 active:from-blue-400 active:to-blue-600 text-white font-black rounded-xl transition min-w-[100px] text-sm shadow-lg border border-blue-400/30"
              >
                <div>コール</div>
                <div className="text-[10px] opacity-80 font-mono">{formatBB(availableActions.callAmount, bigBlind)}BB</div>
              </button>
            )}

            {availableActions.canAllIn && !availableActions.canRaise && !availableActions.canCall && (
              <button
                onClick={() => onAction({ type: 'allIn' })}
                className="flex-none px-5 py-3 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 active:from-red-300 active:to-red-500 text-white font-black rounded-xl transition min-w-[100px] text-sm shadow-lg border border-red-300/30"
              >
                <div>オールイン</div>
                <div className="text-[10px] opacity-80 font-mono">{formatBB(availableActions.allInAmount, bigBlind)}BB</div>
              </button>
            )}

            {availableActions.canAllIn && availableActions.canRaise && (
              <button
                onClick={() => onAction({ type: 'allIn' })}
                className="flex-none px-5 py-3 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 active:from-red-300 active:to-red-500 text-white font-black rounded-xl transition min-w-[100px] text-sm shadow-lg border border-red-300/30"
              >
                <div>オールイン</div>
                <div className="text-[10px] opacity-80 font-mono">{formatBB(availableActions.allInAmount, bigBlind)}BB</div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
