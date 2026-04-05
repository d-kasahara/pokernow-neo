'use client';

import { useState } from 'react';
import { BlindLevel, TournamentSettings, DEFAULT_TOURNAMENT_SETTINGS } from '../../types/game';

// クライアント用ブラインドスケジュール定義
const DEFAULT_BLIND_SCHEDULE: BlindLevel[] = [
  { level: 1, smallBlind: 10, bigBlind: 20, ante: 0 },
  { level: 2, smallBlind: 15, bigBlind: 30, ante: 0 },
  { level: 3, smallBlind: 25, bigBlind: 50, ante: 0 },
  { level: 4, smallBlind: 50, bigBlind: 100, ante: 10 },
  { level: 5, smallBlind: 75, bigBlind: 150, ante: 15 },
  { level: 6, smallBlind: 100, bigBlind: 200, ante: 25 },
  { level: 7, smallBlind: 150, bigBlind: 300, ante: 25 },
  { level: 8, smallBlind: 200, bigBlind: 400, ante: 50 },
  { level: 9, smallBlind: 300, bigBlind: 600, ante: 75 },
  { level: 10, smallBlind: 500, bigBlind: 1000, ante: 100 },
  { level: 11, smallBlind: 750, bigBlind: 1500, ante: 150 },
  { level: 12, smallBlind: 1000, bigBlind: 2000, ante: 200 },
];

interface StructureSettingsProps {
  onSave: (settings: Partial<TournamentSettings>) => void;
  onClose: () => void;
}

// プリセットストラクチャー
const PRESETS = {
  turbo: {
    label: 'ターボ',
    description: '5分レベル / 5,000チップ',
    settings: {
      startingChips: 5000,
      blindLevelDuration: 300,
      blindSchedule: [] as BlindLevel[],
    },
  },
  standard: {
    label: 'スタンダード',
    description: '10分レベル / 10,000チップ',
    settings: {
      startingChips: 10000,
      blindLevelDuration: 600,
      blindSchedule: [] as BlindLevel[],
    },
  },
  deep: {
    label: 'ディープスタック',
    description: '15分レベル / 20,000チップ',
    settings: {
      startingChips: 20000,
      blindLevelDuration: 900,
      blindSchedule: [] as BlindLevel[],
    },
  },
};

