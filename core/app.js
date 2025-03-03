/**
 * app.js - Main application entry point and initialization
 */

window.PhishPhindApp = (function() {
    // Core app state
    const state = {
      initialized: false,
      activeModule: null,
      apiKey: null,
      selectedModel: null,
      isAnalyzing: false
    };
  
    // Init application
    async function init() {
      if (state.initialized) return;
      
      try {
        console.log('Initializing PhishPhind application...');
        
        // Initialize core services in sequence
        if (window.PersistenceManager && typeof window.PersistenceManager.init === 'function') {
          await window.PersistenceManager.init();
        }
        
        if (window.EventBus && typeof window.EventBus.init === 'function') {
          window.EventBus.init();
        }
        
        // Initialize Services
        if (window.Services && typeof window.Services.init === 'function') {
          await window.Services.init();
        }
        
        // Initialize WindowManager
        if (window.WindowManager && typeof window.WindowManager.init === 'function') {
          window.WindowManager.init();
        }
        
        // Initialize Component Loader if available
        if (window.ComponentLoader && typeof window.ComponentLoader.init === 'function') {
          await window.ComponentLoader.init();
        }
        
        // Initialize NavigationManager if available
        if (window.NavigationManager && typeof window.NavigationManager.init === 'function') {
          await window.NavigationManager.init();
        }
        
        // Initialize ModalModules (new system)
        if (window.ModalModules && typeof window.ModalModules.init === 'function') {
          await window.ModalModules.init();
        }
        
        // Initialize ModuleManager
        if (window.ModuleManager && typeof window.ModuleManager.init === 'function') {
          await window.ModuleManager.init();
        }
        
        // Initialize UI components and event handlers
        registerAppEvents();
        initializeUI();
        initDropzone();
        
        // Check for API configuration
        checkApiConfiguration();
        
        // Register any error handlers
        window.onerror = function(message, source, lineno, colno, error) {
          console.error('Global error:', message, error);
          // You could also show a notification to the user
          if (window.Services && window.Services.notification) {
            window.Services.notification.show({
              type: 'error',
              title: 'Application Error',
              message: 'An unexpected error occurred. Please check the console for details.'
            });
          }
          return false; // Let the default handler run as well
        };
        
        state.initialized = true;
        console.log('PhishPhind application initialized successfully');
        
      } catch (error) {
        console.error('Failed to initialize application:', error);
        alert('The application failed to initialize properly. Please check the console for details.');
      }
    }
    
    // Register application-wide event handlers
    function registerAppEvents() {
      // Skip if EventBus is not available
      if (!window.EventBus) return;
      
      // Navigation handlers
      document.querySelectorAll('[data-module]').forEach(element => {
        element.addEventListener('click', (event) => {
          event.preventDefault();
          const moduleId = element.getAttribute('data-module');
          loadModule(moduleId);
        });
      });
      
      // Global app events
      window.EventBus.subscribe('app:api:check', checkApiConfiguration);
      window.EventBus.subscribe('app:startAnalysis', startAnalysis);
      
      // Module events
      window.EventBus.subscribe('module:loaded', (moduleId) => {
        state.activeModule = moduleId;
      });
    }
    
    // Initialize UI components
    function initializeUI() {
      // Initialize dropzone
      initDropzone();
      
      // Initialize analysis button
      const startAnalysisBtn = document.getElementById('startAnalysisBtn');
      if (startAnalysisBtn) {
        // We publish an event "app:startAnalysis" so the analysis module
        // can then do the actual heavy lifting (once it is loaded).
        startAnalysisBtn.addEventListener('click', () => {
          if (window.EventBus) {
            window.EventBus.publish('app:startAnalysis');
          } else {
            startAnalysis();
          }
        });
      }
    }
    
    // Initialize file dropzone
    function initDropzone() {
      const dropzone = document.getElementById('dropzone');
      const fileInput = document.getElementById('messageFile');
      
      if (!dropzone || !fileInput) return;
      
      // Handle click on dropzone
      dropzone.addEventListener('click', () => {
        fileInput.click();
      });
      
      // Handle drag events
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        }, false);
      });
      
      // Handle dragenter and dragover
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
          dropzone.classList.add('drag-over');
        }, false);
      });
      
      // Handle dragleave and drop
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
          dropzone.classList.remove('drag-over');
        }, false);
      });
      
      // Handle file drop
      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
          fileInput.files = files;
          handleFileSelected(files[0]);
        }
      }, false);
      
      // Handle file selection
      fileInput.addEventListener('change', (event) => {
        if (event.target.files.length) {
          handleFileSelected(event.target.files[0]);
        }
      });
    }
    
    // Handle file selected (via drag or click)
    function handleFileSelected(file) {
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('messageText').value = e.target.result;
        if (window.NotificationService) {
          window.NotificationService.info('File loaded successfully');
        }
      };
      reader.readAsText(file);
    }
    
    // Check if API key is configured
    function checkApiConfiguration() {
      // Skip if ConfigService is not available
      if (!window.ConfigService) return false;
      
      const config = window.ConfigService.getApiConfig();
      
      if (!config.apiKey) {
        // No API key configured, show settings
        if (window.NotificationService) {
          window.NotificationService.warning('Please configure your API key in settings');
        }
        loadModule('settings');
        return false;
      }
      
      state.apiKey = config.apiKey;
      state.selectedModel = config.model;
      return true;
    }
    
    // Load a module
    function loadModule(moduleId) {
      if (state.activeModule === moduleId) return;
      
      // For about and settings, use the modal system
      if (moduleId === 'about' || moduleId === 'settings') {
        if (window.ModalModules) {
          window.ModalModules.showModal(moduleId);
          return;
        }
      }
      
      // For other modules, use the module manager
      if (window.ModuleManager) {
        window.ModuleManager.loadModule(moduleId)
          .then(() => {
            state.activeModule = moduleId;
          })
          .catch(error => {
            console.error(`Failed to load module "${moduleId}":`, error);
            if (window.NotificationService) {
              window.NotificationService.error(`Failed to load module: ${error.message}`);
            }
          });
      } else {
        console.error('ModuleManager not available');
      }
    }
    
    // Start analysis process
    async function startAnalysis() {
      // Validate API key is set
      if (!checkApiConfiguration()) return;
      
      // Get message content
      const messageContent = document.getElementById('messageText').value.trim();
      if (!messageContent) {
        if (window.NotificationService) {
          window.NotificationService.error('Please provide message content to analyze');
        }
        return;
      }
      
      console.log('Starting analysis...');
      state.isAnalyzing = true;
      
      // IMPORTANT: First ensure the Analysis module is fully loaded
      // so that it has subscribed to 'analysis:start'.
      loadModule('analysis')
        .then(() => {
          // Now that analysis is loaded (and subscribed),
          // we can publish the analysis:start event:
          if (window.EventBus) {
            window.EventBus.publish('analysis:start', {
              content: messageContent,
              apiKey: state.apiKey,
              model: state.selectedModel
            });
          }
        })
        .catch(err => {
          console.error('Failed to load analysis module:', err);
          if (window.NotificationService) {
            window.NotificationService.error('Could not load Analysis module. See console.');
          }
        });
    }
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
    
    // Public API
    return {
      init,
      loadModule
    };
  })();
