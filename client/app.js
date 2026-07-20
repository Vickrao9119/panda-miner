/* ---------- Telegram WebApp integration ---------- */
const tg = window.Telegram ? window.Telegram.WebApp : null;

// Check if running inside Telegram WebApp
const IS_TELEGRAM = tg !== null;

// Track if we received a 401 error to stop retries
let received401Error = false;

// Initialize Telegram WebApp if available
if (tg) {
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor('#09090B');
    tg.setBackgroundColor('#09090B');
  } catch (e) {
    console.log('[telegram] Theme setting not supported:', e);
  }
  console.log('[telegram] WebApp initialized, initData available:', !!tg.initData);
} else {
  console.log("[telegram] Running outside Telegram");
}

/**
 * Haptic feedback for better UX.
 * Works on mobile Telegram, silently ignored elsewhere.
 */
function haptic(style) {
  if (tg && tg.HapticFeedback) {
    if (style === 'success' || style === 'error' || style === 'warning') {
      tg.HapticFeedback.notificationOccurred(style);
    } else {
      tg.HapticFeedback.impactOccurred(style || 'light');
    }
  }
}

/**
 * Raw initData string Telegram gives us.
 * Only available inside Telegram WebApp.
 */
const INIT_DATA = tg && tg.initData ? tg.initData : "";

const API_BASE = "https://panda-miner.onrender.com";

console.log('[app] INIT_DATA length:', INIT_DATA.length, '(empty:', !INIT_DATA, ')');
console.log("[app] API_BASE:", API_BASE);

/* ---------- API helper ---------- */
/**
 * Makes authenticated API requests to the backend.
 * Only includes Telegram initData when available (inside Telegram).
 * Stops retrying after receiving a 401 error.
 */
async function api(path, body) {
  // Don't make API calls if not in Telegram
  if (!IS_TELEGRAM) {
    console.warn("[api] Blocking API call - not running in Telegram");
    throw new Error("Please open this app inside Telegram");
  }

  // Don't retry after 401 error
  if (received401Error) {
    console.warn("[api] Blocking API call - previously received 401 error");
    throw new Error(
      "Authentication failed. Please reopen the app in Telegram.",
    );
  }

  console.log("[api] Request:", path, "hasInitData:", !!INIT_DATA);

  const res = await fetch(API_BASE + "/api" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ initData: INIT_DATA }, body || {})),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[api] Error:", data.error, data);

    // Stop retries on 401 Unauthorized
    if (res.status === 401) {
      received401Error = true;
      console.error("[api] Received 401 - stopping further API calls");
    }

    const err = new Error(data.error || "Request failed");
    err.data = data;
    throw err;
  }

  console.log("[api] Success:", path);
  return data;
}

/* ---------- Config mirrored from server for display purposes ---------- */
const ENERGY_REGEN_MS = 1500;
const SHOP_META = {
  multitap: { desc: '+1 coin per tap', icon: 'assets/icons/pickaxe.svg' },
  energylimit: { desc: '+500 max energy', icon: 'assets/icons/energy.svg' },
  recharge: { desc: 'Energy regens faster', icon: 'assets/icons/lightning.svg' },
  premium: { desc: 'Show off VIP status', icon: 'assets/badges/badge_premium.svg' },
  backpack: { desc: 'Cosmetic gear upgrade', icon: 'assets/icons/backpack.svg' },
  shield: { desc: 'Cosmetic gear upgrade', icon: 'assets/icons/shield.svg' },
};

const ALL_BADGES = [
  { id: 'reward', name: 'First mine', icon: 'assets/badges/badge_reward.svg', auto: s => s.totalMined >= 100 },
  { id: 'level', name: 'Level 5', icon: 'assets/badges/badge_level.svg', auto: s => s.level >= 5 },
  { id: 'rank', name: 'Top miner', icon: 'assets/badges/badge_rank.svg', auto: s => s.totalMined >= 50000 },
  { id: 'premium', name: 'Premium', icon: 'assets/badges/badge_premium.svg', auto: s => (s.badges || []).includes('premium') },
];

/* ---------- Local state cache (hydrated from server) ---------- */
let state = null;
let shopItems = [];
let leaderboardData = [];

