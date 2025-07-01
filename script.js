// Leaderboard Data
const leaderboardData = [
  {
    id: 1,
    rank: 1,
    modelName: "Flan T5",
    company: "Google",
    size: "250M",
    prerequisiteAccuracy: 78.4,
    conceptRecall: 85.2,
    learningPathQuality: 67.8,
    overallScore: 77.1
  },
  {
    id: 2,
    rank: 2,
    modelName: "Gemini 2.0 Flash",
    company: "Google",
    size: "7B",
    prerequisiteAccuracy: 74.3,
    conceptRecall: 82.6,
    learningPathQuality: 61.7,
    overallScore: 72.9
  },
  {
    id: 3,
    rank: 3,
    modelName: "GPT-4",
    company: "OpenAI",
    size: "7B",
    prerequisiteAccuracy: 72.1,
    conceptRecall: 79.4,
    learningPathQuality: 63.2,
    overallScore: 71.6
  },
  {
    id: 4,
    rank: 4,
    modelName: "GPT-3.5",
    company: "OpenAI",
    size: "4B",
    prerequisiteAccuracy: 65.7,
    conceptRecall: 71.3,
    learningPathQuality: 58.9,
    overallScore: 65.3
  },
  {
    id: 5,
    rank: 5,
    modelName: "Flan T5",
    company: "Google",
    size: "2B",
    prerequisiteAccuracy: 62.4,
    conceptRecall: 68.7,
    learningPathQuality: 55.1,
    overallScore: 62.1
  }
];

// Current sort state
let currentSort = {
  column: 'rank',
  direction: 'asc'
};

// Current filter state
let currentFilters = {
  modelType: 'all',
  size: 'all'
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Set current year
  const yearElements = document.querySelectorAll('#current-year');
  yearElements.forEach(el => el.textContent = new Date().getFullYear());
  
  // Initialize leaderboard if on leaderboard page
  if (document.getElementById('leaderboard-body') || document.getElementById('mobile-leaderboard')) {
    renderLeaderboard();
    
    // Add event listeners for filters if they exist
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
});

// Navigation Functions
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  const icon = document.getElementById('mobile-menu-icon');
  
  if (mobileMenu.classList.contains('hidden')) {
    mobileMenu.classList.remove('hidden');
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>';
  } else {
    mobileMenu.classList.add('hidden');
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>';
  }
}

// Button Functions
function downloadPaper() {
  alert('PDF download functionality would be implemented here. In a real implementation, this would trigger a download of the research paper.');
}

function viewCode() {
  window.open('https://github.com/placeholder/eduvlm-bench', '_blank');
}

function showCitation() {
  document.getElementById('citation-modal').classList.remove('hidden');
}

function hideCitation() {
  document.getElementById('citation-modal').classList.add('hidden');
}

function copyCitation() {
  const citationText = document.getElementById('citation-text').textContent;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(citationText).then(function() {
      alert('Citation copied to clipboard!');
    }).catch(function() {
      fallbackCopyTextToClipboard(citationText);
    });
  } else {
    fallbackCopyTextToClipboard(citationText);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      alert('Citation copied to clipboard!');
    } else {
      alert('Failed to copy citation. Please copy manually.');
    }
  } catch (err) {
    alert('Failed to copy citation. Please copy manually.');
  }
  
  document.body.removeChild(textArea);
}

// Leaderboard Functions
function filterData(data) {
  return data.filter(entry => {
    const matchesType = currentFilters.modelType === 'all' || 
      entry.modelName.toLowerCase().includes(currentFilters.modelType.toLowerCase());
    const matchesSize = currentFilters.size === 'all' || entry.size === currentFilters.size;
    
    return matchesType && matchesSize;
  });
}

