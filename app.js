// ==================== 核心遊戲設定 ====================
const ACE_THRESHOLD = 10;      // 對手分數門檻（對方達到此分數，我方王牌才解鎖）
const ACE_PROBABILITY = 0.30;   // 對手達標後，我方抽卡有 30% 的機率觸發「抽出王牌」
const GLOW_SCORES = [5, 10, 15, 20]; // 觸發抽卡提示的分數門檻
// ====================================================

const cardPool = [
    { name: "免死金牌", desc: "比賽結束前可觸發一次，我方主動失誤(出界、掛網)該球不算分，並由我方重新發球。" },
    { name: "消失邊界", desc: "共有3分的額度，對手回球落於限制區外的話我方得分。" },
    { name: "加倍奉還", desc: "比賽結束前可觸發一次，我方連續得2分後，立刻加2分。" },
    { name: "雙手奉上", desc: "指定對方一名球員，接下來3分必須雙手握拍回球(發球可用單手)。" },
    { name: "霧裡看花", desc: "指定對方一名球員，接下來3分必須閉上一隻眼睛。" },
    { name: "畫地為牢", desc: "指定對方一名球員，接下來3分只能活動於底線區域。" },
    { name: "天使祝福", desc: "即刻生效，若是我方分數落後於對手，立刻提高分數強制平手(分數高則此卡無效)。", isAce: true },
    { name: "惡魔契約", desc: "我方分數立刻扣3分，但下來3回合，我方得1分算3分。", isAce: true },
    { name: "左右互搏", desc: "指定對方一名球員，接下來5分必須使用非慣用手持拍。" },
    { name: "降維打擊", desc: "指定對方一名球員，接下來5分必須用匹克球拍。"},
    { name: "劫富濟貧", desc: "比賽結束前可觸發一次，一旦對手領先，我方分數加2分，且對手扣2分", isAce: true }
];

let gameState = {
    A: { 
        score: 0, 
        deck: [], 
        triggeredComeback: false, // 紀錄 A 隊本場是否曾觸發過反擊資格
        usedComeback: false,      // 紀錄 A 隊本場是否使用過落後反擊抽卡
        drawnThresholds: []       // 紀錄 A 隊在此分數時是否已抽過牌
    },
    B: { 
        score: 0, 
        deck: [], 
        triggeredComeback: false, // 紀錄 B 隊本場是否曾觸發過反擊資格
        usedComeback: false,      // 紀錄 B 隊本場是否使用過落後反擊抽卡
        drawnThresholds: []       // 紀錄 B 隊在此分數時是否已抽過牌
    }
};

function changeScore(team, val) {
    gameState[team].score += val;
    if (gameState[team].score < 0) gameState[team].score = 0;
    if (gameState[team].score > 99) gameState[team].score = 99;
    
    const formatted = String(gameState[team].score).padStart(2, '0');
    document.getElementById(`score${team}`).textContent = formatted;

    // 每次分數變動，檢查是否觸發「螢光提示」與「落後反擊機制」
    checkGlowAndComeback();
}

// 監控分數：處理外框螢光與落後反擊按鈕
function checkGlowAndComeback() {
    const scoreA = gameState.A.score;
    const scoreB = gameState.B.score;

    const teamElementA = document.querySelector('.team-blue');
    const teamElementB = document.querySelector('.team-red');

    // ---- 1. 偵測 5, 10, 15, 20 分的外框螢光提示（未抽過牌才亮燈） ----
    if (GLOW_SCORES.includes(scoreA) && !gameState.A.drawnThresholds.includes(scoreA)) {
        teamElementA.classList.add('glow-active');
    } else {
        teamElementA.classList.remove('glow-active');
    }

    if (GLOW_SCORES.includes(scoreB) && !gameState.B.drawnThresholds.includes(scoreB)) {
        teamElementB.classList.add('glow-active');
    } else {
        teamElementB.classList.remove('glow-active');
    }

    // ---- 2. 偵測落後 10 分以上反擊機制（觸發後常駐） ----
    const comebackBtnA = document.getElementById('comebackBtnA');
    const comebackBtnB = document.getElementById('comebackBtnB');

    // 判斷是否「首次達到」落後 10 分的門檻
    if (scoreB - scoreA >= 10 && !gameState.A.usedComeback) {
        gameState.A.triggeredComeback = true;
    }
    if (scoreA - scoreB >= 10 && !gameState.B.usedComeback) {
        gameState.B.triggeredComeback = true;
    }

    // A 隊按鈕顯示邏輯：一旦觸發過且未使用，便常駐顯示
    if (gameState.A.triggeredComeback && !gameState.A.usedComeback) {
        if (comebackBtnA) comebackBtnA.classList.add('show');
    } else {
        if (comebackBtnA) comebackBtnA.classList.remove('show');
    }

    // B 隊按鈕顯示邏輯：一旦觸發過且未使用，便常駐顯示
    if (gameState.B.triggeredComeback && !gameState.B.usedComeback) {
        if (comebackBtnB) comebackBtnB.classList.add('show');
    } else {
        if (comebackBtnB) comebackBtnB.classList.remove('show');
    }
}

