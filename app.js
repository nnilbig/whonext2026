// 1. 定義 11 張不同的卡牌池
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

let currentDeck = [];

// DOM 元素獲取
const swipeCard = document.getElementById('swipeCard');
const flipContainer = document.getElementById('flipContainer');
const cardTitle = document.getElementById('cardTitle');
const cardDesc = document.getElementById('cardDesc');
const shuffleBtn = document.getElementById('shuffleBtn');
const remCount = document.getElementById('remCount');
const cardDeck = document.getElementById('cardDeck');

// 滑動手勢變數
let startY = 0;
let currentY = 0;
let isDragging = false;
const swipeThreshold = -80; // 向上滑動超過 80px 觸發

// --- 洗牌功能 ---
function shuffle() {
    currentDeck = [...cardPool];
    for (let i = currentDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentDeck[i], currentDeck[j]] = [currentDeck[j], currentDeck[i]];
    }
    
    // 恢復下方的滑動卡牌
    swipeCard.style.display = 'flex';
    swipeCard.style.transform = 'translateY(0) scale(1)';
    swipeCard.style.opacity = '1';
    cardDeck.style.opacity = '1';
    
    // 恢復結果區為「未抽卡」的預設邊框與樣式
    flipContainer.classList.remove('has-result');
    cardTitle.textContent = "等待抽卡";
    cardDesc.textContent = "請由下方拔起一張卡牌向上滑動...";

    updateUI();
}

function updateUI() {
    remCount.textContent = currentDeck.length;
    shuffleBtn.disabled = currentDeck.length === cardPool.length && !flipContainer.classList.contains('has-result');
}

// --- 手勢事件監聽 (向上滑動) ---
function signStart(y) {
    if (currentDeck.length === 0) return;
    startY = y;
    currentY = y;
    isDragging = true;
    
    // 壓住卡片準備往上滑時，先清除發光邊框與上一次的文字
    flipContainer.classList.remove('has-result');
    cardTitle.textContent = "等待抽卡";
    cardDesc.textContent = "請由下方拔起一張卡牌向上滑動...";
}

function signMove(y) {
    if (!isDragging) return;
    currentY = y;
    let moveY = currentY - startY;
    
    // 限制只能往上滑
    if (moveY > 0) moveY = 0;
    
    const scale = 1 + (moveY * 0.001); 
    swipeCard.style.transform = `translateY(${moveY}px) scale(${Math.max(scale, 0.85)})`;
}

function signEnd() {
    if (!isDragging) return;
    isDragging = false;
    const moveY = currentY - startY;

    // 判斷向上滑動距離是否達標
    if (moveY < swipeThreshold) {
        
        // 1. 播放「卡片往上飛走並消失」的順暢動畫
        swipeCard.style.transition = 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.18s';
        swipeCard.style.transform = 'translateY(-600px) scale(0.5)';
        swipeCard.style.opacity = '0';
        
        // 2. 當下方卡片飛走動畫結束的瞬間 (220ms)，直接把結果顯露出來（零翻轉延遲）
        setTimeout(() => {
            
            if (currentDeck.length > 0) {
                const drawnCard = currentDeck.pop();
                
                // 【核心修改】不需翻轉動畫，文字直接替換，容器加上發光樣式類別
                cardTitle.textContent = drawnCard.name;
                cardDesc.textContent = drawnCard.desc;
                flipContainer.classList.add('has-result');
            }
            
            // 3. 重置下方滑動卡牌，準備下一次抽卡
            swipeCard.style.transition = 'none'; // 瞬間重置
            
            if (currentDeck.length > 0) {
                swipeCard.style.transform = 'translateY(0) scale(1)';
                swipeCard.style.opacity = '1';
            } else {
                swipeCard.style.display = 'none'; // 抽完隱藏
                cardDeck.style.opacity = '0.2';
            }
            
            setTimeout(() => {
                swipeCard.style.transition = 'transform 0.1s ease, opacity 0.2s ease';
            }, 50);
            
            updateUI();
        }, 220); // 這裏對應飛出動畫的時間
        
    } else {
        // 沒滑夠高，彈回原位
        swipeCard.style.transform = 'translateY(0) scale(1)';
    }
}

// 觸控事件 (手機端)
swipeCard.addEventListener('touchstart', (e) => signStart(e.touches[0].clientY));
window.addEventListener('touchmove', (e) => {
    signMove(e.touches[0].clientY);
}, { passive: false });
window.addEventListener('touchend', signEnd);

// 滑鼠事件 (電腦端測試用)
swipeCard.addEventListener('mousedown', (e) => signStart(e.clientY));
window.addEventListener('mousemove', (e) => {
    if (isDragging) signMove(e.clientY);
});
window.addEventListener('mouseup', signEnd);

// 洗牌按鈕
shuffleBtn.addEventListener('click', shuffle);

// 初始化遊戲
shuffle();