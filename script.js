let leaderboardData = [];
const spreadsheetURL = 'https://docs.google.com/spreadsheets/d/1BiHQZ5-DpgB_RlrxC-w0q_zxD9Tj-YxYpG9vU01IPD8/gviz/tq?sheet=Sheet1';

fetch(spreadsheetURL)
  .then(res => res.text())
  .then(rep => {
    const json = JSON.parse(rep.substring(47).slice(0, -2));
    const rows = json.table.rows;

    leaderboardData = rows.map((row, index) => {
      return {
        id: index + 1,
        rank: index + 1,
        modelName: row.c[0]?.v || 'N/A',
        company: row.c[1]?.v || '-',
        size: row.c[2]?.v || '-',
        prerequisiteAccuracy: parseFloat((row.c[3]?.v || 0).toFixed(2)),
        conceptRecall: 0,
        learningPathQuality: 0,
        overallScore: parseFloat((row.c[3]?.v || 0).toFixed(2))
      };
    });

    renderLeaderboard();
  })
  .catch(error => {
    console.error('Error loading spreadsheet:', error);
    showNotification('Failed to load leaderboard data from Google Sheets.', 'error');
  });

let currentSort = { column: 'rank', direction: 'asc' };
let currentFilters = { modelType: 'all', size: 'all' };
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
  const yearElements = document.querySelectorAll('#current-year');
  if (yearElements.length > 0) {
    yearElements.forEach(el => el.textContent = new Date().getFullYear());
  }

  checkAuth();

  if (document.getElementById('leaderboard-body') || document.getElementById('mobile-leaderboard')) {
    renderLeaderboard();

    const modelFilter = document.getElementById('model-filter');
    const sizeFilter = document.getElementById('size-filter');

    if (modelFilter) {
      modelFilter.addEventListener('change', function(e) {
        currentFilters.modelType = e.target.value;
        renderLeaderboard();
      });
    }

    if (sizeFilter) {
      sizeFilter.addEventListener('change', function(e) {
        currentFilters.size = e.target.value;
        renderLeaderboard();
      });
    }
  }

  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) loginBtn.addEventListener('click', () => {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.classList.remove('hidden');
  });

  const signupBtn = document.getElementById('signup-btn');
  if (signupBtn) signupBtn.addEventListener('click', () => {
    const signupModal = document.getElementById('signup-modal');
    if (signupModal) signupModal.classList.remove('hidden');
  });

  const mobileLoginBtn = document.getElementById('mobile-login-btn');
  if (mobileLoginBtn) mobileLoginBtn.addEventListener('click', () => {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.classList.remove('hidden');
  });

  const mobileSignupBtn = document.getElementById('mobile-signup-btn');
  if (mobileSignupBtn) mobileSignupBtn.addEventListener('click', () => {
    const signupModal = document.getElementById('signup-modal');
    if (signupModal) signupModal.classList.remove('hidden');
  });

  const loginSubmit = document.getElementById('login-submit');
  if (loginSubmit) loginSubmit.addEventListener('click', login);

  const signupSubmit = document.getElementById('signup-submit');
  if (signupSubmit) signupSubmit.addEventListener('click', signup);
});

function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  const icon = document.getElementById('mobile-menu-icon');

  if (mobileMenu && icon) {
    if (mobileMenu.classList.contains('hidden')) {
      mobileMenu.classList.remove('hidden');
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>';
    } else {
      mobileMenu.classList.add('hidden');
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>';
    }
  }
}

function downloadPaper() {
  alert('PDF download functionality would be implemented here.');
}

function viewCode() {
  window.open('https://github.com/placeholder/eduvlm-bench', '_blank');
}

function showCitation() {
  const modal = document.getElementById('citation-modal');
  if (modal) modal.classList.remove('hidden');
}

function hideCitation() {
  const modal = document.getElementById('citation-modal');
  if (modal) modal.classList.add('hidden');
}

function copyCitation() {
  const citationText = document.getElementById('citation-text');
  if (citationText && navigator.clipboard) {
    navigator.clipboard.writeText(citationText.textContent).then(() => showNotification('Citation copied to clipboard!', 'success'));
  } else if (citationText) {
    fallbackCopyTextToClipboard(citationText.textContent);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showNotification('Citation copied to clipboard!', 'success');
  } catch {
    showNotification('Failed to copy citation. Please copy manually.', 'error');
  }
  document.body.removeChild(textArea);
}