/* ---------- DOM refs ---------- */
const els = {
  playerName: document.getElementById('playerName'),
  profileName: document.getElementById('profileName'),
  levelLabel: document.getElementById('levelLabel'),
  coinBalance: document.getElementById('coinBalance'),
  xpFill: document.getElementById('xpFill'),
  xpText: document.getElementById('xpText'),
  mascotBtn: document.getElementById('mascotBtn'),
  mascotImg: document.getElementById('mascotImg'),
  floaters: document.getElementById('floaters'),
  energyFill: document.getElementById('energyFill'),
  energyText: document.getElementById('energyText'),
  openChestBtn: document.getElementById('openChestBtn'),
  chestSub: document.getElementById('chestSub'),
  openBoxBtn: document.getElementById('openBoxBtn'),
  boxSub: document.getElementById('boxSub'),
  shopList: document.getElementById('shopList'),
  rankList: document.getElementById('rankList'),
  badgeGrid: document.getElementById('badgeGrid'),
  profileStats: document.getElementById('profileStats'),
  toast: document.getElementById('toast'),
  // Wallet
  walletStatus: document.getElementById('walletStatus'),
  walletBalance: document.getElementById('walletBalance'),
  connectWalletBtn: document.getElementById('connectWalletBtn'),
  withdrawBtn: document.getElementById('withdrawBtn'),
  transactionList: document.getElementById('transactionList'),
  // Referral
  referralCount: document.getElementById('referralCount'),
  referralEarnings: document.getElementById('referralEarnings'),
  referralCode: document.getElementById('referralCode'),
  copyReferralBtn: document.getElementById('copyReferralBtn'),
  shareReferralBtn: document.getElementById('shareReferralBtn'),
  referralList: document.getElementById('referralList'),
  // Tasks
  taskList: document.getElementById('taskList'),
  // Friends
  friendSearchInput: document.getElementById('friendSearchInput'),
  friendSearchBtn: document.getElementById('friendSearchBtn'),
  friendList: document.getElementById('friendList'),
  pendingList: document.getElementById('pendingList'),
  // Settings
  soundToggle: document.getElementById('soundToggle'),
  musicToggle: document.getElementById('musicToggle'),
  vibrationToggle: document.getElementById('vibrationToggle'),
  notificationsToggle: document.getElementById('notificationsToggle'),
  languageSelect: document.getElementById('languageSelect'),
  themeSelect: document.getElementById('themeSelect'),
  resetSettingsBtn: document.getElementById('resetSettingsBtn'),
  // Notifications
  notificationList: document.getElementById('notificationList'),
  markAllReadBtn: document.getElementById('markAllReadBtn'),
  // More menu
  moreMenu: document.getElementById('moreMenu'),
};

/* ---------- Helpers ---------- */
function fmt(n) { return Math.floor(n || 0).toLocaleString('en-US'); }

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove('show'), 1800);
}

function setMascotImg(pose) {
  els.mascotImg.src = 'assets/mascot/mascot_' + pose + '.svg';
}

/* ---------- Render ---------- */
function render() {
  if (!state) return;
  els.playerName.textContent = state.playerName;
  els.profileName.textContent = state.playerName;
  els.coinBalance.textContent = fmt(state.coins);
  els.levelLabel.textContent = 'Lv. ' + state.level;

  els.xpFill.style.width = Math.min(100, (state.xp / state.xpNeeded) * 100) + '%';
  els.xpText.textContent = fmt(state.xp) + ' / ' + fmt(state.xpNeeded) + ' XP';

  els.energyFill.style.width = (state.energy / state.maxEnergy) * 100 + '%';
  els.energyText.textContent = fmt(state.energy) + '/' + fmt(state.maxEnergy);

  els.openChestBtn.disabled = !state.chestReady;
  els.chestSub.textContent = state.chestReady ? 'Open now!' : 'Locked';

  const boxRemaining = state.boxCooldownMs - (Date.now() - state.lastBoxClaim);
  if (boxRemaining <= 0) {
    els.openBoxBtn.disabled = false;
    els.boxSub.textContent = 'Ready';
  } else {
    els.openBoxBtn.disabled = true;
    const h = Math.floor(boxRemaining / 3600000);
    const m = Math.floor((boxRemaining % 3600000) / 60000);
    els.boxSub.textContent = h + 'h ' + m + 'm';
  }

  els.profileStats.textContent = 'Level ' + state.level + ' · ' + fmt(state.totalMined) + ' coins mined';

  renderShop();
  renderRank();
  renderBadges();
}

