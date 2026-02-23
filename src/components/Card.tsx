import React from 'react';
import { motion } from 'motion/react';
import { Card as CardType } from '../types';
import { Heart, Diamond, Club, Spade } from 'lucide-react';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  isPlayable?: boolean;
  isFaceDown?: boolean;
  className?: string;
}

const SuitIcon = ({ suit, size = 20 }: { suit: string; size?: number }) => {
  switch (suit) {
    case 'hearts': return <Heart size={size} className="fill-red-600 text-red-600" />;
    case 'diamonds': return <Diamond size={size} className="fill-red-600 text-red-600" />;
    case 'clubs': return <Club size={size} className="fill-slate-900 text-slate-900" />;
    case 'spades': return <Spade size={size} className="fill-slate-900 text-slate-900" />;
    default: return null;
  }
};

export const Card: React.FC<CardProps> = ({ card, onClick, isPlayable, isFaceDown, className = "" }) => {
  if (isFaceDown) {
    return (
      <motion.div
        layout
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-20 h-28 sm:w-24 sm:h-36 bg-blue-800 rounded-lg border-2 border-white/20 flex items-center justify-center card-shadow relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:10px_10px]" />
        <div className="w-12 h-16 sm:w-16 sm:h-24 border border-white/30 rounded flex items-center justify-center">
          <div className="text-white/40 font-bold text-xl sm:text-2xl">MJ</div>
        </div>
      </motion.div>
    );
  }

  if (!card) return null;

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 20 }
      }}
      whileHover={isPlayable ? { y: -10, scale: 1.05 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`
        w-20 h-28 sm:w-24 sm:h-36 bg-white rounded-lg border border-gray-300 flex flex-col p-2 card-shadow relative
        ${isPlayable ? 'cursor-pointer ring-2 ring-yellow-400 ring-offset-2 ring-offset-emerald-900' : 'opacity-90'}
        ${className}
      `}
    >
      <div className={`flex flex-col items-start leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        <span className="text-lg sm:text-xl font-bold font-display">{card.rank}</span>
        <SuitIcon suit={card.suit} size={14} />
      </div>
      
      <div className="flex-grow flex items-center justify-center">
        <SuitIcon suit={card.suit} size={32} />
      </div>
      
      <div className={`flex flex-col items-end leading-none rotate-180 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        <span className="text-lg sm:text-xl font-bold font-display">{card.rank}</span>
        <SuitIcon suit={card.suit} size={14} />
      </div>
    </motion.div>
  );
};
