
let leaderboardData = [];
const spreadsheetURL = 'https://docs.google.com/spreadsheets/d/1BiHQZ5-DpgB_RlrxC-w0q_zxD9Tj-YxYpG9vU01IPD8/gviz/tq?sheet=Sheet1';

console.log('Loaded script.js version: 2025-07-04-v3'); // Debug to confirm script version

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

  // Use authManager for authentication check
  if (window.authManager) {
    window.authManager.checkAuthStatus().then(() => {
      if (window.authManager.isAuthenticated) {
        currentUser = window.authManager.currentUser;
        renderUserInfo();
      }
    });
  }

  // Add click handler for prerequisite detection button
  const prereqBtn = document.getElementById('prereq-detection-btn');
  if (prereqBtn) {
    prereqBtn.addEventListener('click', function(e) {
      console.log('Prerequisite detection button clicked, navigating to prerequisite_detection.html');
      window.location.href = 'prerequisite_detection.html'; // Force navigation
    });
  }

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

  // Add random question loader
  const loadRandomBtn = document.getElementById('loadRandomBtn');
  if (loadRandomBtn) {
    loadRandomBtn.addEventListener('click', async () => {
      try {
        const response = await fetch(`/api/questions?random=1&t=${new Date().getTime()}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const questionInput = document.getElementById('questionInput');
          const correctAnswerInput = document.getElementById('correctAnswerInput');
          const wrongAnswerInput = document.getElementById('wrongAnswerInput');
          const questionDisplay = document.getElementById('questionDisplay');
          const notification = document.getElementById('notification');

          if (questionInput && correctAnswerInput && wrongAnswerInput && questionDisplay && data[0]) {
            questionInput.value = data[0].question || '';
            correctAnswerInput.value = data[0].correct_answer || '';
            wrongAnswerInput.value = data[0].wrong_answer || '';
            questionDisplay.textContent = data[0].question || 'No question loaded';
            notification.textContent = 'Example question loaded successfully!';
            notification.className = 'notification success show';
            setTimeout(() => notification.className = 'notification success', 3000);
          } else {
            throw new Error('Invalid data format or missing elements');
          }
        } else {
          console.error('Failed to load random question:', await response.json());
          showNotification('Failed to load random question.', 'error');
        }
      } catch (error) {
        console.error('Error loading random question:', error);
        showNotification('Error loading random question.', 'error');
      }
    });
  }

  // Add prerequisite detection with Gemini Flash
  const detectBtn = document.getElementById('detectBtn');
  if (detectBtn) {
    detectBtn.addEventListener('click', async () => {
      const questionInput = document.getElementById('questionInput').value.trim();
      const questionDisplay = document.getElementById('questionDisplay').textContent.trim();
      const question = questionInput || questionDisplay || '';
      const correctAnswer = document.getElementById('correctAnswerInput').value || '';
      const wrongAnswer = document.getElementById('wrongAnswerInput').value || '';
      if (!question) {
        showNotification('Please enter a question or load a random one.', 'error');
        return;
      }
      await detectPrerequisites(question, correctAnswer, wrongAnswer);
    });
  }
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
      if (window.authManager) {
        window.authManager.currentUser = data.user;
        window.authManager.isAuthenticated = true;
        window.authManager.updateUI();
      }
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
      if (window.authManager) {
        window.authManager.currentUser = data.user;
        window.authManager.isAuthenticated = true;
        window.authManager.updateUI();
      }
      const loginModal = document.getElementById('login-modal');
      if (loginModal) loginModal.classList.add('hidden');
      showNotification('Login successful!', 'success');
      renderUserInfo();
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
      if (window.authManager) {
        window.authManager.currentUser = data.user;
        window.authManager.isAuthenticated = true;
        window.authManager.updateUI();
      }
      const signupModal = document.getElementById('signup-modal');
      if (signupModal) signupModal.classList.add('hidden');
      showNotification('Registration successful!', 'success');
      renderUserInfo();
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
    if (window.authManager) {
      window.authManager.currentUser = null;
      window.authManager.isAuthenticated = false;
      window.authManager.updateUI();
    }
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

// Updated function to detect prerequisites using Gemini Flash
async function detectPrerequisites(question, correctAnswer, wrongAnswer) {
  console.log('Detecting prerequisites for:', { question, correctAnswer, wrongAnswer }); // Debug log
  const prerequisitesDisplay = document.getElementById('prerequisitesDisplay');
  if (!prerequisitesDisplay) {
    console.error('prerequisitesDisplay element not found in DOM');
    showNotification('UI error: prerequisitesDisplay element not found.', 'error');
    return;
  }
  // Clear previous content with a timestamp to track updates
  prerequisitesDisplay.textContent = 'Loading prerequisites...';
  console.log('Cleared prerequisitesDisplay at:', new Date().toISOString()); // Debug log
  try {
    const response = await fetch('/api/detect-prereqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ question, correct_answer: correctAnswer, wrong_answer: wrongAnswer })
    });
    if (response.ok) {
      const data = await response.json();
      console.log('Prerequisite detection response:', data); // Debug log
      // Validate response structure
      if (!data || !data.all_prerequisites || !('single_missing_prerequisite' in data)) {
        console.error('Invalid response structure:', data);
        showNotification('Invalid response from server.', 'error');
        prerequisitesDisplay.textContent = 'All Prerequisites: None, Missing Prerequisite: None';
        return;
      }
      // Handle all_prerequisites
      const allPrereqs = Array.isArray(data.all_prerequisites) && data.all_prerequisites.length > 0 
        ? data.all_prerequisites.join(', ')
        : 'None';
      // Handle single_missing_prerequisite
      const missingPrereq = typeof data.single_missing_prerequisite === 'string' && data.single_missing_prerequisite.trim() !== '' && data.single_missing_prerequisite !== 'None'
        ? data.single_missing_prerequisite
        : 'None';
      console.log('Rendering prerequisites:', { allPrereqs, missingPrereq }); // Debug log
      prerequisitesDisplay.innerHTML = `<div>All Prerequisites: ${allPrereqs}</div><div>Missing Prerequisite: ${missingPrereq}</div>`;
      console.log('Updated prerequisitesDisplay at:', new Date().toISOString()); // Debug log
      // Clear input fields if questionInput was used
      const questionInput = document.getElementById('questionInput');
      if (questionInput && questionInput.value) {
        questionInput.value = '';
        document.getElementById('correctAnswerInput').value = '';
        document.getElementById('wrongAnswerInput').value = '';
      }
      showNotification('Prerequisites detected successfully!', 'success');
    } else {
      const errorData = await response.json();
      console.error('Prerequisite detection failed:', errorData);
      showNotification(errorData.error || 'Failed to detect prerequisites.', 'error');
      prerequisitesDisplay.innerHTML = '<div>All Prerequisites: None</div><div>Missing Prerequisite: None</div>';
    }
  } catch (error) {
    console.error('Error detecting prerequisites:', error);
    showNotification('Error detecting prerequisites. Please try again.', 'error');
    prerequisitesDisplay.innerHTML = '<div>All Prerequisites: None</div><div>Missing Prerequisite: None</div>';
  }
}