function renderShop() {
  els.shopList.innerHTML = '';
  shopItems.forEach(item => {
    const meta = SHOP_META[item.id] || {};
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <img src="${meta.icon || ''}" alt="">
      <div class="info">
        <div class="name">${item.name}${item.maxLevel > 1 ? ' · Lv ' + item.level : ''}</div>
        <div class="desc">${meta.desc || ''}</div>
      </div>
    `;
    const btn = document.createElement('button');
    if (item.maxed) {
      btn.className = 'buy-btn owned';
      btn.textContent = item.maxLevel > 1 ? 'Maxed' : 'Owned';
      btn.disabled = true;
    } else {
      btn.className = 'buy-btn';
      btn.innerHTML = `<img src="assets/icons/coin_gold.svg" alt="">${fmt(item.cost)}`;
      btn.disabled = state.coins < item.cost;
      btn.onclick = () => buyItem(item.id);
    }
    row.appendChild(btn);
    els.shopList.appendChild(row);
  });
}

async function loadShop() {
  if (!IS_TELEGRAM) {
    console.warn("[app] Blocking loadShop - not running in Telegram");
    return;
  }
  const telegramId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : '';
  const res = await fetch(
    API_BASE + "/api/shop?telegramId=" + encodeURIComponent(telegramId),
  );
  const data = await res.json();
  shopItems = data.items;
}

async function buyItem(itemId) {
  try {
    const data = await api('/shop/buy', { itemId });
    state = data.state;
    haptic('success');
    showToast('Upgraded!');
    await loadShop();
    render();
  } catch (e) {
    showToast(e.data && e.data.error ? e.data.error : 'Purchase failed');
    haptic('error');
  }
}

function renderRank() {
  const combined = leaderboardData.concat([{ name: state.playerName + ' (you)', coins: state.totalMined, me: true }])
    .sort((a, b) => b.coins - a.coins);
  els.rankList.innerHTML = '';
  combined.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'rank-item' + (p.me ? ' me' : '');
    row.innerHTML = `
      <div class="rank-num">${i + 1}</div>
      <div class="rank-name">${p.name}</div>
      <div class="rank-coins"><img src="assets/icons/coin_gold.svg" alt="">${fmt(p.coins)}</div>
    `;
    els.rankList.appendChild(row);
  });
}

async function loadLeaderboard() {
  if (!IS_TELEGRAM) {
    console.warn("[app] Blocking loadLeaderboard - not running in Telegram");
    return;
  }
  try {
    const res = await fetch(API_BASE + "/api/leaderboard");
    const data = await res.json();
    leaderboardData = data.players || [];
  } catch (e) {
    console.error('[app] Failed to load leaderboard:', e);
    leaderboardData = [];
  }
}

/* ---------- Profile ---------- */
async function loadProfile() {
  try {
    const data = await api('/users/profile');
    if (data.profile) {
      els.profileName.textContent = data.profile.firstName || data.profile.username || 'Miner';
      els.profileStats.textContent = `Level ${data.profile.level || 1} · ${fmt(data.profile.totalMined || 0)} coins mined`;
      
      // Load achievements/badges
      const achievementsData = await api('/users/achievements');
      els.badgeGrid.innerHTML = '';
      if (achievementsData.achievements && achievementsData.achievements.length > 0) {
        achievementsData.achievements.forEach(achievement => {
          const cell = document.createElement('div');
          cell.className = 'badge-cell';
          cell.innerHTML = `<img src="${achievement.icon || 'assets/badges/badge_reward.svg'}" alt=""><span>${achievement.name}</span>`;
          els.badgeGrid.appendChild(cell);
        });
      } else {
        // Show default badges based on user stats
        renderBadges();
      }
    }
  } catch (e) {
    console.error('[app] Failed to load profile:', e);
    // Fallback to state data
    els.profileName.textContent = state.playerName || 'Miner';
    els.profileStats.textContent = `Level ${state.level || 1} · ${fmt(state.totalMined || 0)} coins mined`;
    renderBadges();
  }
}

/* ---------- Wallet ---------- */
async function loadWallet() {
  try {
    const data = await api('/wallet');
    if (data.wallet) {
      els.walletStatus.textContent = data.wallet.connected ? 'Connected' : 'Not connected';
      els.walletBalance.textContent = fmt(data.wallet.balance || state.coins);
      els.connectWalletBtn.textContent = data.wallet.connected ? 'Disconnect' : 'Connect Wallet';
      els.withdrawBtn.disabled = !data.wallet.connected || (data.wallet.balance || state.coins) < 1000;
    }
  } catch (e) {
    console.error('[app] Failed to load wallet:', e);
  }
}

async function loadTransactions() {
  try {
    const data = await api('/wallet/transactions');
    els.transactionList.innerHTML = '';
    if (data.transactions && data.transactions.length > 0) {
      data.transactions.forEach(tx => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.innerHTML = `
          <span class="type">${tx.type}</span>
          <span class="amount">${fmt(tx.amount)}</span>
          <span class="status">${tx.status}</span>
        `;
        els.transactionList.appendChild(item);
      });
    } else {
      els.transactionList.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">No transactions yet</div>';
    }
  } catch (e) {
    console.error('[app] Failed to load transactions:', e);
  }
}

els.connectWalletBtn.addEventListener('click', async () => {
  try {
    if (els.connectWalletBtn.textContent === 'Connect Wallet') {
      const data = await api('/wallet/connect', { address: 'UQ...' + Math.random().toString(36).substr(2, 8) });
      showToast('Wallet connected!');
    } else {
      const data = await api('/wallet/disconnect');
      showToast('Wallet disconnected');
    }
    await loadWallet();
  } catch (e) {
    showToast(e.data && e.data.error ? e.data.error : 'Wallet operation failed');
  }
});

els.withdrawBtn.addEventListener('click', async () => {
  try {
    const amount = prompt('Enter amount to withdraw:');
    if (amount && !isNaN(amount)) {
      const data = await api('/wallet/withdraw', { amount: parseInt(amount), address: 'UQ...' + Math.random().toString(36).substr(2, 8) });
      showToast('Withdrawal request submitted!');
      await loadWallet();
      await loadTransactions();
    }
  } catch (e) {
    showToast(e.data && e.data.error ? e.data.error : 'Withdrawal failed');
  }
});

/* ---------- Referral ---------- */
async function loadReferral() {
  try {
    const data = await api('/referral/info');
    els.referralCount.textContent = data.referralCount || 0;
    els.referralEarnings.textContent = fmt(data.totalEarnings || 0);
    els.referralCode.textContent = data.referralCode || '---';
    
    // Load referral list
    const listData = await api('/referral/list');
    els.referralList.innerHTML = '';
    if (listData.referrals && listData.referrals.length > 0) {
      listData.referrals.forEach(ref => {
        const item = document.createElement('div');
        item.className = 'referral-item';
        item.innerHTML = `
          <span class="name">${ref.firstName || 'User'}</span>
          <span class="earned">${fmt(ref.earnings || 0)}</span>
        `;
        els.referralList.appendChild(item);
      });
    } else {
      els.referralList.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">No referrals yet</div>';
    }
  } catch (e) {
    console.error('[app] Failed to load referral:', e);
  }
}

els.copyReferralBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(els.referralCode.textContent);
  showToast('Code copied!');
});

els.shareReferralBtn.addEventListener('click', () => {
  if (tg && tg.openTelegramLink) {
    tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/yourbot?start=${els.referralCode.textContent}&text=Join%20Panda%20Miner%20and%20earn%20coins!`);
  } else {
    showToast('Share feature available in Telegram');
  }
});

