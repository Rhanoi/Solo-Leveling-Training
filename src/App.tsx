import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sword, Activity, Brain, Eye, Plus, Droplets, Dumbbell, Flag, Swords, Coins, Heart, Skull, Map, ShoppingBag, PlusCircle, RefreshCw, Clock, Save, Edit3, Trash2, CheckSquare } from 'lucide-react';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1wDJP_MkDyR30F2R9q4JW8bAiRo268DywtTbCjD-tDiM4cXE8Y0qBhuc5xkX2hwT8/exec';

const App = () => {
  // --- AUTENTICAÇÃO E USUÁRIO ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // --- ESTADOS DO JOGO ---
  const [activeTab, setActiveTab] = useState('rotina');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [level, setLevel] = useState(1);
  const [rank, setRank] = useState('E');
  const [cycleDay, setCycleDay] = useState(1);
  const [gold, setGold] = useState(0);
  const [potions, setPotions] = useState(0);
  
  const [stats, setStats] = useState({ forca: 1, agilidade: 1, vitalidade: 1, inteligencia: 1, sentidos: 1 });
  
  const maxHp = 100 + (stats.vitalidade - 1) * 15;
  const [currentHp, setCurrentHp] = useState(maxHp);
  const [availablePoints, setAvailablePoints] = useState(0);

  // --- TREINOS CUSTOMIZÁVEIS E PENALIDADES ---
  const [customWorkouts, setCustomWorkouts] = useState([]);
  const [isEditingWorkouts, setIsEditingWorkouts] = useState(false);
  const [lastWorkoutDate, setLastWorkoutDate] = useState(null);
  const [penalties, setPenalties] = useState(0);
  const [hasTrainedToday, setHasTrainedToday] = useState(false);
  
  // --- LOGS ---
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);
  
  const [enemy, setEnemy] = useState(null);
  const [battleLogs, setBattleLogs] = useState([]);
  const battleLogEndRef = useRef(null);

  // --- PORTAIS ---
  const [portalsToday, setPortalsToday] = useState(0);
  const [nextPortalTime, setNextPortalTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Função robusta para ID único
  const generateId = () => Date.now().toString() + Math.random().toString(36).substring(2);

  useEffect(() => {
    const savedCreds = localStorage.getItem('solo_leveling_creds');
    if (savedCreds) {
      const parsed = JSON.parse(savedCreds);
      setUsername(parsed.user);
      setPassword(parsed.pass);
      setRememberMe(true);
    }
  }, []);

  const evaluatePenalties = (lastDateStr, currentPenalties, currentCycleDay) => {
    let updatedPenalties = parseInt(currentPenalties) || 0;
    let updatedCycleDay = parseInt(currentCycleDay) || 1;
    let trainedToday = false;
    let modified = false;

    if (lastDateStr) {
      const lastDate = new Date(lastDateStr);
      const todayDate = new Date();
      lastDate.setHours(0,0,0,0);
      todayDate.setHours(0,0,0,0);

      const diffTime = todayDate - lastDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        trainedToday = true;
      } else if (diffDays > 1) {
        // Quantos dias falhou? O dia 1 de falha é tolerado como descanso no ciclo, 
        // mas o sistema penaliza dias consecutivos de inatividade base.
        const missedDays = diffDays - 1; 
        updatedPenalties += missedDays;
        
        if (updatedPenalties >= 3) {
          updatedPenalties = 0;
          updatedCycleDay = 1;
          addLog(`[ZONA DE PENALIDADE]: 3 Faltas acumuladas! Seu ciclo voltou ao Dia 1.`, 'danger');
        } else {
          addLog(`[SISTEMA]: Você falhou ${missedDays} dia(s). Penalidades: ${updatedPenalties}/3.`, 'danger');
        }
        modified = true;
      }
    }
    
    setPenalties(updatedPenalties);
    setCycleDay(updatedCycleDay);
    setHasTrainedToday(trainedToday);
    
    return { modified, p: updatedPenalties, d: updatedCycleDay };
  };

  const handleAuth = async (action) => {
    if (!username || !password) {
      setAuthError("Preencha Usuário e Senha.");
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, user: username.trim(), password })
      });
      const data = await res.json();

      if (data.status === 'success') {
        if (rememberMe) {
          localStorage.setItem('solo_leveling_creds', JSON.stringify({ user: username.trim(), pass: password }));
        } else {
          localStorage.removeItem('solo_leveling_creds');
        }

        const d = data.data;
        setLevel(d.level); setRank(d.rank); setGold(d.gold); setPotions(d.pocoes);
        setCurrentHp(d.pv_atual); setAvailablePoints(d.pontos);
        setStats({ forca: d.forca, agilidade: d.agilidade, vitalidade: d.vitalidade, inteligencia: d.inteligencia, sentidos: d.sentidos });
        setCustomWorkouts(d.treinos && d.treinos.length > 0 ? d.treinos : ["10 Flexões", "10 Abdominais", "10 Agachamentos", "400 Levantamentos de Joelhos", "1 min de Prancha", "Halteres: 6 Rosca, 6 Martelo, 6 Remada"]);
        setLastWorkoutDate(d.ultimo_treino);
        
        setIsLoggedIn(true);
        addLog(`[SISTEMA]: Bem-vindo, Caçador ${username.trim()}.`, 'success');

        // Analisa penalidades de tempo
        const evalResult = evaluatePenalties(d.ultimo_treino, d.penalidades, d.dia_ciclo);
        if (evalResult.modified) {
           saveGameState({ penalidades: evalResult.p, dia_ciclo: evalResult.d });
        }

        // Carrega cooldowns de portais
        const storedPortals = JSON.parse(localStorage.getItem(`solo_leveling_cooldown_${username.trim()}`) || '{}');
        const today = new Date().toDateString();
        if (storedPortals.date !== today) {
          setPortalsToday(0); setNextPortalTime(null);
        } else {
          setPortalsToday(storedPortals.count || 0); setNextPortalTime(storedPortals.nextTime || null);
        }

      } else {
        setAuthError(data.message || "Erro de autenticação.");
      }
    } catch (error) {
      setAuthError("Erro ao contactar o servidor.");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!nextPortalTime) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= nextPortalTime) {
        setNextPortalTime(null); setTimeRemaining(''); clearInterval(interval);
      } else {
        const diff = nextPortalTime - now;
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${m}m ${s < 10 ? '0' : ''}${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextPortalTime]);

  const saveGameState = (overrides = {}) => {
    setIsSyncing(true);
    const payload = {
      action: 'update', user: username.trim(),
      level, rank, dia_ciclo: cycleDay, gold, pocoes: potions, pv_atual: currentHp, pontos: availablePoints,
      forca: stats.forca, agilidade: stats.agilidade, vitalidade: stats.vitalidade, inteligencia: stats.inteligencia, sentidos: stats.sentidos,
      ultimo_treino: lastWorkoutDate, penalidades: penalties,
      ...overrides
    };
    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
      .then(() => setIsSyncing(false))
      .catch(() => { addLog('[ERRO]: Falha ao salvar na nuvem.', 'danger'); setIsSyncing(false); });
  };

  const saveWorkoutsToCloud = (workoutsToSave) => {
    setIsSyncing(true);
    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_workouts', user: username.trim(), workouts: workoutsToSave }) })
      .then(() => { setIsSyncing(false); addLog('[SISTEMA]: Treino atualizado.', 'success'); setIsEditingWorkouts(false); })
      .catch(() => { setIsSyncing(false); addLog('[ERRO]: Falha ao salvar treino.', 'danger'); });
  };

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => { battleLogEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [battleLogs]);

  const addLog = (text, type = 'normal') => setLogs(prev => [...prev, { id: generateId(), text, type }]);
  const addBattleLog = (text, type = 'normal') => setBattleLogs(prev => [...prev, { id: generateId(), text, type }]);

  const applyPenaltyToWorkout = (workoutStr, penaltyCount) => {
    if (penaltyCount === 0 || !workoutStr) return workoutStr;
    const multiplier = 1 + (penaltyCount * 0.5);
    return workoutStr.replace(/\d+/g, (match) => {
      return Math.ceil(parseInt(match) * multiplier);
    });
  };

  const completeDailyWorkout = () => {
    const todayStr = new Date().toISOString();
    const newPoints = availablePoints + 2;
    const newGold = gold + 50;
    const newDay = cycleDay < 14 ? cycleDay + 1 : cycleDay;
    
    setAvailablePoints(newPoints); setGold(newGold); setCycleDay(newDay);
    setLastWorkoutDate(todayStr); setHasTrainedToday(true); setPenalties(0); // Treinar reseta penalidade
    
    addLog(`[QUEST DIÁRIA]: Treino concluído! +2 Pontos, +50 G.`, 'success');
    saveGameState({ pontos: newPoints, gold: newGold, dia_ciclo: newDay, ultimo_treino: todayStr, penalidades: 0 });
  };

  const completeRestDay = () => {
    const todayStr = new Date().toISOString();
    const newPoints = availablePoints + 1;
    const newGold = gold + 25;
    const newDay = cycleDay < 14 ? cycleDay + 1 : cycleDay;
    
    setAvailablePoints(newPoints); setGold(newGold); setCycleDay(newDay);
    setLastWorkoutDate(todayStr); setHasTrainedToday(true); setPenalties(0);

    addLog(`[RECUPERAÇÃO]: Meta de água/descanso batida! +1 Ponto, +25 G.`, 'success');
    saveGameState({ pontos: newPoints, gold: newGold, dia_ciclo: newDay, ultimo_treino: todayStr, penalidades: 0 });
  };

  const completeDungeon = () => {
    const todayStr = new Date().toISOString();
    const newLevel = level + 1;
    const newRank = rank === 'E' ? 'D' : (rank === 'D' ? 'C' : rank); // Simplificação de ranks
    
    setLevel(newLevel); setRank(newRank); setCycleDay(1);
    setLastWorkoutDate(todayStr); setHasTrainedToday(true); setPenalties(0);
    
    addLog(`[DUNGEON]: Sobreviveu à Masmorra! Rank Elevado para ${newRank}!`, 'success');
    saveGameState({ level: newLevel, rank: newRank, dia_ciclo: 1, ultimo_treino: todayStr, penalidades: 0 });
  };

  const portalTiers = {
    facil: [{ name: "Goblin Peste", hp: 30, atk: 5, goldDrop: [5, 10], logDesc: "Um goblin sujo surge das sombras." }],
    medio: [{ name: "Orc Guerreiro", hp: 80, atk: 15, goldDrop: [20, 35], logDesc: "Um orc corpulento levanta seu machado." }],
    dificil: [{ name: "Cavaleiro Sombrio", hp: 150, atk: 30, goldDrop: [50, 100], logDesc: "Uma armadura vazia emanando magia negra te encara." }]
  };

  const dungeons = {
    'E': ["20 Burpees c/ Salto", "50 Polichinelos", "3 Km de Corrida", "1,5 min de Prancha"],
    'D': ["30 Burpees c/ Salto", "60 Polichinelos", "4 Km de Corrida", "2 min de Prancha"],
    'C': ["40 Burpees c/ Salto", "80 Polichinelos", "5 Km de Corrida", "3 min de Prancha"]
  };

  const distributePoint = (statName) => {
    if (availablePoints > 0) {
      const newStats = { ...stats, [statName]: stats[statName] + 1 };
      setStats(newStats); setAvailablePoints(availablePoints - 1);
      addLog(`[ATUALIZAÇÃO]: +1 em ${statName.toUpperCase()}.`, 'upgrade');
      saveGameState({ [statName]: newStats[statName], pontos: availablePoints - 1 });
    }
  };

  const buyPotion = () => {
    if (gold >= 50) {
      setGold(gold - 50); setPotions(potions + 1);
      addLog(`[LOJA]: Poção adquirida.`, 'normal');
      saveGameState({ gold: gold - 50, pocoes: potions + 1 });
    }
  };

  const usePotion = (isCombat = false) => {
    if (potions > 0 && currentHp < maxHp) {
      const healAmount = Math.floor(maxHp * 0.5);
      const newHp = Math.min(maxHp, currentHp + healAmount);
      setPotions(potions - 1); setCurrentHp(newHp);
      if (isCombat) addBattleLog(`Poção consumida! +${healAmount} PV.`, 'success');
      else addLog(`[INVENTÁRIO]: Poção consumida. +${healAmount} PV.`, 'success');
      saveGameState({ pocoes: potions - 1, pv_atual: newHp });
    }
  };

  const handleEnterPortal = (difficulty) => {
    if (portalsToday >= 3) { addLog('[SISTEMA]: Você atingiu o limite de 3 portais.', 'danger'); return; }
    if (nextPortalTime && Date.now() < nextPortalTime) { addLog(`[SISTEMA]: Energia instável. Aguarde.`, 'danger'); return; }

    const newCount = portalsToday + 1;
    const newTime = Date.now() + 3600000;
    setPortalsToday(newCount); setNextPortalTime(newTime);
    localStorage.setItem(`solo_leveling_cooldown_${username.trim()}`, JSON.stringify({ date: new Date().toDateString(), count: newCount, nextTime: newTime }));

    const enemiesList = portalTiers[difficulty];
    const selectedEnemy = { ...enemiesList[Math.floor(Math.random() * enemiesList.length)] };
    setEnemy(selectedEnemy); setActiveTab('combate');
    setBattleLogs([ { id: generateId(), text: `Entrando no Portal ${difficulty.toUpperCase()}... (${newCount}/3 hoje)`, type: 'system' }, { id: generateId(), text: selectedEnemy.logDesc, type: 'danger' } ]);
  };

  const attackTurn = () => {
    if (!enemy || currentHp <= 0) return;
    let eHp = enemy.hp; let pHp = currentHp;
    
    let variation = Math.random() * (10 / stats.inteligencia);
    let playerDmg = Math.floor(5 + (stats.forca * 2.5) + variation);
    let isCrit = Math.random() < (stats.sentidos * 0.05);
    
    if (isCrit) { playerDmg = Math.floor(playerDmg * 1.5); addBattleLog(`CRÍTICO! Dano massivo de ${playerDmg}!`, 'upgrade'); } 
    else addBattleLog(`Você ataca causando ${playerDmg} de dano.`, 'normal');

    eHp -= playerDmg;
    if (eHp <= 0) {
      const gDrop = Math.floor(Math.random() * (enemy.goldDrop[1] - enemy.goldDrop[0] + 1)) + enemy.goldDrop[0];
      setGold(gold + gDrop); setEnemy({ ...enemy, hp: 0 });
      addBattleLog(`VITÓRIA! Ganhou ${gDrop} G.`, 'success');
      saveGameState({ gold: gold + gDrop, pv_atual: pHp });
      setTimeout(() => setActiveTab('portais'), 2000);
      return;
    }
    setEnemy(prev => ({ ...prev, hp: eHp }));

    setTimeout(() => {
      if (eHp > 0) {
        if (Math.random() < (stats.agilidade * 0.03)) {
          addBattleLog(`ESQUIVOU! O golpe passou no vazio.`, 'upgrade');
        } else {
          let enemyDmg = Math.max(1, enemy.atk - Math.floor(stats.vitalidade * 0.5));
          pHp -= enemyDmg;
          addBattleLog(`${enemy.name} atacou. Sofreu ${enemyDmg} de dano.`, 'danger');
          if (pHp <= 0) {
            setCurrentHp(1); addBattleLog(`O Sistema te resgatou com 1 PV.`, 'danger');
            saveGameState({ pv_atual: 1 });
            setTimeout(() => { setActiveTab('rotina'); addLog(`[ALERTA]: Ferimentos graves.`, 'danger'); }, 3000);
          } else setCurrentHp(pHp);
        }
      }
    }, 500);
  };

  const fleeBattle = () => { addBattleLog(`Fugindo...`, 'system'); saveGameState({ pv_atual: currentHp }); setTimeout(() => setActiveTab('portais'), 1000); };

  const isWorkoutDay = cycleDay % 2 !== 0 && cycleDay < 13;
  const isRestDay = cycleDay % 2 === 0 && cycleDay < 13;
  const isDungeonDay = cycleDay === 13 || cycleDay === 14;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-gray-300 font-mono flex items-center justify-center p-4">
        <div className="bg-[#111115] border border-blue-900/50 p-8 rounded-lg shadow-[0_0_40px_rgba(30,58,138,0.2)] max-w-md w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 via-blue-500 to-blue-900"></div>
          <h1 className="text-3xl font-bold text-center text-blue-500 mb-2 uppercase tracking-widest">SISTEMA</h1>
          <p className="text-center text-gray-500 mb-8 text-sm">Registro de Caçadores Independentes</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1">Nome do Caçador</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black border border-gray-800 rounded p-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="Ex: Sung Jin-Woo" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1">Senha (Mín 3 Caracteres)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-gray-800 rounded p-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-gray-400">
               <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="form-checkbox bg-black border-gray-800 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900" />
               Salvar credenciais neste dispositivo
            </label>

            {authError && <div className="text-red-500 text-sm text-center font-bold bg-red-900/20 p-2 rounded">{authError}</div>}
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <button onClick={() => handleAuth('login')} disabled={authLoading} className="py-3 bg-blue-900/40 hover:bg-blue-800 border border-blue-700 text-blue-200 rounded font-bold tracking-widest text-sm transition-colors disabled:opacity-50">ENTRAR</button>
              <button onClick={() => handleAuth('register')} disabled={authLoading} className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 rounded font-bold tracking-widest text-sm transition-colors disabled:opacity-50">REGISTRAR</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-gray-300 font-mono flex flex-col relative overflow-x-hidden">
      {isSyncing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col items-center justify-end pb-4 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/80 px-4 py-2 rounded-full border border-blue-900/50">
            <RefreshCw className="text-blue-500 animate-spin" size={16} /> <span className="text-blue-400 text-xs">Sincronizando...</span>
          </div>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className="bg-[#111115] border-b border-blue-900/50 p-3 sm:p-4 sticky top-0 z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="text-lg sm:text-xl font-bold text-blue-400 tracking-widest flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-white uppercase truncate max-w-[150px] sm:max-w-[200px]" title={username}>{username}</span> 
              <span className="hidden sm:inline text-gray-600">|</span> 
              <span className="text-blue-500">NÍVEL {level}</span>
            </div>
            <div className="px-3 py-1 bg-blue-900/30 border border-blue-700 text-blue-300 rounded text-xs sm:text-sm font-bold">
              RANK {rank}
            </div>
          </div>
          
          <div className="flex w-full sm:w-auto justify-between sm:justify-end items-center gap-4 sm:gap-6 bg-black/30 sm:bg-transparent p-2 sm:p-0 rounded border border-gray-800 sm:border-transparent">
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Heart size={16} className="text-red-500" />
              <div className="w-full sm:w-24 md:w-32 bg-gray-800 h-3 rounded overflow-hidden border border-red-900">
                <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${Math.max(0, (currentHp / maxHp) * 100)}%` }} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-red-400 whitespace-nowrap">{currentHp}/{maxHp}</span>
            </div>
            
            <div className="flex items-center gap-1 font-bold text-yellow-500 whitespace-nowrap">
              <Coins size={16} /> <span className="text-xs sm:text-sm">{gold} G</span>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO */}
        <div className="max-w-6xl mx-auto mt-3 sm:mt-4 flex bg-gray-900/40 rounded-t-md overflow-hidden border-b border-blue-900/30">
          <button onClick={() => setActiveTab('rotina')} disabled={activeTab === 'combate'} className={`flex-1 py-3 px-2 flex justify-center items-center gap-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'rotina' ? 'bg-blue-900/50 text-blue-300 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300 disabled:opacity-30'}`}>
            <Dumbbell size={16} /> <span className="hidden sm:inline">Rotina Real</span><span className="sm:hidden">Rotina</span>
          </button>
          <button onClick={() => setActiveTab('portais')} disabled={activeTab === 'combate'} className={`flex-1 py-3 px-2 flex justify-center items-center gap-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'portais' ? 'bg-purple-900/40 text-purple-300 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300 disabled:opacity-30'}`}>
            <Map size={16} /> <span className="hidden sm:inline">Portais (Jogo)</span><span className="sm:hidden">Portais</span>
          </button>
        </div>
      </header>

      <main className="flex-grow p-3 sm:p-4 md:p-8 flex justify-center w-full">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* STATUS PANEL */}
          <div className="col-span-1 lg:col-span-1 border border-gray-800 bg-[#111115] p-4 sm:p-5 rounded-md flex flex-col shadow-lg h-fit order-2 lg:order-1">
            <h2 className="text-blue-400 font-bold border-b border-gray-700 pb-2 mb-4 uppercase tracking-widest text-xs sm:text-sm">Status</h2>
            <div className={`text-xs sm:text-sm mb-4 font-bold ${availablePoints > 0 ? 'text-yellow-500 animate-pulse' : 'text-gray-500'}`}>Pontos: {availablePoints}</div>
            <div className="space-y-4">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {key === 'forca' && <Sword size={16} className="text-red-400" />}
                    {key === 'agilidade' && <Activity size={16} className="text-green-400" />}
                    {key === 'vitalidade' && <Shield size={16} className="text-orange-400" />}
                    {key === 'inteligencia' && <Brain size={16} className="text-purple-400" />}
                    {key === 'sentidos' && <Eye size={16} className="text-teal-400" />}
                    <span className="capitalize text-gray-300 font-semibold text-xs sm:text-sm">{key}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-bold text-white w-6 text-right">{value}</span>
                    <button onClick={() => distributePoint(key)} disabled={availablePoints <= 0} className={`p-1.5 rounded transition-colors ${availablePoints > 0 ? 'bg-blue-900/50 hover:bg-blue-700 text-blue-300 border border-blue-600' : 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed'}`}><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-800">
              <h3 className="text-yellow-500 font-bold uppercase tracking-widest text-xs sm:text-sm mb-3 flex items-center gap-2"><ShoppingBag size={14} /> Loja do Sistema</h3>
              <div className="bg-black/50 p-3 rounded border border-gray-700 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-gray-300 flex items-center gap-2"><PlusCircle size={12} className="text-red-400"/> Poções:</span>
                  <span className="font-bold text-white">{potions}</span>
                </div>
                <button onClick={() => usePotion(false)} disabled={potions <= 0 || currentHp >= maxHp} className="w-full py-2 bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded border border-red-800/50 text-[10px] sm:text-xs font-bold transition-colors disabled:opacity-30">USAR POÇÃO (Cura 50%)</button>
                <button onClick={buyPotion} disabled={gold < 50} className="w-full py-2 bg-yellow-900/30 hover:bg-yellow-800/50 text-yellow-500 rounded border border-yellow-800/50 text-[10px] sm:text-xs font-bold transition-colors disabled:opacity-30 flex justify-center items-center gap-1">COMPRAR POÇÃO <Coins size={10}/> 50</button>
              </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 sm:gap-6 order-1 lg:order-2">
            
            {/* TAB: ROTINA REAL */}
            {activeTab === 'rotina' && (
              <>
                <div className="border border-blue-900/40 bg-blue-950/10 p-4 sm:p-6 rounded-md relative overflow-hidden shadow-lg min-h-[300px]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 via-blue-500 to-blue-900"></div>
                  
                  <div className="flex justify-between items-center border-b border-blue-900/50 pb-3 mb-6">
                    <h2 className="text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2 text-sm sm:text-base">
                      <Flag size={18} /> Missão Diária 
                      {penalties > 0 && <span className="ml-2 px-2 py-0.5 bg-red-900/80 text-red-300 text-[10px] rounded border border-red-700 shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse">PENALIDADE: {penalties}/3</span>}
                    </h2>
                    <div className="flex items-center gap-2">
                       {!isEditingWorkouts && isWorkoutDay && (
                         <button onClick={() => setIsEditingWorkouts(true)} className="text-gray-400 hover:text-white bg-black/50 p-1.5 rounded border border-gray-700 transition-colors" title="Personalizar Treino"><Edit3 size={16}/></button>
                       )}
                       <span className="text-xs sm:text-sm font-bold text-gray-400 bg-gray-900 px-3 py-1 rounded">Dia {cycleDay}/14</span>
                    </div>
                  </div>

                  {/* MODO DE EDIÇÃO DE TREINO */}
                  {isEditingWorkouts ? (
                     <div className="animate-fade-in bg-black/40 p-4 rounded border border-gray-800">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Edit3 size={16} className="text-blue-400"/> Personalizar Treino Atual</h3>
                        <div className="space-y-2 mb-4">
                           {customWorkouts.map((ex, idx) => (
                              <div key={idx} className="flex gap-2">
                                 <input type="text" value={ex} onChange={(e) => {
                                    const newW = [...customWorkouts]; newW[idx] = e.target.value; setCustomWorkouts(newW);
                                 }} className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm text-gray-300 focus:border-blue-500 outline-none" />
                                 <button onClick={() => setCustomWorkouts(customWorkouts.filter((_, i) => i !== idx))} className="bg-red-900/30 hover:bg-red-900/60 p-2 rounded text-red-400 border border-red-800 transition-colors"><Trash2 size={16}/></button>
                              </div>
                           ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                           <button onClick={() => setCustomWorkouts([...customWorkouts, "Novo Exercício"])} className="py-2 px-4 bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 rounded border border-gray-600 flex justify-center items-center gap-2 transition-colors"><Plus size={14}/> Adicionar Exercício</button>
                           <button onClick={() => saveWorkoutsToCloud(customWorkouts)} className="py-2 px-4 bg-blue-900/40 hover:bg-blue-800 text-sm text-blue-300 rounded border border-blue-700 flex justify-center items-center gap-2 font-bold transition-colors"><Save size={14}/> Salvar Treino na Nuvem</button>
                        </div>
                     </div>
                  ) : (
                    <div>
                      {isWorkoutDay && (
                        <div className="animate-fade-in">
                          <h3 className="text-lg sm:text-xl text-white font-bold mb-2">Treino Físico {penalties > 0 && <span className="text-red-500">(SOBRECARGA)</span>}</h3>
                          <p className="text-xs sm:text-sm text-gray-400 mb-6">Realize as séries listadas. {penalties > 0 ? "As cargas foram aumentadas devido a falhas passadas." : "O limite diário de treinos bloqueia abusos."}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {customWorkouts.map((ex, i) => (
                              <div key={i} className={`bg-black/50 p-3 rounded border flex items-center gap-3 text-sm transition-colors ${penalties > 0 ? 'border-red-900/50 text-red-200 bg-red-950/10' : 'border-gray-800 text-gray-200'}`}>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${penalties > 0 ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                <span>{applyPenaltyToWorkout(ex, penalties)}</span>
                              </div>
                            ))}
                          </div>
                          <button onClick={completeDailyWorkout} disabled={hasTrainedToday} className="w-full mt-8 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 py-4 rounded border border-blue-500/50 font-bold tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm">
                            {hasTrainedToday ? <><CheckSquare size={18}/> LIMITE DIÁRIO ATINGIDO</> : 'CONFIRMAR CONCLUSÃO (+2 PTS, +50 G)'}
                          </button>
                        </div>
                      )}

                      {isRestDay && (
                        <div className="animate-fade-in">
                          <h3 className="text-lg sm:text-xl text-white font-bold mb-2">Recuperação Ativa</h3>
                          <div className="space-y-3 mt-4">
                            <div className="bg-black/50 p-4 rounded border border-gray-800 flex items-center gap-4"><Droplets className="text-blue-400" size={20}/><span className="text-sm">Ingerir 3.5L a 4L de Água</span></div>
                            <div className="bg-black/50 p-4 rounded border border-gray-800 flex items-center gap-4"><Dumbbell className="text-gray-400" size={20}/><span className="text-sm">Consumir 5g de Creatina</span></div>
                          </div>
                          <button onClick={completeRestDay} disabled={hasTrainedToday} className="w-full mt-8 bg-gray-800 hover:bg-gray-700 text-gray-300 py-4 rounded border border-gray-600 font-bold tracking-widest text-sm disabled:opacity-30 flex justify-center items-center gap-2">
                             {hasTrainedToday ? <><CheckSquare size={18}/> LIMITE DIÁRIO ATINGIDO</> : 'CONFIRMAR DESCANSO (+1 PT, +25 G)'}
                          </button>
                        </div>
                      )}

                      {isDungeonDay && (
                        <div className="animate-fade-in text-center p-6 bg-red-950/20 border border-red-900/50 rounded shadow-[0_0_20px_rgba(220,38,38,0.1)]">
                          <h3 className="text-2xl text-red-500 font-bold mb-2 flex justify-center items-center gap-3"><Skull size={20}/> Masmorra de Mudança de Classe <Skull size={20}/></h3>
                          <p className="text-sm text-red-300 mb-6">Fim de Semana. Você tem até domingo para completar este teste de resistência.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                            {(dungeons[rank] || dungeons['C']).map((ex, i) => (
                              <div key={i} className="bg-black p-3 border border-red-900/30 text-white font-bold text-sm">{ex}</div>
                            ))}
                          </div>
                          <button onClick={completeDungeon} disabled={hasTrainedToday} className="w-full max-w-xl mx-auto mt-8 bg-red-900/50 hover:bg-red-700 text-white py-4 rounded border border-red-500 font-bold tracking-widest text-sm disabled:opacity-30 flex justify-center items-center gap-2">
                             {hasTrainedToday ? <><CheckSquare size={18}/> LIMITE DIÁRIO ATINGIDO</> : 'SOBREVIVI À MASMORRA (SUBIR RANK)'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* LOGS */}
                <div className="h-40 border border-gray-800 bg-black p-4 rounded-md flex flex-col font-mono text-xs sm:text-sm">
                  <h3 className="text-gray-600 border-b border-gray-800 pb-2 mb-2 uppercase text-xs tracking-widest">Logs do Sistema</h3>
                  <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {logs.map(log => (<div key={log.id} className={`${log.type === 'system' ? 'text-blue-400' : ''} ${log.type === 'success' ? 'text-green-400 font-bold' : ''} ${log.type === 'upgrade' ? 'text-purple-400' : ''} ${log.type === 'normal' ? 'text-gray-400' : ''} ${log.type === 'danger' ? 'text-red-500 font-bold' : ''}`}>{log.text}</div>))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </>
            )}

            {/* TAB: PORTAIS */}
            {activeTab === 'portais' && (
              <div className="border border-purple-900/40 bg-purple-950/10 p-6 rounded-md shadow-lg min-h-[500px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-purple-900/50 pb-4 mb-6 gap-3">
                   <h2 className="text-purple-400 font-bold uppercase tracking-widest flex items-center gap-2 text-sm sm:text-base"><Map size={18} /> Associação de Caçadores</h2>
                   <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded border border-gray-800">
                     <Clock size={14} className={portalsToday >= 3 ? "text-red-500" : "text-blue-400"} />
                     <span className="text-xs sm:text-sm font-bold text-gray-300">Portais Hoje: <span className={portalsToday >= 3 ? "text-red-500" : "text-white"}>{portalsToday}/3</span></span>
                   </div>
                </div>
                <p className="text-sm text-gray-400 mb-8">Entre para testar seus atributos. Morrer te expulsa com ferimentos graves.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['facil', 'medio', 'dificil'].map((diff) => {
                     const isLocked = portalsToday >= 3 || (nextPortalTime && Date.now() < nextPortalTime);
                     return (
                      <button key={diff} disabled={isLocked} onClick={() => handleEnterPortal(diff)} className={`group p-6 bg-black border rounded flex flex-col items-center transition-all ${isLocked ? 'border-gray-800 opacity-60 cursor-not-allowed' : `border-${diff === 'facil' ? 'green' : diff === 'medio' ? 'yellow' : 'red'}-900/50 hover:border-${diff === 'facil' ? 'green' : diff === 'medio' ? 'yellow' : 'red'}-500`}`}>
                        <Swords size={28} className={`${isLocked ? 'text-gray-600' : `text-${diff === 'facil' ? 'green' : diff === 'medio' ? 'yellow' : 'red'}-500`} mb-3 ${!isLocked && 'group-hover:scale-110'} transition-transform`} />
                        <h3 className={`${isLocked ? 'text-gray-500' : `text-${diff === 'facil' ? 'green' : diff === 'medio' ? 'yellow' : 'red'}-400`} font-bold text-lg capitalize`}>Portal {diff === 'facil' ? 'Fácil' : diff === 'medio' ? 'Médio' : 'Difícil'}</h3>
                        <div className="mt-3 w-full">
                           {portalsToday >= 3 ? <span className="block text-xs text-red-500 font-bold bg-red-900/20 py-1 rounded">LIMITE DIÁRIO</span> : (nextPortalTime && Date.now() < nextPortalTime) ? <span className="block text-xs text-blue-400 font-bold bg-blue-900/20 py-1 rounded">{timeRemaining}</span> : <span className="block text-xs text-gray-500 font-bold py-1">ENTRAR</span>}
                        </div>
                      </button>
                     )
                  })}
                </div>
              </div>
            )}

            {/* TAB: COMBATE */}
            {activeTab === 'combate' && enemy && (
              <div className="border border-red-900/40 bg-black p-6 rounded-md shadow-[0_0_30px_rgba(153,27,27,0.15)] flex flex-col min-h-[500px]">
                <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-900 p-4 rounded border border-gray-800 mb-6 gap-4">
                  <div className="w-full sm:w-[45%] text-left">
                    <h3 className="text-blue-400 font-bold mb-1 text-sm">Jogador</h3>
                    <div className="w-full bg-black h-4 rounded overflow-hidden border border-gray-700">
                      <div className="bg-red-600 h-full transition-all" style={{ width: `${Math.max(0, (currentHp / maxHp) * 100)}%` }} />
                    </div>
                    <p className="text-xs mt-1 text-gray-400">{currentHp} / {maxHp} PV</p>
                  </div>
                  <div className="font-bold text-gray-500 text-xl">VS</div>
                  <div className="w-full sm:w-[45%] text-left sm:text-right">
                    <h3 className="text-red-400 font-bold mb-1 text-sm">{enemy.name}</h3>
                    <div className="w-full bg-black h-4 rounded overflow-hidden border border-gray-700 sm:transform sm:rotate-180">
                      <div className="bg-orange-600 h-full transition-all" style={{ width: `${Math.max(0, (enemy.hp / 100) * 100)}%` }} />
                    </div>
                    <p className="text-xs mt-1 text-gray-400">Vida Inimiga: {enemy.hp}</p>
                  </div>
                </div>

                <div className="flex-grow bg-[#050505] border border-gray-800 rounded p-4 mb-6 overflow-hidden flex flex-col">
                  <div className="flex-grow overflow-y-auto space-y-3 font-mono text-sm scrollbar-thin scrollbar-thumb-gray-800 pr-2">
                    {battleLogs.map(log => (<div key={log.id} className={`${log.type === 'system' ? 'text-blue-500 font-bold' : ''} ${log.type === 'danger' ? 'text-red-500' : ''} ${log.type === 'normal' ? 'text-gray-300' : ''} ${log.type === 'upgrade' ? 'text-yellow-400 font-bold' : ''} ${log.type === 'success' ? 'text-green-500 font-bold text-lg py-2' : ''}`}>{log.text}</div>))}
                    <div ref={battleLogEndRef} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button onClick={attackTurn} disabled={enemy.hp <= 0 || currentHp <= 0} className="py-3 bg-red-900/30 hover:bg-red-900/60 border border-red-700 text-red-200 font-bold rounded flex justify-center items-center gap-2 disabled:opacity-30 transition-colors text-sm"><Sword size={18} /> ATACAR</button>
                  <button onClick={() => usePotion(true)} disabled={potions <= 0 || currentHp >= maxHp || enemy.hp <= 0 || currentHp <= 0} className="py-3 bg-purple-900/30 hover:bg-purple-900/60 border border-purple-700 text-purple-200 font-bold rounded flex justify-center items-center gap-2 disabled:opacity-30 transition-colors text-sm"><PlusCircle size={18} /> POÇÃO ({potions})</button>
                  <button onClick={fleeBattle} disabled={enemy.hp <= 0 || currentHp <= 0} className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 font-bold rounded disabled:opacity-30 transition-colors text-sm">FUGIR</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}} />
    </div>
  );
};

export default App;