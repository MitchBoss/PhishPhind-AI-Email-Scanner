/**
 * services.js - Core services registry and initialization
 */

// Create Services as a global object
window.Services = (function() {
    // Registered services
    const registeredServices = new Map();
    
    /**
     * Initialize all services
     */
    async function init() {
      try {
        // Initialize each service that has an init method
        const initPromises = [];
        
        for (const [name, service] of registeredServices.entries()) {
          if (service.init && typeof service.init === 'function') {
            try {
              console.log(`Initializing service: ${name}`);
              const promise = service.init().catch(error => {
                console.error(`Failed to initialize service "${name}":`, error);
              });
              initPromises.push(promise);
            } catch (error) {
              console.error(`Error calling init for "${name}":`, error);
            }
          }
        }
        
        await Promise.all(initPromises);
        console.log('All services initialized');
      } catch (error) {
        console.error('Failed to initialize services:', error);
        throw error;
      }
    }
    
    /**
     * Register a service
     * @param {string} name - Service name
     * @param {object} service - Service implementation
     */
    function register(name, service) {
      if (registeredServices.has(name)) {
        console.warn(`Service "${name}" already registered, overwriting...`);
      }
      
      registeredServices.set(name, service);
      console.log(`Service registered: ${name}`);
      
      // Make the service globally available
      window[name] = service;
    }
    
    /**
     * Get a registered service
     * @param {string} name - Service name
     * @returns {object} - Service implementation
     */
    function get(name) {
      if (!registeredServices.has(name)) {
        throw new Error(`Service "${name}" not registered`);
      }
      
      return registeredServices.get(name);
    }
    
    // Public API
    return {
      init,
      register,
      get
    };
  })();