/* ---------- Tasks ---------- */
async function loadTasks() {
  try {
    const data = await api('/tasks');
    els.taskList.innerHTML = '';
    if (data.tasks && data.tasks.length > 0) {
      data.tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'task-item' + (task.completed ? ' completed' : '');
        item.innerHTML = `
          <div class="info">
            <div class="title">${task.title}</div>
            <div class="desc">${task.description || ''}</div>
          </div>
          <div class="reward"><img src="assets/icons/coin_gold.svg" alt="">${fmt(task.reward)}</div>
          <button class="task-btn" ${task.completed ? 'disabled' : ''}>${task.completed ? 'Done' : 'Claim'}</button>
        `;
        if (!task.completed) {
          item.querySelector('.task-btn').addEventListener('click', () => completeTask(task.taskId));
        }
        els.taskList.appendChild(item);
      });
    } else {
      els.taskList.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">No tasks available</div>';
    }
  } catch (e) {
    console.error('[app] Failed to load tasks:', e);
  }
}

async function completeTask(taskId) {
  try {
    const data = await api(`/tasks/${taskId}/complete`);
    showToast('Task completed!');
    await loadTasks();
    await refreshState();
  } catch (e) {
    showToast(e.data && e.data.error ? e.data.error : 'Task completion failed');
  }
}

