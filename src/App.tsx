/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card as CardComponent } from './components/Card';
import { Card, Suit, GameState, GameStatus } from './types';
import { createDeck, isPlayable, shuffle } from './utils';
import { Heart, Diamond, Club, Spade, RotateCcw, Trophy, User, Cpu, Info, Home } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    playerHand: [],
    aiHand: [],
    discardPile: [],
    currentSuit: null,
    turn: 'player',
    status: 'start',
    winner: null,
  });

  const [showInstructions, setShowInstructions] = useState(false);

  // Initialize game
  const initGame = useCallback(() => {
    const fullDeck = createDeck();
    const playerHand = fullDeck.splice(0, 8);
    const aiHand = fullDeck.splice(0, 8);
    const firstDiscard = fullDeck.pop()!;
    
    // If first discard is an 8, reshuffle or just pick another? 
    // Let's just reshuffle if it's an 8 to keep it simple for start.
    if (firstDiscard.rank === '8') {
      initGame();
      return;
    }

    setGameState({
      deck: fullDeck,
      playerHand,
      aiHand,
      discardPile: [firstDiscard],
      currentSuit: null,
      turn: 'player',
      status: 'playing',
      winner: null,
    });
  }, []);

  useEffect(() => {
    // We can pre-initialize the deck if we want, but let's wait for start button
  }, []);

  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  // AI Turn Logic
  useEffect(() => {
    if (gameState.turn === 'ai' && gameState.status === 'playing') {
      const timer = setTimeout(() => {
        const playableCards = gameState.aiHand.filter(card => 
          isPlayable(card, topCard, gameState.currentSuit)
        );

        if (playableCards.length > 0) {
          // AI strategy: prefer normal cards over 8s unless necessary
          const normalPlayable = playableCards.filter(c => c.rank !== '8');
          const cardToPlay = normalPlayable.length > 0 
            ? normalPlayable[Math.floor(Math.random() * normalPlayable.length)]
            : playableCards[0];

          playCard(cardToPlay, 'ai');
        } else if (gameState.deck.length > 0) {
          drawCard('ai');
        } else {
          // AI skips turn if no deck
          setGameState(prev => ({ ...prev, turn: 'player' }));
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.turn, gameState.status, gameState.aiHand, topCard, gameState.currentSuit, gameState.deck.length]);

  const drawCard = (who: 'player' | 'ai') => {
    if (gameState.deck.length === 0) {
      // If deck is empty, maybe reshuffle discard pile?
      if (gameState.discardPile.length > 1) {
        const newDeck = shuffle(gameState.discardPile.slice(0, -1));
        const lastCard = gameState.discardPile[gameState.discardPile.length - 1];
        setGameState(prev => ({
          ...prev,
          deck: newDeck,
          discardPile: [lastCard],
        }));
        // Recurse once to actually draw
        setTimeout(() => drawCard(who), 0);
      } else {
        // Truly empty, skip turn
        setGameState(prev => ({ ...prev, turn: who === 'player' ? 'ai' : 'player' }));
      }
      return;
    }

    const newDeck = [...gameState.deck];
    const drawnCard = newDeck.pop()!;
    
    setGameState(prev => {
      const isPlayer = who === 'player';
      const hand = isPlayer ? [...prev.playerHand, drawnCard] : [...prev.aiHand, drawnCard];
      
      return {
        ...prev,
        deck: newDeck,
        [isPlayer ? 'playerHand' : 'aiHand']: hand,
        turn: isPlayer ? 'ai' : 'player',
      };
    });
  };

  const playCard = (card: Card, who: 'player' | 'ai') => {
    const isPlayer = who === 'player';
    
    if (card.rank === '8') {
      if (isPlayer) {
        setGameState(prev => ({
          ...prev,
          status: 'choosing_suit',
          // We don't remove the card yet, we wait for suit selection
          // Actually, let's remove it and store it temporarily or just handle it in handleSuitSelect
        }));
        // Store the card being played
        setPendingEight(card);
        return;
      } else {
        // AI chooses suit based on its hand
        const suitCounts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
        gameState.aiHand.forEach(c => {
          if (c.id !== card.id) suitCounts[c.suit]++;
        });
        const bestSuit = (Object.keys(suitCounts) as Suit[]).reduce((a, b) => suitCounts[a] > suitCounts[b] ? a : b);
        
        executePlay(card, who, bestSuit);
      }
    } else {
      executePlay(card, who, null);
    }
  };

  const [pendingEight, setPendingEight] = useState<Card | null>(null);

  const executePlay = (card: Card, who: 'player' | 'ai', newSuit: Suit | null) => {
    setGameState(prev => {
      const isPlayer = who === 'player';
      const currentHand = isPlayer ? prev.playerHand : prev.aiHand;
      const newHand = currentHand.filter(c => c.id !== card.id);
      
      const nextStatus: GameStatus = newHand.length === 0 ? (isPlayer ? 'won' : 'lost') : 'playing';
      
      return {
        ...prev,
        [isPlayer ? 'playerHand' : 'aiHand']: newHand,
        discardPile: [...prev.discardPile, card],
        currentSuit: newSuit,
        turn: isPlayer ? 'ai' : 'player',
        status: nextStatus,
        winner: newHand.length === 0 ? who : null,
      };
    });
    setPendingEight(null);
  };

  const handleSuitSelect = (suit: Suit) => {
    if (pendingEight) {
      executePlay(pendingEight, 'player', suit);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-between p-4 relative overflow-hidden">
      {/* Header */}
      <div className="w-full flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-500 p-1.5 rounded-lg shadow-lg">
            <RotateCcw className="text-emerald-900 w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white drop-shadow-md">
            MEIJIA <span className="text-yellow-400">疯狂 8 点</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowInstructions(true)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <Info className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setGameState(prev => ({ ...prev, status: 'start' }))}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" /> 退出
          </button>
          <button 
            onClick={initGame}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> 重置
          </button>
        </div>
      </div>

      {/* AI Area */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-black/30 rounded-full border border-white/10">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">电脑对手 ({gameState.aiHand.length})</span>
          {gameState.turn === 'ai' && gameState.status === 'playing' && (
            <motion.div 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 rounded-full bg-blue-400"
            />
          )}
        </div>
        <div className="flex -space-x-12 sm:-space-x-16 h-32 sm:h-40 items-center">
          {gameState.aiHand.map((card, i) => (
            <CardComponent key={card.id} card={card} isFaceDown className="z-0" />
          ))}
        </div>
      </div>

      {/* Center Area: Deck and Discard */}
      <div className="flex items-center justify-center gap-8 sm:gap-16 my-4">
        {/* Draw Pile */}
        <div className="relative cursor-pointer group" onClick={() => gameState.turn === 'player' && gameState.status === 'playing' && drawCard('player')}>
          <div className="absolute -inset-2 bg-yellow-400/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <CardComponent card={gameState.deck[0]} isFaceDown className="z-10" />
            {gameState.deck.length > 1 && (
              <div className="absolute top-1 left-1 w-full h-full bg-blue-900 rounded-lg border border-white/10 -z-10" />
            )}
            <div className="absolute -bottom-6 left-0 w-full text-center text-xs font-bold text-white/60 uppercase tracking-widest">
              摸牌 ({gameState.deck.length})
            </div>
          </div>
        </div>

        {/* Discard Pile */}
        <div className="relative">
          <AnimatePresence mode="popLayout">
            {topCard && (
              <motion.div
                key={topCard.id}
                initial={{ x: -100, y: -50, rotate: -20, opacity: 0 }}
                animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                <CardComponent card={topCard} />
              </motion.div>
            )}
          </AnimatePresence>
          
          {gameState.currentSuit && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-xl border-2 border-yellow-400"
            >
              {gameState.currentSuit === 'hearts' && <Heart className="fill-red-600 text-red-600 w-6 h-6" />}
              {gameState.currentSuit === 'diamonds' && <Diamond className="fill-red-600 text-red-600 w-6 h-6" />}
              {gameState.currentSuit === 'clubs' && <Club className="fill-slate-900 text-slate-900 w-6 h-6" />}
              {gameState.currentSuit === 'spades' && <Spade className="fill-slate-900 text-slate-900 w-6 h-6" />}
            </motion.div>
          )}
          <div className="absolute -bottom-6 left-0 w-full text-center text-xs font-bold text-white/60 uppercase tracking-widest">
            弃牌堆
          </div>
        </div>
      </div>

      {/* Player Area */}
      <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
        <div className="flex items-center gap-2 px-3 py-1 bg-black/30 rounded-full border border-white/10">
          <User className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium">你的手牌 ({gameState.playerHand.length})</span>
          {gameState.turn === 'player' && gameState.status === 'playing' && (
            <motion.div 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 rounded-full bg-yellow-400"
            />
          )}
        </div>
        
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 overflow-x-auto pb-4 px-4 w-full">
          {gameState.playerHand.map((card) => (
            <CardComponent
              key={card.id}
              card={card}
              isPlayable={gameState.turn === 'player' && gameState.status === 'playing' && isPlayable(card, topCard, gameState.currentSuit)}
              onClick={() => playCard(card, 'player')}
            />
          ))}
        </div>
      </div>

      {/* Suit Picker Modal */}
      <AnimatePresence>
        {gameState.status === 'choosing_suit' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-emerald-800 border-2 border-yellow-400 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <h2 className="text-3xl font-bold font-display mb-2">疯狂 8 点!</h2>
              <p className="text-white/70 mb-8">请选择接下来的花色</p>
              
              <div className="grid grid-cols-2 gap-4">
                {(['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).map((suit) => (
                  <button
                    key={suit}
                    onClick={() => handleSuitSelect(suit)}
                    className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl hover:bg-yellow-100 transition-colors group"
                  >
                    {suit === 'hearts' && <Heart className="fill-red-600 text-red-600 w-12 h-12 group-hover:scale-110 transition-transform" />}
                    {suit === 'diamonds' && <Diamond className="fill-red-600 text-red-600 w-12 h-12 group-hover:scale-110 transition-transform" />}
                    {suit === 'clubs' && <Club className="fill-slate-900 text-slate-900 w-12 h-12 group-hover:scale-110 transition-transform" />}
                    {suit === 'spades' && <Spade className="fill-slate-900 text-slate-900 w-12 h-12 group-hover:scale-110 transition-transform" />}
                    <span className="mt-2 text-slate-900 font-bold uppercase text-xs tracking-widest">{suit}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setGameState(prev => ({ ...prev, status: 'playing' }));
                  setPendingEight(null);
                }}
                className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors border border-white/20"
              >
                返回
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {(gameState.status === 'won' || gameState.status === 'lost') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-white text-slate-900 rounded-3xl p-10 max-w-md w-full shadow-[0_0_50px_rgba(250,204,21,0.3)] text-center relative overflow-hidden"
            >
              {gameState.status === 'won' && (
                <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400" />
              )}
              
              <div className="mb-6 inline-flex p-4 bg-yellow-100 rounded-full">
                <Trophy className={`w-12 h-12 ${gameState.status === 'won' ? 'text-yellow-600' : 'text-slate-400'}`} />
              </div>
              
              <h2 className="text-5xl font-bold font-display mb-2">
                {gameState.status === 'won' ? '胜利!' : '失败'}
              </h2>
              <p className="text-slate-500 mb-8 text-lg">
                {gameState.status === 'won' 
                  ? '你赢了！打得太棒了。' 
                  : '电脑赢了。再试一次？'}
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={initGame}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xl transition-all shadow-lg hover:shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  <RotateCcw className="w-6 h-6" /> 重新开始
                </button>
                <button
                  onClick={() => setGameState(prev => ({ ...prev, status: 'start' }))}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-3"
                >
                  <Home className="w-6 h-6" /> 退出游戏
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white text-slate-900 rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold font-display">游戏规则</h2>
                <button onClick={() => setShowInstructions(false)} className="text-slate-400 hover:text-slate-600">
                  <RotateCcw className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <div className="space-y-4 text-slate-600">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">1</div>
                  <p>打出与弃牌堆顶部卡片<b>花色</b>或<b>点数</b>相同的牌。</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">2</div>
                  <p><b>数字 8 是万能牌！</b> 你可以随时打出 8 并指定新的花色。</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">3</div>
                  <p>如果你无牌可出，必须从牌堆<b>摸一张牌</b>。</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">4</div>
                  <p>最先<b>清空手牌</b>的玩家获胜！</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-8 py-3 bg-slate-900 text-white rounded-xl font-bold transition-colors"
              >
                我知道了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Screen */}
      <AnimatePresence>
        {gameState.status === 'start' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-900 p-4"
          >
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
            
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className="relative z-10 text-center max-w-lg w-full"
            >
              <div className="flex justify-center gap-4 mb-8">
                <motion.div animate={{ rotate: [-10, -15, -10] }} transition={{ repeat: Infinity, duration: 4 }} className="relative -mr-8">
                  <div className="w-24 h-36 bg-white rounded-xl border-2 border-gray-200 shadow-2xl flex items-center justify-center">
                    <Heart className="text-red-600 fill-red-600 w-12 h-12" />
                  </div>
                </motion.div>
                <motion.div animate={{ y: [-10, 0, -10] }} transition={{ repeat: Infinity, duration: 3 }} className="z-10">
                  <div className="w-24 h-36 bg-white rounded-xl border-2 border-yellow-400 shadow-2xl flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-slate-900 font-display">8</span>
                    <Spade className="text-slate-900 fill-slate-900 w-8 h-8" />
                  </div>
                </motion.div>
                <motion.div animate={{ rotate: [10, 15, 10] }} transition={{ repeat: Infinity, duration: 4 }} className="relative -ml-8">
                  <div className="w-24 h-36 bg-white rounded-xl border-2 border-gray-200 shadow-2xl flex items-center justify-center">
                    <Club className="text-slate-900 fill-slate-900 w-12 h-12" />
                  </div>
                </motion.div>
              </div>

              <h1 className="text-6xl sm:text-7xl font-bold font-display text-white mb-4 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                MEIJIA<span className="text-yellow-400">疯狂8点</span>
              </h1>
              <p className="text-emerald-100 text-lg mb-12 font-medium tracking-wide opacity-80">
                经典纸牌游戏 · 智慧与运气的对决
              </p>

              <div className="space-y-4">
                <button
                  onClick={initGame}
                  className="w-full py-5 bg-yellow-400 hover:bg-yellow-300 text-emerald-950 rounded-2xl font-bold text-2xl transition-all shadow-[0_8px_0_rgb(202,138,4)] active:translate-y-1 active:shadow-none"
                >
                  开始游戏
                </button>
                <button
                  onClick={() => setShowInstructions(true)}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-lg transition-all border border-white/20 shadow-[0_8px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
                >
                  游戏规则
                </button>
              </div>

              <div className="mt-12 text-white/40 text-sm font-medium uppercase tracking-[0.2em]">
                Meijia Games Studio
              </div>
            </motion.div>

            {/* Floating Cards Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: Math.random() * 100 + '%', 
                    y: '110%', 
                    rotate: Math.random() * 360 
                  }}
                  animate={{ 
                    y: '-10%', 
                    rotate: Math.random() * 360 + 360 
                  }}
                  transition={{ 
                    duration: 10 + Math.random() * 10, 
                    repeat: Infinity, 
                    delay: i * 2,
                    ease: "linear"
                  }}
                  className="absolute w-16 h-24 bg-white/5 rounded-lg border border-white/10"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decor */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] pointer-events-none -z-10 opacity-10">
        <div className="absolute top-1/4 left-1/4 rotate-12"><Heart size={200} /></div>
        <div className="absolute bottom-1/4 right-1/4 -rotate-12"><Spade size={200} /></div>
        <div className="absolute top-1/3 right-1/3 rotate-45"><Diamond size={150} /></div>
        <div className="absolute bottom-1/3 left-1/3 -rotate-45"><Club size={150} /></div>
      </div>
    </div>
  );
}
