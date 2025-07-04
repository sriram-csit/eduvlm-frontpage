// Leaderboard Data
let leaderboardData = [];
const spreadsheetURL = 'https://docs.google.com/spreadsheets/d/1BiHQZ5-DpgB_RlrxC-w0q_zxD9Tj-YxYpG9vU01IPD8/gviz/tq?sheet=Sheet1';

// Fetch spreadsheet data and initialize leaderboard
fetch(spreadsheetURL)
  .then(res => res.text())
  .then(rep => {
    const json = JSON.parse(rep.substring(47).slice(0, -2));
    const rows = json.table.rows;

    leaderboardData = rows.map((row, index) => {
      const cells = row.c || [];
      return {
        id: index + 1,
        rank: index + 1,
        modelName: cells[0]?.v || 'N/A',
        size: cells[1]?.v || '-',
        modelType: cells[2]?.v || '-',
        detectionAccuracy: parseFloat((cells[3]?.v || 0).toFixed(2)),
        notes: cells[4]?.v || '-',
        overallScore: parseFloat((cells[3]?.v || 0).toFixed(2))
      };
    });

    renderLeaderboard();
  })
  .catch(error => {
    console.error('Error loading spreadsheet:', error);
    alert("Failed to load leaderboard data from Google Sheets.");
  });

let currentSort = { column: 'rank', direction: 'asc' };
let currentFilters = { modelType: 'all', size: 'all' };

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('#current-year').forEach(el => el.textContent = new Date().getFullYear());

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
});

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

function downloadPaper() {
  alert('PDF download functionality would be implemented here.');
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
    navigator.clipboard.writeText(citationText).then(() => alert('Citation copied to clipboard!'));
  } else {
    fallbackCopyTextToClipboard(citationText);
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
    alert('Citation copied to clipboard!');
  } catch {
    alert('Failed to copy citation. Please copy manually.');
  }
  document.body.removeChild(textArea);
}

function filterData(data) {
  return data.filter(entry => {
    const matchesType = currentFilters.modelType === 'all' || entry.modelType.toLowerCase() === currentFilters.modelType.toLowerCase();
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
  if (isOverall && score >= 35) return 'score-overall-excellent';
  if (score >= 30) return 'score-excellent';
  if (score >= 20) return 'score-good';
  return 'score-average';
}

function updateSortIcons() {
  document.querySelectorAll('.sort-icon').forEach(icon => {
    icon.className = 'sort-icon';
    icon.textContent = '↕';
  });
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
        <td>${entry.modelName}</td>
        <td>${entry.size}</td>
        <td>${entry.modelType}</td>
        <td><span class="${getScoreClass(entry.detectionAccuracy)}">${entry.detectionAccuracy}%</span></td>
        <td>${entry.notes}</td>
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
          <div>
            <span class="${getRankBadgeClass(entry.rank)}">${entry.rank}</span>
            <div>${entry.modelName}</div>
            <div>${entry.modelType} • ${entry.size}</div>
          </div>
          <div>
            <div class="${getScoreClass(entry.detectionAccuracy, true)}">${entry.detectionAccuracy}%</div>
            <div>Accuracy</div>
          </div>
        </div>
        <div class="mobile-card-metrics">
          <div><div>Notes</div><div>${entry.notes}</div></div>
        </div>
      `;
      mobileContainer.appendChild(card);
    });
  }

  updateSortIcons();
}

document.addEventListener('click', function(e) {
  const modal = document.getElementById('citation-modal');
  if (e.target === modal) hideCitation();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') hideCitation();
});
