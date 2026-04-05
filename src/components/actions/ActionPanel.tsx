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
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

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

  // レイズ/ベットプリセット（Hooksは早期returnの前に配置する必要がある）
  const raisePresets = useMemo(() => {
    if (!availableActions?.canRaise) return [];
    const { minRaise, maxRaise } = availableActions;
    const presets: { label: string; amount: number }[] = [];

    presets.push({ label: 'Min', amount: minRaise });

    // プリセットはBB倍数で（ベット時: 2.5x, 3x / レイズ時: pot系）
    if (isBetAction) {
      // ベット時: 2.5BB, 3BB, 4BB, 5BB
      const presetMultiples = [2.5, 3, 4, 5];
      for (const mult of presetMultiples) {
        const amount = Math.floor(bigBlind * mult);
        if (amount > minRaise && amount < maxRaise) {
          presets.push({ label: `${mult}x`, amount });
        }
      }
    } else {
      // レイズ時: 1/2 Pot, Pot
      const halfPot = currentBet + Math.floor(totalPot / 2);
      if (halfPot > minRaise && halfPot < maxRaise) {
        presets.push({ label: '1/2 Pot', amount: halfPot });
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
      <div className="h-20 bg-gray-900/90 border-t border-gray-800 flex items-center justify-center px-4">
        <span className="text-gray-500 text-sm">相手のアクションを待っています...</span>
      </div>
    );
  }

  const handleRaise = () => {
    if (raiseAmount >= availableActions.maxRaise) {
      onAction({ type: 'allIn' });
    } else {
      onAction({ type: 'raise', amount: raiseAmount });
    }
    setShowRaiseSlider(false);
  };

  return (
    <div className="bg-gray-900/95 border-t border-gray-800">
      {/* タイマーバー */}
      {isMyTurn && (
        <div className="h-1.5 bg-gray-800 w-full">
          <div
            className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      <div className="p-3 md:p-4">
        {/* タイマー＆タイムバンク表示 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-mono font-bold ${
              actionTimerRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
            }`}>
              {actionTimerRemaining}秒
            </span>
          </div>
          {myTimeBankRemaining > 0 && (
            <button
              onClick={onUseTimeBank}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1"
            >
              <span>+30秒</span>
              <span className="bg-yellow-800 px-1.5 py-0.5 rounded text-[10px]">
                残り{myTimeBankRemaining}回
              </span>
            </button>
          )}
        </div>

        {/* レイズ/ベットスライダー */}
        {showRaiseSlider && availableActions.canRaise && (
          <div className="mb-3 bg-gray-800 rounded-xl p-3">
            <div className="flex gap-2 mb-3 flex-wrap">
              {raisePresets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => setRaiseAmount(preset.amount)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition ${
                    raiseAmount === preset.amount
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {preset.label}
                  <span className="ml-1 opacity-70">{formatBB(preset.amount, bigBlind)}BB</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-20">{formatBB(availableActions.minRaise, bigBlind)}BB</span>
              <input
                type="range"
                min={availableActions.minRaise}
                max={availableActions.maxRaise}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-xs text-gray-400 w-20 text-right">{formatBB(availableActions.maxRaise, bigBlind)}BB</span>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="text-white font-mono font-bold text-lg">
                {formatBB(raiseAmount, bigBlind)} BB
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRaiseSlider(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleRaise}
                  className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg text-sm hover:bg-emerald-500 transition"
                >
                  {raiseAmount >= availableActions.maxRaise
                    ? `オールイン ${formatBB(raiseAmount, bigBlind)}BB`
                    : `${raiseLabel} ${formatBB(raiseAmount, bigBlind)}BB`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2 justify-center">
          {availableActions.canFold && (
            <button
              onClick={() => onAction({ type: 'fold' })}
              className="px-6 py-3.5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl transition min-w-[100px] text-sm"
            >
              フォールド
            </button>
          )}

          {availableActions.canCheck && (
            <button
              onClick={() => onAction({ type: 'check' })}
              className="px-6 py-3.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl transition min-w-[100px] text-sm"
            >
              チェック
            </button>
          )}

          {availableActions.canCall && (
            <button
              onClick={() => onAction({ type: 'call' })}
              className="px-6 py-3.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl transition min-w-[100px] text-sm"
            >
              コール<br />
              <span className="text-xs opacity-80">{formatBB(availableActions.callAmount, bigBlind)}BB</span>
            </button>
          )}

          {availableActions.canRaise && (
            <button
              onClick={() => {
                setRaiseAmount(availableActions.minRaise);
                setShowRaiseSlider(!showRaiseSlider);
              }}
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition min-w-[100px] text-sm"
            >
              {raiseLabel}
            </button>
          )}

          {availableActions.canAllIn && !availableActions.canRaise && !availableActions.canCall && (
            <button
              onClick={() => onAction({ type: 'allIn' })}
              className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition min-w-[100px] text-sm"
            >
              オールイン<br />
              <span className="text-xs opacity-80">{formatBB(availableActions.allInAmount, bigBlind)}BB</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
