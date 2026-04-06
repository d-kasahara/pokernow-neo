'use client';

import { Card as CardType, SUIT_SYMBOLS, SUIT_COLORS, RANK_DISPLAY } from '../../types/card';

interface CardProps {
  card?: CardType | null;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// サイズ設定（xl: コミュニティカード、lg: 自分のカード、md: 他プレイヤー、sm: 小）
const sizeConfig = {
  sm: {
    card: 'w-10 h-14',
    rank: 'text-sm',
    suit: 'text-xs',
    centerSuit: 'text-2xl',
    logo: 'text-[7px]',
  },
  md: {
    card: 'w-14 h-20',
    rank: 'text-lg',
    suit: 'text-base',
    centerSuit: 'text-3xl',
    logo: 'text-[10px]',
  },
  lg: {
    card: 'w-24 h-36',
    rank: 'text-3xl',
    suit: 'text-2xl',
    centerSuit: 'text-6xl',
    logo: 'text-base',
  },
  xl: {
    card: 'w-28 h-40',
    rank: 'text-4xl',
    suit: 'text-3xl',
    centerSuit: 'text-7xl',
    logo: 'text-lg',
  },
};

export function CardComponent({ card, faceDown = false, size = 'md', className = '' }: CardProps) {
  const config = sizeConfig[size];

  if (faceDown || !card) {
    // カード裏面：ダイヤモンドパターン風のスタイリッシュなデザイン
    return (
      <div
        className={`${config.card} rounded-xl relative overflow-hidden
          shadow-xl shadow-black/60 ${className}`}
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #0c1e5e 100%)',
          border: '2px solid #3b82f6',
        }}
      >
        {/* 装飾パターン */}
        <div
          className="absolute inset-[6%] rounded-lg border border-blue-300/30"
          style={{
            background:
              'repeating-linear-gradient(45deg, rgba(96, 165, 250, 0.15) 0px, rgba(96, 165, 250, 0.15) 2px, transparent 2px, transparent 8px)',
          }}
        />
        {/* 中央ロゴ */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-blue-950/60 rounded-full w-[55%] h-[55%] flex items-center justify-center border border-blue-400/40 shadow-inner">
            <span className={`text-blue-200 font-black tracking-tighter ${config.logo}`} style={{ fontFamily: 'Georgia, serif' }}>
              PN
            </span>
          </div>
        </div>
        {/* 光沢効果 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.2) 100%)',
          }}
        />
      </div>
    );
  }

  // 表面
  const color = SUIT_COLORS[card.suit];
  const isRed = color === 'red';
  const symbol = SUIT_SYMBOLS[card.suit];
  const display = RANK_DISPLAY[card.rank];

  // スート色の強化
  const rankColor = isRed ? 'text-rose-600' : 'text-slate-900';
  const suitColor = isRed ? 'text-rose-500' : 'text-slate-800';
  const watermarkColor = isRed ? 'text-rose-500/15' : 'text-slate-900/15';

  return (
    <div
      className={`${config.card} rounded-xl relative overflow-hidden
        shadow-xl shadow-black/50 ${className}`}
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
        border: '2px solid #cbd5e1',
      }}
    >
      {/* 上部光沢 */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
        }}
      />

      {/* 左上のランク+スート */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-[0.85]">
        <span className={`${rankColor} font-black ${config.rank}`} style={{ fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.02em' }}>
          {display}
        </span>
        <span className={`${suitColor} ${config.suit} leading-none mt-0.5`}>{symbol}</span>
      </div>

      {/* 中央のスート（透かし） */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`${watermarkColor} ${config.centerSuit} font-bold`}>{symbol}</span>
      </div>

      {/* 右下のランク+スート（逆さ） */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-[0.85] rotate-180">
        <span className={`${rankColor} font-black ${config.rank}`} style={{ fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.02em' }}>
          {display}
        </span>
        <span className={`${suitColor} ${config.suit} leading-none mt-0.5`}>{symbol}</span>
      </div>
    </div>
  );
}
