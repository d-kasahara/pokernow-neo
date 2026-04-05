'use client';

import { useState, useMemo } from 'react';
import { ClientGameState } from '../../types/game';
import { PlayerAction } from '../../types/action';

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
  const { availableActions, currentBet, pots, actionTimerRemaining, actionTimerTotal, myTimeBankRemaining, blindLevel } = gameState;
  const bigBlind = blindLevel.bigBlind;
  const [customRaiseAmount, setCustomRaiseAmount] = useState(0);
  const [showCustomSlider, setShowCustomSlider] = useState(false);

  const isMyTurn = !!availableActions;

  // タイマーの割合計算
  const timerPercent = actionTimerTotal > 0
    ? Math.round((actionTimerRemaining / actionTimerTotal) * 100)
    : 100;
  const timerColor = timerPercent < 25 ? 'bg-red-500' : timerPercent < 50 ? 'bg-yellow-500' : 'bg-emerald-500';

  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);

  // currentBet === 0 のときは「ベット」、それ以外は「レイズ」
  const isBetAction = currentBet === 0;
  const raiseLabel = isBetAction ? 'ベット' : 'レイズ';

  // クイックベット/レイズプリセット（常に表示用）
  const quickPresets = useMemo(() => {
    if (!availableActions?.canRaise) return [];
    const { minRaise, maxRaise } = availableActions;
    const presets: { label: string; amount: number }[] = [];

    if (isBetAction) {
      // ベット時: 2BB, 2.5BB, 3BB, 4BB
      const multiples = [2, 2.5, 3, 4];
      for (const mult of multiples) {
        const amount = Math.floor(bigBlind * mult);
        if (amount >= minRaise && amount <= maxRaise) {
          presets.push({ label: `${mult}BB`, amount });
        }
      }
    } else {
      // レイズ時: 2.5x, 3x, 1/2 Pot, Pot
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
        if (c.amount >= minRaise && c.amount <= maxRaise && !seen.has(c.amount)) {
          seen.add(c.amount);
          presets.push(c);
        }
      }
    }

    return presets;
  }, [availableActions, currentBet, totalPot, isBetAction, bigBlind]);

  // カスタムスライダー用プリセット
  const sliderPresets = useMemo(() => {
    if (!availableActions?.canRaise) return [];
    const { minRaise, maxRaise } = availableActions;
    const presets: { label: string; amount: number }[] = [];

    presets.push({ label: 'Min', amount: minRaise });
    if (isBetAction) {
      const multiples = [2.5, 3, 4, 5];
      for (const mult of multiples) {
        const amount = Math.floor(bigBlind * mult);
        if (amount > minRaise && amount < maxRaise) {
          presets.push({ label: `${mult}x`, amount });
        }
      }
    } else {
      const halfPot = currentBet + Math.floor(totalPot / 2);
      if (halfPot > minRaise && halfPot < maxRaise) {
        presets.push({ label: '½ Pot', amount: halfPot });
      }
      const potSize = currentBet + totalPot;
      if (potSize > minRaise && potSize < maxRaise) {
        presets.push({ label: 'Pot', amount: potSize });
      }
    }
    presets.push({ label: 'All In', amount: maxRaise });
    return presets;
  }, [availableActions, currentBet, totalPot, isBetAction, bigBlind]);

  // 自分のターンでない場合
  if (!isMyTurn) {
    return (
      <div className="h-24 bg-gray-900/90 border-t border-gray-800 flex items-center justify-center px-4">
        <span className="text-gray-500 text-base">相手のアクションを待っています...</span>
      </div>
    );
  }

  const handleQuickRaise = (amount: number) => {
    if (amount >= availableActions.maxRaise) {
      onAction({ type: 'allIn' });
    } else {
      onAction({ type: 'raise', amount });
    }
  };

  const handleCustomRaise = () => {
    if (customRaiseAmount >= availableActions.maxRaise) {
      onAction({ type: 'allIn' });
    } else {
      onAction({ type: 'raise', amount: customRaiseAmount });
    }
    setShowCustomSlider(false);
  };

  return (
    <div className="bg-gray-900/95 border-t border-gray-800">
      {/* タイマーバー */}
      {isMyTurn && (
        <div className="h-2 bg-gray-800 w-full">
          <div
            className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      <div className="p-3 md:p-4">
        {/* タイマー＆タイムバンク表示 */}
        <div className="flex items-center justify-between mb-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <span className={`text-xl font-mono font-black ${
              actionTimerRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
            }`}>
              {actionTimerRemaining}秒
            </span>
          </div>
          {myTimeBankRemaining > 0 && (
            <button
              onClick={onUseTimeBank}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold rounded-lg transition flex items-center gap-2 shadow-lg"
            >
              <span>+30秒</span>
              <span className="bg-yellow-800 px-2 py-0.5 rounded text-xs">
                残り{myTimeBankRemaining}回
              </span>
            </button>
          )}
        </div>

        {/* カスタムスライダー（展開時のみ） */}
        {showCustomSlider && availableActions.canRaise && (
          <div className="mb-3 bg-gray-800 rounded-xl p-4 max-w-4xl mx-auto">
            <div className="flex gap-2 mb-3 flex-wrap">
              {sliderPresets.map((preset, i) => (
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
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-20">{formatBB(availableActions.minRaise, bigBlind)}BB</span>
              <input
                type="range"
                min={availableActions.minRaise}
                max={availableActions.maxRaise}
                value={customRaiseAmount}
                onChange={(e) => setCustomRaiseAmount(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-xs text-gray-400 w-20 text-right">{formatBB(availableActions.maxRaise, bigBlind)}BB</span>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="text-white font-mono font-black text-xl">
                {formatBB(customRaiseAmount, bigBlind)} BB
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomSlider(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCustomRaise}
                  className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg text-sm hover:bg-emerald-500 transition"
                >
                  {customRaiseAmount >= availableActions.maxRaise
                    ? `オールイン ${formatBB(customRaiseAmount, bigBlind)}BB`
                    : `${raiseLabel} ${formatBB(customRaiseAmount, bigBlind)}BB`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* クイックBBプリセット（ベット/レイズ可能時は常に表示） */}
        {availableActions.canRaise && !showCustomSlider && quickPresets.length > 0 && (
          <div className="flex gap-2 justify-center mb-3 flex-wrap max-w-4xl mx-auto">
            {quickPresets.map((preset, i) => (
              <button
                key={i}
                onClick={() => handleQuickRaise(preset.amount)}
                className="px-4 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold rounded-lg transition text-sm shadow-md min-w-[80px]"
              >
                <div className="text-xs opacity-80">{raiseLabel}</div>
                <div className="font-black">{preset.label}</div>
              </button>
            ))}
            <button
              onClick={() => {
                setCustomRaiseAmount(availableActions.minRaise);
                setShowCustomSlider(true);
              }}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition text-sm shadow-md"
            >
              <div className="text-xs opacity-80">カスタム</div>
              <div className="font-black">⋯</div>
            </button>
          </div>
        )}

        {/* メインアクションボタン */}
        <div className="flex gap-3 justify-center max-w-4xl mx-auto">
          {availableActions.canFold && (
            <button
              onClick={() => onAction({ type: 'fold' })}
              className="px-6 py-4 bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-black rounded-xl transition min-w-[120px] text-base shadow-lg border border-red-500/30"
            >
              フォールド
            </button>
          )}

          {availableActions.canCheck && (
            <button
              onClick={() => onAction({ type: 'check' })}
              className="px-6 py-4 bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-black rounded-xl transition min-w-[120px] text-base shadow-lg border border-blue-400/30"
            >
              チェック
            </button>
          )}

          {availableActions.canCall && (
            <button
              onClick={() => onAction({ type: 'call' })}
              className="px-6 py-4 bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-black rounded-xl transition min-w-[120px] text-base shadow-lg border border-blue-400/30"
            >
              <div>コール</div>
              <div className="text-xs opacity-80 font-mono">{formatBB(availableActions.callAmount, bigBlind)}BB</div>
            </button>
          )}

          {availableActions.canAllIn && !availableActions.canRaise && !availableActions.canCall && (
            <button
              onClick={() => onAction({ type: 'allIn' })}
              className="px-6 py-4 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-black rounded-xl transition min-w-[120px] text-base shadow-lg border border-red-300/30"
            >
              <div>オールイン</div>
              <div className="text-xs opacity-80 font-mono">{formatBB(availableActions.allInAmount, bigBlind)}BB</div>
            </button>
          )}

          {availableActions.canAllIn && availableActions.canRaise && (
            <button
              onClick={() => onAction({ type: 'allIn' })}
              className="px-6 py-4 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-black rounded-xl transition min-w-[120px] text-base shadow-lg border border-red-300/30"
            >
              <div>オールイン</div>
              <div className="text-xs opacity-80 font-mono">{formatBB(availableActions.allInAmount, bigBlind)}BB</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
