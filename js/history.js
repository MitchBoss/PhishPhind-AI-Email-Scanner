// history.js - Manage analysis history
const HistoryManager = (function() {
    const MAX_HISTORY_ITEMS = 10;
    
    /* Save analysis history to localStorage */
    function saveAnalysisHistory(rawMessage, stepResults) {
      const historyStr = localStorage.getItem("analysis_history") || "[]";
      const history = JSON.parse(historyStr);
      const timestamp = new Date().toISOString();
      
      history.unshift({
        timestamp,
        message: rawMessage,
        results: stepResults
      });
      
      // Keep only the most recent entries
      while (history.length > MAX_HISTORY_ITEMS) {
        history.pop();
      }
      
      localStorage.setItem("analysis_history", JSON.stringify(history));
      return history;
    }
  
    /* Get analysis history from localStorage */
    function getAnalysisHistory() {
      const historyStr = localStorage.getItem("analysis_history") || "[]";
      return JSON.parse(historyStr);
    }
  
    /* Get a specific history item by index */
    function getHistoryItem(index) {
      const history = getAnalysisHistory();
      return history[index] || null;
    }
  
    /* Clear all history */
    function clearHistory() {
      localStorage.removeItem("analysis_history");
    }
    
    // Public API
    return {
      saveAnalysisHistory,
      getAnalysisHistory,
      getHistoryItem,
      clearHistory
    };
  })();
  