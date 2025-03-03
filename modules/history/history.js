/**
 * History Module - Manages and displays analysis history
 */
const HistoryModule = (function() {
  // Module state
  const state = {
    history: [],
    selectedItemIndex: -1
  };

  // Initialize module
  function init() {
    // Subscribe to events
    if (window.EventBus) {
      window.EventBus.subscribe('history:updated', handleHistoryUpdated);
      window.EventBus.subscribe('history:open', openHistory);
    }
    
    // Load initial history
    if (window.HistoryService) {
      state.history = window.HistoryService.getAnalysisHistory();
    }
    
    console.log('History module initialized');
    return true;
  }

  // Mount the module
  async function mount(container) {
    console.log('Mounting History module');
    
    // Clear container
    container.innerHTML = '';
    
    // Create main card for history
    try {
      const historyCard = await ComponentLoader.createCard({
        title: 'Analysis History',
        contentClass: 'p-0', // Remove padding for table content
        fullWidth: true,
        headerActions: `
          <button id="clearHistoryBtn" class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear History
          </button>
        `
      });
      
      // Create history table
      const tableContainer = document.createElement('div');
      tableContainer.id = 'historyTableContainer';
      
      // Create table with history data
      const historyTable = createHistoryTable();
      tableContainer.appendChild(historyTable);
      
      // Create detail view (initially hidden)
      const detailContainer = document.createElement('div');
      detailContainer.id = 'historyDetailContainer';
      detailContainer.className = 'hidden p-4';
      
      // Add back button for detail view
      const backButton = document.createElement('button');
      backButton.id = 'backToHistoryBtn';
      backButton.className = 'back-button mb-4 inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-colors duration-200';
      backButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to History
      `;
      detailContainer.appendChild(backButton);
      
      // Add detail content container
      const detailContent = document.createElement('div');
      detailContent.id = 'historyDetailContent';
      detailContainer.appendChild(detailContent);
      
      // Append components to card
      const cardContent = historyCard.querySelector('.card-content') || historyCard;
      cardContent.appendChild(tableContainer);
      cardContent.appendChild(detailContainer);
      
      // Append card to container
      container.appendChild(historyCard);
      
      // Setup event handlers
      setupEventHandlers();
      
      console.log('History module mounted');
    } catch (error) {
      console.error('Error mounting History module:', error);
      container.innerHTML = `<div class="error">Error mounting History module: ${error.message}</div>`;
    }
  }

  // Unmount the module
  function unmount() {
    // Nothing special to clean up
    return true;
  }
  
  // Create history table
  function createHistoryTable() {
    // Format history data for table
    const tableData = state.history.map((item, index) => {
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      
      // Extract message subject or first line
      let subject = item.message.split('\n')[0];
      if (subject.length > 50) {
        subject = subject.substring(0, 47) + '...';
      }
      
      // Determine result status
      let status = 'Unknown';
      let statusClass = 'bg-gray-100 text-gray-800';
      
      if (item.results && item.results.overallThreatLevel) {
        const threatLevel = item.results.overallThreatLevel;
        if (threatLevel === 'high') {
          status = 'High Risk';
          statusClass = 'bg-red-100 text-red-800';
        } else if (threatLevel === 'medium') {
          status = 'Medium Risk';
          statusClass = 'bg-yellow-100 text-yellow-800';
        } else if (threatLevel === 'low') {
          status = 'Low Risk';
          statusClass = 'bg-green-100 text-green-800';
        }
      }
      
      return {
        id: index,
        date: formattedDate,
        subject: subject,
        status: status,
        statusClass: statusClass
      };
    });
    
    // Create simple table element manually instead of using ComponentLoader
    const tableEl = document.createElement('table');
    tableEl.className = 'table';
    tableEl.innerHTML = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Subject</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        ${tableData.map(item => `
          <tr data-id="${item.id}">
            <td>${item.date}</td>
            <td>${item.subject}</td>
            <td><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.statusClass}">${item.status}</span></td>
          </tr>
        `).join('')}
      </tbody>
    `;
    
    // Add click handlers to rows
    const rows = tableEl.querySelectorAll('tbody tr');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const rowId = parseInt(row.dataset.id, 10);
        showHistoryDetail(rowId);
      });
      row.style.cursor = 'pointer';
    });
    
    return tableEl;
  }
  
  // Show history detail
  function showHistoryDetail(index) {
    state.selectedItemIndex = index;
    const historyItem = state.history[index];
    
    if (!historyItem) {
      console.error('History item not found:', index);
      return;
    }
    
    // Hide table, show detail view
    document.getElementById('historyTableContainer').classList.add('hidden');
    const detailContainer = document.getElementById('historyDetailContainer');
    detailContainer.classList.remove('hidden');
    
    // Get detail content container
    const detailContent = document.getElementById('historyDetailContent');
    
    // Format date
    const date = new Date(historyItem.timestamp);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    // Create detail view content
    let detailHTML = `
      <div class="mb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-2">Analysis from ${formattedDate}</h3>
        
        <div class="bg-gray-50 rounded-md p-4 mb-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Original Message</h4>
          <pre class="whitespace-pre-wrap text-sm text-gray-600 border border-gray-200 rounded-md p-3 bg-white max-h-60 overflow-y-auto">${historyItem.message}</pre>
        </div>
        
        <div class="bg-gray-50 rounded-md p-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Analysis Results</h4>
    `;
    
    // Add results for each step
    if (historyItem.results) {
      // Get steps from StepService if available
      const steps = window.StepService ? window.StepService.getSteps() : [];
      
      if (steps.length > 0) {
        detailHTML += `<div class="space-y-4">`;
        
        steps.forEach(step => {
          const output = historyItem.results[`${step.id}_output`] || "";
          const summary = historyItem.results[`${step.id}_summary`] || "";
          
          detailHTML += `
            <div class="border border-gray-200 rounded-md bg-white">
              <div class="border-b border-gray-200 bg-gray-50 px-4 py-2">
                <h5 class="text-sm font-medium text-gray-700">${step.name}</h5>
              </div>
              <div class="p-4">
                <div class="mb-2">
                  <h6 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</h6>
                  <p class="mt-1 text-sm text-gray-800">${summary || "No summary available"}</p>
                </div>
                <div>
                  <h6 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Details</h6>
                  <pre class="mt-1 text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">${output || "No details available"}</pre>
                </div>
              </div>
            </div>
          `;
        });
        
        detailHTML += `</div>`;
      } else {
        // If no steps are available, just show raw results
        detailHTML += `<pre class="whitespace-pre-wrap text-sm text-gray-600 border border-gray-200 rounded-md p-3 bg-white max-h-60 overflow-y-auto">${JSON.stringify(historyItem.results, null, 2)}</pre>`;
      }
    } else {
      detailHTML += `<p class="text-sm text-gray-500">No results available</p>`;
    }
    
    detailHTML += `
        </div>
      </div>
    `;
    
    // Set detail content
    detailContent.innerHTML = detailHTML;
  }
  
  // Setup event handlers
  function setupEventHandlers() {
    // Clear history button
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all analysis history? This cannot be undone.')) {
          if (window.HistoryService) {
            window.HistoryService.clearHistory();
            state.history = [];
            refreshHistoryTable();
            
            // Show notification
            if (window.NotificationService) {
              window.NotificationService.show('History cleared successfully', 'success');
            }
          }
        }
      });
    }
    
    // Back button
    const backToHistoryBtn = document.getElementById('backToHistoryBtn');
    if (backToHistoryBtn) {
      backToHistoryBtn.addEventListener('click', () => {
        document.getElementById('historyDetailContainer').classList.add('hidden');
        document.getElementById('historyTableContainer').classList.remove('hidden');
        state.selectedItemIndex = -1;
      });
    }
  }
  
  // Refresh history table
  function refreshHistoryTable() {
    const tableContainer = document.getElementById('historyTableContainer');
    if (tableContainer) {
      // Remove old table
      tableContainer.innerHTML = '';
      
      // Create new table
      const historyTable = createHistoryTable();
      tableContainer.appendChild(historyTable);
    }
  }
  
  // Event handlers
  function handleHistoryUpdated(history) {
    state.history = history;
    refreshHistoryTable();
  }
  
  function openHistory() {
    // This function can be called from other modules to open the history view
    if (window.ModuleManager) {
      window.ModuleManager.showModule('history');
    }
  }

  // Return public API
  return {
    id: 'history',
    name: 'History',
    description: 'View analysis history',
    icon: 'history',
    init,
    mount,
    unmount
  };
})();

// Register with ModuleManager
if (window.ModuleManager) {
  try {
    if (typeof window.ModuleManager.registerModule === 'function') {
      window.ModuleManager.registerModule(HistoryModule);
      console.log('HistoryModule registered with ModuleManager');
    } else {
      // Fall back to alternative registration method
      window.ModuleManager.registerModule = window.ModuleManager.registerModule || function(module) {
        console.log('Using fallback module registration for:', module.id);
        this[module.id + 'Module'] = module;
      };
      window.ModuleManager.registerModule(HistoryModule);
    }
  } catch (error) {
    console.error('Error registering HistoryModule:', error);
  }
} else {
  console.error('ModuleManager not available, cannot register HistoryModule');
}

// Always make it available on window
window.HistoryModule = HistoryModule;
console.log('History module loaded successfully');
