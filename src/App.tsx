import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sword, Activity, Brain, Eye, Plus, Droplets, Dumbbell, Flag, Swords, Coins, Heart, Skull, Map, ShoppingBag, PlusCircle, RefreshCw, Clock, User, Lock, Edit2, Trash2, Save, X, CheckSquare, BookOpen } from 'lucide-react';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1wDJP_MkDyR30F2R9q4JW8bAiRo268DywtTbCjD-tDiM4cXE8Y0qBhuc5xkX2hwT8/exec';

const App = () => {
  // --- AUTENTICAÇÃO E USUÁRIO ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- ESTADOS DO JOGO ---
  const [activeTab, setActiveTab] = useState('rotina');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const xpToNextLevel = level * 100;
  const [rank, setRank] = useState('E');
  const [cycleDay, setCycleDay] = useState(1);
  const [gold, setGold] = useState(0);
  const [potions, setPotions] = useState(0);
  
  const [stats, setStats] = useState({ forca: 1, agilidade: 1, vitalidade: 1, inteligencia: 1, sentidos: 1 });
  
  const maxHp = 100 + (stats.vitalidade - 1) * 15;
  const [currentHp, setCurrentHp] = useState(maxHp);
  const [availablePoints, setAvailablePoints] = useState(0);

  // --- TREINOS CUSTOMIZÁVEIS E PENALIDADES ---
  const [customDaily, setCustomDaily] = useState(null);
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [editWorkoutList, setEditWorkoutList] = useState([]);
  
  const [lastWorkoutDate, setLastWorkoutDate] = useState(null);
  const [penalties, setPenalties] = useState(0);
  const [hasTrainedToday, setHasTrainedToday] = useState(false);
  
  // NOVA MECÂNICA: Checkboxes
  const [checkedTasks, setCheckedTasks] = useState(new Set());
  
  // --- LOGS ---
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  // NOVO SISTEMA DE FILA DE MONSTROS
  const [currentEnemy, setCurrentEnemy] = useState(null);
  const [enemyQueue, setEnemyQueue] = useState([]);
  const [dungeonStats, setDungeonStats] = useState({ rank: '', totalGold: 0, defeated: 0, total: 0 });
  
  const [battleLogs, setBattleLogs] = useState([]);
  const battleLogEndRef = useRef(null);

  // Sistema de Cooldown de Portais
  const [portalsToday, setPortalsToday] = useState(0);
  const [nextPortalTime, setNextPortalTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  const generateId = () => Date.now().toString() + Math.random().toString(36).substring(2);

  useEffect(() => {
    const savedUser = localStorage.getItem('solo_leveling_user');
    const savedPass = localStorage.getItem('solo_leveling_pass');
    if (savedUser && savedPass) {
      setUsername(savedUser);
      setPassword(savedPass);
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

  const handleAuth = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setAuthError('Preencha o Nome de Caçador e a Senha.');
      return;
    }
    setIsSyncing(true);
    setAuthError('');
    
    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: isRegisterMode ? 'register' : 'login',
          user: username.trim(),
          password: password.trim()
        })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        const d = data.data;
        setLevel(d.level || 1);
        setRank(d.rank || 'E');
        setCycleDay(d.dia_ciclo || 1);
        setXp(d.xp || 0);
        setGold(d.gold || 0);
        setPotions(d.pocoes || 0);
        setCurrentHp(d.pv_atual || 100);
        setAvailablePoints(d.pontos || 0);
        setStats({
          forca: d.forca || 1, agilidade: d.agilidade || 1, vitalidade: d.vitalidade || 1,
          inteligencia: d.inteligencia || 1, sentidos: d.sentidos || 1
        });
        
        setCustomDaily(Array.isArray(d.treinos) && d.treinos.length > 0 ? d.treinos : null);
        setLastWorkoutDate(d.ultimo_treino);

        if (rememberMe) {
          localStorage.setItem('solo_leveling_user', username.trim());
          localStorage.setItem('solo_leveling_pass', password.trim());
        } else {
          localStorage.removeItem('solo_leveling_user');
          localStorage.removeItem('solo_leveling_pass');
        }

        setIsLoggedIn(true);
        addLog(`[SISTEMA]: Bem-vindo, Caçador ${username.trim()}.`, 'success');

        const evalResult = evaluatePenalties(d.ultimo_treino, d.penalidades, d.dia_ciclo);
        if (evalResult.modified) {
           saveGameState({ penalidades: evalResult.p, dia_ciclo: evalResult.d });
        }
      } else {
        setAuthError(data.message || 'Erro de autenticação.');
      }
    } catch (error) {
      setAuthError('Falha ao conectar com o Servidor do Sistema.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !username) return;
    const storedPortals = JSON.parse(localStorage.getItem(`solo_leveling_cooldown_${username}`) || '{}');
    const today = new Date().toDateString();
    if (storedPortals.date !== today) {
      setPortalsToday(0); setNextPortalTime(null);
      localStorage.setItem(`solo_leveling_cooldown_${username}`, JSON.stringify({ date: today, count: 0, nextTime: null }));
    } else {
      setPortalsToday(storedPortals.count || 0); setNextPortalTime(storedPortals.nextTime || null);
    }
  }, [isLoggedIn, username]);

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
      level, xp, rank, dia_ciclo: cycleDay, gold, pocoes: potions, pv_atual: currentHp, pontos: availablePoints,
      forca: stats.forca, agilidade: stats.agilidade, vitalidade: stats.vitalidade, inteligencia: stats.inteligencia, sentidos: stats.sentidos,
      ultimo_treino: lastWorkoutDate, penalidades: penalties,
      ...overrides
    };
    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
      .then(() => setIsSyncing(false))
      .catch(() => { addLog('[ERRO]: Falha ao salvar na nuvem.', 'danger'); setIsSyncing(false); });
  };

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => { battleLogEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [battleLogs]);

  const addLog = (text, type = 'normal') => setLogs(prev => [...prev, { id: generateId(), text, type }]);
  const addBattleLog = (text, type = 'normal') => setBattleLogs(prev => [...prev, { id: generateId(), text, type }]);

  const rankWorkouts = {
    'E': ["30 Flexões", "30 Abdominais", "30 Agachamentos", "400 Levantamentos de Joelhos (1 Km)", "1 min de Prancha", "Halteres: 20 Rosca, 20 Martelo, 20 Remada, 10 Tríceps"],
    'D': ["45 Flexões", "45 Abdominais", "45 Agachamentos", "800 Levantamentos de Joelhos (2 Km)", "1.5 min de Prancha", "Halteres: 30 Rosca, 30 Martelo, 30 Remada, 15 Tríceps"],
    'C': ["60 Flexões", "60 Abdominais", "60 Agachamentos", "1200 Levantamentos de Joelhos (3 Km)", "2 min de Prancha", "Halteres: 40 Rosca, 40 Martelo, 40 Remada, 20 Tríceps"],
    'B': ["75 Flexões", "75 Abdominais", "75 Agachamentos", "2000 Levantamentos de Joelhos (5 Km)", "2.5 min de Prancha", "Halteres: 50 Rosca, 50 Martelo, 50 Remada, 25 Tríceps"],
    'A': ["90 Flexões", "90 Abdominais", "90 Agachamentos", "3000 Levantamentos de Joelhos (7.5 Km)", "3 min de Prancha", "Halteres: 60 Rosca, 60 Martelo, 60 Remada, 30 Tríceps"],
    'S': ["100 Flexões", "100 Abdominais", "100 Agachamentos", "4000 Levantamentos de Joelhos (10 Km)", "5 min de Prancha", "Halteres: 70 Rosca, 70 Martelo, 70 Remada, 40 Tríceps"]
  };

  const dungeons = {
    'E': ["20 Burpees c/ Salto", "50 Polichinelos", "3 Km de Corrida", "1,5 min de Prancha"],
    'D': ["30 Burpees c/ Salto", "60 Polichinelos", "4 Km de Corrida", "2 min de Prancha"],
    'C': ["40 Burpees c/ Salto", "80 Polichinelos", "5 Km de Corrida", "3 min de Prancha"],
    'B': ["60 Burpees c/ Salto", "100 Polichinelos", "7.5 Km de Corrida", "4 min de Prancha"],
    'A': ["80 Burpees c/ Salto", "150 Polichinelos", "10 Km de Corrida", "5 min de Prancha"],
    'S': ["100 Burpees c/ Salto", "200 Polichinelos", "10 Km de Corrida (4000 Lev.)", "7 min de Prancha"]
  };

  const rankValues = { 'E': 1, 'D': 2, 'C': 3, 'B': 4, 'A': 5, 'S': 6 };

  const bestiaryData = {
    'E': [
      { name: "Goblin Batedor", minLvl: 1, maxLvl: 3, baseHp: 30, baseAtk: 5, xpDrop: 15, goldDrop: [5, 10], lore: "Criaturas fracas, astutas e covardes que sempre atacam em bandos." },
      { name: "Lobo Cinzento", minLvl: 2, maxLvl: 4, baseHp: 45, baseAtk: 8, xpDrop: 20, goldDrop: [8, 15], lore: "Lobos selvagens corrompidos por mana. Seus dentes rasgam armaduras leves." },
      { name: "Slime Gigante", minLvl: 3, maxLvl: 5, baseHp: 60, baseAtk: 4, xpDrop: 25, goldDrop: [10, 20], lore: "Massa gelatinosa ácida. Lenta, mas muito resistente a golpes físicos." }
    ],
    'D': [
      { name: "Orc Guerreiro", minLvl: 5, maxLvl: 8, baseHp: 90, baseAtk: 18, xpDrop: 45, goldDrop: [25, 40], lore: "Brutos e irracionais. Os Orcs não recuam e balançam machados pesados." },
      { name: "Aranha Cavernícola", minLvl: 6, maxLvl: 9, baseHp: 70, baseAtk: 25, xpDrop: 50, goldDrop: [20, 35], lore: "Aranhas gigantes que descem do teto. Seu veneno causa dor excruciante." }
    ],
    'C': [
      { name: "Homem-Lagarto", minLvl: 10, maxLvl: 15, baseHp: 180, baseAtk: 40, xpDrop: 90, goldDrop: [50, 80], lore: "Guerreiros reptilianos rápidos e bem coordenados armados com lanças afiadas." },
      { name: "Golem de Pedra", minLvl: 12, maxLvl: 18, baseHp: 300, baseAtk: 25, xpDrop: 110, goldDrop: [70, 100], lore: "Corpos feitos de rocha pura. Difíceis de arranhar sem força extrema." }
    ],
    'B': [
      { name: "Orc de Elite", minLvl: 20, maxLvl: 25, baseHp: 450, baseAtk: 80, xpDrop: 200, goldDrop: [120, 200], lore: "Chefes guerreiros entre os Orcs. Pele avermelhada e força sobre-humana." },
      { name: "Assassino Sombrio", minLvl: 22, maxLvl: 28, baseHp: 300, baseAtk: 120, xpDrop: 250, goldDrop: [150, 220], lore: "Sombras tangíveis que carregam lâminas letais. Atacam pontos vitais." }
    ],
    'A': [
      { name: "Cavaleiro da Morte", minLvl: 30, maxLvl: 40, baseHp: 1000, baseAtk: 200, xpDrop: 500, goldDrop: [300, 500], lore: "Espectros em armaduras antigas envoltos em chamas azuis infernais." },
      { name: "Wyvern Inferior", minLvl: 35, maxLvl: 45, baseHp: 1200, baseAtk: 180, xpDrop: 600, goldDrop: [350, 600], lore: "Draconídeos que dominam os céus da masmorra rasgando o ar e as presas." }
    ],
    'S': [
      { name: "Rei Demônio", minLvl: 50, maxLvl: 60, baseHp: 3500, baseAtk: 450, xpDrop: 1500, goldDrop: [1000, 2000], lore: "Senhor dos reinos inferiores. Sua mera aura opressora esmaga caçadores comuns." },
      { name: "Dragão Ancião", minLvl: 55, maxLvl: 70, baseHp: 5000, baseAtk: 400, xpDrop: 2000, goldDrop: [1500, 3000], lore: "Calamidade alada. Escamas impenetráveis e um sopro capaz de evaporar montanhas." }
    ]
  };

  const handleGainXp = (amount) => {
    let currentXp = xp + amount;
    let currentLevel = level;
    let pointsGained = 0;

    while (currentXp >= currentLevel * 100) {
      currentXp -= currentLevel * 100;
      currentLevel += 1;
      pointsGained += 3;
    }

    if (currentLevel > level) {
      setLevel(currentLevel);
      setAvailablePoints(prev => prev + pointsGained);
      setCurrentHp(maxHp); 
      addLog(`[SUBIU DE NÍVEL] Você alcançou o Nível ${currentLevel}! +${pointsGained} Pontos. PV Restaurado.`, 'upgrade');
    }
    setXp(currentXp);
    return { newLevel: currentLevel, newXp: currentXp };
  };

  const applyPenaltyToWorkout = (workoutStr, penaltyCount) => {
    if (penaltyCount === 0 || !workoutStr) return workoutStr;
    const multiplier = 1 + (penaltyCount * 0.5);
    return workoutStr.replace(/\d+/g, (match) => {
      return Math.ceil(parseInt(match) * multiplier);
    });
  };

  const toggleCheck = (index) => {
    const newSet = new Set(checkedTasks);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setCheckedTasks(newSet);
  };

  const distributePoint = (statName) => {
    if (availablePoints > 0) {
      const newStats = { ...stats, [statName]: stats[statName] + 1 };
      setStats(newStats); setAvailablePoints(availablePoints - 1);
      addLog(`[ATUALIZAÇÃO]: +1 em ${statName.toUpperCase()}.`, 'upgrade');
      saveGameState({ [statName]: newStats[statName], pontos: availablePoints - 1 });
    }
  };

  const completeDailyWorkout = () => {
    const todayStr = new Date().toISOString();
    const newPoints = availablePoints + 2;
    const newGold = gold + 50;
    const newPotions = potions + 1;
    const newDay = cycleDay < 14 ? cycleDay + 1 : cycleDay;
    
    setAvailablePoints(newPoints); setGold(newGold); setPotions(newPotions); setCycleDay(newDay);
    setLastWorkoutDate(todayStr); setHasTrainedToday(true); setPenalties(0); 
    setCheckedTasks(new Set()); // Reseta as checkboxes
    
    addLog(`[QUEST DIÁRIA]: Treino concluído! +2 Pontos, +50 G, +1 Poção.`, 'success');
    saveGameState({ pontos: newPoints, gold: newGold, pocoes: newPotions, dia_ciclo: newDay, ultimo_treino: todayStr, penalidades: 0 });
  };

  const completeRestDay = () => {
    const todayStr = new Date().toISOString();
    const newPoints = availablePoints + 1;
    const newGold = gold + 25;
    const newDay = cycleDay < 14 ? cycleDay + 1 : cycleDay;
    
    setAvailablePoints(newPoints); setGold(newGold); setCycleDay(newDay);
    setLastWorkoutDate(todayStr); setHasTrainedToday(true); setPenalties(0);
    setCheckedTasks(new Set()); 

    addLog(`[RECUPERAÇÃO]: Meta de água/descanso batida! +1 Ponto, +25 G.`, 'success');
    saveGameState({ pontos: newPoints, gold: newGold, dia_ciclo: newDay, ultimo_treino: todayStr, penalidades: 0 });
  };

  const completeDungeon = () => {
    const todayStr = new Date().toISOString();
    const newLevel = level + 1;
    const rankList = ['E', 'D', 'C', 'B', 'A', 'S'];
    const currentRankIndex = rankList.indexOf(rank);
    const newRank = currentRankIndex < rankList.length - 1 ? rankList[currentRankIndex + 1] : 'S';
    const newDay = 1;
    
    setLevel(newLevel); setRank(newRank); setCycleDay(newDay); 
    setLastWorkoutDate(todayStr); setHasTrainedToday(true); setPenalties(0);
    setCheckedTasks(new Set()); 
    setCustomDaily(null); 
    
    addLog(`[DUNGEON]: Você sobreviveu e subiu para Rank ${newRank}! Treinos reajustados.`, 'success');
    saveGameState({ level: newLevel, rank: newRank, dia_ciclo: newDay, ultimo_treino: todayStr, penalidades: 0 });
    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_workouts', user: username, workouts: [] }) });
  };

  const buyPotion = () => {
    if (gold >= 200) {
      setGold(gold - 200); setPotions(potions + 1);
      addLog(`[LOJA]: Poção adquirida.`, 'normal');
      saveGameState({ gold: gold - 200, pocoes: potions + 1 });
    }
  };

  const usePotion = (isCombat = false) => {
    if (potions > 0 && currentHp < maxHp) {
      const healAmount = Math.floor(maxHp * 0.5);
      const newHp = Math.min(maxHp, currentHp + healAmount);
      const newPotions = potions - 1;
      setPotions(newPotions); setCurrentHp(newHp);
      
      if (isCombat) addBattleLog(`Poção consumida! +${healAmount} PV.`, 'success');
      else addLog(`[INVENTÁRIO]: Poção consumida. +${healAmount} PV.`, 'success');
      saveGameState({ pocoes: newPotions, pv_atual: newHp });
    }
  };

  const handleEnterPortal = (rankDiff) => {
    if (portalsToday >= 18) { addLog('[SISTEMA]: Você atingiu o limite físico de 18 portais hoje.', 'danger'); return; }
    if (nextPortalTime && Date.now() < nextPortalTime) { addLog(`[SISTEMA]: Energia instável. Aguarde.`, 'danger'); return; }
    if (rankValues[rank] < rankValues[rankDiff]) { addLog(`[SISTEMA]: Rank insuficiente para entrar neste portal.`, 'danger'); return; }

    const newCount = portalsToday + 1;
    const newTime = Date.now() + 1200000; // 20 Minutos = 1.200.000 ms
    setPortalsToday(newCount); setNextPortalTime(newTime);
    localStorage.setItem(`solo_leveling_cooldown_${username.trim()}`, JSON.stringify({ date: new Date().toDateString(), count: newCount, nextTime: newTime }));

    const enemiesList = bestiaryData[rankDiff];
    const numEnemies = Math.floor(Math.random() * 4) + 3; // Gera de 3 a 6 monstros
    let generatedQueue = [];
    let totalXpDungeon = 0;
    
    for(let i=0; i < numEnemies; i++) {
       const template = enemiesList[Math.floor(Math.random() * enemiesList.length)];
       const generatedLevel = Math.floor(Math.random() * (template.maxLvl - template.minLvl + 1)) + template.minLvl;
       const multiplier = 1 + (generatedLevel * 0.1); 
       
       generatedQueue.push({ 
         ...template, 
         level: generatedLevel,
         hp: Math.floor(template.baseHp * multiplier),
         atk: Math.floor(template.baseAtk * multiplier),
         logDesc: `[Lvl ${generatedLevel}] ${template.lore}`
       });
    }
    
    const firstEnemyTemplate = generatedQueue.shift();
    const firstEnemy = { ...firstEnemyTemplate, maxHp: firstEnemyTemplate.hp }; 
    
    setCurrentEnemy(firstEnemy);
    setEnemyQueue(generatedQueue);
    setDungeonStats({ rank: rankDiff, totalGold: 0, totalXp: 0, defeated: 0, total: numEnemies });
    
    setActiveTab('combate');
    setBattleLogs([ 
      { id: generateId(), text: `[PORTAL RANK ${rankDiff}] Iniciado... (${newCount}/18 hoje)`, type: 'system' }, 
      { id: generateId(), text: `Alerta: Múltiplas assinaturas de mana detectadas (${numEnemies} inimigos).`, type: 'danger' },
      { id: generateId(), text: firstEnemy.logDesc, type: 'danger' } 
    ]);
  };

  const attackTurn = () => {
    if (!currentEnemy || currentHp <= 0) return;
    let eHp = currentEnemy.hp; let pHp = currentHp;
    
    let variation = Math.random() * (10 / stats.inteligencia);
    let playerDmg = Math.floor(5 + (stats.forca * 2.5) + variation);
    let isCrit = Math.random() < (stats.sentidos * 0.05);
    
    if (isCrit) { playerDmg = Math.floor(playerDmg * 1.5); addBattleLog(`CRÍTICO! Dano massivo de ${playerDmg}!`, 'upgrade'); } 
    else addBattleLog(`Você ataca causando ${playerDmg} de dano.`, 'normal');

    eHp -= playerDmg;
    
    if (eHp <= 0) {
      const gDrop = Math.floor(Math.random() * (currentEnemy.goldDrop[1] - currentEnemy.goldDrop[0] + 1)) + currentEnemy.goldDrop[0];
      const xDrop = Math.floor(currentEnemy.xpDrop * (1 + currentEnemy.level * 0.1));
      
      const accumulatedGold = dungeonStats.totalGold + gDrop;
      const accumulatedXp = (dungeonStats.totalXp || 0) + xDrop;
      const newDefeated = dungeonStats.defeated + 1;
      
      setCurrentEnemy({ ...currentEnemy, hp: 0 });
      addBattleLog(`${currentEnemy.name} derrotado! (+${gDrop} G, +${xDrop} XP)`, 'success');
      
      if (enemyQueue.length === 0) {
         // Fim do Portal Completo
         const newTotalGold = gold + accumulatedGold;
         setGold(newTotalGold);
         
         const { newLevel, newXp } = handleGainXp(accumulatedXp);
         
         addBattleLog(`[PORTAL CONCLUÍDO] Você aniquilou a masmorra! Lucro total: ${accumulatedGold} G, ${accumulatedXp} XP.`, 'system');
         saveGameState({ gold: newTotalGold, pv_atual: pHp, level: newLevel, xp: newXp });
         setTimeout(() => { setActiveTab('portais'); setCurrentEnemy(null); }, 4000);
      } else {
         // Puxa o próximo monstro da fila
         setDungeonStats({ ...dungeonStats, totalGold: accumulatedGold, totalXp: accumulatedXp, defeated: newDefeated });
         const nextEnemyTemplate = enemyQueue[0];
         const nextEnemy = { ...nextEnemyTemplate, maxHp: nextEnemyTemplate.hp };
         const newQueue = enemyQueue.slice(1);
         setTimeout(() => {
            setCurrentEnemy(nextEnemy);
            setEnemyQueue(newQueue);
            addBattleLog(`Um novo monstro avança: [Lvl ${nextEnemy.level}] ${nextEnemy.name}!`, 'danger');
         }, 1500);
      }
      return;
    }

    setCurrentEnemy(prev => ({ ...prev, hp: eHp }));

    setTimeout(() => {
      if (eHp > 0) {
        if (Math.random() < (stats.agilidade * 0.03)) {
          addBattleLog(`ESQUIVOU! O golpe do inimigo passou no vazio.`, 'upgrade');
        } else {
          let enemyDmg = Math.max(1, currentEnemy.atk - Math.floor(stats.vitalidade * 0.5));
          pHp -= enemyDmg;
          addBattleLog(`${currentEnemy.name} atacou. Sofreu ${enemyDmg} de dano.`, 'danger');
          if (pHp <= 0) {
            setCurrentHp(1); addBattleLog(`Quase morto... O Sistema te resgatou com 1 PV. O Portal colapsou.`, 'danger');
            saveGameState({ pv_atual: 1 });
            setTimeout(() => { setActiveTab('rotina'); addLog(`[ALERTA]: Ferimentos graves no portal. Fugiu com vida.`, 'danger'); setCurrentEnemy(null); }, 3000);
          } else {
            setCurrentHp(pHp);
          }
        }
      }
    }, 500);
  };

  const fleeBattle = () => { 
    addBattleLog(`Fugindo... Todo o ouro acumulado nesta masmorra (${dungeonStats.totalGold} G) foi salvo.`, 'system'); 
    setGold(gold + dungeonStats.totalGold);
    saveGameState({ pv_atual: currentHp, gold: gold + dungeonStats.totalGold }); 
    setTimeout(() => { setActiveTab('portais'); setCurrentEnemy(null); }, 2000); 
  };

  const isWorkoutDay = cycleDay <= 12 && cycleDay % 2 !== 0;
  const isRestDay = cycleDay <= 12 && cycleDay % 2 === 0;
  const isDungeonDay = cycleDay === 13 || cycleDay === 14;
  const isCooldownActive = nextPortalTime && Date.now() < nextPortalTime;
  const activeWorkoutList = customDaily || rankWorkouts[rank] || rankWorkouts['S'];

  const startEditing = () => {
    setEditWorkoutList([...activeWorkoutList]);
    setIsEditingWorkout(true);
  };

  const saveWorkoutEdit = () => {
    setCustomDaily(editWorkoutList);
    setIsEditingWorkout(false);
    setCheckedTasks(new Set()); // Resetar boxes se alterou o treino
    addLog('[SISTEMA]: Treino diário personalizado salvo.', 'success');
    
    setIsSyncing(true);
    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_workouts', user: username, workouts: editWorkoutList }) })
      .then(() => setIsSyncing(false))
      .catch(() => { addLog('[ERRO]: Falha ao salvar treino na nuvem.', 'danger'); setIsSyncing(false); });
  };

  const handleWorkoutChange = (index, value) => { const newList = [...editWorkoutList]; newList[index] = value; setEditWorkoutList(newList); };
  const removeWorkoutItem = (index) => { setEditWorkoutList(editWorkoutList.filter((_, i) => i !== index)); };
  const addWorkoutItem = () => { setEditWorkoutList([...editWorkoutList, "Novo Exercício"]); };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-gray-300 font-mono flex flex-col items-center justify-center p-4">
        {isSyncing && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <RefreshCw className="text-blue-500 animate-spin mb-4" size={40} />
            <h2 className="text-blue-400 font-bold tracking-widest text-center">Conectando ao Servidor...</h2>
          </div>
        )}
        <div className="bg-[#111115] border border-blue-900/50 p-6 md:p-8 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.8)] w-full max-w-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-500 tracking-widest text-center mb-2">SOLO LEVELING</h1>
          <p className="text-center text-gray-500 mb-6 text-sm">Associação de Caçadores - Acesso Global</p>
          
          {authError && <div className="bg-red-900/30 border border-red-500 text-red-400 p-3 rounded mb-6 text-sm text-center font-bold">{authError}</div>}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">Nome do Caçador</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ex: SungJinWoo" className="w-full bg-black border border-gray-700 text-white rounded py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">Senha Secreta</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full bg-black border border-gray-700 text-white rounded py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            </div>
            <div className="flex items-center mt-2 mb-2">
              <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-700 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer" />
              <label htmlFor="rememberMe" className="ml-2 text-xs text-gray-400 cursor-pointer select-none">Salvar credenciais neste dispositivo</label>
            </div>
            <button type="submit" className="w-full py-3 mt-4 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 font-bold tracking-widest rounded border border-blue-700 transition-colors">
              {isRegisterMode ? 'CRIAR REGISTRO NO SISTEMA' : 'DESPERTAR (ENTRAR)'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsRegisterMode(!isRegisterMode); setAuthError(''); }} className="text-gray-500 hover:text-gray-300 text-xs sm:text-sm underline transition-colors">
              {isRegisterMode ? 'Já é um Caçador registrado? Faça Login.' : 'Ainda não despertou? Cadastre-se aqui.'}
            </button>
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
            <div className="flex flex-col">
              <div className="text-lg sm:text-2xl font-bold text-blue-500 tracking-widest uppercase truncate max-w-[200px] sm:max-w-sm">
                <span className="text-gray-200">{username}</span> <span className="text-blue-800 mx-1 sm:mx-2">|</span> NÍVEL {level}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] sm:text-xs text-blue-300 font-bold w-4">XP</span>
                <div className="w-32 sm:w-48 bg-gray-800 h-1.5 rounded overflow-hidden border border-blue-900/30">
                  <div className="bg-blue-500 h-full shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-500" style={{ width: `${Math.max(0, (xp / xpToNextLevel) * 100)}%` }} />
                </div>
                <span className="text-[10px] sm:text-xs text-blue-300">{xp}/{xpToNextLevel}</span>
              </div>
            </div>
            <div className="px-3 py-1 bg-blue-900/30 border border-blue-700 text-blue-300 rounded text-xs sm:text-sm font-bold whitespace-nowrap h-fit">
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

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="max-w-6xl mx-auto mt-3 sm:mt-4 flex bg-gray-900/40 rounded-t-md overflow-hidden border-b border-blue-900/30">
          <button onClick={() => setActiveTab('rotina')} disabled={activeTab === 'combate'} className={`flex-1 py-3 px-2 flex justify-center items-center gap-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'rotina' ? 'bg-blue-900/50 text-blue-300 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300 disabled:opacity-30'}`}>
            <Dumbbell size={16} /> <span className="hidden sm:inline">Rotina</span>
          </button>
          <button onClick={() => setActiveTab('portais')} disabled={activeTab === 'combate'} className={`flex-1 py-3 px-2 flex justify-center items-center gap-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'portais' ? 'bg-purple-900/40 text-purple-300 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300 disabled:opacity-30'}`}>
            <Map size={16} /> <span className="hidden sm:inline">Portais</span>
          </button>
          <button onClick={() => setActiveTab('bestiario')} disabled={activeTab === 'combate'} className={`flex-1 py-3 px-2 flex justify-center items-center gap-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'bestiario' ? 'bg-green-900/40 text-green-300 border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-300 disabled:opacity-30'}`}>
            <BookOpen size={16} /> <span className="hidden sm:inline">Bestiário</span>
          </button>
        </div>
      </header>

      <main className="flex-grow p-3 sm:p-4 md:p-8 flex justify-center w-full">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* PAINEL DE ATRIBUTOS */}
          <div className="col-span-1 lg:col-span-1 border border-gray-800 bg-[#111115] p-4 sm:p-5 rounded-md flex flex-col shadow-lg h-fit order-2 lg:order-1">
            <h2 className="text-blue-400 font-bold border-b border-gray-700 pb-2 sm:pb-3 mb-4 uppercase tracking-widest text-xs sm:text-sm">Status</h2>
            <div className={`text-xs sm:text-sm mb-4 sm:mb-6 font-bold ${availablePoints > 0 ? 'text-yellow-500 animate-pulse' : 'text-gray-500'}`}>Pontos Disponíveis: {availablePoints}</div>
            <div className="space-y-4 sm:space-y-5">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {key === 'forca' && <Sword size={16} className="text-red-400" />}
                    {key === 'agilidade' && <Activity size={16} className="text-green-400" />}
                    {key === 'vitalidade' && <Shield size={16} className="text-orange-400" />}
                    {key === 'inteligencia' && <Brain size={16} className="text-purple-400" />}
                    {key === 'sentidos' && <Eye size={16} className="text-teal-400" />}
                    <span className="capitalize text-gray-300 font-semibold text-xs sm:text-sm">{key}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-base sm:text-lg font-bold text-white w-6 text-right">{value}</span>
                    <button onClick={() => distributePoint(key)} disabled={availablePoints <= 0} className={`p-1 sm:p-1.5 rounded transition-colors ${availablePoints > 0 ? 'bg-blue-900/50 hover:bg-blue-700 text-blue-300 border border-blue-600' : 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed'}`}><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-800">
              <h3 className="text-yellow-500 font-bold uppercase tracking-widest text-xs sm:text-sm mb-3 flex items-center gap-2"><ShoppingBag size={14} /> Loja do Sistema</h3>
              <div className="bg-black/50 p-3 rounded border border-gray-700 flex flex-col gap-2 sm:gap-3">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-gray-300 flex items-center gap-1 sm:gap-2"><PlusCircle size={12} className="text-red-400"/> Poções:</span>
                  <span className="font-bold text-white">{potions}</span>
                </div>
                <button onClick={() => usePotion(false)} disabled={potions <= 0 || currentHp >= maxHp} className="w-full py-2 bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded border border-red-800/50 text-[10px] sm:text-xs font-bold transition-colors disabled:opacity-30">USAR POÇÃO (Cura 50%)</button>
                <button onClick={buyPotion} disabled={gold < 200} className="w-full py-2 bg-yellow-900/30 hover:bg-yellow-800/50 text-yellow-500 rounded border border-yellow-800/50 text-[10px] sm:text-xs font-bold transition-colors disabled:opacity-30 flex justify-center items-center gap-1">COMPRAR POÇÃO <Coins size={10}/> 200</button>
              </div>
            </div>
          </div>

          {/* PAINEL PRINCIPAL DE MISSÃO */}
          <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 sm:gap-6 order-1 lg:order-2">
            
            {}
            {activeTab === 'rotina' && (
              <>
                <div className="border border-blue-900/40 bg-blue-950/10 p-4 sm:p-6 rounded-md relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 via-blue-500 to-blue-900"></div>
                  
                  <div className="flex justify-between items-center border-b border-blue-900/50 pb-2 sm:pb-3 mb-4 sm:mb-6">
                    <h2 className="text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2 text-sm sm:text-base">
                      <Flag size={18} /> Missão Diária
                      {penalties > 0 && <span className="ml-2 px-2 py-0.5 bg-red-900/80 text-red-300 text-[10px] rounded border border-red-700 shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse">PENALIDADE: {penalties}/3</span>}
                    </h2>
                    <span className="text-xs sm:text-sm font-bold text-gray-400 bg-gray-900 px-2 sm:px-3 py-1 rounded">Dia {cycleDay}/14</span>
                  </div>

                  <div className="min-h-[200px] sm:min-h-[250px]">
                    
                    {isWorkoutDay && (
                      <div className="animate-fade-in">
                        <div className="flex justify-between items-start sm:items-center mb-4 sm:mb-6 flex-col sm:flex-row gap-2">
                          <div>
                            <h3 className="text-lg sm:text-xl text-white font-bold mb-1">Treino Físico {penalties > 0 && <span className="text-red-500">(SOBRECARGA)</span>}</h3>
                            <p className="text-xs sm:text-sm text-gray-400">
                              {penalties > 0 ? "As cargas foram aumentadas devido a falhas passadas." : "Marque todas as tarefas para concluir."}
                            </p>
                          </div>
                          {!isEditingWorkout && (
                            <button onClick={startEditing} className="px-3 py-1.5 bg-blue-900/30 hover:bg-blue-800 text-blue-400 rounded border border-blue-800 transition-colors flex items-center gap-2 text-xs sm:text-sm" title="Editar Treino">
                              <Edit2 size={14} /> Personalizar
                            </button>
                          )}
                        </div>
                        
                        {isEditingWorkout ? (
                          <div className="space-y-3 mb-6 bg-black/40 p-3 sm:p-4 rounded border border-blue-900/50 shadow-inner">
                            <p className="text-xs text-blue-400 mb-2 uppercase tracking-widest font-bold">Modo de Edição do Sistema</p>
                            {editWorkoutList.map((ex, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                <input type="text" value={ex} onChange={(e) => handleWorkoutChange(i, e.target.value)} className="flex-grow bg-[#111115] border border-gray-700 text-white rounded px-3 py-2 text-xs sm:text-sm focus:border-blue-500 outline-none transition-colors" />
                                <button onClick={() => removeWorkoutItem(i)} className="text-red-500 hover:text-red-300 p-2 bg-red-900/20 rounded border border-red-900/50 transition-colors"><Trash2 size={16} /></button>
                              </div>
                            ))}
                            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-gray-800">
                              <button onClick={addWorkoutItem} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs sm:text-sm rounded border border-gray-600 flex justify-center items-center gap-2 transition-colors"><Plus size={16} /> Adicionar</button>
                              <button onClick={saveWorkoutEdit} className="flex-1 py-2 bg-green-900/40 hover:bg-green-800 text-green-400 text-xs sm:text-sm rounded border border-green-800 flex justify-center items-center gap-2 transition-colors"><Save size={16} /> Salvar Treino</button>
                              <button onClick={() => setIsEditingWorkout(false)} className="py-2 px-4 bg-red-900/40 hover:bg-red-800 text-red-400 text-xs sm:text-sm rounded border border-red-800 flex justify-center items-center transition-colors"><X size={16} /></button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                            {activeWorkoutList.map((ex, i) => {
                              const isChecked = checkedTasks.has(i);
                              return (
                                <label key={i} className={`cursor-pointer bg-black/50 p-3 rounded border flex items-center gap-3 text-sm transition-colors ${penalties > 0 ? 'border-red-900/50 hover:bg-red-950' : 'border-gray-800 hover:bg-gray-900'}`}>
                                  <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(i)} className="w-4 h-4 rounded cursor-pointer accent-blue-500" />
                                  <span className={`${isChecked ? 'line-through opacity-50' : 'text-gray-200'} ${penalties > 0 && !isChecked ? 'text-red-300 font-bold' : ''}`}>
                                    {applyPenaltyToWorkout(ex, penalties)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        <button 
                          disabled={hasTrainedToday || isEditingWorkout || checkedTasks.size !== activeWorkoutList.length} 
                          onClick={completeDailyWorkout} 
                          className="w-full mt-6 sm:mt-8 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 py-3 sm:py-4 rounded border border-blue-500/50 font-bold tracking-widest transition-all text-xs sm:text-sm disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                          {hasTrainedToday ? <span className="flex items-center gap-2"><CheckSquare size={18}/> LIMITE DIÁRIO ATINGIDO</span> : checkedTasks.size !== activeWorkoutList.length ? 'MARQUE TODAS AS TAREFAS' : 'CONFIRMAR CONCLUSÃO (+2 PTS, +50 G, +1 POÇÃO)'}
                        </button>
                      </div>
                    )}

                    {isRestDay && (
                      <div className="animate-fade-in">
                        <h3 className="text-lg sm:text-xl text-white font-bold mb-2">Recuperação Ativa</h3>
                        <p className="text-xs sm:text-sm text-gray-400 mb-6">A hidratação e o repouso reparam a fadiga muscular.</p>
                        <div className="space-y-2 sm:space-y-3 mt-4">
                          {[
                            { icon: <Droplets className="text-blue-400" size={20}/>, text: "Ingerir 3.5L a 4L de Água" },
                            { icon: <Dumbbell className="text-gray-400" size={20}/>, text: "Consumir 5g de Creatina" }
                          ].map((task, i) => {
                            const isChecked = checkedTasks.has(i);
                            return (
                              <label key={i} className="cursor-pointer bg-black/50 p-4 rounded border border-gray-800 hover:bg-gray-900 flex items-center gap-4 transition-colors">
                                <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(i)} className="w-5 h-5 rounded cursor-pointer accent-blue-500" />
                                {task.icon}
                                <span className={`text-sm ${isChecked ? 'line-through opacity-50' : 'text-gray-200'}`}>{task.text}</span>
                              </label>
                            );
                          })}
                        </div>
                        <button 
                          disabled={hasTrainedToday || checkedTasks.size !== 2} 
                          onClick={completeRestDay} 
                          className="w-full mt-6 sm:mt-8 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 sm:py-4 rounded border border-gray-600 font-bold tracking-widest text-xs sm:text-sm disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                          {hasTrainedToday ? <span className="flex items-center gap-2"><CheckSquare size={18}/> LIMITE DIÁRIO ATINGIDO</span> : checkedTasks.size !== 2 ? 'MARQUE TODAS AS TAREFAS' : 'CONFIRMAR DESCANSO (+1 PT, +25 G)'}
                        </button>
                      </div>
                    )}

                    {isDungeonDay && (
                      <div className="animate-fade-in text-center p-4 sm:p-6 bg-red-950/20 border border-red-900/50 rounded shadow-[0_0_20px_rgba(220,38,38,0.1)]">
                        <h3 className="text-xl sm:text-2xl text-red-500 font-bold mb-2 flex justify-center items-center gap-2 sm:gap-3"><Skull size={20}/> Masmorra de Ascensão <Skull size={20}/></h3>
                        <p className="text-xs sm:text-sm text-red-300 mb-4 sm:mb-6">Fim de Semana. Sobreviva a este teste para subir de Rank.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-w-xl mx-auto text-left">
                          {(dungeons[rank] || dungeons['S']).map((ex, i) => {
                            const isChecked = checkedTasks.has(i);
                            return (
                              <label key={i} className="cursor-pointer bg-black p-3 border border-red-900/30 hover:bg-red-900/20 flex items-center gap-3 transition-colors">
                                <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(i)} className="w-4 h-4 rounded cursor-pointer accent-red-600" />
                                <span className={`font-bold text-sm ${isChecked ? 'line-through opacity-50 text-red-300' : 'text-white'}`}>{ex}</span>
                              </label>
                            );
                          })}
                        </div>
                        <button 
                          disabled={hasTrainedToday || checkedTasks.size !== (dungeons[rank] || dungeons['S']).length} 
                          onClick={completeDungeon} 
                          className="w-full max-w-xl mx-auto mt-6 sm:mt-8 bg-red-900/50 hover:bg-red-700 text-white py-3 sm:py-4 rounded border border-red-500 font-bold tracking-widest text-xs sm:text-sm disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                          {hasTrainedToday ? <span className="flex items-center gap-2"><CheckSquare size={18}/> LIMITE DIÁRIO ATINGIDO</span> : checkedTasks.size !== (dungeons[rank] || dungeons['S']).length ? 'MARQUE TODAS AS TAREFAS' : 'SOBREVIVI À MASMORRA (Avançar Rank)'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* LOGS MOBILE ADJUSTED */}
                <div className="h-32 sm:h-40 border border-gray-800 bg-black p-3 sm:p-4 rounded-md flex flex-col font-mono text-xs sm:text-sm">
                  <h3 className="text-gray-600 border-b border-gray-800 pb-1 sm:pb-2 mb-1 sm:mb-2 uppercase text-[10px] sm:text-xs tracking-widest">Logs do Sistema</h3>
                  <div className="flex-grow overflow-y-auto space-y-1 sm:space-y-2 pr-2 custom-scrollbar">
                    {logs.map(log => (<div key={log.id} className={`${log.type === 'system' ? 'text-blue-400' : ''} ${log.type === 'success' ? 'text-green-400 font-bold' : ''} ${log.type === 'upgrade' ? 'text-purple-400' : ''} ${log.type === 'normal' ? 'text-gray-400' : ''} ${log.type === 'danger' ? 'text-red-500' : ''}`}>{log.text}</div>))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </>
            )}

            {/* TAB: PORTAIS */}
            {activeTab === 'portais' && (
              <div className="border border-purple-900/40 bg-purple-950/10 p-4 sm:p-6 rounded-md shadow-lg min-h-[400px] sm:min-h-[500px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-purple-900/50 pb-3 mb-4 sm:mb-6 gap-2">
                   <h2 className="text-purple-400 font-bold uppercase tracking-widest flex items-center gap-2 text-sm sm:text-base">
                     <Map size={18} /> Associação de Caçadores
                   </h2>
                   
                   <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded border border-gray-800 w-full sm:w-auto">
                     <Clock size={14} className={portalsToday >= 18 ? "text-red-500" : "text-blue-400"} />
                     <span className="text-xs sm:text-sm font-bold text-gray-300">Portais Hoje: <span className={portalsToday >= 18 ? "text-red-500" : "text-white"}>{portalsToday}/18</span></span>
                   </div>
                </div>

                <p className="text-xs sm:text-sm text-gray-400 mb-6 sm:mb-8">Entre para testar seus atributos. Morrer te expulsa com ferimentos graves. (Masmorras com 3 a 6 inimigos. Limite: 1 a cada 20 min, máx 18/dia).</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                  {['E', 'D', 'C', 'B', 'A', 'S'].map((diffRank) => {
                     const isRankLocked = rankValues[rank] < rankValues[diffRank];
                     const isLocked = portalsToday >= 18 || isCooldownActive || isRankLocked;
                     
                     // Definindo classes para não quebrar a limpeza do Tailwind
                     const cConfig = {
                       'E': { border: 'border-gray-900/50', hover: 'hover:border-gray-500', text: 'text-gray-500', tLight: 'text-gray-400' },
                       'D': { border: 'border-green-900/50', hover: 'hover:border-green-500', text: 'text-green-500', tLight: 'text-green-400' },
                       'C': { border: 'border-blue-900/50', hover: 'hover:border-blue-500', text: 'text-blue-500', tLight: 'text-blue-400' },
                       'B': { border: 'border-purple-900/50', hover: 'hover:border-purple-500', text: 'text-purple-500', tLight: 'text-purple-400' },
                       'A': { border: 'border-yellow-900/50', hover: 'hover:border-yellow-500', text: 'text-yellow-500', tLight: 'text-yellow-400' },
                       'S': { border: 'border-red-900/50', hover: 'hover:border-red-500', text: 'text-red-500', tLight: 'text-red-400' }
                     };
                     const color = cConfig[diffRank];

                     return (
                      <button 
                        key={diffRank}
                        disabled={isLocked}
                        onClick={() => handleEnterPortal(diffRank)} 
                        className={`group p-3 sm:p-6 bg-black border rounded flex flex-col items-center transition-all ${isLocked ? 'border-gray-800 opacity-60 cursor-not-allowed' : `${color.border} ${color.hover}`}`}
                      >
                        <Swords size={28} className={`${isLocked ? 'text-gray-600' : color.text} mb-2 sm:mb-3 ${!isLocked && 'group-hover:scale-110'} transition-transform`} />
                        <h3 className={`${isLocked ? 'text-gray-500' : color.tLight} font-bold text-sm sm:text-lg capitalize`}>Portal Rank {diffRank}</h3>
                        
                        <div className="mt-3 w-full">
                           {isRankLocked ? (
                              <span className="block text-[10px] sm:text-xs text-gray-500 font-bold py-1 flex justify-center items-center gap-1"><Lock size={12}/> EXIGE RANK {diffRank}</span>
                           ) : portalsToday >= 18 ? (
                              <span className="block text-[10px] sm:text-xs text-red-500 font-bold bg-red-900/20 py-1 rounded">LIMITE</span>
                           ) : isCooldownActive ? (
                              <span className="block text-[10px] sm:text-xs text-blue-400 font-bold bg-blue-900/20 py-1 rounded">{timeRemaining}</span>
                           ) : (
                              <span className="block text-[10px] sm:text-xs text-gray-500 font-bold py-1">ENTRAR</span>
                           )}
                        </div>
                      </button>
                     )
                  })}
                </div>
              </div>
            )}

            {/* TAB: BESTIÁRIO */}
            {activeTab === 'bestiario' && (
              <div className="border border-green-900/40 bg-green-950/10 p-4 sm:p-6 rounded-md shadow-lg min-h-[400px] sm:min-h-[500px]">
                <div className="border-b border-green-900/50 pb-3 mb-4 sm:mb-6">
                   <h2 className="text-green-400 font-bold uppercase tracking-widest flex items-center gap-2 text-sm sm:text-base">
                     <BookOpen size={18} /> Bestiário do Sistema
                   </h2>
                   <p className="text-xs sm:text-sm text-gray-400 mt-2">Registros de criaturas conhecidas organizadas por Rank. Atributos base variam de acordo com o Nível do monstro gerado.</p>
                </div>

                <div className="space-y-6 sm:space-y-8">
                  {['E', 'D', 'C', 'B', 'A', 'S'].map(rankKey => {
                    const isRankLocked = rankValues[rank] < rankValues[rankKey];
                    return (
                      <div key={rankKey} className="relative">
                        <h3 className="text-lg font-bold text-gray-200 mb-3 flex items-center gap-2">
                           Rank {rankKey} {isRankLocked && <Lock size={14} className="text-gray-600"/>}
                        </h3>
                        
                        {isRankLocked ? (
                          <div className="bg-black/50 border border-gray-800 rounded p-6 text-center text-gray-600 text-sm font-bold tracking-widest uppercase">
                             Arquivos Classificados. Alcance o Rank {rankKey} para visualizar.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {bestiaryData[rankKey].map((monster, i) => (
                              <div key={i} className="bg-black border border-green-900/30 rounded p-4 hover:border-green-700/50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-green-400 font-bold text-sm">{monster.name}</h4>
                                  <span className="bg-gray-900 text-gray-400 border border-gray-700 text-[10px] px-2 py-0.5 rounded">
                                    Lvl {monster.minLvl} - {monster.maxLvl}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 mb-3 italic">"{monster.lore}"</p>
                                <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
                                  <div className="bg-red-950/20 text-red-400 border border-red-900/30 p-1.5 rounded flex justify-between">
                                    <span>HP Base:</span> <span className="font-bold">{monster.baseHp}</span>
                                  </div>
                                  <div className="bg-orange-950/20 text-orange-400 border border-orange-900/30 p-1.5 rounded flex justify-between">
                                    <span>ATK Base:</span> <span className="font-bold">{monster.baseAtk}</span>
                                  </div>
                                  <div className="bg-blue-950/20 text-blue-400 border border-blue-900/30 p-1.5 rounded flex justify-between">
                                    <span>XP Mín:</span> <span className="font-bold">{monster.xpDrop}</span>
                                  </div>
                                  <div className="bg-yellow-950/20 text-yellow-500 border border-yellow-900/30 p-1.5 rounded flex justify-between">
                                    <span>Gold:</span> <span className="font-bold">{monster.goldDrop[0]}-{monster.goldDrop[1]}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB: COMBATE */}
            {activeTab === 'combate' && currentEnemy && (
              <div className="border border-red-900/40 bg-black p-4 sm:p-6 rounded-md shadow-[0_0_30px_rgba(153,27,27,0.15)] flex flex-col min-h-[400px] sm:min-h-[500px]">
                
                <div className="text-center mb-2">
                   <span className="bg-red-900/40 text-red-400 border border-red-800/50 px-3 py-1 rounded text-[10px] sm:text-xs font-bold tracking-widest">
                     INIMIGO {dungeonStats.defeated + 1} DE {dungeonStats.total}
                   </span>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-900 p-3 sm:p-4 rounded border border-gray-800 mb-4 sm:mb-6 gap-4 sm:gap-0">
                  <div className="w-full sm:w-[45%] text-left">
                    <h3 className="text-blue-400 font-bold mb-1 text-xs sm:text-sm">Jogador</h3>
                    <div className="w-full bg-black h-3 sm:h-4 rounded overflow-hidden border border-gray-700">
                      <div className="bg-red-600 h-full transition-all" style={{ width: `${Math.max(0, (currentHp / maxHp) * 100)}%` }} />
                    </div>
                    <p className="text-[10px] sm:text-xs mt-1 text-gray-400">{currentHp} / {maxHp} PV</p>
                  </div>
                  
                  <div className="font-bold text-gray-500 text-sm sm:text-xl">VS</div>

                  <div className="w-full sm:w-[45%] text-left sm:text-right">
                    <h3 className="text-red-400 font-bold mb-1 text-xs sm:text-sm">
                      <span className="text-gray-500 text-[10px] mr-2">Lvl {currentEnemy.level}</span>
                      {currentEnemy.name}
                    </h3>
                    <div className="w-full bg-black h-3 sm:h-4 rounded overflow-hidden border border-gray-700 sm:transform sm:rotate-180">
                      <div className="bg-orange-600 h-full transition-all" style={{ width: `${Math.max(0, (currentEnemy.hp / currentEnemy.maxHp) * 100)}%` }} />
                    </div>
                    <p className="text-[10px] sm:text-xs mt-1 text-gray-400">Vida: {currentEnemy.hp}</p>
                  </div>
                </div>

                <div className="flex-grow bg-[#050505] border border-gray-800 rounded p-3 sm:p-4 mb-4 sm:mb-6 overflow-hidden flex flex-col">
                  <div className="flex-grow overflow-y-auto space-y-2 sm:space-y-3 font-mono text-xs sm:text-base scrollbar-thin scrollbar-thumb-gray-800 pr-2">
                    {battleLogs.map(log => (<div key={log.id} className={`${log.type === 'system' ? 'text-blue-500 font-bold' : ''} ${log.type === 'danger' ? 'text-red-500' : ''} ${log.type === 'normal' ? 'text-gray-300' : ''} ${log.type === 'upgrade' ? 'text-yellow-400 font-bold' : ''} ${log.type === 'success' ? 'text-green-500 font-bold text-sm sm:text-lg py-1 sm:py-2' : ''}`}>{log.text}</div>))}
                    <div ref={battleLogEndRef} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  <button onClick={attackTurn} disabled={currentEnemy.hp <= 0 || currentHp <= 0} className="py-2.5 sm:py-3 bg-red-900/30 hover:bg-red-900/60 border border-red-700 text-red-200 font-bold rounded flex justify-center items-center gap-2 disabled:opacity-30 transition-colors text-xs sm:text-sm">
                    <Sword size={16} className="sm:w-5 sm:h-5" /> ATACAR
                  </button>
                  <button onClick={() => usePotion(true)} disabled={potions <= 0 || currentHp >= maxHp || currentEnemy.hp <= 0 || currentHp <= 0} className="py-2.5 sm:py-3 bg-purple-900/30 hover:bg-purple-900/60 border border-purple-700 text-purple-200 font-bold rounded flex justify-center items-center gap-2 disabled:opacity-30 transition-colors text-xs sm:text-sm">
                    <PlusCircle size={16} className="sm:w-5 sm:h-5" /> POÇÃO ({potions})
                  </button>
                  <button onClick={fleeBattle} disabled={currentEnemy.hp <= 0 || currentHp <= 0} className="py-2.5 sm:py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 font-bold rounded disabled:opacity-30 transition-colors text-xs sm:text-sm">
                    FUGIR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        @media (min-width: 640px) { .custom-scrollbar::-webkit-scrollbar { width: 6px; } }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}} />
    </div>
  );
};

export default App;