/* config.js - Configuration management */

const ConfigManager = (function() {
    // Default configuration
    let MODELS = [];
    let STEPS = [];
    
    /* Load default JSON configurations from /config */
    function loadDefaultConfigs() {
      return Promise.all([
        fetch('config/steps.json').then(res => res.json()),
        fetch('config/models.json').then(res => res.json())
      ]).then(([defaultSteps, defaultModels]) => {
        return { defaultSteps, defaultModels };
      });
    }
  
    /* Load stored settings from localStorage */
    function loadSettings() {
      const configStr = localStorage.getItem("openai_config");
      const stepsConfigStr = localStorage.getItem("steps_config");
      const modelsConfigStr = localStorage.getItem("models_config");
  
      let apiConfig = configStr ? JSON.parse(configStr) : { apiKey: "", model: "" };
      let stepsConfig = stepsConfigStr ? JSON.parse(stepsConfigStr) : null;
      let modelsConfig = modelsConfigStr ? JSON.parse(modelsConfigStr) : null;
  
      return { apiConfig, stepsConfig, modelsConfig };
    }
  
    /* Save API settings to localStorage */
    function saveApiSettings(apiKey, model) {
      const config = { apiKey, model };
      localStorage.setItem("openai_config", JSON.stringify(config));
      return config;
    }
  
    /* Reset to default configurations */
    function resetToDefaults(keepAPIKey = true) {
      return loadDefaultConfigs().then(({ defaultSteps, defaultModels }) => {
        localStorage.setItem("steps_config", JSON.stringify(defaultSteps));
        localStorage.setItem("models_config", JSON.stringify(defaultModels));
        localStorage.removeItem("user_steps");
        localStorage.removeItem("virtual_steps");
        
        STEPS = defaultSteps;
        MODELS = defaultModels;
        
        if (!keepAPIKey) {
          localStorage.removeItem("openai_config");
        }
        
        return { defaultSteps, defaultModels };
      });
    }
  
    /* Save advanced settings */
    function saveAdvancedSettings(stepsJson, modelsJson) {
      localStorage.setItem("steps_config", JSON.stringify(stepsJson));
      localStorage.setItem("models_config", JSON.stringify(modelsJson));
      STEPS = stepsJson;
      MODELS = modelsJson;
      return { stepsJson, modelsJson };
    }
    
    /* Initialize configurations */
    async function initialize() {
      try {
        const { defaultSteps, defaultModels } = await loadDefaultConfigs();
        const { apiConfig, stepsConfig, modelsConfig } = loadSettings();
        
        STEPS = stepsConfig || defaultSteps;
        MODELS = modelsConfig || defaultModels;
        
        return {
          models: MODELS,
          steps: STEPS,
          apiConfig
        };
      } catch (error) {
        console.error("Error initializing configurations:", error);
        throw error;
      }
    }
  
    // Public API
    return {
      initialize,
      loadDefaultConfigs,
      loadSettings,
      saveApiSettings,
      resetToDefaults,
      saveAdvancedSettings,
      getModels: () => MODELS,
      getSteps: () => STEPS
    };
  })();
  