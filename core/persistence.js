/**
 * persistence.js - Data persistence layer
 */

const PersistenceManager = (function() {
    // Default TTL for cached items in milliseconds
    const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
    
    // In-memory cache
    const memoryCache = new Map();
    
    /**
     * Initialize the persistence manager
     */
    function init() {
      // Clean up expired cache items
      cleanupExpiredItems();
      
      console.log('PersistenceManager initialized');
    }
    
    /**
     * Save data to local storage
     * @param {string} key - Storage key
     * @param {any} data - Data to store
     * @param {object} options - Storage options
     */
    function saveToStorage(key, data, options = {}) {
      try {
        const storageItem = {
          data,
          timestamp: Date.now(),
          ttl: options.ttl || DEFAULT_TTL
        };
        
        // Save to local storage
        localStorage.setItem(key, JSON.stringify(storageItem));
        
        // Also update memory cache if enabled
        if (options.cache !== false) {
          memoryCache.set(key, {
            data,
            expires: Date.now() + (options.ttl || DEFAULT_TTL)
          });
        }
      } catch (error) {
        console.error(`Error saving data to storage (key: ${key}):`, error);
        throw error;
      }
    }
    
    /**
     * Load data from storage
     * @param {string} key - Storage key
     * @param {object} options - Load options
     * @returns {any} - Stored data or default value
     */
    function loadFromStorage(key, options = {}) {
      // First check memory cache if enabled
      if (options.cache !== false && memoryCache.has(key)) {
        const cachedItem = memoryCache.get(key);
        if (cachedItem.expires > Date.now()) {
          return cachedItem.data;
        } else {
          // Expired, remove from cache
          memoryCache.delete(key);
        }
      }
      
      try {
        const storedValue = localStorage.getItem(key);
        if (!storedValue) {
          return options.defaultValue || null;
        }
        
        const storageItem = JSON.parse(storedValue);
        
        // Check if expired
        if (storageItem.ttl && storageItem.timestamp) {
          const expirationTime = storageItem.timestamp + storageItem.ttl;
          if (Date.now() > expirationTime) {
            // Data expired, remove it
            localStorage.removeItem(key);
            return options.defaultValue || null;
          }
        }
        
        // Update memory cache if enabled
        if (options.cache !== false) {
          memoryCache.set(key, {
            data: storageItem.data,
            expires: storageItem.timestamp + storageItem.ttl
          });
        }
        
        return storageItem.data;
      } catch (error) {
        console.error(`Error loading data from storage (key: ${key}):`, error);
        return options.defaultValue || null;
      }
    }
    
    /**
     * Remove data from storage
     * @param {string} key - Storage key
     */
    function removeFromStorage(key) {
      try {
        localStorage.removeItem(key);
        memoryCache.delete(key);
      } catch (error) {
        console.error(`Error removing data from storage (key: ${key}):`, error);
      }
    }
    
    /**
     * Clean up expired items from storage
     */
    function cleanupExpiredItems() {
      try {
        // Go through all localStorage items
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          try {
            const value = localStorage.getItem(key);
            if (!value) continue;
            
            const item = JSON.parse(value);
            if (item.timestamp && item.ttl) {
              const expirationTime = item.timestamp + item.ttl;
              if (Date.now() > expirationTime) {
                localStorage.removeItem(key);
              }
            }
          } catch (e) {
            // Skip non-JSON items
            continue;
          }
        }
        
        // Also clean memory cache
        for (const [key, value] of memoryCache.entries()) {
          if (value.expires < Date.now()) {
            memoryCache.delete(key);
          }
        }
      } catch (error) {
        console.error('Error cleaning up expired items:', error);
      }
    }
    
    // Public API
    return {
      init,
      saveToStorage,
      loadFromStorage,
      removeFromStorage,
      cleanupExpiredItems
    };
  })();
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    PersistenceManager.init();
  });