async function checkAuth() {
  try {
    const response = await fetch('/api/user', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      const loginBtn = document.getElementById('login-btn');
      const signupBtn = document.getElementById('signup-btn');
      const mobileLoginBtn = document.getElementById('mobile-login-btn');
      const mobileSignupBtn = document.getElementById('mobile-signup-btn');
      if (loginBtn) loginBtn.classList.add('hidden');
      if (signupBtn) signupBtn.classList.add('hidden');
      if (mobileLoginBtn) mobileLoginBtn.classList.add('hidden');
      if (mobileSignupBtn) mobileSignupBtn.classList.add('hidden');
      renderUserInfo();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
}

function renderUserInfo() {
  const userInfo = document.getElementById('user-info');
  if (userInfo && currentUser) {
    userInfo.classList.remove('hidden');
    userInfo.innerHTML = `
      <div class="user-info-content">
        <div class="user-avatar">${currentUser.firstName[0]}${currentUser.lastName[0]}</div>
        <div class="user-details">
          <div class="user-name">${currentUser.firstName} ${currentUser.lastName}</div>
          <div class="user-username">@${currentUser.username}</div>
          <div class="user-email">${currentUser.email}</div>
        </div>
        <button class="logout-btn" onclick="logout()">Logout</button>
      </div>`;
  }
}

async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (response.ok) {
      currentUser = data.user;
      const loginModal = document.getElementById('login-modal');
      if (loginModal) loginModal.classList.add('hidden');
      showNotification('Login successful!', 'success');
      renderUserInfo();
      const loginBtn = document.getElementById('login-btn');
      const signupBtn = document.getElementById('signup-btn');
      const mobileLoginBtn = document.getElementById('mobile-login-btn');
      const mobileSignupBtn = document.getElementById('mobile-signup-btn');
      if (loginBtn) loginBtn.classList.add('hidden');
      if (signupBtn) signupBtn.classList.add('hidden');
      if (mobileLoginBtn) mobileLoginBtn.classList.add('hidden');
      if (mobileSignupBtn) mobileSignupBtn.classList.add('hidden');
    } else {
      if (errorDiv) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = data.error || 'Login failed';
      }
    }
  } catch (error) {
    if (errorDiv) {
      errorDiv.style.display = 'block';
      errorDiv.textContent = 'Server error during login';
    }
  }
}

async function signup() {
  const firstName = document.getElementById('signup-firstName').value;
  const lastName = document.getElementById('signup-lastName').value;
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  const errorDiv = document.getElementById('signup-error');

  if (password !== confirmPassword) {
    if (errorDiv) {
      errorDiv.style.display = 'block';
      errorDiv.textContent = 'Passwords do not match';
    }
    return;
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ firstName, lastName, username, email, password })
    });

    const data = await response.json();
    if (response.ok) {
      currentUser = data.user;
      const signupModal = document.getElementById('signup-modal');
      if (signupModal) signupModal.classList.add('hidden');
      showNotification('Registration successful!', 'success');
      renderUserInfo();
      const loginBtn = document.getElementById('login-btn');
      const signupBtn = document.getElementById('signup-btn');
      const mobileLoginBtn = document.getElementById('mobile-login-btn');
      const mobileSignupBtn = document.getElementById('mobile-signup-btn');
      if (loginBtn) loginBtn.classList.add('hidden');
      if (signupBtn) signupBtn.classList.add('hidden');
      if (mobileLoginBtn) mobileLoginBtn.classList.add('hidden');
      if (mobileSignupBtn) mobileSignupBtn.classList.add('hidden');
    } else {
      if (errorDiv) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = data.error || 'Registration failed';
      }
    }
  } catch (error) {
    if (errorDiv) {
      errorDiv.style.display = 'block';
      errorDiv.textContent = 'Server error during registration';
    }
  }
}

function switchToSignup() {
  const loginModal = document.getElementById('login-modal');
  const signupModal = document.getElementById('signup-modal');
  if (loginModal) loginModal.classList.add('hidden');
  if (signupModal) signupModal.classList.remove('hidden');
}

function switchToLogin() {
  const signupModal = document.getElementById('signup-modal');
  const loginModal = document.getElementById('login-modal');
  if (signupModal) signupModal.classList.add('hidden');
  if (loginModal) loginModal.classList.remove('hidden');
}