/* ---------- Friends ---------- */
async function loadFriends() {
  try {
    const data = await api('/friends');
    els.friendList.innerHTML = '';
    if (data.friends && data.friends.length > 0) {
      data.friends.forEach(friend => {
        const item = document.createElement('div');
        item.className = 'friend-item';
        item.innerHTML = `
          <div class="avatar">${(friend.firstName || 'U')[0]}</div>
          <div class="info">
            <div class="name">${friend.firstName || 'User'}</div>
            <div class="level">Lv. ${friend.level || 1}</div>
          </div>
          <div class="friend-actions">
            <button>View</button>
          </div>
        `;
        els.friendList.appendChild(item);
      });
    } else {
      els.friendList.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">No friends yet</div>';
    }
    
    // Load pending
    const pendingData = await api('/friends/pending');
    els.pendingList.innerHTML = '';
    if (pendingData.pending && pendingData.pending.length > 0) {
      pendingData.pending.forEach(pending => {
        const item = document.createElement('div');
        item.className = 'friend-item';
        item.innerHTML = `
          <div class="avatar">${(pending.firstName || 'U')[0]}</div>
          <div class="info">
            <div class="name">${pending.firstName || 'User'}</div>
          </div>
          <div class="friend-actions">
            <button class="primary">Accept</button>
            <button>Reject</button>
          </div>
        `;
        els.pendingList.appendChild(item);
      });
    } else {
      els.pendingList.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">No pending requests</div>';
    }
  } catch (e) {
    console.error('[app] Failed to load friends:', e);
  }
}

els.friendSearchBtn.addEventListener('click', async () => {
  const query = els.friendSearchInput.value.trim();
  if (query) {
    try {
      const data = await api(`/friends/search?query=${encodeURIComponent(query)}`);
      els.friendList.innerHTML = '';
      if (data.users && data.users.length > 0) {
        data.users.forEach(user => {
          const item = document.createElement('div');
          item.className = 'friend-item';
          item.innerHTML = `
            <div class="avatar">${(user.firstName || 'U')[0]}</div>
            <div class="info">
              <div class="name">${user.firstName || 'User'}</div>
              <div class="level">Lv. ${user.level || 1}</div>
            </div>
            <div class="friend-actions">
              <button class="primary">Add</button>
            </div>
          `;
          els.friendList.appendChild(item);
        });
      } else {
        els.friendList.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">No users found</div>';
      }
    } catch (e) {
      showToast('Search failed');
    }
  }
});

/* ---------- Settings ---------- */
async function loadSettings() {
  try {
    const data = await api('/settings');
    if (data.settings) {
      els.soundToggle.checked = data.settings.soundEnabled !== false;
      els.musicToggle.checked = data.settings.musicEnabled !== false;
      els.vibrationToggle.checked = data.settings.vibrationEnabled !== false;
      els.notificationsToggle.checked = data.settings.notificationsEnabled !== false;
      els.languageSelect.value = data.settings.language || 'en';
      els.themeSelect.value = data.settings.theme || 'dark';
    }
  } catch (e) {
    console.error('[app] Failed to load settings:', e);
  }
}

async function saveSettings() {
  try {
    const settings = {
      soundEnabled: els.soundToggle.checked,
      musicEnabled: els.musicToggle.checked,
      vibrationEnabled: els.vibrationToggle.checked,
      notificationsEnabled: els.notificationsToggle.checked,
      language: els.languageSelect.value,
      theme: els.themeSelect.value,
    };
    await api('/settings', { settings });
    showToast('Settings saved!');
  } catch (e) {
    showToast(e.data && e.data.error ? e.data.error : 'Failed to save settings');
  }
}

[els.soundToggle, els.musicToggle, els.vibrationToggle, els.notificationsToggle, els.languageSelect, els.themeSelect].forEach(el => {
  el.addEventListener('change', saveSettings);
});

els.resetSettingsBtn.addEventListener('click', async () => {
  if (confirm('Reset all settings to default?')) {
    try {
      await api('/settings/reset');
      await loadSettings();
      showToast('Settings reset!');
    } catch (e) {
      showToast('Failed to reset settings');
    }
  }
});

