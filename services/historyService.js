/**
 * historyService.js - Analysis history management
 */

const HistoryService = (function() {
    const MAX_HISTORY_ITEMS = 10;
    
    /**
     * Initialize history service
     */
    function init() {
      console.log('HistoryService initialized');
    }
    
    /**
     * Save analysis to history
     * @param {string} message - Original message content
     * @param {Object} results - Analysis results
     * @returns {Array} - Updated history
     */
    function saveAnalysis(message, results) {
      const historyStr = localStorage.getItem('analysis_history') || '[]';
      const history = JSON.parse(historyStr);
      const timestamp = new Date().toISOString();
      
      history.unshift({
        timestamp,
        message,
        results
      });
      
      // Keep only the most recent entries
      while (history.length > MAX_HISTORY_ITEMS) {
        history.pop();
      }
      
      localStorage.setItem('analysis_history', JSON.stringify(history));
      
      EventBus.publish('history:updated', history);
      
      return history;
    }
    
    /**
     * Get analysis history
     * @returns {Array} - Analysis history
     */
    function getAnalysisHistory() {
      const historyStr = localStorage.getItem('analysis_history') || '[]';
      return JSON.parse(historyStr);
    }
    
    /**
     * Get a specific history item
     * @param {number} index - History item index
     * @returns {Object} - History item
     */
    function getHistoryItem(index) {
      const history = getAnalysisHistory();
      return history[index] || null;
    }
    
    /**
     * Clear all history
     */
    function clearHistory() {
      localStorage.removeItem('analysis_history');
      EventBus.publish('history:cleared');
    }
    
    // Register service
    Services.register('HistoryService', {
      init,
      saveAnalysis,
      getAnalysisHistory,
      getHistoryItem,
      clearHistory
    });
    
    // Return public API
    return {
      init,
      saveAnalysis,
      getAnalysisHistory,
      getHistoryItem,
      clearHistory
    };
  })();