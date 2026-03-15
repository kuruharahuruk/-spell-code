import React, { useState, useEffect, useRef } from 'react';
import { Heart, HeartCrack, Layers, Shuffle, Play, Shield, Skull, Snowflake, ArrowRight, Users, Info, Settings, RotateCcw, Save, RefreshCcw, AlertTriangle, CheckCircle2, XCircle, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';

// --- デフォルトのカードリスト・データ ---
const DEFAULT_LAG_CODES = ['・デ・', '・ザ・', '・ル・', '・ラ・', '・ノ・', '・ダ・', '・ン・', '・マ・', '・ゼ・', '・ボ・'];
const DEFAULT_NORMAL_CODES = [
  'ボムス', 'プッロ', 'レフア', 'グアグ', 'クリア', 'ホルス', 'ザリフ', 'シルア', 'ブリザ', 'ダルク', 'ドザリ', 'ルボア', 'リョビ', 'ギャミ', 'ドイブ', 'スネダ',
  'バッログ', 'イグッニ', 'ドムラフ', 'スニッギ', 'ルギャミ', 'デイカシ', 'メヒュジ', 'クスラフ', 'テミシア', 'ルサリア', 'シッアル', 'グレイク', 'ボルテス', 'チサフル', 'イレグス', 'ドッムス', 'バキュシ', 'オテメス', 'ウソルア',
  'エクスプロ', 'フレイーム', 'ロプスクエ', 'ムーイレフ', 'イックシル', 'ルミャギメ', 'トッルネア', 'ドザリフス', 'テッラシア', 'ゲヘナック', 'アッビスマ', 'クナヘゲス', 'スビッアル'
];
const ROOT_CODES = ['パラレルプロ', 'セススクリプ'];

export default function App() {
  const [lagCodes, setLagCodes] = useState(DEFAULT_LAG_CODES);
  const [normalCodes, setNormalCodes] = useState(DEFAULT_NORMAL_CODES);
  
  const [prepareTime, setPrepareTime] = useState(3);
  const [chantTime, setChantTime] = useState(5);
  const [drawTime, setDrawTime] = useState(1.8);
  const [drawMode, setDrawMode] = useState('manual'); 
  
  const [player1Name, setPlayer1Name] = useState('PLAYER 1');
  const [player2Name, setPlayer2Name] = useState('PLAYER 2');
  const [maxLife, setMaxLife] = useState(3);

  const [deck, setDeck] = useState([]);
  const [p1, setP1] = useState({ life: 3, stack: [], frozen: false });
  const [p2, setP2] = useState({ life: 3, stack: [], frozen: false });
  const [logs, setLogs] = useState([]);
  const [modal, setModal] = useState(null); 
  const [drawCount, setDrawCount] = useState(0);
  
  const [gameState, setGameState] = useState('DRAW'); 
  const [firstPlayer, setFirstPlayer] = useState(1); 
  const [activePlayer, setActivePlayer] = useState(1); 
  const [drawnCards, setDrawnCards] = useState(null); 
  const [swapData, setSwapData] = useState(null); 
  const [swapTick, setSwapTick] = useState(false); 
  
  const [p1Ready, setP1Ready] = useState(false);
  const [p2Ready, setP2Ready] = useState(false);

  const [isFaceToFace, setIsFaceToFace] = useState(false);
  
  const [modalPhase, setModalPhase] = useState('IDLE'); 
  const [modalTimer, setModalTimer] = useState(0);
  const [tutorialStep, setTutorialStep] = useState(0); 
  
  const [editNormal, setEditNormal] = useState('');
  const [editLag, setEditLag] = useState('');
  const [editPrepareTime, setEditPrepareTime] = useState(3);
  const [editChantTime, setEditChantTime] = useState(5);
  const [editDrawTime, setEditDrawTime] = useState(1.8);
  const [editDrawMode, setEditDrawMode] = useState('manual');
  const [editIsFaceToFace, setEditIsFaceToFace] = useState(false);
  const [editPlayer1Name, setEditPlayer1Name] = useState('PLAYER 1');
  const [editPlayer2Name, setEditPlayer2Name] = useState('PLAYER 2');
  const [editMaxLife, setEditMaxLife] = useState(3);

  const logsEndRef = useRef(null);

  const isRootCode = (code) => code.includes("最古") || code.includes("パラレル") || code.includes("セススク");
  const getPlayerName = (num, p1n = player1Name, p2n = player2Name) => num === 1 ? p1n : p2n;

  useEffect(() => {
    initGame(normalCodes, lagCodes, maxLife, player1Name, player2Name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (modal && ['chant', 'defend', 'counter', 'sudden_death'].includes(modal.type)) {
      setModalPhase('INIT');
    } else {
      setModalPhase('IDLE');
      setModalTimer(0);
    }
  }, [modal?.type, modal?.attacker, modal?.defender, modal?.player]);

  useEffect(() => {
    if (!modal || !['chant', 'defend', 'counter', 'sudden_death'].includes(modal.type)) return;
    
    if (modalPhase === 'INIT') {
      setModalPhase('PREPARE');
      setModalTimer(prepareTime); 
      return;
    }

    if (modalTimer > 0) {
      const timer = setTimeout(() => setModalTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      if (modalPhase === 'PREPARE') {
        setModalPhase('CHANTING');
        setModalTimer(chantTime); 
      } else if (modalPhase === 'CHANTING') {
        setModalPhase('JUDGE'); 
      }
    }
  }, [modalTimer, modalPhase, modal, prepareTime, chantTime]);

  const handleModalSkip = () => {
    if (['INIT', 'PREPARE'].includes(modalPhase)) {
      setModalPhase('CHANTING');
      setModalTimer(chantTime);
    } else if (modalPhase === 'CHANTING') {
      setModalPhase('JUDGE');
    }
  };

  const log = (msg) => {
    setLogs(prev => [...prev, `[D${drawCount}] ${msg}`]);
  };

  const initGame = (currentNormal = normalCodes, currentLag = lagCodes, currentMaxLife = maxLife, p1Name = player1Name, p2Name = player2Name) => {
    let allCards = [...currentLag, ...ROOT_CODES, ...currentNormal];
    
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    if (currentLag.length > 0 && currentLag[0] === '・ハルク・') {
      const root1 = allCards.find(c => isRootCode(c)) || ROOT_CODES[0];
      const root2 = allCards.find(c => isRootCode(c) && c !== root1) || ROOT_CODES[1];
      allCards = allCards.filter(c => !isRootCode(c));

      const normalCards = allCards.filter(c => !c.startsWith('・'));
      const n1 = normalCards[0];
      const n2 = normalCards[1];
      allCards = allCards.filter(c => c !== n1 && c !== n2); 

      const targetPlayer = Math.random() < 0.5 ? 1 : 2;
      if (targetPlayer === 1) {
        allCards.unshift(n2);    
        allCards.unshift(root2); 
        allCards.unshift(n1);    
        allCards.unshift(root1); 
      } else {
        allCards.unshift(root2); 
        allCards.unshift(n2);    
        allCards.unshift(root1); 
        allCards.unshift(n1);    
      }
    }

    setDeck(allCards);
    setP1({ life: currentMaxLife, stack: [], frozen: false });
    setP2({ life: currentMaxLife, stack: [], frozen: false });
    setDrawCount(0);
    setFirstPlayer(1);
    setActivePlayer(1);
    setGameState('DRAW');
    setDrawnCards(null);
    setSwapData(null);
    setP1Ready(false);
    setP2Ready(false);
    setLogs([`システム初期化。${p1Name}先攻でゲーム開始。`]);
    setModal(null);
  };

  const handleSimultaneousDraw = () => {
    if (deck.length < 2) {
      log("[警告] 山札が枯渇！これ以上のドロー不可！強制的に詠唱せよ！");
      return;
    }

    const card1 = deck[0];
    const card2 = deck[1];
    
    setP1Ready(false);
    setP2Ready(false);
    setDrawnCards({ p1: card1, p2: card2 });
    setGameState('DRAWING');

    if (drawMode === 'auto') {
      setTimeout(() => {
        applyDrawResults(card1, card2);
      }, drawTime * 1000); 
    }
  };

  const handleDrawReady = (playerNum) => {
    const nextP1Ready = playerNum === 1 ? true : p1Ready;
    const nextP2Ready = playerNum === 2 ? true : p2Ready;
    
    setP1Ready(nextP1Ready);
    setP2Ready(nextP2Ready);

    if (nextP1Ready && nextP2Ready) {
      setTimeout(() => {
        applyDrawResults(drawnCards.p1, drawnCards.p2);
      }, 300);
    }
  };

  const handleSwapReady = (playerNum) => {
    const nextP1Ready = playerNum === 1 ? true : p1Ready;
    const nextP2Ready = playerNum === 2 ? true : p2Ready;
    
    setP1Ready(nextP1Ready);
    setP2Ready(nextP2Ready);

    if (nextP1Ready && nextP2Ready) {
      setTimeout(() => {
        setP1(prev => ({ ...prev, stack: swapData.newStack1, frozen: swapData.p1Lag }));
        setP2(prev => ({ ...prev, stack: swapData.newStack2, frozen: swapData.p2Lag }));
        if (swapData.p1Lag) log(`[休符] ${player1Name}フリーズ。`);
        if (swapData.p2Lag) log(`[休符] ${player2Name}フリーズ。`);
        log(`強制置換完了。${getPlayerName(activePlayer)}の選択フェーズ。`);
        
        setSwapData(null);
        setSwapTick(false);
        setGameState('ACTION');
      }, 400);
    }
  };

  const applyDrawResults = (card1, card2) => {
    const nextDrawCount = drawCount + 1;
    setDrawCount(nextDrawCount);
    setDeck(prev => prev.slice(2));

    const p1Lag = card1.startsWith("・");
    const p2Lag = card2.startsWith("・");
    const p1Root = isRootCode(card1);
    const p2Root = isRootCode(card2);

    const oldStack1 = [...p1.stack];
    const oldStack2 = [...p2.stack];

    let newStack1 = [];
    let newStack2 = [];
    let isSwapping = false;

    const p1SuddenDeath = p1Root && oldStack1.length > 0 && isRootCode(oldStack1[oldStack1.length - 1]);
    const p2SuddenDeath = p2Root && oldStack2.length > 0 && isRootCode(oldStack2[oldStack2.length - 1]);

    if (p1SuddenDeath) {
      setP1(prev => ({ ...prev, stack: [...oldStack1, card1], frozen: p1Lag }));
      setP2(prev => ({ ...prev, stack: [...oldStack2, card2], frozen: p2Lag }));
      setDrawnCards(null);
      setModal({ type: 'sudden_death', stack: [...oldStack1, card1], player: 1 });
      return;
    } else if (p2SuddenDeath) {
      setP1(prev => ({ ...prev, stack: [...oldStack1, card1], frozen: p1Lag }));
      setP2(prev => ({ ...prev, stack: [...oldStack2, card2], frozen: p2Lag }));
      setDrawnCards(null);
      setModal({ type: 'sudden_death', stack: [...oldStack2, card2], player: 2 });
      return;
    }

    if (p1Root && !p2Root) {
      log(`[警告] ${player1Name}がルート・コード検知！既存スタック強制スワップ！`);
      isSwapping = true;
    } else if (!p1Root && p2Root) {
      log(`[警告] ${player2Name}がルート・コード検知！既存スタック強制スワップ！`);
      isSwapping = true;
    } else if (p1Root && p2Root) {
      log(`[異常] 両者がルート・コードを検知！スワップ相殺！`);
    }

    setDrawnCards(null); 

    if (isSwapping) {
      newStack1 = [...oldStack2, card1];
      newStack2 = [...oldStack1, card2];

      setP1Ready(false);
      setP2Ready(false);
      setSwapData({ p1Old: oldStack1, p2Old: oldStack2, newStack1, newStack2, p1Lag, p2Lag, trigger: p1Root ? 1 : 2 });
      setGameState('SWAPPING');
      
      setTimeout(() => setSwapTick(true), 1200);
    } else {
      newStack1 = [...oldStack1, card1];
      newStack2 = [...oldStack2, card2];
      
      setP1(prev => ({ ...prev, stack: newStack1, frozen: p1Lag }));
      setP2(prev => ({ ...prev, stack: newStack2, frozen: p2Lag }));
      if (p1Lag) log(`[休符] ${player1Name}フリーズ。`);
      if (p2Lag) log(`[休符] ${player2Name}フリーズ。`);
      log(`両者にドロー。${getPlayerName(activePlayer)}の選択フェーズ。`);
      setGameState('ACTION');
    }
  };

  const handlePass = (playerNum) => {
    log(`${getPlayerName(playerNum)}がパスを選択。`);
    if (playerNum === firstPlayer) {
      const nextPlayer = firstPlayer === 1 ? 2 : 1;
      setActivePlayer(nextPlayer);
      setGameState('DRAW');
      log(`選択権が${getPlayerName(nextPlayer)}（後攻）に移行。次のドローフェーズへ。`);
    } else {
      const nextFirstPlayer = firstPlayer === 1 ? 2 : 1;
      setFirstPlayer(nextFirstPlayer);
      setActivePlayer(nextFirstPlayer);
      setGameState('DRAW');
      log(`両者パスでラウンド終了。次は${getPlayerName(nextFirstPlayer)}が先攻。`);
    }
  };

  const handleChant = (attackerNum) => {
    const attackerState = attackerNum === 1 ? p1 : p2;
    if (attackerState.stack.length === 0 || attackerState.frozen) return;
    setModal({ type: 'chant', attacker: attackerNum, stack: [...attackerState.stack] });
  };

  const resolveCombat = () => {
    setP1(prev => ({ ...prev, stack: [], frozen: false }));
    setP2(prev => ({ ...prev, stack: [], frozen: false }));
    const nextFirstPlayer = firstPlayer === 1 ? 2 : 1;
    setFirstPlayer(nextFirstPlayer);
    setActivePlayer(nextFirstPlayer);
    setGameState('DRAW');
  };

  const reverseString = (str) => str.split('').reverse().join('');

  const damagePlayer = (playerNum) => {
    let isDead = false;
    if (playerNum === 1) {
      const newLife = p1.life - 1;
      setP1(prev => ({ ...prev, life: newLife }));
      if (newLife <= 0) { isDead = true; setModal({ type: 'gameover', winner: 2 }); }
    } else {
      const newLife = p2.life - 1;
      setP2(prev => ({ ...prev, life: newLife }));
      if (newLife <= 0) { isDead = true; setModal({ type: 'gameover', winner: 1 }); }
    }
    return isDead;
  };

  const openSettings = () => {
    setEditNormal(normalCodes.join(' / '));
    setEditLag(lagCodes.join(' / '));
    setEditPrepareTime(prepareTime);
    setEditChantTime(chantTime);
    setEditDrawTime(drawTime);
    setEditDrawMode(drawMode);
    setEditIsFaceToFace(isFaceToFace);
    setEditPlayer1Name(player1Name);
    setEditPlayer2Name(player2Name);
    setEditMaxLife(maxLife);
    setModal({ type: 'settings' });
  };

  const saveSettings = () => {
    const newNormal = editNormal.split('/').map(s => s.trim()).filter(Boolean);
    const newLag = editLag.split('/').map(s => s.trim()).filter(Boolean);
    if (newNormal.length === 0 || newLag.length === 0) {
      alert("エラー：コードリストを空にすることはできません。");
      return;
    }
    
    const newPrep = Math.max(1, editPrepareTime);
    const newChant = Math.max(1, editChantTime);
    const newDraw = Math.max(0.5, editDrawTime);
    const newP1Name = editPlayer1Name.trim() || 'PLAYER 1';
    const newP2Name = editPlayer2Name.trim() || 'PLAYER 2';
    const newMaxLife = Math.min(3, Math.max(1, editMaxLife));

    setNormalCodes(newNormal);
    setLagCodes(newLag);
    setPrepareTime(newPrep);
    setChantTime(newChant);
    setDrawTime(newDraw);
    setDrawMode(editDrawMode);
    setIsFaceToFace(editIsFaceToFace);
    setPlayer1Name(newP1Name);
    setPlayer2Name(newP2Name);
    setMaxLife(newMaxLife);

    initGame(newNormal, newLag, newMaxLife, newP1Name, newP2Name);
  };

  const resetSettings = () => {
    setNormalCodes(DEFAULT_NORMAL_CODES);
    setLagCodes(DEFAULT_LAG_CODES);
    setPrepareTime(3);
    setChantTime(5);
    setDrawTime(1.8);
    setDrawMode('manual');
    setIsFaceToFace(false);
    setPlayer1Name('PLAYER 1');
    setPlayer2Name('PLAYER 2');
    setMaxLife(3);
    initGame(DEFAULT_NORMAL_CODES, DEFAULT_LAG_CODES, 3, 'PLAYER 1', 'PLAYER 2');
  };

  const LifeDisplay = ({ life, max }) => (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map(i => (
        <div key={i}>
          {i <= life ? <Heart className="text-red-500 fill-red-500 w-5 h-5" /> : <HeartCrack className="text-slate-600 w-5 h-5" />}
        </div>
      ))}
    </div>
  );

  const getModalActivePlayer = () => {
    if (!modal) return null;
    if (modal.type === 'chant') return modal.attacker;
    if (modal.type === 'defend') return modal.attacker === 1 ? 2 : 1;
    if (modal.type === 'counter') return modal.defender; 
    if (modal.type === 'sudden_death') return modal.player;
    if (modal.type === 'result') return modal.targetPlayer; 
    if (modal.type === 'gameover') return null; 
    return null;
  };
  const modalRotationClass = (isFaceToFace && getModalActivePlayer() === 2) ? 'rotate-180' : '';

  const getFormattedStackArray = (stack, isReverse = false) => {
    if (stack.length === 0) return [];
    let arr = isReverse ? stack.slice().reverse().map(reverseString) : stack.slice();
    
    return arr.map((code, idx) => {
      let formatted = code;
      if (idx === 0 && formatted.startsWith('・')) {
        formatted = formatted.substring(1);
      }
      if (idx === arr.length - 1 && formatted.endsWith('・')) {
        formatted = formatted.slice(0, -1);
      }
      if (idx < arr.length - 1 && formatted.endsWith('・') && arr[idx + 1].startsWith('・')) {
        formatted = formatted.slice(0, -1);
      }
      return formatted;
    });
  };

  const getDrawCardStyle = (code, playerNum) => {
    if (isRootCode(code)) return 'bg-yellow-950/90 border-yellow-400 text-yellow-100 shadow-[0_0_30px_rgba(234,179,8,0.6)] animate-pulse';
    if (code.startsWith('・') && activePlayer === playerNum) return 'bg-blue-900/80 border-blue-500 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.3)]';
    return 'bg-slate-800 border-slate-500 text-white';
  };

  const renderStack = (stack, isAttacker, isMain) => {
    if (stack.length === 0) return <span className="text-slate-600 text-sm w-full text-center">スタック空</span>;
    
    const formattedArr = getFormattedStackArray(stack, !isAttacker);
    const totalLen = Math.max(1, formattedArr.join('').length);

    const baseColor = isAttacker ? (isMain ? 'text-white' : 'text-red-300/50') : (isMain ? 'text-blue-100' : 'text-blue-300/50');
    const highlightColor = isMain ? 'text-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.6)]' : 'text-yellow-400/80';
    const highlightIdx = isAttacker ? formattedArr.length - 1 : 0; 
    const maxSize = isMain ? '1.125rem' : '0.875rem';

    return (
      <span 
        className={`font-bold ${baseColor} break-all transition-all leading-tight text-left flex-1 min-w-0`}
        style={{
          fontSize: `min(${maxSize}, calc(65vw / ${totalLen}))`,
          letterSpacing: totalLen > 20 ? '0px' : '0.1em'
        }}
      >
        {formattedArr.map((code, idx) => (
          <span key={idx} className={idx === highlightIdx ? highlightColor : ''}>{code}</span>
        ))}
      </span>
    );
  };

  const renderModalText = (isYellow = false) => {
    if (!modal) return null;
    const textContent = modal.stack.length > 0 ? getFormattedStackArray(modal.stack, modal.type === 'defend').join("") : "（不発）";
    const textLen = Math.max(1, textContent.length);
    const colorClass = isYellow ? 'text-yellow-400 border-yellow-700' : 'text-white border-slate-700';
    return (
        <div 
            className={`bg-black p-2 sm:p-4 rounded font-bold ${colorClass} ${modalPhase === 'JUDGE' ? 'mb-8' : 'mb-4'} border flex items-center justify-center overflow-hidden min-h-[80px] sm:min-h-[100px] transition-all w-full shadow-inner break-all leading-tight`}
            style={{
                fontSize: `min(2.5rem, calc(80vw / ${textLen}))`,
                letterSpacing: textLen > 15 ? '0px' : '0.1em'
            }}
        >
            {textContent}
        </div>
    );
  };

  const tutorialContents = [
    {
      title: "1. 呪文の構築 (ドロー)",
      desc: "毎ターンお互いにカードを引き、手元の「スタック（呪文の束）」に追加していきます。呪文が長くなるほど発動リスクと威力が上がります。",
      visual: <div className="text-xl sm:text-2xl font-bold tracking-widest text-slate-300 bg-slate-900 p-4 border border-slate-700 rounded w-full text-center">ボムス<span className="text-yellow-400 animate-pulse">・デ・</span></div>
    },
    {
      title: "2. 通常詠唱 (攻撃)",
      desc: "「詠唱」を選ぶと攻撃になります。自分のスタックを【左から右へ】一度も噛まずに読み上げます。成功すれば相手の防壁フェーズへ移ります。",
      visual: <div className="flex flex-col items-center gap-2 w-full"><span className="text-xs text-red-400 font-bold flex items-center gap-1">左から右へ読む！ <ArrowRight className="w-4 h-4"/></span><div className="text-lg sm:text-2xl font-bold tracking-widest text-white border border-red-500 bg-red-950/30 px-4 py-3 rounded w-full text-center">ボムス・デ・プッロ</div></div>
    },
    {
      title: "3. 反転詠唱 (防御)",
      desc: "相手の攻撃に対し、自分のスタックを【右から左へ（反転）】噛まずに読み上げ防壁を張ります。小文字（ッ等）はそのまま発音します。",
      visual: <div className="flex flex-col items-center gap-2 w-full"><span className="text-xs text-blue-400 font-bold flex items-center gap-1"><ArrowRight className="w-4 h-4 rotate-180"/> 右から左へ読む！</span><div className="text-lg sm:text-2xl font-bold tracking-widest text-blue-100 border border-blue-500 bg-blue-950/30 px-4 py-3 rounded w-full text-center">ロップ・デ・スムボ</div></div>
    },
    {
      title: "4. カウンター (反撃)",
      desc: "相手が詠唱を噛んで自滅した時は大チャンスです。防御側は自分のスタックを【通常詠唱】して追い討ちをかけられます。成功すれば相手にダメージを与えます。",
      visual: <RefreshCcw className="w-16 h-16 text-purple-500 mx-auto animate-spin-slow drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
    },
    {
      title: "5. ルート・コード (特殊)",
      desc: "「最古の欠片」を引くと、それまでのスタックがお互いに強制的に入れ替わります。さらに自身で連続して2枚引き当てると、即死か勝利かのサドンデスが発生します。",
      visual: <div className="text-xl sm:text-2xl font-bold tracking-widest text-yellow-400 border border-yellow-500 bg-yellow-950/50 px-4 py-3 rounded animate-pulse w-full text-center shadow-[0_0_15px_rgba(234,179,8,0.4)]">パラレルプロ</div>
    }
  ];

  return (
    // 最外郭コンテナ： h-[100dvh] でモバイルの動的ビューポートに対応し、pb-12 で下から押し上げる
    <div className="h-[100dvh] bg-slate-950 text-green-400 font-mono p-4 pb-12 flex flex-col max-w-2xl mx-auto select-none overflow-hidden relative">
      
      <style>{`
        @keyframes drawCard {
          0% { opacity: 0; transform: translateY(-30px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-draw {
          animation: drawCard 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes heartBeatPulse {
          0% { transform: scale(1); background-color: rgba(69, 10, 10, 0.95); }
          15% { transform: scale(1.02); background-color: rgba(127, 29, 29, 0.95); box-shadow: inset 0 0 50px rgba(220, 38, 38, 0.3); }
          30% { transform: scale(1); background-color: rgba(69, 10, 10, 0.95); }
          45% { transform: scale(1.02); background-color: rgba(127, 29, 29, 0.95); box-shadow: inset 0 0 50px rgba(220, 38, 38, 0.3); }
          100% { transform: scale(1); background-color: rgba(69, 10, 10, 0.95); }
        }
        .animate-heartbeat-bg {
          animation: heartBeatPulse 2s infinite ease-in-out;
        }
      `}</style>

      {/* --- ルートコードスワップ専用演出フェーズ --- */}
      {gameState === 'SWAPPING' && swapData && (
        <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center overflow-hidden">
          
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10 bg-slate-950/80 p-6 rounded-full border border-yellow-900/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
            <AlertTriangle className="w-12 h-12 text-yellow-500 animate-pulse" />
            <span className="text-yellow-400 font-bold tracking-widest text-lg">STACK OVERRIDE</span>
            <span className="text-xs text-yellow-600">ルート・コードによる強制置換</span>
          </div>

          <div className={`absolute left-0 right-0 flex flex-col items-center transition-all duration-1000 ease-in-out ${swapTick ? 'translate-y-[30vh]' : 'translate-y-[-35vh]'} ${isFaceToFace && !swapTick ? 'rotate-180' : ''}`}>
             <div className={`w-full max-w-[90vw] px-6 py-4 rounded-xl text-xl sm:text-2xl font-bold tracking-widest border-2 break-all text-center leading-tight shadow-lg z-20 ${swapTick ? 'border-red-500 text-white bg-slate-900 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'border-slate-600 text-slate-400 bg-slate-900'}`}>
               <span className={`text-[10px] block mb-1 font-bold ${swapTick ? 'text-red-400' : 'text-slate-500'}`}>
                 {swapTick ? `${player1Name} NEW STACK` : `${player2Name} OLD STACK`}
               </span>
               {swapData.p2Old.length > 0 ? getFormattedStackArray(swapData.p2Old, false).join("") : "（空）"}
             </div>
          </div>

          <div className={`absolute left-0 right-0 flex flex-col items-center transition-all duration-1000 ease-in-out ${swapTick ? 'translate-y-[-35vh]' : 'translate-y-[30vh]'} ${isFaceToFace && swapTick ? 'rotate-180' : ''}`}>
             <div className={`w-full max-w-[90vw] px-6 py-4 rounded-xl text-xl sm:text-2xl font-bold tracking-widest border-2 break-all text-center leading-tight shadow-lg z-20 ${swapTick ? 'border-blue-500 text-white bg-slate-900 shadow-[0_0_30px_rgba(59,130,246,0.4)]' : 'border-slate-600 text-slate-400 bg-slate-900'}`}>
               <span className={`text-[10px] block mb-1 font-bold ${swapTick ? 'text-blue-400' : 'text-slate-500'}`}>
                 {swapTick ? `${player2Name} NEW STACK` : `${player1Name} OLD STACK`}
               </span>
               {swapData.p1Old.length > 0 ? getFormattedStackArray(swapData.p1Old, false).join("") : "（空）"}
             </div>
             {swapTick && (
               <div className="mt-4 h-12 flex items-center justify-center z-20 animate-in fade-in zoom-in delay-1000 fill-mode-both">
                 {p2Ready ? (
                   <span className="text-green-400 font-bold flex items-center gap-2 text-lg truncate max-w-[200px]"><CheckCircle2 className="w-6 h-6 shrink-0"/> {player2Name} READY</span>
                 ) : (
                   <button onClick={() => handleSwapReady(2)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-full border border-slate-500 shadow-lg active:scale-95 transition-all truncate max-w-[200px]">
                     確認完了 ({player2Name})
                   </button>
                 )}
               </div>
             )}
          </div>
          
          {swapTick && (
            <div className={`absolute left-0 right-0 flex justify-center transition-all duration-1000 ease-in-out translate-y-[30vh]`}>
              <div className="mt-[110px] sm:mt-[130px] h-12 flex items-center justify-center z-20 animate-in fade-in zoom-in delay-1000 fill-mode-both">
                {p1Ready ? (
                   <span className="text-green-400 font-bold flex items-center gap-2 text-lg truncate max-w-[200px]"><CheckCircle2 className="w-6 h-6 shrink-0"/> {player1Name} READY</span>
                ) : (
                  <button onClick={() => handleSwapReady(1)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-full border border-slate-500 shadow-lg active:scale-95 transition-all truncate max-w-[200px]">
                    確認完了 ({player1Name})
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* --- ドロー演出専用オーバーレイ（DRAWINGフェーズ） --- */}
      {gameState === 'DRAWING' && drawnCards && (
        <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col items-center justify-between py-16 px-4 backdrop-blur-sm">
           <div className={`flex flex-col items-center justify-center transform transition-transform duration-300 ${isFaceToFace ? 'rotate-180' : ''} w-full`}>
             {drawnCards.p2.startsWith('・') && activePlayer === 2 && !isRootCode(drawnCards.p2) && (
               <div className="mb-4 text-blue-400 font-bold text-sm animate-pulse flex flex-col items-center animate-in fade-in zoom-in delay-300 fill-mode-both">
                 <span className="text-xs text-blue-500 mb-1">※このターン攻撃不可</span>
                 <span className="flex items-center gap-1"><Snowflake className="w-5 h-5" /> 詠唱回路フリーズ</span>
               </div>
             )}
             {isRootCode(drawnCards.p2) && (
               <div className="mb-4 text-yellow-400 font-bold text-sm animate-pulse flex flex-col items-center animate-in fade-in zoom-in delay-200 fill-mode-both">
                 <span className="text-xs text-yellow-500 mb-1">※システム権限の上書きを検知</span>
                 <span className="flex items-center gap-1"><AlertTriangle className="w-5 h-5" /> ルート・コード干渉</span>
               </div>
             )}
             <span className="text-green-500/70 mb-2 font-bold tracking-widest text-sm animate-pulse truncate max-w-[90vw]">{player2Name} DREW</span>
             <div 
               className={`px-4 sm:px-8 py-4 sm:py-6 rounded-2xl font-bold border-2 animate-draw w-full max-w-[90vw] flex items-center justify-center break-all leading-tight ${getDrawCardStyle(drawnCards.p2, 2)}`}
               style={{
                 fontSize: `min(3rem, calc(80vw / ${Math.max(1, drawnCards.p2.length)}))`,
                 letterSpacing: drawnCards.p2.length > 10 ? '0px' : '0.1em'
               }}
             >
               {drawnCards.p2}
             </div>
             {drawMode === 'manual' && (
               <div className="mt-6 h-12 flex items-center justify-center animate-in fade-in zoom-in delay-500 fill-mode-both">
                 {p2Ready ? (
                   <span className="text-green-400 font-bold flex items-center gap-2 text-lg truncate max-w-[200px]"><CheckCircle2 className="w-6 h-6 shrink-0"/> {player2Name} READY</span>
                 ) : (
                   <button onClick={() => handleDrawReady(2)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-full border border-slate-500 shadow-lg active:scale-95 transition-all truncate max-w-[200px]">
                     確認完了 ({player2Name})
                   </button>
                 )}
               </div>
             )}
           </div>

           <div className="text-green-500 font-bold tracking-widest animate-pulse flex items-center gap-2 text-lg">
             <Shuffle className="w-6 h-6 animate-spin shrink-0" />
             {drawMode === 'manual' ? 'WAITING FOR READY...' : 'ACCESSING...'}
           </div>

           <div className="flex flex-col items-center justify-center w-full">
             {drawnCards.p1.startsWith('・') && activePlayer === 1 && !isRootCode(drawnCards.p1) && (
               <div className="mb-4 text-blue-400 font-bold text-sm animate-pulse flex flex-col items-center animate-in fade-in zoom-in delay-300 fill-mode-both">
                 <span className="text-xs text-blue-500 mb-1">※このターン攻撃不可</span>
                 <span className="flex items-center gap-1"><Snowflake className="w-5 h-5" /> 詠唱回路フリーズ</span>
               </div>
             )}
             {isRootCode(drawnCards.p1) && (
               <div className="mb-4 text-yellow-400 font-bold text-sm animate-pulse flex flex-col items-center animate-in fade-in zoom-in delay-200 fill-mode-both">
                 <span className="text-xs text-yellow-500 mb-1">※システム権限の上書きを検知</span>
                 <span className="flex items-center gap-1"><AlertTriangle className="w-5 h-5" /> ルート・コード干渉</span>
               </div>
             )}
             <span className="text-green-500/70 mb-2 font-bold tracking-widest text-sm animate-pulse truncate max-w-[90vw]">{player1Name} DREW</span>
             <div 
               className={`px-4 sm:px-8 py-4 sm:py-6 rounded-2xl font-bold border-2 animate-draw w-full max-w-[90vw] flex items-center justify-center break-all leading-tight ${getDrawCardStyle(drawnCards.p1, 1)}`}
               style={{
                 fontSize: `min(3rem, calc(80vw / ${Math.max(1, drawnCards.p1.length)}))`,
                 letterSpacing: drawnCards.p1.length > 10 ? '0px' : '0.1em'
               }}
             >
               {drawnCards.p1}
             </div>
             {drawMode === 'manual' && (
               <div className="mt-6 h-12 flex items-center justify-center animate-in fade-in zoom-in delay-500 fill-mode-both">
                 {p1Ready ? (
                   <span className="text-green-400 font-bold flex items-center gap-2 text-lg truncate max-w-[200px]"><CheckCircle2 className="w-6 h-6 shrink-0"/> {player1Name} READY</span>
                 ) : (
                   <button onClick={() => handleDrawReady(1)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-full border border-slate-500 shadow-lg active:scale-95 transition-all truncate max-w-[200px]">
                     確認完了 ({player1Name})
                   </button>
                 )}
               </div>
             )}
           </div>
        </div>
      )}

      {/* --- ヘッダー領域 --- */}
      <header className="flex justify-between items-center border-b border-green-800 pb-2 mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-widest text-green-300">SC: OVERLOAD</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm">残: {deck.length}</span>
          </div>
          <button onClick={() => setModal({ type: 'rule' })} className="px-3 py-1 bg-slate-800 rounded hover:bg-slate-700 text-blue-400 border border-slate-600 transition-colors text-xs font-bold">
            ルール
          </button>
          <button onClick={openSettings} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* --- プレイヤー2 (上部) --- */}
      <div className={`p-4 rounded-lg border-2 ${p2.frozen && activePlayer === 2 ? 'border-blue-800 bg-blue-950/20' : (gameState === 'ACTION' && activePlayer === 2) ? 'border-green-500 bg-green-950/20' : 'border-slate-800 bg-slate-900'} mb-2 transition-transform duration-300 relative ${isFaceToFace ? 'rotate-180' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 truncate">
            {player2Name}
            {p2.frozen && activePlayer === 2 && <Snowflake className="text-blue-400 w-5 h-5 animate-pulse shrink-0" />}
            {gameState === 'ACTION' && activePlayer === 2 && <span className="text-xs bg-green-700 text-white px-2 py-1 rounded shrink-0">選択権あり</span>}
          </h2>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-600">
              {p2.stack.length} 枚
            </span>
            <LifeDisplay life={p2.life} max={maxLife} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="w-full bg-slate-950 p-2 rounded border border-slate-700 relative min-h-[70px] flex flex-col justify-center overflow-hidden break-all">
            {p2.stack.length > 0 ? (
              (gameState === 'ACTION' && activePlayer === 1) ? (
                <>
                  <div className="flex items-start gap-2 mb-1 w-full">
                    <span className="text-[10px] text-blue-400/80 font-bold border border-blue-900/50 bg-blue-950/30 px-1 rounded shrink-0 mt-0.5">防壁(反転)</span>
                    {renderStack(p2.stack, false, true)}
                  </div>
                  <div className="flex items-start gap-2 w-full">
                    <span className="text-[10px] text-red-400/80 font-bold border border-red-900/50 bg-red-950/30 px-1 rounded shrink-0 mt-0.5">反撃(通常)</span>
                    {renderStack(p2.stack, true, false)}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 w-full">
                    <span className="text-[10px] text-red-400/80 font-bold border border-red-900/50 bg-red-950/30 px-1 rounded shrink-0 mt-0.5">攻撃(通常)</span>
                    {renderStack(p2.stack, true, true)}
                  </div>
                </>
              )
            ) : (
              <span className="text-slate-600 text-sm w-full text-center">スタック空</span>
            )}
          </div>
          
          <div className="flex justify-center gap-2 h-12 w-full">
            {gameState === 'ACTION' && activePlayer === 2 ? (
              <>
                <button 
                  onClick={() => handleChant(2)}
                  disabled={p2.stack.length === 0 || p2.frozen}
                  className={`flex-1 rounded font-bold flex items-center justify-center gap-2 transition-colors ${p2.stack.length === 0 || p2.frozen ? 'bg-slate-800 text-slate-600' : 'bg-red-900/50 hover:bg-red-800/80 text-red-400 border border-red-800'}`}
                >
                  <Play className="w-5 h-5" /> 詠唱
                </button>
                <button 
                  onClick={() => handlePass(2)}
                  className="flex-1 rounded font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-5 h-5" /> パス
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm border border-dashed border-slate-700 rounded bg-slate-900/50">
                待機中
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- 中央エリア (ドローボタン) --- */}
      <div className="flex flex-col gap-2 my-2 min-h-[80px] justify-center relative w-full">
        {gameState === 'DRAW' || gameState === 'DRAWING' ? (
          <button 
            onClick={gameState === 'DRAW' ? handleSimultaneousDraw : undefined}
            disabled={deck.length < 2 || gameState === 'DRAWING'}
            className={`py-4 rounded-xl font-bold text-xl flex flex-col items-center justify-center gap-4 transition-colors ${deck.length < 2 || gameState === 'DRAWING' ? 'bg-slate-800 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-green-400 border border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] active:scale-95'} min-h-[80px] w-full`}
          >
            {isFaceToFace && (
              <div className="flex items-center gap-3 rotate-180 opacity-70">
                <Shuffle className="w-6 h-6 shrink-0" />
                <span className="truncate">DEAL ({getPlayerName(activePlayer)} のドロー)</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Shuffle className="w-6 h-6 shrink-0" />
              <span className="truncate">DEAL ({getPlayerName(activePlayer)} のドロー)</span>
            </div>
          </button>
        ) : (
          <div className="py-4 flex flex-col items-center justify-center min-h-[80px] rounded-xl border border-dashed border-green-800 bg-slate-900 text-green-500 font-bold gap-4 w-full text-lg">
            {isFaceToFace && (
              <span className="rotate-180 opacity-70 truncate max-w-[90vw]">{getPlayerName(activePlayer)} のアクション選択中...</span>
            )}
            <span className="truncate max-w-[90vw]">{getPlayerName(activePlayer)} のアクション選択中...</span>
          </div>
        )}
      </div>

      {/* --- プレイヤー1 (下部) --- mb-6 でさらに下から押し上げる */}
      <div className={`p-4 rounded-lg border-2 ${p1.frozen && activePlayer === 1 ? 'border-blue-800 bg-blue-950/20' : (gameState === 'ACTION' && activePlayer === 1) ? 'border-green-500 bg-green-950/20' : 'border-slate-800 bg-slate-900'} mb-6 transition-all relative`}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 truncate">
            {player1Name}
            {p1.frozen && activePlayer === 1 && <Snowflake className="text-blue-400 w-5 h-5 animate-pulse shrink-0" />}
            {gameState === 'ACTION' && activePlayer === 1 && <span className="text-xs bg-green-700 text-white px-2 py-1 rounded shrink-0">選択権あり</span>}
          </h2>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-600">
              {p1.stack.length} 枚
            </span>
            <LifeDisplay life={p1.life} max={maxLife} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="w-full bg-slate-950 p-2 rounded border border-slate-700 relative min-h-[70px] flex flex-col justify-center overflow-hidden break-all">
            {p1.stack.length > 0 ? (
              (gameState === 'ACTION' && activePlayer === 2) ? (
                <>
                  <div className="flex items-start gap-2 mb-1 w-full">
                    <span className="text-[10px] text-blue-400/80 font-bold border border-blue-900/50 bg-blue-950/30 px-1 rounded shrink-0 mt-0.5">防壁(反転)</span>
                    {renderStack(p1.stack, false, true)}
                  </div>
                  <div className="flex items-start gap-2 w-full">
                    <span className="text-[10px] text-red-400/80 font-bold border border-red-900/50 bg-red-950/30 px-1 rounded shrink-0 mt-0.5">反撃(通常)</span>
                    {renderStack(p1.stack, true, false)}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 w-full">
                    <span className="text-[10px] text-red-400/80 font-bold border border-red-900/50 bg-red-950/30 px-1 rounded shrink-0 mt-0.5">攻撃(通常)</span>
                    {renderStack(p1.stack, true, true)}
                  </div>
                </>
              )
            ) : (
              <span className="text-slate-600 text-sm w-full text-center">スタック空</span>
            )}
          </div>
          
          <div className="flex justify-center gap-2 h-12 w-full">
            {gameState === 'ACTION' && activePlayer === 1 ? (
              <>
                <button 
                  onClick={() => handleChant(1)}
                  disabled={p1.stack.length === 0 || p1.frozen}
                  className={`flex-1 rounded font-bold flex items-center justify-center gap-2 transition-colors ${p1.stack.length === 0 || p1.frozen ? 'bg-slate-800 text-slate-600' : 'bg-red-900/50 hover:bg-red-800/80 text-red-400 border border-red-800'}`}
                >
                  <Play className="w-5 h-5" /> 詠唱
                </button>
                <button 
                  onClick={() => handlePass(1)}
                  className="flex-1 rounded font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-5 h-5" /> パス
                </button>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm border border-dashed border-slate-700 rounded bg-slate-900/50">
                待機中
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- モーダル群 --- */}
      {modal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className={`bg-slate-900 border border-green-500 rounded-xl w-[95vw] max-w-4xl p-4 sm:p-6 text-center transform transition-transform duration-300 ${modalRotationClass} max-h-[95vh] overflow-y-auto flex flex-col ${modal.type === 'sudden_death' ? 'animate-heartbeat-bg border-red-600' : ''}`}>
            
            {/* 結果表示モーダル */}
            {modal.type === 'result' && (
              <div className="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in duration-300">
                {modal.status === 'success' ? (
                  <CheckCircle2 className="w-20 h-20 text-green-500 mb-4 animate-pulse" />
                ) : (
                  <XCircle className="w-20 h-20 text-red-500 mb-4 animate-pulse" />
                )}
                <h2 className={`text-3xl font-bold tracking-widest mb-2 ${modal.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {modal.title}
                </h2>
                <p className="text-slate-300 text-lg whitespace-pre-wrap leading-relaxed">{modal.message}</p>
                
                <button 
                  onClick={() => {
                    if (modal.action) modal.action();
                    else if (modal.nextModal) setModal(modal.nextModal);
                    else setModal(null);
                  }}
                  className="mt-8 px-10 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-500 flex items-center gap-2 active:scale-95 transition-transform w-full justify-center max-w-md mx-auto"
                >
                  NEXT <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* ルール・設定 */}
            {modal.type === 'rule' && (
              <div className="text-left text-slate-300 max-w-md mx-auto w-full">
                <div className="flex justify-between items-center mb-4 border-b border-blue-800 pb-2">
                  <h2 className="text-2xl font-bold text-blue-400">ルール・マニュアル</h2>
                  <button onClick={() => { setTutorialStep(0); setModal({ type: 'tutorial' }); }} className="flex items-center gap-1 text-xs bg-purple-900/50 hover:bg-purple-800 text-purple-300 px-3 py-1.5 rounded border border-purple-800 transition-colors font-bold shrink-0">
                    <BookOpen className="w-4 h-4" /> チュートリアル
                  </button>
                </div>
                <div className="space-y-4 text-sm font-sans leading-relaxed">
                  <p><strong>【目的】</strong><br/>魔術のコードを蓄積し、噛まずに読み上げて相手の精神力(ライフ)をゼロにしろ！</p>
                  <p><strong>【進行】</strong><br/>1. <strong>DEAL(ドロー)</strong>: 中央のボタンで両者にカードが配られる。<br/>2. <strong>選択</strong>: 「先攻」が【詠唱】か【パス】を選択。パスなら「後攻」に権利が移る。両者パスで次のDEALへ。</p>
                  <p><strong>【詠唱(アタック)】</strong><br/>自分のスタックを「通常詠唱（そのままの順）」で淀みなく読め！<br/><span className="text-green-400">成功 ⇒ 相手の【防壁フェーズ】へ移行</span><br/><span className="text-yellow-400">失敗(噛む) ⇒ 相手の【カウンターフェーズ】へ移行</span></p>
                  <p><strong>【防壁(ディフェンス)】</strong><br/>飛来した魔法に対し、自分のスタックを「反転詠唱（文字の並びも全て逆）」で読み上げて防壁を張れ！小文字はそのまま発音。<br/><span className="text-blue-400">成功 ⇒ 相殺（両者ノーダメージ・全リセット）</span><br/><span className="text-red-400">失敗(噛む) ⇒ 被弾して自分が1ダメージ（全リセット）</span></p>
                  <p><strong>【カウンター(追い討ち)】</strong><br/>自滅した相手に対し、自分の手札を「通常詠唱」して追い討ちしろ！<br/><span className="text-purple-400">成功 ⇒ 攻撃側(噛んだ側)に1ダメージ（全リセット）</span><br/><span className="text-slate-400">失敗 ⇒ 魔法不発。両者ノーダメージ（全リセット）</span></p>
                  <p><strong>【特殊コード】</strong><br/><strong>・休符（・デ・等）</strong>: 引いた瞬間フリーズ。そのターンは詠唱不可。<br/><strong>・ルートコード</strong>: 引くとそれまでのスタックが入れ替わる。自身で連続して2枚引くとサドンデス発生！</p>
                </div>
                <button onClick={() => setModal(null)} className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 rounded font-bold text-white border border-slate-600">閉じる</button>
              </div>
            )}

            {/* チュートリアル */}
            {modal.type === 'tutorial' && (
              <div className="text-left text-slate-300 max-w-md mx-auto w-full flex flex-col h-full">
                <h2 className="text-2xl font-bold text-purple-400 mb-4 border-b border-purple-800 pb-2 flex items-center gap-2">
                  <BookOpen className="w-6 h-6" /> チュートリアル {tutorialStep + 1}/5
                </h2>
                
                <div className="flex-1 flex flex-col items-center justify-center py-4 min-h-[250px]">
                  <h3 className="text-xl font-bold text-white mb-4">{tutorialContents[tutorialStep].title}</h3>
                  {tutorialContents[tutorialStep].visual}
                  <p className="mt-6 text-sm font-sans leading-relaxed text-slate-400 text-center px-2">
                    {tutorialContents[tutorialStep].desc}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-6 gap-4">
                  <button 
                    onClick={() => setTutorialStep(prev => Math.max(0, prev - 1))}
                    disabled={tutorialStep === 0}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  
                  <div className="flex gap-2">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className={`w-2 h-2 rounded-full ${tutorialStep === i ? 'bg-purple-500' : 'bg-slate-700'}`} />
                    ))}
                  </div>

                  {tutorialStep < 4 ? (
                    <button 
                      onClick={() => setTutorialStep(prev => Math.min(4, prev + 1))}
                      className="p-3 bg-purple-700 hover:bg-purple-600 text-white rounded-lg border border-purple-500 transition-colors shadow-lg shadow-purple-900/50"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => setModal(null)}
                      className="py-3 px-6 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg border border-green-500 transition-colors shadow-lg"
                    >
                      完了
                    </button>
                  )}
                </div>
              </div>
            )}

            {modal.type === 'settings' && (
              <div className="text-left text-slate-300 max-w-md mx-auto w-full">
                <h2 className="text-2xl font-bold text-purple-400 mb-4 border-b border-purple-800 pb-2 flex items-center justify-between">
                  <span>設定</span>
                  <button onClick={resetSettings} className="flex items-center gap-1 text-xs bg-red-900/50 hover:bg-red-800 text-red-300 px-2 py-1 rounded border border-red-800 transition-colors">
                    <RotateCcw className="w-3 h-3" /> 初期化
                  </button>
                </h2>
                <div className="space-y-4 text-sm font-sans">

                  <div className="bg-slate-900 p-3 rounded border border-slate-700">
                    <label className="block text-blue-400 font-bold mb-2">■ インターフェース設定</label>
                    <div className="flex gap-2">
                      <button onClick={() => setEditIsFaceToFace(false)} className={`flex-1 py-2 font-bold rounded text-xs transition-colors ${!editIsFaceToFace ? 'bg-blue-600 text-white border border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700'}`}>
                        対面OFF (1人用)
                      </button>
                      <button onClick={() => setEditIsFaceToFace(true)} className={`flex-1 py-2 font-bold rounded text-xs transition-colors ${editIsFaceToFace ? 'bg-blue-600 text-white border border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700'}`}>
                        対面ON (2人用)
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded border border-slate-700">
                    <label className="block text-blue-400 font-bold mb-2">■ プレイヤー設定</label>
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 flex flex-col">
                        <span className="text-slate-400 text-[10px] mb-1">プレイヤー1 (P1)</span>
                        <input type="text" value={editPlayer1Name} onChange={(e) => setEditPlayer1Name(e.target.value)} maxLength="10" className="w-full bg-black border border-slate-700 rounded p-2 text-white font-bold text-center focus:outline-none focus:border-green-500" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-slate-400 text-[10px] mb-1">プレイヤー2 (P2)</span>
                        <input type="text" value={editPlayer2Name} onChange={(e) => setEditPlayer2Name(e.target.value)} maxLength="10" className="w-full bg-black border border-slate-700 rounded p-2 text-white font-bold text-center focus:outline-none focus:border-green-500" />
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] mb-1 block">初期ライフ (1〜3)</span>
                      <div className="flex gap-2">
                        {[1, 2, 3].map(num => (
                          <button key={num} onClick={() => setEditMaxLife(num)} className={`flex-1 py-2 font-bold rounded text-xs transition-colors ${editMaxLife === num ? 'bg-red-600 text-white border border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.4)]' : 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700'}`}>
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded border border-slate-700">
                    <label className="block text-blue-400 font-bold mb-2">■ ドロー移行方式</label>
                    <div className="flex gap-2">
                      <button onClick={() => setEditDrawMode('auto')} className={`flex-1 py-2 font-bold rounded text-xs transition-colors ${editDrawMode === 'auto' ? 'bg-blue-600 text-white border border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700'}`}>
                        自動移行 (Auto)
                      </button>
                      <button onClick={() => setEditDrawMode('manual')} className={`flex-1 py-2 font-bold rounded text-xs transition-colors ${editDrawMode === 'manual' ? 'bg-blue-600 text-white border border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700'}`}>
                        双方確認 (Manual)
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-yellow-400 font-bold mb-1">■ タイマー設定 (秒)</label>
                    <div className="flex gap-2">
                      <div className={`flex-1 bg-black border ${editDrawMode === 'manual' ? 'border-slate-800 opacity-50' : 'border-slate-700'} rounded p-2 flex flex-col`}>
                        <span className="text-slate-400 text-[10px] mb-1">ドロー (演出)</span>
                        <input type="number" step="0.1" min="0.5" max="5.0" value={editDrawTime} disabled={editDrawMode === 'manual'} onChange={(e) => setEditDrawTime(parseFloat(e.target.value) || 0.5)} className="w-full bg-transparent text-white font-bold text-center focus:outline-none disabled:text-slate-500"/>
                      </div>
                      <div className="flex-1 bg-black border border-slate-700 rounded p-2 flex flex-col">
                        <span className="text-slate-400 text-[10px] mb-1">準備 (確認)</span>
                        <input type="number" min="1" max="10" value={editPrepareTime} onChange={(e) => setEditPrepareTime(parseInt(e.target.value) || 1)} className="w-full bg-transparent text-white font-bold text-center focus:outline-none"/>
                      </div>
                      <div className="flex-1 bg-black border border-slate-700 rounded p-2 flex flex-col">
                        <span className="text-slate-400 text-[10px] mb-1">詠唱 (本番)</span>
                        <input type="number" min="1" max="20" value={editChantTime} onChange={(e) => setEditChantTime(parseInt(e.target.value) || 1)} className="w-full bg-transparent text-white font-bold text-center focus:outline-none"/>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-green-400 font-bold mb-1 mt-4">■ カードリスト編集 (/)区切り</label>
                    <textarea value={editNormal} onChange={(e) => setEditNormal(e.target.value)} className="w-full h-24 bg-black border border-slate-700 rounded p-2 text-slate-300 font-mono text-xs focus:border-green-500 focus:outline-none"/>
                  </div>
                  <div>
                    <label className="block text-blue-400 font-bold mb-1">■ ラグ・コード (休符)</label>
                    <textarea value={editLag} onChange={(e) => setEditLag(e.target.value)} className="w-full h-12 bg-black border border-slate-700 rounded p-2 text-slate-300 font-mono text-xs focus:border-blue-500 focus:outline-none"/>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setModal(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded font-bold text-white border border-slate-600">キャンセル</button>
                  <button onClick={saveSettings} className="flex-1 py-3 bg-green-700 hover:bg-green-600 rounded font-bold text-white border border-green-500 flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" /> 保存して再起動
                  </button>
                </div>
              </div>
            )}

            {/* --- 各種フェーズの詠唱・判定モーダル --- */}
            {['chant', 'defend', 'counter', 'sudden_death'].includes(modal.type) && (
              <div className="flex flex-col h-full justify-center w-full">
                <h2 className={`text-xl sm:text-2xl font-bold mb-2 sm:mb-4 flex items-center justify-center gap-2 ${modal.type === 'chant' ? 'text-red-500' : modal.type === 'defend' ? 'text-blue-400' : modal.type === 'counter' ? 'text-purple-400' : 'text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]'}`}>
                  {modal.type === 'chant' && <Play className="w-6 h-6" />}
                  {modal.type === 'defend' && <Shield className="w-6 h-6" />}
                  {modal.type === 'counter' && <RefreshCcw className="w-6 h-6" />}
                  {modal.type === 'sudden_death' && <AlertTriangle className="w-8 h-8 animate-bounce" />}
                  {modal.type === 'sudden_death' ? '神の魔法の復元' : `${getPlayerName(modal.attacker || modal.defender || modal.player)} ${modal.type === 'defend' ? '反転' : '通常'}詠唱`}
                </h2>
                
                <div className="flex flex-col items-center mb-4 sm:mb-6 min-h-[70px] sm:min-h-[90px] justify-center relative w-full">
                  {['INIT', 'PREPARE'].includes(modalPhase) && (
                    <>
                      <span className="text-xs sm:text-sm text-slate-400 font-bold mb-1 sm:mb-2">
                        {modal.type === 'sudden_death' ? '最終詠唱準備・覚悟を決めろ' : 'コンパイル中・文字列を確認せよ'}
                      </span>
                      <span className={`text-4xl sm:text-5xl font-bold animate-pulse ${modal.type === 'sudden_death' ? 'text-red-500' : 'text-slate-300'}`}>{modalPhase === 'INIT' ? prepareTime : modalTimer}</span>
                    </>
                  )}
                  {modalPhase === 'CHANTING' && (
                    <>
                      <span className={`text-xs sm:text-sm font-bold mb-1 sm:mb-2 animate-pulse ${modal.type === 'sudden_death' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {modal.type === 'sudden_death' ? '詠唱開始！世界を支配しろ！' : '詠唱開始！'}
                      </span>
                      <span className={`text-5xl sm:text-6xl font-bold drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] ${modal.type === 'sudden_death' ? 'text-yellow-500' : 'text-red-500'}`}>{modalTimer}</span>
                    </>
                  )}
                  {modalPhase === 'JUDGE' && <span className="text-lg sm:text-xl font-bold text-slate-300">タイムアップ！判定せよ。</span>}
                </div>

                {renderModalText(modal.type === 'sudden_death')}

                {['INIT', 'PREPARE', 'CHANTING'].includes(modalPhase) && (
                  <div className="mt-auto max-w-md mx-auto w-full">
                    <button onClick={handleModalSkip} className="w-full py-3 sm:py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-600 transition-colors flex items-center justify-center gap-2 shadow-lg text-lg">
                      SKIP ⏭
                    </button>
                  </div>
                )}

                {modalPhase === 'JUDGE' && modal.type !== 'sudden_death' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-300 max-w-md mx-auto w-full mt-auto">
                    <button onClick={() => {
                      if (modal.type === 'chant') {
                        setModal({ type: 'result', targetPlayer: modal.attacker, status: 'success', title: 'SUCCESS', message: `詠唱完了。\n相手の【防壁フェーズ (反転)】へ...`, nextModal: { type: 'defend', attacker: modal.attacker, stack: modal.attacker === 1 ? p2.stack : p1.stack } });
                      } else if (modal.type === 'defend') {
                        setModal({ type: 'result', targetPlayer: modal.attacker === 1 ? 2 : 1, status: 'success', title: 'DEFENDED', message: `防壁展開成功！\n盤面をリセットする...`, action: () => { resolveCombat(); setModal(null); } });
                      } else if (modal.type === 'counter') {
                        setModal({ type: 'result', targetPlayer: modal.defender, status: 'success', title: 'COUNTER HIT', message: `追い打ち成功！相手にダメージ。\nリセットする...`, action: () => { const d = damagePlayer(modal.attacker); resolveCombat(); if(!d) setModal(null); } });
                      }
                    }} className="bg-green-600 hover:bg-green-500 text-white py-4 rounded font-bold text-lg shadow-[0_0_15px_rgba(34,197,94,0.3)]">成功</button>
                    <button onClick={() => {
                      if (modal.type === 'chant') {
                        setModal({ type: 'result', targetPlayer: modal.attacker, status: 'error', title: 'FAILED', message: `詠唱エラー！魔法暴発！\n相手の【カウンターフェーズ】へ...`, nextModal: { type: 'counter', defender: modal.attacker === 1 ? 2 : 1, stack: modal.attacker === 1 ? p2.stack : p1.stack, attacker: modal.attacker } });
                      } else if (modal.type === 'defend') {
                        const target = modal.attacker === 1 ? 2 : 1;
                        setModal({ type: 'result', targetPlayer: target, status: 'error', title: 'DAMAGE', message: `防壁突破！被弾！\nリセットする...`, action: () => { const d = damagePlayer(target); resolveCombat(); if(!d) setModal(null); } });
                      } else if (modal.type === 'counter') {
                        setModal({ type: 'result', targetPlayer: modal.defender, status: 'error', title: 'COUNTER FAILED', message: `追い打ち失敗。ノーダメージ。\nリセットする...`, action: () => { resolveCombat(); setModal(null); } });
                      }
                    }} className="bg-slate-700 hover:bg-slate-600 text-white py-4 rounded font-bold text-lg">噛んだ (失敗)</button>
                  </div>
                )}

                {modalPhase === 'JUDGE' && modal.type === 'sudden_death' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-300 max-w-md mx-auto w-full mt-auto">
                    <button onClick={() => {
                      log(`[奇跡] ${getPlayerName(modal.player)}が最古の魔法を詠唱完了！`);
                      setModal({ type: 'gameover', winner: modal.player });
                    }} className="bg-yellow-600 hover:bg-yellow-500 text-white py-4 rounded font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)]">完全詠唱 (勝利)</button>
                    <button onClick={() => {
                      log(`[致命的エラー] 脳が焼き切れた。${getPlayerName(modal.player)}死亡。`);
                      setModal({ type: 'gameover', winner: modal.player === 1 ? 2 : 1 });
                    }} className="bg-red-800 hover:bg-red-700 text-white py-4 rounded font-bold text-lg shadow-[0_0_20px_rgba(153,27,27,0.5)]">脳焼損 (即死)</button>
                  </div>
                )}
              </div>
            )}

            {modal.type === 'gameover' && (
              <div className="max-w-md mx-auto w-full">
                <Skull className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
                <h2 className="text-4xl font-bold text-green-400 mb-2 tracking-widest drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">WIN: {getPlayerName(modal.winner)}</h2>
                <h3 className="text-2xl font-bold text-red-500 mb-8 tracking-widest">LOSE: {getPlayerName(modal.winner === 1 ? 2 : 1)}</h3>
                <button onClick={() => initGame(normalCodes, lagCodes, maxLife, player1Name, player2Name)} className="bg-green-700 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold w-full text-xl shadow-[0_0_15px_rgba(34,197,94,0.4)]">システム再起動</button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}