/* ---------- Notifications ---------- */
async function loadNotifications() {
  try {
    const data = await api('/notifications');
    els.notificationList.innerHTML = '';
    if (data.notifications && data.notifications.length > 0) {
      data.notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = 'notification-item' + (notif.read ? '' : ' unread');
        item.innerHTML = `
          <div class="info">
            <div class="title">${notif.title}</div>
            <div class="message">${notif.message}</div>
            <div class="time">${new Date(notif.createdAt).toLocaleString()}</div>
          </div>
          ${!notif.read ? '<button class="read-btn">Mark read</button>' : ''}
        `;
        if (!notif.read) {
          item.querySelector('.read-btn').addEventListener('click', () => markNotificationRead(notif.notificationId));
        }
        els.notificationList.appendChild(item);
      });
    } else {
      els.notificationList.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">No notifications</div>';
    }
  } catch (e) {
    console.error('[app] Failed to load notifications:', e);
  }
}

async function markNotificationRead(notificationId) {
  try {
    await api(`/notifications/${notificationId}/read`);
    await loadNotifications();
  } catch (e) {
    console.error('[app] Failed to mark notification read:', e);
  }
}

els.markAllReadBtn.addEventListener('click', async () => {
  try {
    await api('/notifications/read-all');
    await loadNotifications();
    showToast('All marked as read!');
  } catch (e) {
    showToast('Failed to mark all as read');
  }
});

function renderBadges() {
  els.badgeGrid.innerHTML = '';
  ALL_BADGES.forEach(b => {
    const earned = b.auto(state);
    const cell = document.createElement('div');
    cell.className = 'badge-cell' + (earned ? '' : ' locked');
    cell.innerHTML = `<img src="${b.icon}" alt=""><span>${b.name}</span>`;
    els.badgeGrid.appendChild(cell);
  });
}

/* ---------- Mining ---------- */
async function mine(e) {
  if (state.energy < 5) {
    showToast('Out of energy — wait to recharge');
    haptic('error');
    return;
  }

  // optimistic UI
  els.mascotBtn.classList.remove('bump');
  void els.mascotBtn.offsetWidth;
  els.mascotBtn.classList.add('bump');
  setMascotImg('mining');
  clearTimeout(mine._t);
  mine._t = setTimeout(() => setMascotImg('idle'), 220);

  try {
    const data = await api('/mine');
    spawnFloater('+' + data.gained, e);
    state = data.state;
    haptic('light');
    if (data.leveledUp) {
      haptic('success');
      showToast('Level up! Now level ' + state.level);
      setMascotImg('celebrating');
      clearTimeout(mine._lt);
      mine._lt = setTimeout(() => setMascotImg('idle'), 900);
    }
    render();
  } catch (err) {
    showToast(err.data && err.data.error ? err.data.error : 'Mining failed');
    if (err.data && err.data.state) { state = err.data.state; render(); }
  }
}

function spawnFloater(text, e) {
  const f = document.createElement('div');
  f.className = 'floater';
  f.textContent = text;
  const rect = els.floaters.getBoundingClientRect();
  let x = rect.width / 2, y = rect.height / 2;
  if (e && e.touches && e.touches[0]) {
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  } else if (e && e.clientX) {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  }
  f.style.left = x + 'px';
  f.style.top = y + 'px';
  els.floaters.appendChild(f);
  setTimeout(() => f.remove(), 950);
}

/* ---------- Chest & mystery box ---------- */
els.openChestBtn.addEventListener('click', async () => {
  try {
    const data = await api('/chest/open');
    state = data.state;
    haptic('success');
    showToast('Chest opened: +' + fmt(data.reward) + ' coins!');
    render();
  } catch (e) {
    showToast(e.data && e.data.error ? e.data.error : 'Chest not ready');
  }
});

els.openBoxBtn.addEventListener('click', async () => {
  try {
    const data = await api('/box/open');
    state = data.state;
    haptic('success');
    showToast('Mystery box: +' + fmt(data.reward) + ' coins!');
    render();
  } catch (e) {
    showToast('Box still on cooldown');
  }
});

/* ---------- Periodic state refresh (keeps energy bar + cooldowns accurate) ---------- */
let refreshInterval = null;

