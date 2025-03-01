/**
 * eventBus.js - Application-wide event communication system
 */

// Create the EventBus as a global object
window.EventBus = (function() {
    // Event subscription map
    const subscribers = new Map();
    
    // Debug mode for logging events
    let debugMode = false;
    
    /**
     * Initialize the event bus
     */
    function init() {
      // Check if debug mode should be enabled
      debugMode = localStorage.getItem('debug_mode') === 'true';
      console.log('EventBus initialized', debugMode ? '(debug mode)' : '');
    }
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name to subscribe to
     * @param {function} callback - Function to call when event is published
     * @returns {object} - Subscription object with unsubscribe method
     */
    function subscribe(event, callback) {
      if (!subscribers.has(event)) {
        subscribers.set(event, []);
      }
      
      const callbacks = subscribers.get(event);
      callbacks.push(callback);
      
      // Return subscription with unsubscribe method
      return {
        unsubscribe: () => {
          const callbackIndex = callbacks.indexOf(callback);
          if (callbackIndex !== -1) {
            callbacks.splice(callbackIndex, 1);
          }
        }
      };
    }
    
    /**
     * Publish an event with data
     * @param {string} event - Event name to publish
     * @param {any} data - Data to pass to subscribers
     */
    function publish(event, data) {
      if (debugMode) {
        console.log(`Event published: ${event}`, data);
      }
      
      if (!subscribers.has(event)) return;
      
      const callbacks = subscribers.get(event);
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event subscriber for "${event}":`, error);
        }
      });
    }
    
    /**
     * Clear all subscribers for an event or all events
     * @param {string} [event] - Event to clear (if not provided, clears all)
     */
    function clear(event) {
      if (event) {
        subscribers.delete(event);
      } else {
        subscribers.clear();
      }
    }
    
    /**
     * Set debug mode
     * @param {boolean} enabled - Whether debug mode should be enabled
     */
    function setDebugMode(enabled) {
      debugMode = enabled;
      localStorage.setItem('debug_mode', enabled);
    }
    
    // Initialize immediately
    init();
    
    // Public API
    return {
      init,
      subscribe,
      publish,
      clear,
      setDebugMode
    };
  })();