// 觸發落後反擊抽卡（不限時機，點擊按鈕直接抽）
function triggerComebackDraw(team) {
    if (gameState[team].deck.length === 0) return;
    
    // 標記已使用過
    gameState[team].usedComeback = true;
    
    // 隱藏該隊的反擊按鈕 (漸隱動畫)
    const btn = document.getElementById(`comebackBtn${team}`);
    if (btn) btn.classList.remove('show');

    // 執行抽卡流程
    executeDrawFlow(team);
}

// 封裝原本的抽卡後續邏輯，方便一般抽卡與反擊按鈕共用
function executeDrawFlow(team) {
    const swipeCard = document.getElementById(`swipeCard${team}`);
    const cardDeck = document.getElementById(`cardDeck${team}`);
    const container = document.getElementById(`flipContainer${team}`);
    const title = document.getElementById(`cardTitle${team}`);
    const desc = document.getElementById(`cardDesc${team}`);
    const tag = container.querySelector('.card-tag');

    // 關鍵：抽卡的同時，紀錄該隊當前分數已經完成抽卡
    const currentScore = gameState[team].score;
    if (!gameState[team].drawnThresholds.includes(currentScore)) {
        gameState[team].drawnThresholds.push(currentScore);
    }

    // 抽卡特效演出
    swipeCard.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.15s';
    swipeCard.style.transform = 'translateY(-250px) scale(0.6)';
    swipeCard.style.opacity = '0';
    
    setTimeout(() => {
        if (gameState[team].deck.length > 0) {
            const drawnCard = verifyAndDrawCard(team);
            
            title.textContent = drawnCard.name;
            desc.textContent = drawnCard.desc;
            
            if (team === 'A') {
                tag.textContent = drawnCard.isAce ? '★ 藍隊王牌 ★' : '藍隊技能';
                container.classList.add('has-result-blue');
                // 抽完卡後，立刻手動移除藍隊螢光框
                document.querySelector('.team-blue').classList.remove('glow-active');
            } else {
                tag.textContent = drawnCard.isAce ? '★ 紅隊王牌 ★' : '紅隊技能';
                container.classList.add('has-result-red');
                // 抽完卡後，立刻手動移除紅隊螢光框
                document.querySelector('.team-red').classList.remove('glow-active');
            }
        }
        
        swipeCard.style.transition = 'none';
        
        if (gameState[team].deck.length > 0) {
            swipeCard.style.transform = 'translateY(0) scale(1)';
            swipeCard.style.opacity = '1';
        } else {
            swipeCard.style.display = 'none';
            cardDeck.style.opacity = '0.2';
        }
        
        setTimeout(() => {
            swipeCard.style.transition = 'transform 0.1s ease, opacity 0.2s ease';
        }, 50);
        
    }, 200);
}

// 初始化/重置牌組
function initDeck(team) {
    let customDeck = [];
    
    cardPool.forEach(card => {
        if (card.isAce) {
            customDeck.push({ ...card });
        } else {
            customDeck.push({ ...card });
            customDeck.push({ ...card });
        }
    });

    // 隨機洗牌
    for (let i = customDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [customDeck[i], customDeck[j]] = [customDeck[j], customDeck[i]];
    }
    
    gameState[team].deck = customDeck;
    gameState[team].triggeredComeback = false; // 重置反擊卡觸發狀態
    gameState[team].usedComeback = false;      // 重置反擊卡使用狀態
    gameState[team].drawnThresholds = [];      // 重置已抽過牌的分數紀錄
    
    const swipeCard = document.getElementById(`swipeCard${team}`);
    const cardDeck = document.getElementById(`cardDeck${team}`);
    swipeCard.style.display = 'flex';
    swipeCard.style.transform = 'translateY(0) scale(1)';
    swipeCard.style.opacity = '1';
    cardDeck.style.opacity = '1';
    
    const container = document.getElementById(`flipContainer${team}`);
    const title = document.getElementById(`cardTitle${team}`);
    const desc = document.getElementById(`cardDesc${team}`);
    const tag = container.querySelector('.card-tag');
    
    container.classList.remove('has-result-blue', 'has-result-red');
    tag.textContent = "等待抽卡";
    title.textContent = "請抽卡";
    desc.textContent = "向上撥動下方卡牌...";
}

// 全部重置
function resetAll() {
    gameState.A.score = 0;
    gameState.B.score = 0;
    document.getElementById('scoreA').textContent = "00";
    document.getElementById('scoreB').textContent = "00";
    initDeck('A');
    initDeck('B');
    
    // 清除螢光與按鈕
    const teamA = document.querySelector('.team-blue');
    const teamB = document.querySelector('.team-red');
    if (teamA) teamA.classList.remove('glow-active');
    if (teamB) teamB.classList.remove('glow-active');
    
    const comebackBtnA = document.getElementById('comebackBtnA');
    const comebackBtnB = document.getElementById('comebackBtnB');
    if (comebackBtnA) comebackBtnA.classList.remove('show');
    if (comebackBtnB) comebackBtnB.classList.remove('show');

    if(teamA && teamB) {
        teamA.classList.remove('position-right');
        teamA.classList.add('position-left');
        teamB.classList.remove('position-left');
        teamB.classList.add('position-right');
    }
}