/**
 * Periodically refreshes user state from server.
 * This keeps energy bar and cooldown timers in sync with server.
 * Runs every 6 seconds (4 * ENERGY_REGEN_MS).
 * Stops after 401 error to prevent infinite retries.
 */
async function refreshState() {
  // Don't refresh if not in Telegram or after 401 error
  if (!IS_TELEGRAM || received401Error) {
    return;
  }

  try {
    console.log("[app] Refreshing state...");
    const data = await api("/state");
    state = data;
    render();
    console.log("[app] State refreshed:", {
      coins: state.coins,
      energy: state.energy,
      level: state.level,
    });
  } catch (e) {
    console.error("[app] State refresh failed:", e);
    // Stop periodic refresh on error
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
}

/* ---------- Tap handler ---------- */
els.mascotBtn.addEventListener('click', mine);

/* ---------- Tab navigation ---------- */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const view = tab.dataset.view;
    
    // Handle "More" menu
    if (view === 'more') {
      els.moreMenu.classList.toggle('show');
      haptic('light');
      return;
    }
    
    // Hide more menu when switching to other tabs
    els.moreMenu.classList.remove('show');
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('view-' + view).classList.add('active');
    haptic('light');
    
    // Load data for specific views
    if (view === "wallet") {
      loadWallet();
      loadTransactions();
    } else if (view === "referral") {
      loadReferral();
    } else if (view === "tasks") {
      loadTasks();
    } else if (view === "friends") {
      loadFriends();
    } else if (view === "settings") {
      loadSettings();
    } else if (view === "notifications") {
      loadNotifications();
    } else if (view === "rank") {
      loadLeaderboard();
    } else if (view === "profile") {
      loadProfile();
    }
  });
});

// More menu navigation
document.querySelectorAll('.more-item').forEach(item => {
  item.addEventListener('click', () => {
    const view = item.dataset.view;
    els.moreMenu.classList.remove('show');
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.more-item').forEach(m => m.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('view-' + view).classList.add('active');
    haptic('light');
    
    // Load data for specific views
    if (view === "wallet") {
      loadWallet();
      loadTransactions();
    } else if (view === "referral") {
      loadReferral();
    } else if (view === "settings") {
      loadSettings();
    } else if (view === "notifications") {
      loadNotifications();
    } else if (view === "rank") {
      loadLeaderboard();
    } else if (view === "profile") {
      loadProfile();
    }
  });
});

/* ---------- Init ---------- */
/**
 * Initialize the application.
 * Loads initial state from server and renders the UI.
 */
(async function init() {
  console.log("[app] Initializing application...");

  // Check if running in Telegram
  if (!IS_TELEGRAM) {
    console.warn("[app] Not running in Telegram - showing message");
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:20px;text-align:center;color:#fff;background:#09090B;">
        <div style="font-size:48px;margin-bottom:20px;">🐼</div>
        <h1 style="margin-bottom:10px;">Panda Miner</h1>
        <p style="color:#888;margin-bottom:30px;">Please open this app inside Telegram to play.</p>
        <a href="https://t.me/Dogeshcoinbot" target="_blank" style="padding:12px 24px;background:#0088cc;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Open in Telegram</a>
      </div>
    `;
    return;
  }

  try {
    await refreshState();
    await loadShop();
    await loadLeaderboard();
    await loadProfile();
    render();

    // Start periodic state refresh only if in Telegram and no 401 error
    if (!received401Error) {
      refreshInterval = setInterval(refreshState, ENERGY_REGEN_MS * 4);
    }

    console.log("[app] Application initialized successfully");
  } catch (e) {
    console.error("[app] Initialization failed:", e);

    // Show error message if 401
    if (received401Error) {
      const errorMessage = e.message || "Unknown authentication error";
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:20px;text-align:center;color:#fff;background:#09090B;">
          <div style="font-size:48px;margin-bottom:20px;">🔒</div>
          <h1 style="margin-bottom:10px;">Authentication Failed</h1>
          <p style="color:#888;margin-bottom:10px;">Error: ${errorMessage}</p>
          <p style="color:#888;margin-bottom:30px;">Please reopen the app in Telegram.</p>
          <a href="https://t.me/Dogeshcoinbot" target="_blank" style="padding:12px 24px;background:#0088cc;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Open in Telegram</a>
        </div>
      `;
    } else {
      showToast("Failed to load game data");
    }
  }
})();