function sortData(data, column, direction) {
  return [...data].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    
    if (direction === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
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
  currentSort.column = 'rank';
  currentSort.direction = 'asc';
  
  document.getElementById('model-filter').value = 'all';
  document.getElementById('size-filter').value = 'all';
  
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
  // Reset all sort icons
  document.querySelectorAll('.sort-icon').forEach(icon => {
    icon.className = 'sort-icon';
    icon.textContent = '↕';
  });
  
  // Update active sort icon
  const activeIcon = document.getElementById(currentSort.column + '-sort');
  if (activeIcon) {
    activeIcon.className = `sort-icon ${currentSort.direction}`;
    activeIcon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
  }
}

function renderLeaderboard() {
  const filtered = filterData(leaderboardData);
  const sorted = sortData(filtered, currentSort.column, currentSort.direction);
  
  // Render desktop table
  const tbody = document.getElementById('leaderboard-body');
  if (tbody) {
    tbody.innerHTML = '';
    
    sorted.forEach(entry => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50 transition-colors';
      
      row.innerHTML = `
        <td class="px-4 lg:px-6 py-4 whitespace-nowrap">
          <span class="${getRankBadgeClass(entry.rank)}">
            ${entry.rank}
          </span>
        </td>
        <td class="px-4 lg:px-6 py-4 whitespace-nowrap">
          <div class="font-medium text-dark-slate">${entry.modelName}</div>
          <div class="text-sm text-slate-grey">${entry.company}</div>
        </td>
        <td class="px-4 lg:px-6 py-4 whitespace-nowrap text-slate-grey">
          ${entry.size}
        </td>
        <td class="px-4 lg:px-6 py-4 whitespace-nowrap">
          <span class="${getScoreClass(entry.prerequisiteAccuracy)}">
            ${entry.prerequisiteAccuracy}%
          </span>
        </td>
        <td class="px-4 lg:px-6 py-4 whitespace-nowrap">
          <span class="${getScoreClass(entry.conceptRecall)}">
            ${entry.conceptRecall}%
          </span>
        </td>
        <td class="px-4 lg:px-6 py-4 whitespace-nowrap">
          <span class="${getScoreClass(entry.learningPathQuality)}">
            ${entry.learningPathQuality}%
          </span>
        </td>
        <td class="px-4 lg:px-6 py-4 whitespace-nowrap">
          <span class="${getScoreClass(entry.overallScore, true)}">
            ${entry.overallScore}%
          </span>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  }
  
  // Render mobile cards
  const mobileContainer = document.getElementById('mobile-leaderboard');
  if (mobileContainer) {
    mobileContainer.innerHTML = '';
    
    sorted.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'mobile-card';
      
      card.innerHTML = `
        <div class="mobile-card-header">
          <div class="flex items-center">
            <span class="${getRankBadgeClass(entry.rank)} mr-3">
              ${entry.rank}
            </span>
            <div>
              <div class="font-medium text-dark-slate">${entry.modelName}</div>
              <div class="text-sm text-slate-grey">${entry.company} • ${entry.size}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-lg font-bold ${getScoreClass(entry.overallScore, true)}">
              ${entry.overallScore}%
            </div>
            <div class="text-xs text-slate-grey">Overall</div>
          </div>
        </div>
        <div class="mobile-card-metrics">
          <div class="mobile-card-metric">
            <div class="mobile-card-metric-label">Prerequisite Accuracy</div>
            <div class="mobile-card-metric-value ${getScoreClass(entry.prerequisiteAccuracy)}">
              ${entry.prerequisiteAccuracy}%
            </div>
          </div>
          <div class="mobile-card-metric">
            <div class="mobile-card-metric-label">Concept Recall</div>
            <div class="mobile-card-metric-value ${getScoreClass(entry.conceptRecall)}">
              ${entry.conceptRecall}%
            </div>
          </div>
          <div class="mobile-card-metric" style="grid-column: span 2;">
            <div class="mobile-card-metric-label">Learning Path Quality</div>
            <div class="mobile-card-metric-value ${getScoreClass(entry.learningPathQuality)}">
              ${entry.learningPathQuality}%
            </div>
          </div>
        </div>
      `;
      
      mobileContainer.appendChild(card);
    });
  }
  
  updateSortIcons();
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
  const modal = document.getElementById('citation-modal');
  if (e.target === modal) {
    hideCitation();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    hideCitation();
  }
});