/**
 * moduleManager.js - Manages application modules
 */

window.ModuleManager = (function() {
    // Registered modules
    const modules = new Map();
    
    // Currently loaded module
    let activeModule = null;
    
    // Main content container
    let contentContainer = null;
    
    /**
     * Initialize the module manager
     */
    async function init() {
      console.log('Initializing ModuleManager...');
      contentContainer = document.getElementById('moduleContainer');
      if (!contentContainer) {
        console.error('Module container element not found');
        throw new Error('Module container element not found');
      }
      
      // Register built-in modules
      try {
        await registerBuiltInModules();
        console.log('ModuleManager initialized');
        return true;
      } catch (error) {
        console.error('Failed to initialize ModuleManager:', error);
        throw error;
      }
    }
    
    /**
     * Register the built-in modules
     */
    async function registerBuiltInModules() {
      try {
        // Create an array of module scripts to load
        const moduleScripts = [
          'modules/about/about.js',
          'modules/analysis/analysis.js',
          'modules/settings/settings.js',
          'modules/history/history.js'  // Add history module
        ];
        
        // Load each script with better error handling
        for (const script of moduleScripts) {
          try {
            await loadScript(script);
            console.log(`Successfully loaded: ${script}`);
          } catch (error) {
            console.warn(`Non-critical error loading module script ${script}:`, error);
            // Continue loading other modules
          }
        }
        
        // Each module will call registerModule on load
        console.log('Built-in modules registered:', Array.from(modules.keys()));
      } catch (error) {
        console.error('Failed to register built-in modules:', error);
        throw error;
      }
    }
    
    /**
     * Load a script dynamically
     * @param {string} src - Script source URL
     * @returns {Promise} - Resolves when script is loaded
     */
    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          resolve(); // Script already loaded
          return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
          console.log(`Script loaded: ${src}`);
          resolve();
        };
        script.onerror = () => {
          console.error(`Failed to load script: ${src}`);
          reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
      });
    }
    
    /**
     * Register a module
     * @param {object} module - Module definition
     */
    function registerModule(module) {
      if (!module || !module.id) {
        throw new Error('Invalid module: missing id');
      }
      
      if (!module.mount || typeof module.mount !== 'function') {
        throw new Error(`Invalid module "${module.id}": missing mount() method`);
      }
      
      modules.set(module.id, module);
      console.log(`Module registered: ${module.id}`);
    }
    
    /**
     * Load a module by ID
     * @param {string} moduleId - ID of the module to load
     * @returns {Promise<boolean>} - true if successful
     */
    async function loadModule(moduleId) {
      // First ensure the module is registered
      if (!modules.has(moduleId)) {
        // If module isn't registered, try loading it
        try {
          await loadScript(`modules/${moduleId}/${moduleId}.js`);
        } catch (error) {
          console.error(`Module "${moduleId}" couldn't be loaded:`, error);
          throw new Error(`Module "${moduleId}" not registered and couldn't be loaded`);
        }
        
        // Check again after attempted load
        if (!modules.has(moduleId)) {
          throw new Error(`Module "${moduleId}" not registered`);
        }
      }
      
      const module = modules.get(moduleId);
      
      try {
        // Unmount current module if any
        if (activeModule) {
          await unloadModule();
        }
        
        // Clear the container
        contentContainer.innerHTML = '';
        
        // Load module's CSS if needed
        if (module.css && !document.querySelector(`link[href="${module.css}"]`)) {
          await loadCSS(module.css);
        }
        
        // Load module's HTML template if specified
        if (module.template) {
          const template = await fetchTemplate(module.template);
          contentContainer.innerHTML = template;
        }
        
        // Initialize the module if needed
        if (module.init && !module.initialized) {
          try {
            await module.init();
            module.initialized = true;
          } catch (error) {
            console.error(`Failed to initialize module "${moduleId}":`, error);
            throw error;
          }
        }
        
        // Mount the module
        if (module.mount) {
          try {
            await module.mount(contentContainer);
          } catch (error) {
            console.error(`Failed to mount module "${moduleId}":`, error);
            throw error;
          }
        }
        
        // Update active module reference
        activeModule = moduleId;
        
        // Trigger module:loaded event for other components to respond
        if (window.EventBus) {
          window.EventBus.publish('module:loaded', { moduleId: moduleId });
        }
        
        // Update navigation if NavigationManager is available
        if (window.NavigationManager && typeof window.NavigationManager.setActiveItem === 'function') {
          window.NavigationManager.setActiveItem(moduleId);
        }
        
        console.log(`Module "${moduleId}" loaded successfully`);
        return true;
      } catch (error) {
        console.error(`Failed to load module "${moduleId}":`, error);
        
        // Show error in the container
        contentContainer.innerHTML = `
          <div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <h3 class="text-lg font-semibold">Error Loading Module</h3>
            <p>Failed to load the "${moduleId}" module: ${error.message}</p>
          </div>
        `;
        throw error;
      }
    }
    
    /**
     * Unload the current active module
     */
    async function unloadModule() {
      if (!activeModule) return;
      
      try {
        // Call unmount if available
        if (activeModule.unmount) {
          await activeModule.unmount();
        }
        
        if (window.EventBus) {
          window.EventBus.publish('module:unloaded', activeModule.id);
        }
        activeModule = null;
      } catch (error) {
        console.error(`Error unloading module "${activeModule.id}":`, error);
        throw error;
      }
    }
    
    /**
     * Fetch HTML template
     * @param {string} url - Template URL
     * @returns {Promise<string>} - Template HTML content
     */
    async function fetchTemplate(url) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
        }
        return await response.text();
      } catch (error) {
        console.error(`Failed to fetch template "${url}":`, error);
        throw error;
      }
    }
    
    /**
     * Load CSS dynamically
     * @param {string} href - CSS file URL
     * @returns {Promise} - Resolves when CSS is loaded
     */
    function loadCSS(href) {
      return new Promise((resolve, reject) => {
        const existingLink = document.querySelector(`link[href="${href}"]`);
        if (existingLink) {
          resolve(); // CSS already loaded
          return;
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
        document.head.appendChild(link);
      });
    }
    
    // Create simplified module files for the basic modules
    async function createDefaultModules() {
      // In a real-world scenario, we'd load these from files
      // For now, let's create simple placeholders
      
      const aboutHtml = `
        <div class="p-6 bg-white rounded-lg shadow-sm">
          <h2 class="text-2xl font-semibold text-center mb-4">About PhishPhind</h2>
          <p class="mb-4">PhishPhind is an AI-powered email scanner designed to detect phishing attempts.</p>
          <p>This application helps analyze suspicious emails for signs of phishing or other malicious content.</p>
        </div>
      `;
      
      const analysisHtml = `
        <div class="analysis-module">
          <div class="mb-6">
            <div class="border-b border-gray-200">
              <nav class="-mb-px flex space-x-8" id="resultTabs" role="tablist"></nav>
            </div>
            <div class="bg-white rounded-lg p-6" id="resultTabsContent">
              <div class="text-center py-8 text-gray-500" id="emptyResultsMessage">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="text-lg">No analysis results yet</p>
                <p class="text-sm mt-1">Add email content and click "Start Analysis" to begin</p>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Analysis History</h2>
            </div>
            <div class="p-4" id="analysisHistory">
              <p class="text-gray-500">No previous analyses.</p>
            </div>
          </div>
        </div>
      `;
      
      const settingsHtml = `
        <div class="settings-module">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
          <div class="mb-6">
            <div class="bg-white shadow-sm rounded p-4 border border-gray-200">
              <h3 class="text-lg font-medium mb-3">API Configuration</h3>
              <div class="mb-4">
                <label for="apiKeyInput" class="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
                <input type="text" id="apiKeyInput" placeholder="Enter your API key" class="shadow-sm focus:ring-brand-purple focus:border-brand-purple block w-full sm:text-sm border-gray-300 rounded-md transition-all duration-200 p-2 border">
              </div>
              <div class="mb-4">
                <label for="modelSelect" class="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <select id="modelSelect" class="shadow-sm focus:ring-brand-purple focus:border-brand-purple block w-full sm:text-sm border-gray-300 rounded-md transition-all duration-200 p-2 border">
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                </select>
              </div>
              <button id="saveApiSettingsBtn" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-purple hover:bg-brand-purple-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-all duration-200">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      `;
      
      // Register simple modules
      registerModule({
        id: 'about',
        mount: function(container) {
          container.innerHTML = aboutHtml;
          console.log('About module mounted');
        },
        unmount: function() {
          console.log('About module unmounted');
        }
      });
      
      registerModule({
        id: 'analysis',
        mount: function(container) {
          container.innerHTML = analysisHtml;
          console.log('Analysis module mounted');
        },
        unmount: function() {
          console.log('Analysis module unmounted');
        }
      });
      
      registerModule({
        id: 'settings',
        mount: function(container) {
          container.innerHTML = settingsHtml;
          console.log('Settings module mounted');
          
          // Set up event handlers
          setTimeout(() => {
            const saveBtn = document.getElementById('saveApiSettingsBtn');
            if (saveBtn) {
              saveBtn.addEventListener('click', function() {
                const apiKey = document.getElementById('apiKeyInput').value;
                const model = document.getElementById('modelSelect').value;
                
                if (window.ConfigService) {
                  window.ConfigService.saveApiConfig(apiKey, model);
                  if (window.NotificationService) {
                    window.NotificationService.success('API settings saved');
                  }
                  if (window.EventBus) {
                    window.EventBus.publish('app:api:check');
                  }
                }
              });
            }
            
            // Populate with current settings
            if (window.ConfigService) {
              const config = window.ConfigService.getApiConfig();
              const apiKeyInput = document.getElementById('apiKeyInput');
              const modelSelect = document.getElementById('modelSelect');
              
              if (apiKeyInput && config.apiKey) {
                apiKeyInput.value = config.apiKey;
              }
              
              if (modelSelect && config.model) {
                modelSelect.value = config.model;
              }
            }
          }, 100);
        },
        unmount: function() {
          console.log('Settings module unmounted');
        }
      });
    }
    
    // Return public API
    return {
      init,
      registerModule,
      loadModule,
      unloadModule,
      createDefaultModules
    };
  })();