export function StructureSettings({ onSave, onClose }: StructureSettingsProps) {
  const [startingChips, setStartingChips] = useState(DEFAULT_TOURNAMENT_SETTINGS.startingChips);
  const [blindLevelDuration, setBlindLevelDuration] = useState(DEFAULT_TOURNAMENT_SETTINGS.blindLevelDuration / 60); // 分で表示
  const [actionTimeout, setActionTimeout] = useState(DEFAULT_TOURNAMENT_SETTINGS.actionTimeout);
  const [timeBankCount, setTimeBankCount] = useState(DEFAULT_TOURNAMENT_SETTINGS.timeBankCount);
  const [timeBankSeconds, setTimeBankSeconds] = useState(DEFAULT_TOURNAMENT_SETTINGS.timeBankSeconds);
  const [blindSchedule, setBlindSchedule] = useState<BlindLevel[]>(DEFAULT_BLIND_SCHEDULE);
  const [showSchedule, setShowSchedule] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('standard');

  // プリセット適用
  const applyPreset = (key: string) => {
    const preset = PRESETS[key as keyof typeof PRESETS];
    if (!preset) return;
    setActivePreset(key);
    setStartingChips(preset.settings.startingChips);
    setBlindLevelDuration(preset.settings.blindLevelDuration / 60);
    setBlindSchedule(DEFAULT_BLIND_SCHEDULE);
  };

  // ブラインドレベル編集
  const updateBlindLevel = (index: number, field: keyof BlindLevel, value: number) => {
    const updated = [...blindSchedule];
    updated[index] = { ...updated[index], [field]: value };
    setBlindSchedule(updated);
  };

  // ブラインドレベル追加
  const addBlindLevel = () => {
    const lastLevel = blindSchedule[blindSchedule.length - 1];
    setBlindSchedule([...blindSchedule, {
      level: lastLevel.level + 1,
      smallBlind: lastLevel.smallBlind * 2,
      bigBlind: lastLevel.bigBlind * 2,
      ante: Math.floor(lastLevel.bigBlind * 2 * 0.1),
    }]);
  };

  // ブラインドレベル削除
  const removeBlindLevel = (index: number) => {
    if (blindSchedule.length <= 3) return; // 最低3レベル
    setBlindSchedule(blindSchedule.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      startingChips,
      blindLevelDuration: blindLevelDuration * 60,
      actionTimeout,
      timeBankCount,
      timeBankSeconds,
      blindSchedule,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-white">トーナメント設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* プリセット */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">プリセット</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`p-3 rounded-xl border text-center transition ${
                    activePreset === key
                      ? 'border-emerald-500 bg-emerald-900/30'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium text-white">{preset.label}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 基本設定 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">初期チップ</label>
              <input
                type="number"
                value={startingChips}
                onChange={(e) => setStartingChips(Number(e.target.value))}
                min={1000}
                step={1000}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">レベル時間（分）</label>
              <input
                type="number"
                value={blindLevelDuration}
                onChange={(e) => setBlindLevelDuration(Number(e.target.value))}
                min={1}
                max={60}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">持ち時間（秒）</label>
              <input
                type="number"
                value={actionTimeout}
                onChange={(e) => setActionTimeout(Number(e.target.value))}
                min={10}
                max={120}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">タイムバンク回数</label>
              <input
                type="number"
                value={timeBankCount}
                onChange={(e) => setTimeBankCount(Number(e.target.value))}
                min={0}
                max={10}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
          </div>

          {/* タイムバンク秒数 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">タイムバンク延長秒数</label>
            <input
              type="number"
              value={timeBankSeconds}
              onChange={(e) => setTimeBankSeconds(Number(e.target.value))}
              min={10}
              max={120}
              className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            />
          </div>

          {/* ブラインドスケジュール */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">ブラインドスケジュール</label>
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                {showSchedule ? '閉じる' : '編集する'}
              </button>
            </div>

            {/* プレビュー（常時表示） */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-700">
                    <th className="py-1.5 px-2 text-left">Lv</th>
                    <th className="py-1.5 px-2 text-right">SB</th>
                    <th className="py-1.5 px-2 text-right">BB</th>
                    <th className="py-1.5 px-2 text-right">Ante</th>
                    {showSchedule && <th className="py-1.5 px-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {blindSchedule.map((level, i) => (
                    <tr key={i} className="border-b border-gray-800/50 text-gray-300">
                      <td className="py-1.5 px-2">{level.level}</td>
                      {showSchedule ? (
                        <>
                          <td className="py-1 px-1">
                            <input
                              type="number"
                              value={level.smallBlind}
                              onChange={(e) => updateBlindLevel(i, 'smallBlind', Number(e.target.value))}
                              className="w-full px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-right text-xs text-white"
                            />
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="number"
                              value={level.bigBlind}
                              onChange={(e) => updateBlindLevel(i, 'bigBlind', Number(e.target.value))}
                              className="w-full px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-right text-xs text-white"
                            />
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="number"
                              value={level.ante}
                              onChange={(e) => updateBlindLevel(i, 'ante', Number(e.target.value))}
                              className="w-full px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-right text-xs text-white"
                            />
                          </td>
                          <td className="py-1 px-1">
                            <button
                              onClick={() => removeBlindLevel(i)}
                              className="text-red-500 hover:text-red-400 text-xs px-1"
                              disabled={blindSchedule.length <= 3}
                            >
                              ×
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-1.5 px-2 text-right">{level.smallBlind.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right">{level.bigBlind.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right">{level.ante > 0 ? level.ante.toLocaleString() : '-'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {showSchedule && (
                <div className="p-2">
                  <button
                    onClick={addBlindLevel}
                    className="w-full py-1.5 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 text-xs transition"
                  >
                    + レベルを追加
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