async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    currentUser = null;
    const userInfo = document.getElementById('user-info');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const mobileSignupBtn = document.getElementById('mobile-signup-btn');
    if (userInfo) userInfo.classList.add('hidden');
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (signupBtn) signupBtn.classList.remove('hidden');
    if (mobileLoginBtn) mobileLoginBtn.classList.remove('hidden');
    if (mobileSignupBtn) mobileSignupBtn.classList.remove('hidden');
    showNotification('Logout successful', 'success');
    window.location.reload();
  } catch (error) {
    console.error('Logout failed:', error);
    showNotification('Logout failed', 'error');
  }
}

function showNotification(message, type) {
  const notification = document.getElementById('notification');
  if (notification) {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => {
      if (notification) notification.className = `notification ${type}`;
    }, 3000);
  }
}

function filterData(data) {
  return data.filter(entry => {
    const matchesType = currentFilters.modelType === 'all' || entry.modelName.toLowerCase().includes(currentFilters.modelType.toLowerCase());
    const matchesSize = currentFilters.size === 'all' || entry.size === currentFilters.size;
    return matchesType && matchesSize;
  });
}

function sortData(data, column, direction) {
  return [...data].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];
    if (typeof aVal === 'number') return direction === 'asc' ? aVal - bVal : bVal - aVal;
    return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
}

function sortTable(column) {
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.direction = 'asc';
  }
  renderLeaderboard();
}

function resetFilters() {
  currentFilters.modelType = 'all';
  currentFilters.size = 'all';
  currentSort = { column: 'rank', direction: 'asc' };
  const modelFilter = document.getElementById('model-filter');
  const sizeFilter = document.getElementById('size-filter');
  if (modelFilter) modelFilter.value = 'all';
  if (sizeFilter) sizeFilter.value = 'all';
  renderLeaderboard();
}

function getRankBadgeClass(rank) {
  if (rank === 1) return 'rank-badge rank-1';
  if (rank === 2 || rank === 3) return 'rank-badge rank-2';
  return 'rank-badge rank-other';
}

function getScoreClass(score, isOverall = false) {
  if (isOverall && score >= 75) return 'score-overall-excellent';
  if (score >= 80) return 'score-excellent';
  if (score >= 70) return 'score-good';
  return 'score-average';
}

function updateSortIcons() {
  const sortIcons = document.querySelectorAll('.sort-icon');
  if (sortIcons) {
    sortIcons.forEach(icon => {
      icon.className = 'sort-icon';
      icon.textContent = '↕';
    });
  }
  const activeIcon = document.getElementById(currentSort.column + '-sort');
  if (activeIcon) {
    activeIcon.className = `sort-icon ${currentSort.direction}`;
    activeIcon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
  }
}

function renderLeaderboard() {
  const filtered = filterData(leaderboardData);
  const sorted = sortData(filtered, currentSort.column, currentSort.direction);

  const tbody = document.getElementById('leaderboard-body');
  if (tbody) {
    tbody.innerHTML = '';
    sorted.forEach(entry => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50 transition-colors';
      row.innerHTML = `
        <td><span class="${getRankBadgeClass(entry.rank)}">${entry.rank}</span></td>
        <td><div>${entry.modelName}</div><div>${entry.company}</div></td>
        <td>${entry.size}</td>
        <td><span class="${getScoreClass(entry.prerequisiteAccuracy)}">${entry.prerequisiteAccuracy}%</span></td>
      `;
      tbody.appendChild(row);
    });
  }

  const mobileContainer = document.getElementById('mobile-leaderboard');
  if (mobileContainer) {
    mobileContainer.innerHTML = '';
    sorted.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'mobile-card';
      card.innerHTML = `
        <div class="mobile-card-header">
          <div><span class="${getRankBadgeClass(entry.rank)}">${entry.rank}</span><div>${entry.modelName}</div><div>${entry.company} • ${entry.size}</div></div>
          <div><div class="${getScoreClass(entry.overallScore, true)}">${entry.overallScore}%</div><div>Overall</div></div>
        </div>
        <div class="mobile-card-metrics">
          <div><div>Prerequisite Accuracy</div><div class="${getScoreClass(entry.prerequisiteAccuracy)}">${entry.prerequisiteAccuracy}%</div></div>
          <div><div>Concept Recall</div><div class="${getScoreClass(entry.conceptRecall)}">${entry.conceptRecall}%</div></div>
          <div><div>Learning Path Quality</div><div class="${getScoreClass(entry.learningPathQuality)}">${entry.learningPathQuality}%</div></div>
        </div>
      `;
      mobileContainer.appendChild(card);
    });
  }
  updateSortIcons();
}

document.addEventListener('click', function(e) {
  const modal = document.getElementById('citation-modal');
  if (modal && e.target === modal) hideCitation();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') hideCitation();
});