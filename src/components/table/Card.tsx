'use client';

import { Card as CardType, SUIT_SYMBOLS, SUIT_COLORS, RANK_DISPLAY } from '../../types/card';

interface CardProps {
  card?: CardType | null;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: { card: 'w-10 h-14', rank: 'text-sm', suit: 'text-xs', logo: 'text-[8px]', inner: 'w-3/4 h-3/4' },
  md: { card: 'w-14 h-20', rank: 'text-lg', suit: 'text-base', logo: 'text-xs', inner: 'w-3/4 h-3/4' },
  lg: { card: 'w-20 h-28', rank: 'text-2xl', suit: 'text-xl', logo: 'text-sm', inner: 'w-4/5 h-4/5' },
};

export function CardComponent({ card, faceDown = false, size = 'md', className = '' }: CardProps) {
  const config = sizeConfig[size];

  if (faceDown || !card) {
    // 裏面
    return (
      <div
        className={`${config.card} rounded-lg flex items-center justify-center
          bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 border-2 border-blue-600
          shadow-lg ${className}`}
      >
        <div className={`${config.inner} rounded border border-blue-500/40 bg-blue-900/60
          flex items-center justify-center`}>
          <div className="flex flex-col items-center">
            <span className={`text-blue-300 font-bold ${config.logo}`}>PN</span>
          </div>
        </div>
      </div>
    );
  }

  // 表面
  const color = SUIT_COLORS[card.suit];
  const textColor = color === 'red' ? 'text-red-600' : 'text-gray-900';
  const symbol = SUIT_SYMBOLS[card.suit];
  const display = RANK_DISPLAY[card.rank];

  return (
    <div
      className={`${config.card} rounded-lg relative overflow-hidden
        bg-white border-2 border-gray-200 shadow-lg ${className}`}
    >
      {/* 左上のランク+スート */}
      <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none">
        <span className={`${textColor} font-bold ${config.rank}`}>{display}</span>
        <span className={`${textColor} ${config.suit} -mt-0.5`}>{symbol}</span>
      </div>
      {/* 中央のスート（大） */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${textColor} opacity-20 ${size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-3xl' : 'text-2xl'}`}>
          {symbol}
        </span>
      </div>
      {/* 右下のランク+スート（逆さ） */}
      <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180">
        <span className={`${textColor} font-bold ${config.rank}`}>{display}</span>
        <span className={`${textColor} ${config.suit} -mt-0.5`}>{symbol}</span>
      </div>
    </div>
  );
}
