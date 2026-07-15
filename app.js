const cardPool = [
    { name: "免死金牌", desc: "比賽結束前可觸發一次，我方主動失誤(出界、掛網)該球不算分，並由我方重新發球。" },
    { name: "消失邊界", desc: "共有3分的額度，對手回球落於限制區外的話我方得分。" },
    { name: "加倍奉還", desc: "比賽結束前可觸發一次，我方連續得2分後，立刻加2分。" },
    { name: "雙手奉上", desc: "指定對方一名球員，接下來3分必須雙手握拍回球(發球可用單手)。" },
    { name: "霧裡看花", desc: "指定對方一名球員，接下來3分必須閉上一隻眼睛。" },
    { name: "畫地為牢", desc: "指定對方一名球員，接下來3分只能活動於底線區域。" },
    { name: "天使祝福", desc: "即刻生效，若是我方分數落後於對手，立刻提高分數強制平手(分數高則此卡無效)。" },
    { name: "惡魔契約", desc: "我方分數立刻扣3分，但下來3回合，我方得1分算3分。" },
    { name: "左右互搏", desc: "指定對方一名球員，接下來5分必須使用非慣用手持拍。" },
    { name: "降維打擊", desc: "指定對方一名球員，接下來5分必須用匹克球拍。" },
    { name: "劫富濟貧", desc: "比賽結束前可觸發一次，一旦對手領先，我方分數加2分，且對手扣2分" }
];

let gameState = {
    A: { score: 0, deck: [] },
    B: { score: 0, deck: [] }
};

function changeScore(team, val) {
    gameState[team].score += val;
    if (gameState[team].score < 0) gameState[team].score = 0;
    if (gameState[team].score > 99) gameState[team].score = 99;
    
    const formatted = String(gameState[team].score).padStart(2, '0');
    document.getElementById(`score${team}`).textContent = formatted;
}

function initDeck(team) {
    gameState[team].deck = [...cardPool, ...cardPool];
    for (let i = gameState[team].deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState[team].deck[i], gameState[team].deck[j]] = [gameState[team].deck[j], gameState[team].deck[i]];
    }
    
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
    
    updateUI(team);
}

function updateUI(team) {
    document.getElementById(`remCount${team}`).textContent = gameState[team].deck.length;
}

// 1. 全部重置
function resetAll() {
    gameState.A.score = 0;
    gameState.B.score = 0;
    document.getElementById('scoreA').textContent = "00";
    document.getElementById('scoreB').textContent = "00";
    initDeck('A');
    initDeck('B');
    
    // 重置順序類別為初始狀態（A在左，B在右）
    const teamA = document.querySelector('.team-blue');
    const teamB = document.querySelector('.team-red');
    if(teamA && teamB) {
        teamA.classList.remove('position-right');
        teamA.classList.add('position-left');
        teamB.classList.remove('position-left');
        teamB.classList.add('position-right');
    }
}

// 2. 核心修正：整個區塊左右互換 (利用 CSS order 對調)
function switchSides() {
    // 抓取兩個隊伍的 HTML 容器區塊 (這裡假设你的 HTML 左邊是 .team-blue, 右邊是 .team-red)
    const teamA = document.querySelector('.team-blue');
    const teamB = document.querySelector('.team-red');

    if (teamA && teamB) {
        // 檢查目前是否已經換過位置
        const isAMovedRight = teamA.classList.contains('position-right');

        if (!isAMovedRight) {
            // 如果原本 A 在左邊，點擊後把 A 移到右邊，B 移到左邊
            teamA.classList.remove('position-left');
            teamA.classList.add('position-right');
            teamB.classList.remove('position-right');
            teamB.classList.add('position-left');
        } else {
            // 如果已經換過了，再點一次就復原（A 回左邊，B 回右邊）
            teamA.classList.remove('position-right');
            teamA.classList.add('position-left');
            teamB.classList.remove('position-left');
            teamB.classList.add('position-right');
        }
    }
}

function setupSwipeEntry(team) {
    const swipeCard = document.getElementById(`swipeCard${team}`);
    const cardDeck = document.getElementById(`cardDeck${team}`);
    const container = document.getElementById(`flipContainer${team}`);
    const title = document.getElementById(`cardTitle${team}`);
    const desc = document.getElementById(`cardDesc${team}`);
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
            swipeCard.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.15s';
            swipeCard.style.transform = 'translateY(-250px) scale(0.6)';
            swipeCard.style.opacity = '0';
            
            setTimeout(() => {
                if (gameState[team].deck.length > 0) {
                    const drawnCard = gameState[team].deck.pop();
                    title.textContent = drawnCard.name;
                    desc.textContent = drawnCard.desc;
                    
                    if (team === 'A') {
                        tag.textContent = '藍隊技能';
                        container.classList.add('has-result-blue');
                    } else {
                        tag.textContent = '紅隊技能';
                        container.classList.add('has-result-red');
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
                
                updateUI(team);
            }, 200);
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

// 監聽與初始化
document.getElementById('resetAllBtn').addEventListener('click', resetAll);
document.getElementById('switchSidesBtn').addEventListener('click', switchSides);

setupSwipeEntry('A');
setupSwipeEntry('B');
resetAll();