// 整個區塊左右互換
function switchSides() {
    const teamA = document.querySelector('.team-blue');
    const teamB = document.querySelector('.team-red');

    if (teamA && teamB) {
        const isAMovedRight = teamA.classList.contains('position-right');

        if (!isAMovedRight) {
            teamA.classList.remove('position-left');
            teamA.classList.add('position-right');
            teamB.classList.remove('position-right');
            teamB.classList.add('position-left');
        } else {
            teamA.classList.remove('position-right');
            teamA.classList.add('position-left');
            teamB.classList.remove('position-left');
            teamB.classList.add('position-right');
        }
    }
}

// 隨機抽卡與王牌卡判定邏輯
function verifyAndDrawCard(team) {
    const opponent = (team === 'A') ? 'B' : 'A';
    const opponentScore = gameState[opponent].score;
    
    const isAceUnlocked = (opponentScore >= ACE_THRESHOLD);
    const wantsAce = isAceUnlocked && (Math.random() < ACE_PROBABILITY);
    
    let temporaryHand = [];
    let chosenCard = null;

    while (gameState[team].deck.length > 0) {
        let card = gameState[team].deck.pop();

        if (card.isAce) {
            if (wantsAce) {
                chosenCard = card;
                break;
            } else {
                temporaryHand.push(card);
            }
        } else {
            if (!wantsAce) {
                chosenCard = card;
                break;
            } else {
                temporaryHand.push(card);
            }
        }
    }

    if (!chosenCard && temporaryHand.length > 0) {
        chosenCard = temporaryHand.shift();
    }

    if (temporaryHand.length > 0) {
        gameState[team].deck.push(...temporaryHand);
        for (let i = gameState[team].deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gameState[team].deck[i], gameState[team].deck[j]] = [gameState[team].deck[j], gameState[team].deck[i]];
        }
    }

    return chosenCard;
}

function setupSwipeEntry(team) {
    const swipeCard = document.getElementById(`swipeCard${team}`);
    const container = document.getElementById(`flipContainer${team}`);
    const tag = container.querySelector('.card-tag');
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    const swipeThreshold = -50; 

    function onStart(y) {
        if (gameState[team].deck.length === 0) return;
        startY = y;
        currentY = y;
        isDragging = true;
        
        container.classList.remove('has-result-blue', 'has-result-red');
        tag.textContent = "等待抽卡";
    }

    function onMove(y) {
        if (!isDragging) return;
        currentY = y;
        let moveY = currentY - startY;
        if (moveY > 0) moveY = 0; 
        
        const scale = 1 + (moveY * 0.001);
        swipeCard.style.transform = `translateY(${moveY}px) scale(${Math.max(scale, 0.85)})`;
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        const moveY = currentY - startY;

        if (moveY < swipeThreshold) {
            executeDrawFlow(team);
        } else {
            swipeCard.style.transform = 'translateY(0) scale(1)';
            if (container.classList.contains('has-result-blue')) {
                tag.textContent = '藍隊技能';
            } else if (container.classList.contains('has-result-red')) {
                tag.textContent = '紅隊技能';
            } else {
                tag.textContent = "等待抽卡";
            }
        }
    }

    swipeCard.addEventListener('touchstart', (e) => onStart(e.touches[0].clientY));
    swipeCard.addEventListener('touchmove', (e) => onMove(e.touches[0].clientY), {passive: false});
    swipeCard.addEventListener('touchend', onEnd);

    swipeCard.addEventListener('mousedown', (e) => onStart(e.clientY));
    window.addEventListener('mousemove', (e) => { if (isDragging) onMove(e.clientY); });
    window.addEventListener('mouseup', onEnd);
}

// ==================== 規則說明視窗邏輯 ====================
const ruleModal = document.getElementById('ruleModal');
const ruleBtn = document.getElementById('ruleBtn');
const closeRuleBtn = document.getElementById('closeRuleBtn');
const confirmRuleBtn = document.getElementById('confirmRuleBtn');

if (ruleBtn && ruleModal) {
    ruleBtn.addEventListener('click', () => {
        ruleModal.classList.add('show');
    });

    const closeRuleModal = () => {
        ruleModal.classList.remove('show');
    };

    if (closeRuleBtn) closeRuleBtn.addEventListener('click', closeRuleModal);
    if (confirmRuleBtn) confirmRuleBtn.addEventListener('click', closeRuleModal);

    ruleModal.addEventListener('click', (e) => {
        if (e.target === ruleModal) {
            closeRuleModal();
        }
    });
}

// 監聽與初始化
document.getElementById('resetAllBtn').addEventListener('click', resetAll);
document.getElementById('switchSidesBtn').addEventListener('click', switchSides);

setupSwipeEntry('A');
setupSwipeEntry('B');
resetAll();