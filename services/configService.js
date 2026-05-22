/**
 * configService.js - Application configuration management
 */

window.ConfigService = (function() {
    // Default configuration
    const DEFAULT_CONFIG = {
      api: {
        apiKey: '',
        model: 'gpt-5.4-mini'
      },
      steps: [],
      models: [
        {
          "id": "gpt-5.5",
          "displayName": "GPT-5.5",
          "provider": "OpenAI",
          "api": "responses"
        },
        {
          "id": "gpt-5.4",
          "displayName": "GPT-5.4",
          "provider": "OpenAI",
          "api": "responses"
        },
        {
          "id": "gpt-5.4-mini",
          "displayName": "GPT-5.4 Mini",
          "provider": "OpenAI",
          "api": "responses"
        },
        {
          "id": "gpt-4.1",
          "displayName": "GPT-4.1",
          "provider": "OpenAI",
          "api": "chat_completions"
        },
        {
          "id": "gpt-4.1-mini",
          "displayName": "GPT-4.1 Mini",
          "provider": "OpenAI",
          "api": "chat_completions"
        },
        {
          "id": "gpt-4.1-nano",
          "displayName": "GPT-4.1 Nano",
          "provider": "OpenAI",
          "api": "chat_completions"
        },
        {
          "id": "gpt-4o",
          "displayName": "GPT-4o",
          "provider": "OpenAI",
          "api": "chat_completions"
        },
        {
          "id": "gpt-4o-mini",
          "displayName": "GPT-4o Mini",
          "provider": "OpenAI",
          "api": "chat_completions"
        }
      ]
    };
    
    // Current configuration
    let config = structuredClone(DEFAULT_CONFIG);
    
    /**
     * Initialize configuration service
     */
    async function init() {
      try {
        // Load config from storage
        loadConfig();
        
        // Load default step config from file if needed
        if (config.steps.length === 0) {
          await loadDefaultSteps();
        }
        
        if (window.EventBus) {
          window.EventBus.subscribe('config:updated', saveConfig);
        }
        
        console.log('ConfigService initialized');
        return Promise.resolve();
      } catch (error) {
        console.error('Failed to initialize ConfigService:', error);
        throw error;
      }
    }
    
    /**
     * Load configuration from persistent storage
     */
    function loadConfig() {
      // API Config
      const apiConfigStr = localStorage.getItem('openai_config');
      if (apiConfigStr) {
        try {
          const apiConfig = JSON.parse(apiConfigStr);
          config.api = {
            apiKey: apiConfig.apiKey || '',
            model: apiConfig.model || DEFAULT_CONFIG.api.model
          };
        } catch (error) {
          console.error('Error parsing API config:', error);
        }
      }
      
      // Models Config
      const modelsConfigStr = localStorage.getItem('models_config');
      if (modelsConfigStr) {
        try {
          config.models = mergeDefaultModels(JSON.parse(modelsConfigStr));
        } catch (error) {
          console.error('Error parsing models config:', error);
          config.models = mergeDefaultModels(config.models);
        }
      } else {
        config.models = mergeDefaultModels(config.models);
      }

      if (!config.models.some(model => model.id === config.api.model)) {
        config.api.model = DEFAULT_CONFIG.api.model;
      }
      
      // Steps Config
      const stepsConfigStr = localStorage.getItem('steps_config');
      if (stepsConfigStr) {
        try {
          config.steps = JSON.parse(stepsConfigStr);
        } catch (error) {
          console.error('Error parsing steps config:', error);
        }
      }
    }
    
    /**
     * Ensure stored model lists receive newly shipped defaults while preserving
     * user-defined/custom models that are not part of the default list.
     * @param {array} storedModels - Models loaded from storage or defaults
     * @returns {array} - Merged model list
     */
    function mergeDefaultModels(storedModels = []) {
      const customModels = Array.isArray(storedModels) ? storedModels : [];
      const defaultIds = new Set(DEFAULT_CONFIG.models.map(model => model.id));
      const customOnlyModels = customModels.filter(model => model?.id && !defaultIds.has(model.id));

      return [...DEFAULT_CONFIG.models, ...customOnlyModels];
    }

    /**
     * Save configuration to persistent storage
     */
    function saveConfig() {
      // API Config
      localStorage.setItem('openai_config', JSON.stringify(config.api));
      
      // Models Config
      localStorage.setItem('models_config', JSON.stringify(config.models));
      
      // Steps Config
      localStorage.setItem('steps_config', JSON.stringify(config.steps));
    }
    
    /**
     * Load default steps from config file
     */
    async function loadDefaultSteps() {
      try {
        const response = await fetch('config/steps.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch default steps: ${response.status} ${response.statusText}`);
        }
        
        config.steps = await response.json();
        saveConfig();
      } catch (error) {
        console.error('Error loading default steps:', error);
        // Use a minimal default config if fetch fails
        config.steps = [
          {
            "id": "data_extraction",
            "file": "steps/data_extraction.txt",
            "position": 0
          },
          {
            "id": "sender_analysis",
            "file": "steps/sender_analysis.txt",
            "position": 1
          },
          {
            "id": "content_analysis",
            "file": "steps/content_analysis.txt",
            "position": 2
          }
        ];
        saveConfig();
      }
    }
    
    /**
     * Get API configuration
     * @returns {object} - API configuration
     */
    function getApiConfig() {
      return { ...config.api };
    }
    
    /**
     * Save API configuration
     * @param {string} apiKey - API key
     * @param {string} model - Model ID
     */
    function saveApiConfig(apiKey, model) {
      config.api = {
        apiKey,
        model
      };
      
      saveConfig();
      if (window.EventBus) {
        window.EventBus.publish('config:api:updated', { apiKey, model });
      }
    }
    
    /**
     * Get models configuration
     * @returns {array} - Models configuration
     */
    function getModels() {
      return [...config.models];
    }
    
    /**
     * Save models configuration
     * @param {array} models - Models configuration
     */
    function saveModels(models) {
      config.models = [...models];
      saveConfig();
      if (window.EventBus) {
        window.EventBus.publish('config:models:updated', models);
      }
    }
    
    /**
     * Get steps configuration
     * @returns {array} - Steps configuration
     */
    function getSteps() {
      return [...config.steps];
    }
    
    /**
     * Save steps configuration
     * @param {array} steps - Steps configuration
     */
    function saveSteps(steps) {
      config.steps = [...steps];
      saveConfig();
      if (window.EventBus) {
        window.EventBus.publish('config:steps:updated', steps);
      }
    }
    
    /**
     * Reset to default configuration
     * @param {boolean} keepApiKey - Whether to keep API key
     */
    function resetToDefaults(keepApiKey = false) {
      const apiKey = keepApiKey ? config.api.apiKey : '';
      
      config = structuredClone(DEFAULT_CONFIG);
      
      if (keepApiKey) {
        config.api.apiKey = apiKey;
      }
      
      saveConfig();
      if (window.EventBus) {
        window.EventBus.publish('config:reset', { keepApiKey });
      }
    }
    
    /**
     * Get models configuration - Alias for getModels for backward compatibility
     * @returns {array} - Models configuration
     */
    function getAvailableModels() {
      console.log('getAvailableModels called (deprecated) - use getModels instead');
      return getModels();
    }
    
    // Register service if Services exists
    if (window.Services) {
      window.Services.register('ConfigService', {
        init,
        getApiConfig,
        saveApiConfig,
        getModels,
        saveModels,
        getSteps,
        saveSteps,
        resetToDefaults,
        loadDefaultSteps,
        getAvailableModels
      });
    }
    
    // Return public API
    return {
      init,
      getApiConfig,
      saveApiConfig,
      getModels,
      saveModels,
      getSteps,
      saveSteps,
      resetToDefaults,
      loadDefaultSteps,
      getAvailableModels
    };
  })();