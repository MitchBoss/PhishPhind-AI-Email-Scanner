/**
 * Settings Module - Manages application settings
 */

const SettingsModule = (function() {
    // Module state
    const state = {
      currentEditingStep: null,
      hasUnsavedChanges: false,
      steps: [],
      models: []
    };
    
    // Tab sizing information for smooth transitions
    const tabSizes = {
      apiSettings: { width: 400, height: 'auto' },
      stepManager: { width: 800, height: 'auto' },
      advancedSettings: { width: 500, height: 'auto' }
    };
    
    // Track sortable list
    let sortable = null;
    
    // Initialize module
    async function init() {
      console.log("[SETTINGS] SettingsModule.init called");
      
      // Subscribe to events
      if (window.EventBus) {
        window.EventBus.subscribe('config:api:updated', handleApiConfigUpdate);
        window.EventBus.subscribe('config:models:updated', handleModelsUpdate);
        window.EventBus.subscribe('config:steps:updated', handleStepsUpdate);
        window.EventBus.subscribe('modal:shown', handleModalShown);
        window.EventBus.subscribe('settings:open', openSettings);
      }
      
      // Add global functions for cross-module access
      addGlobalFunctions();
      
      // Expose debugging functions globally
      window.PhishPhindDebug = window.PhishPhindDebug || {};
      window.PhishPhindDebug.toggleVariablePicker = toggleVariablePicker;
      window.PhishPhindDebug.updateVariablePicker = updateVariablePicker;
      window.PhishPhindDebug.insertVariableIntoPrompt = insertVariableIntoPrompt;
      
      console.log("[SETTINGS] All debug functions exposed via PhishPhindDebug global object");
      console.log("[SETTINGS] You can use window.PhishPhindDebug.toggleVariablePicker() to manually show the picker");
      
      // Preload data
      if (window.ConfigService) {
        try {
          // Use getModels instead of getAvailableModels
          state.models = window.ConfigService.getModels() || [];
        } catch (error) {
          console.error('Error loading models:', error);
          state.models = []; // Set default empty array
        }
      }
      
      if (window.StepService) {
        try {
        state.steps = await window.StepService.getSteps();
        } catch (error) {
          console.error('Error loading steps:', error);
          state.steps = []; // Set default empty array
        }
      }
      
      console.log('Settings module initialized');
      return true;
    }
    
    /**
     * Opens the settings modal
     */
    function openSettings() {
      if (window.ModalModules && typeof window.ModalModules.showModal === 'function') {
        window.ModalModules.showModal('settings');
      } else {
        console.error('ModalModules not available, cannot show settings');
      }
    }
    
    // Mount the module
    async function mount(container) {
      try {
        // Ensure container is a valid DOM element
        if (!container || !(container instanceof Element)) {
          console.error('Invalid container provided to settings module:', container);
          return false;
        }
      
        // Clear container
        container.innerHTML = '';
        
        // Create main card for settings
        try {
          const settingsCard = await ComponentLoader.createCard({
            title: 'Settings',
            contentClass: 'p-0', // Remove padding for tab content
            fullWidth: true
          });
          
          // Verify that settingsCard is a DOM element
          if (!settingsCard || !(settingsCard instanceof Element)) {
            console.error('ComponentLoader.createCard did not return a valid DOM element');
            container.innerHTML = '<div class="error-message">Error: Failed to create settings card</div>';
            return false;
          }
          
          // Create tabs
          const tabs = await ComponentLoader.createTabs({
            id: 'settingsTabs',
            tabs: [
              { id: 'apiSettings', text: 'API Settings', active: true },
              { id: 'stepManager', text: 'Step Manager' },
              { id: 'advancedSettings', text: 'Advanced' }
            ],
            onTabChange: (tabId) => {
              // Resize modal based on tab
              if (tabSizes[tabId]) {
                const modal = document.querySelector('.modal-container');
                if (modal) {
                  modal.style.width = tabSizes[tabId].width + 'px';
                  modal.style.height = tabSizes[tabId].height;
                }
              }
            }
          });
          
          // Verify that tabs is a DOM element
          if (!tabs || !(tabs instanceof Element)) {
            console.error('ComponentLoader.createTabs did not return a valid DOM element');
            container.innerHTML = '<div class="error-message">Error: Failed to create settings tabs</div>';
            return false;
          }
          
          // API Settings Content
          const apiSettingsContent = document.createElement('div');
          apiSettingsContent.id = 'apiSettings';
          apiSettingsContent.className = 'tab-content block';
          
          const apiConfigCard = ComponentLoader.createCard({
            contentClass: 'p-4',
            content: `
              <h3 class="text-lg font-medium mb-3">API Configuration</h3>
              <div class="mb-4">
                <label for="apiKeyInput" class="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
                <input type="text" id="apiKeyInput" placeholder="Enter your API key" class="shadow-sm focus:ring-brand-purple focus:border-brand-purple block w-full sm:text-sm border-gray-300 rounded-md transition-all duration-200 p-2 border">
              </div>
              <div class="mb-4">
                <label for="modelSelect" class="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <select id="modelSelect" class="shadow-sm focus:ring-brand-purple focus:border-brand-purple block w-full sm:text-sm border-gray-300 rounded-md transition-all duration-200 p-2 border">
                  ${state.models.map(model => `<option value="${model.id}">${model.name}</option>`).join('')}
                </select>
              </div>
            `
          });
          
          apiSettingsContent.appendChild(apiConfigCard);
          
          // Step Manager Content
          const stepManagerContent = document.createElement('div');
          stepManagerContent.id = 'stepManager';
          stepManagerContent.className = 'tab-content hidden';
          
          // Dependencies visualization
          const dependenciesCard = ComponentLoader.createCard({
            headerContent: `<h3 class="text-sm font-medium text-gray-700">Dependencies</h3>`,
            content: `
              <div id="dependencyVisualization" class="border rounded-md p-4 max-h-40 overflow-y-auto">
                <p class="text-gray-500">Select a step to see dependencies</p>
              </div>
            `
          });
          
          // Steps list and editor container
          const stepsContainer = document.createElement('div');
          stepsContainer.id = 'stepsGrid';
          stepsContainer.className = 'grid-area-steps mt-6';
          
          const stepsToolbar = document.createElement('div');
          stepsToolbar.innerHTML = `
            <h3 class="text-lg font-medium text-gray-700 mb-2">Steps</h3>
            <div class="mb-3 flex flex-wrap gap-2">
              <button id="addStepBtn" class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-brand-purple hover:bg-brand-purple-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
              <button id="importStepsBtn" class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-brand-purple bg-brand-purple bg-opacity-10 hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Import
              </button>
              <button id="exportStepsBtn" class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
              <button id="restoreDefaultStepsBtn" class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restore
              </button>
            </div>
          `;
          
          // Create step list
          const stepListCard = ComponentLoader.createCard({
            content: `
              <ul id="stepList" class="bg-white divide-y divide-gray-200 step-sortable">
                ${state.steps.length > 0 ? 
                  state.steps.map((step, index) => `
                    <li class="p-4 flex justify-between items-center step-item" data-id="${step.id}">
                      <div class="flex items-center">
                        <span class="step-drag-handle mr-2 cursor-move">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </span>
                        <div>
                          <span class="font-medium">${step.name}</span>
                          <p class="text-xs text-gray-500">${step.description}</p>
                        </div>
                      </div>
                      <div class="flex space-x-2">
                        <button class="edit-step-btn text-brand-purple hover:text-brand-purple-dark" data-id="${step.id}">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button class="delete-step-btn text-red-600 hover:text-red-800" data-id="${step.id}">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  `).join('') : 
                  '<li class="p-4 text-center text-gray-500">No steps configured. Click "Add" to create a step.</li>'
                }
              </ul>
            `,
            contentClass: 'p-0'
          });
          
          stepsContainer.appendChild(stepsToolbar);
          stepsContainer.appendChild(stepListCard);
          
          // Step Editor (Hidden initially)
          const stepEditorContainer = document.createElement('div');
          stepEditorContainer.id = 'stepEditorContainer';
          stepEditorContainer.className = 'hidden grid-area-editor';
          
          const backButton = document.createElement('button');
          backButton.id = 'backToStepsBtn';
          backButton.className = 'back-button mb-4 inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-colors duration-200';
          backButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Steps
          `;
          
          // Step editor will be populated when a step is selected
          const stepEditorPanel = document.createElement('div');
          stepEditorPanel.id = 'stepEditorPanel';
          
          stepEditorContainer.appendChild(backButton);
          stepEditorContainer.appendChild(stepEditorPanel);
          
          // Advanced Settings Content
          const advancedSettingsContent = document.createElement('div');
          advancedSettingsContent.id = 'advancedSettings';
          advancedSettingsContent.className = 'tab-content hidden';
          
          // Create advanced settings card
          const advancedSettingsCard = ComponentLoader.createCard({
            content: `
              <h3 class="text-lg font-medium mb-3">Advanced Configuration</h3>
              <div class="mb-4">
                <label for="debugModeToggle" class="flex items-center cursor-pointer">
                  <div class="relative">
                    <input type="checkbox" id="debugModeToggle" class="sr-only">
                    <div class="block bg-gray-200 w-10 h-6 rounded-full"></div>
                    <div class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                  </div>
                  <div class="ml-3 text-gray-700 font-medium">Debug Mode</div>
                </label>
                <p class="text-sm text-gray-500 mt-1">Enables detailed console logging for debugging purposes.</p>
              </div>
            `
          });
          
          advancedSettingsContent.appendChild(advancedSettingsCard);
          
          // Append tab content to tabs
          const tabContentContainer = document.createElement('div');
          tabContentContainer.className = 'tab-content-container';
          tabContentContainer.appendChild(apiSettingsContent);
          tabContentContainer.appendChild(stepManagerContent);
          tabContentContainer.appendChild(advancedSettingsContent);
          
          // Append step manager content
          stepManagerContent.appendChild(dependenciesCard);
          stepManagerContent.appendChild(stepsContainer);
          stepManagerContent.appendChild(stepEditorContainer);
          
          // Assemble settings component
          settingsCard.querySelector('.card-content').appendChild(tabs);
          settingsCard.querySelector('.card-content').appendChild(tabContentContainer);
          
          // Append the main card to the container
          container.appendChild(settingsCard);
          
          // Setup event handlers after DOM is updated
      setupEventHandlers();
      
          // Initialize form values
          populateFormValues();
        } catch (error) {
          console.error('Error creating settings card:', error);
          container.innerHTML = `<div class="error-message">Error mounting settings module: ${error.message}</div>`;
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Error in settings module mount:', error);
        if (container && container.innerHTML) {
          container.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        }
        return false;
      }
    }
    
    // Unmount the module
    function unmount() {
      // Check for unsaved changes
      if (state.hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Are you sure you want to discard them?')) {
          return false;
        }
      }
      
      // Clean up sortable
      const stepList = document.getElementById('stepList');
      if (stepList && window.Sortable && stepList.sortable) {
        stepList.sortable.destroy();
      }
      
      console.log('Settings module unmounted');
      return true;
    }
    
    // Handle modal shown event
    function handleModalShown(data) {
      if (data && data.id === 'settings') {
        // Initialize modal content when shown
        initTabs();
        populateApiSettings();
        populateModels();
        populateStepManager();
        populateAdvancedSettings();
        initSortable();
        setupEventHandlers();
      }
    }
    
    // Initialize tabs
    function initTabs() {
      const tabLinks = document.querySelectorAll('#settingsTabs a');
      const tabContents = document.querySelectorAll('.tab-content');
      
      tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Check for unsaved changes if in step editor
          if (state.hasUnsavedChanges && state.currentEditingStep) {
            if (!confirm('You have unsaved changes. Discard changes?')) {
              return;
            }
            state.hasUnsavedChanges = false;
          }
          
          // Get target tab
          const tabId = link.getAttribute('data-tab');
          
          // Resize modal for the tab (smooth transition)
          resizeModalForTab(tabId);
          
          // Add fade-out effect to all tabs
          tabContents.forEach(content => {
            // Add opacity transition
            content.style.transition = 'opacity 0.3s ease-out';
            content.style.opacity = '0';
            
            // After fade out, hide the content
            setTimeout(() => {
              content.classList.add('hidden');
            }, 250); // Slightly shorter than the fade duration
          });
          
          // After a short delay, show and fade in the target tab
          setTimeout(() => {
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
              // Show the tab but keep it transparent
              targetTab.classList.remove('hidden');
              targetTab.style.opacity = '0';
              
              // Force a reflow before starting the animation
              void targetTab.offsetWidth;
              
              // Fade in the content
              targetTab.style.transition = 'opacity 0.3s ease-in';
              targetTab.style.opacity = '1';
            }
          }, 300);
          
          // Update active tab styling
          tabLinks.forEach(tab => {
            tab.classList.remove('border-brand-purple', 'text-brand-purple');
            tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
          });
          
          link.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
          link.classList.add('border-brand-purple', 'text-brand-purple');
        });
      });
    }
    
    // Resize modal based on tab
    function resizeModalForTab(tabId) {
      if (window.EventBus) {
        window.EventBus.publish('modal:resize', {
          modalId: 'settings',
          width: tabSizes[tabId]?.width || 800,
          height: tabSizes[tabId]?.height || 'auto',
          transition: 'all 0.5s ease-in-out'
        });
      }
    }
    
    // Initialize sortable list
    function initSortable() {
      const el = document.getElementById('stepList');
      if (!el || !window.Sortable) return;
      
      sortable = new Sortable(el, {
        handle: '.step-drag-handle',
        animation: 150,
        onEnd: handleStepReorder
      });
    }
    
    // Set up event handlers
    function setupEventHandlers() {
      console.log("[SETUP] Setting up event handlers");
      
      // API Settings
      const saveApiSettingsBtn = document.getElementById('saveApiSettingsBtn');
      if (saveApiSettingsBtn) {
        saveApiSettingsBtn.addEventListener('click', saveApiSettings);
      }
      
      // Step Manager
      const addStepBtn = document.getElementById('addStepBtn');
      if (addStepBtn) {
        addStepBtn.addEventListener('click', handleAddStep);
      }
      
      const importStepsBtn = document.getElementById('importStepsBtn');
      if (importStepsBtn) {
        importStepsBtn.addEventListener('click', handleImportSteps);
      }
      
      const exportStepsBtn = document.getElementById('exportStepsBtn');
      if (exportStepsBtn) {
        exportStepsBtn.addEventListener('click', handleExportSteps);
      }
      
      const restoreDefaultStepsBtn = document.getElementById('restoreDefaultStepsBtn');
      if (restoreDefaultStepsBtn) {
        restoreDefaultStepsBtn.addEventListener('click', handleRestoreDefaultSteps);
      }
      
      // Step Editor
      const backToStepsBtn = document.getElementById('backToStepsBtn');
      if (backToStepsBtn) {
        backToStepsBtn.addEventListener('click', handleBackToSteps);
      }
      
      const saveStepBtn = document.getElementById('saveStepBtn');
      if (saveStepBtn) {
        saveStepBtn.addEventListener('click', handleSaveStep);
      }
      
      const cancelStepEditBtn = document.getElementById('cancelStepEditBtn');
      if (cancelStepEditBtn) {
        cancelStepEditBtn.addEventListener('click', handleCancelStepEdit);
      }
      
      const resetStepBtn = document.getElementById('resetStepBtn');
      if (resetStepBtn) {
        resetStepBtn.addEventListener('click', handleResetStep);
      }
      
      const exportStepBtn = document.getElementById('exportStepBtn');
      if (exportStepBtn) {
        exportStepBtn.addEventListener('click', handleExportStep);
      }
      
      // Variable Picker - Enhanced with better debugging
      const variablePickerBtn = document.getElementById('variablePickerBtn');
      console.log("[SETUP] Variable picker button found:", !!variablePickerBtn, variablePickerBtn);
      console.log("[SETUP] Variable picker button HTML:", variablePickerBtn ? variablePickerBtn.outerHTML : "Not found");
      
      // Check if parent elements are properly rendered
      if (variablePickerBtn) {
        console.log("[SETUP] Variable picker button parent:", variablePickerBtn.parentElement);
        console.log("[SETUP] Variable picker button is visible:", variablePickerBtn.offsetParent !== null);
        
        // Enhanced click event with detailed logging
        console.log("[SETUP] Adding click event listener to variable picker button");
        variablePickerBtn.onclick = function(e) {
          console.log("[CLICK] Variable picker button clicked with onclick handler");
          toggleVariablePicker(e);
          return false; // Prevent default and stop propagation
        };
        
        // Also add regular event listener as backup
        variablePickerBtn.addEventListener('click', function(e) {
          console.log("[CLICK] Variable picker button clicked with addEventListener");
          e.preventDefault();
          e.stopPropagation();
          toggleVariablePicker(e);
        }, true); // Use capture phase to ensure our handler runs first
        
        // Add direct access for debugging
        window.showVariablePicker = function() {
          console.log("[DEBUG] Manually showing variable picker");
          toggleVariablePicker({
            preventDefault: function() {},
            stopPropagation: function() {}
          });
        };
        
        console.log("[SETUP] Direct debug access added: Call window.showVariablePicker() to test");
      } else {
        console.error("[SETUP] CRITICAL: Variable picker button not found in DOM!");
        // Look for any button in the document to debug
        const allButtons = document.querySelectorAll('button');
        console.log("[SETUP] All buttons found:", allButtons.length);
        allButtons.forEach((btn, index) => {
          console.log(`[SETUP] Button ${index}:`, btn.outerHTML);
        });
      }
      
      document.addEventListener('click', (e) => {
        const menu = document.getElementById('variablePickerMenu');
        const btn = document.getElementById('variablePickerBtn');
        if (menu && btn && !menu.contains(e.target) && e.target !== btn) {
          menu.classList.add('hidden');
          console.log("[DOCUMENT] Hiding variable picker menu from document click event");
        }
      });
      
      // Track changes in step form fields
      ['stepId', 'stepMenuName', 'stepPrompt', 'stepInstructions'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => {
            state.hasUnsavedChanges = true;
          });
        }
      });
      
      // Advanced Settings
      const saveAdvancedBtn = document.getElementById('saveAdvancedBtn');
      if (saveAdvancedBtn) {
        saveAdvancedBtn.addEventListener('click', saveAdvancedSettings);
      }
      
      // Reset Buttons
      const resetConfigBtn = document.getElementById('resetConfigBtn');
      if (resetConfigBtn) {
        resetConfigBtn.addEventListener('click', () => resetConfig(true));
      }
      
      const fullResetBtn = document.getElementById('fullResetBtn');
      if (fullResetBtn) {
        fullResetBtn.addEventListener('click', () => resetConfig(false));
      }
      
      // Global save settings button
      const saveSettingsBtn = document.getElementById('saveSettingsBtn');
      if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveAllSettings);
      }
    }
    
    // Populate API settings form
    function populateApiSettings() {
      if (!window.ConfigService) return;
      
      const config = window.ConfigService.getApiConfig();
      const apiKeyInput = document.getElementById('apiKeyInput');
      if (apiKeyInput) {
        apiKeyInput.value = config.apiKey || '';
      }
      
      // Set model in dropdown
      const modelSelect = document.getElementById('modelSelect');
      if (modelSelect && config.model) {
        modelSelect.value = config.model;
      }
    }
    
    // Populate models dropdown
    function populateModels() {
      const modelSelect = document.getElementById('modelSelect');
      if (!modelSelect) return;
      
      // Clear existing options
      modelSelect.innerHTML = '';
      
      // Add options for each model
      state.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        modelSelect.appendChild(option);
      });
      
      // Set current model if any
      if (window.ConfigService) {
        const config = window.ConfigService.getApiConfig();
        if (config.model) {
          modelSelect.value = config.model;
        }
      }
    }
    
    // Populate step manager
    function populateStepManager() {
      renderStepList();
      updateVariablePicker();
    }
    
    // Populate advanced settings
    function populateAdvancedSettings() {
      if (!window.ConfigService) return;
      
      const stepsEditor = document.getElementById('stepsEditor');
      if (stepsEditor) {
        stepsEditor.value = JSON.stringify(window.ConfigService.getSteps(), null, 2);
      }
      
      const modelsEditor = document.getElementById('modelsEditor');
      if (modelsEditor) {
        modelsEditor.value = JSON.stringify(window.ConfigService.getModels(), null, 2);
      }
    }
    
    // Handle API config update event
    function handleApiConfigUpdate(config) {
      const apiKeyInput = document.getElementById('apiKeyInput');
      if (apiKeyInput) {
        apiKeyInput.value = config.apiKey || '';
      }
      
      const modelSelect = document.getElementById('modelSelect');
      if (modelSelect && config.model) {
        modelSelect.value = config.model;
      }
    }
    
    // Handle models update event
    function handleModelsUpdate(models) {
      state.models = models;
      populateModels();
      populateAdvancedSettings();
    }
    
    // Handle steps update event
    function handleStepsUpdate(steps) {
      state.steps = steps;
      renderStepList();
      populateAdvancedSettings();
    }
    
    // Save API settings
    function saveApiSettings() {
      if (!window.ConfigService || !window.NotificationService) return;
      
      const apiKeyInput = document.getElementById('apiKeyInput');
      const modelSelect = document.getElementById('modelSelect');
      
      if (!apiKeyInput || !modelSelect) return;
      
      const apiKey = apiKeyInput.value.trim();
      const model = modelSelect.value;
      
      window.ConfigService.saveApiConfig(apiKey, model);
      window.NotificationService.success('API settings saved');
      
      // Publish event for app to check API config
      if (window.EventBus) {
        window.EventBus.publish('app:api:check');
      }
    }
    
    // Save all settings
    function saveAllSettings() {
      saveApiSettings();
      
      // Check which tab is active
      const stepManagerTab = document.getElementById('stepManager');
      const advancedSettingsTab = document.getElementById('advancedSettings');
      
      if (stepManagerTab && !stepManagerTab.classList.contains('hidden')) {
        // Save any unsaved step
        if (state.hasUnsavedChanges && state.currentEditingStep) {
          handleSaveStep();
        }
      } else if (advancedSettingsTab && !advancedSettingsTab.classList.contains('hidden')) {
        saveAdvancedSettings();
      }
      
      // Close the modal
      if (window.ModalModules) {
        window.ModalModules.hideModal('settings');
      }
    }
    
    // Save advanced settings
    function saveAdvancedSettings() {
      if (!window.ConfigService || !window.NotificationService) return;
      
      try {
        const stepsEditor = document.getElementById('stepsEditor');
        const modelsEditor = document.getElementById('modelsEditor');
        
        if (!stepsEditor || !modelsEditor) return;
        
        const stepsJson = JSON.parse(stepsEditor.value);
        const modelsJson = JSON.parse(modelsEditor.value);
        
        window.ConfigService.saveSteps(stepsJson);
        window.ConfigService.saveModels(modelsJson);
        
        state.steps = stepsJson;
        state.models = modelsJson;
        
        // Update UI
        populateModels();
        renderStepList();
        
        window.NotificationService.success('Advanced settings saved');
      } catch (error) {
        window.NotificationService.error('Invalid JSON: ' + error.message);
      }
    }
    
    // Reset configuration
    function resetConfig(keepApiKey) {
      if (!window.ConfigService || !window.NotificationService || !window.StepService) return;
      
      if (!confirm(keepApiKey ? 
                  'Reset configuration to defaults? API key will be preserved.' : 
                  'Full reset will clear all settings including API key. Continue?')) {
        return;
      }
      
      window.ConfigService.resetToDefaults(keepApiKey);
      
      // Reload data
      state.models = window.ConfigService.getModels();
      window.StepService.getSteps().then(steps => {
        state.steps = steps;
        
        // Update UI
        populateApiSettings();
        populateModels();
        renderStepList();
        populateAdvancedSettings();
        
        // If in step editor mode, exit
        if (state.currentEditingStep) {
          hideStepEditor();
        }
        
        window.NotificationService.success('Configuration reset to defaults');
      });
    }
    
    // Render step list
    function renderStepList() {
      const stepList = document.getElementById('stepList');
      if (!stepList) return;
      
      stepList.innerHTML = '';
      
      if (state.steps.length === 0) {
        stepList.innerHTML = '<li class="p-4 text-center text-gray-500">No steps configured</li>';
        return;
      }
      
      state.steps.forEach(step => {
        const modifiedBadge = step.isModified ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Modified</span>' : '';
        const virtualBadge = step.isVirtual ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Virtual</span>' : '';
        
        const li = document.createElement('li');
        li.className = 'p-3 border-b border-gray-200 flex justify-between items-center';
        li.dataset.id = step.id;
        li.style.cursor = 'pointer'; // Add pointer cursor to indicate clickable
        
        li.innerHTML = `
          <div class="step-drag-handle mr-2 text-gray-400">⋮⋮</div>
          <div class="flex-grow-1 flex items-center">
            <span class="font-medium text-gray-700">${step.name}</span>
            ${modifiedBadge}
            ${virtualBadge}
          </div>
          <div class="flex space-x-2">
            <button class="select-step inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-brand-purple text-brand-purple bg-white hover:bg-brand-purple hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-colors duration-200">
              Edit Step
            </button>
            <button class="clone-step inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-green-500 text-green-600 bg-white hover:bg-green-500 hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200">
              Clone
            </button>
            <button class="delete-step inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-red-500 text-red-600 bg-white hover:bg-red-500 hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200">
              Delete
            </button>
          </div>
        `;
        
        stepList.appendChild(li);
        
        // Make the whole row clickable for showing dependencies
        li.addEventListener('click', (e) => {
          // Don't trigger if clicking on a button
          if (!e.target.closest('button')) {
            showStepDependencies(step);
          }
        });
        
        // Add event listeners for buttons
        li.querySelector('.select-step').addEventListener('click', () => handleEditStep(step.id));
        li.querySelector('.clone-step').addEventListener('click', () => handleCloneStep(step.id));
        li.querySelector('.delete-step').addEventListener('click', () => handleDeleteStep(step.id));
      });
    }
    
    // Show step dependencies
    function showStepDependencies(step) {
      const vizContainer = document.getElementById('dependencyVisualization');
      if (!vizContainer) return;
      
      vizContainer.innerHTML = '';
      
      if (!step) {
        vizContainer.innerHTML = '<p class="text-gray-500">Select a step to see dependencies</p>';
        return;
      }
      
      // Create step dependencies section
      const depTitle = document.createElement('h6');
      depTitle.className = 'text-sm font-medium text-gray-700';
      depTitle.textContent = `Dependencies for "${step.name}"`;
      vizContainer.appendChild(depTitle);
      
      // This step depends on:
      if (step.dependencies && step.dependencies.length > 0) {
        const depList = document.createElement('div');
        depList.className = 'mt-2';
        depList.innerHTML = '<span class="text-sm font-medium text-gray-700">This step uses:</span>';
        
        step.dependencies.forEach(depId => {
          const depStep = state.steps.find(s => s.id === depId);
          if (depStep) {
            const depNode = document.createElement('div');
            depNode.className = 'dependency-node text-sm';
            depNode.innerHTML = `
              <span class="dependency-arrow text-gray-500">→</span>
              <span class="font-medium">${depStep.name}</span> <span class="text-gray-500">(${depId})</span>
            `;
            depList.appendChild(depNode);
          }
        });
        
        vizContainer.appendChild(depList);
      } else {
        const noDeps = document.createElement('div');
        noDeps.className = 'mt-2 text-sm text-gray-500';
        noDeps.textContent = 'This step has no dependencies';
        vizContainer.appendChild(noDeps);
      }
      
      // Steps that depend on this step
      const dependentSteps = state.steps.filter(s => s.dependencies && s.dependencies.includes(step.id));
      if (dependentSteps.length > 0) {
        const depOn = document.createElement('div');
        depOn.className = 'mt-3';
        depOn.innerHTML = '<span class="text-sm font-medium text-gray-700">Used by:</span>';
        
        dependentSteps.forEach(depStep => {
          const depNode = document.createElement('div');
          depNode.className = 'dependency-node text-sm';
          depNode.innerHTML = `
            <span class="dependency-arrow text-gray-500">←</span>
            <span class="font-medium">${depStep.name}</span> <span class="text-gray-500">(${depStep.id})</span>
          `;
          depOn.appendChild(depNode);
        });
        
        vizContainer.appendChild(depOn);
      } else {
        const noDepOn = document.createElement('div');
        noDepOn.className = 'mt-2 text-sm text-gray-500';
        noDepOn.textContent = 'No steps depend on this step';
        vizContainer.appendChild(noDepOn);
      }
      
      // Add warning if there are circular dependencies
      if (window.StepService && window.StepService.hasCircularDependencies) {
        const hasCycles = window.StepService.hasCircularDependencies(state.steps);
        if (hasCycles) {
          const warning = document.createElement('div');
          warning.className = 'mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm';
          warning.textContent = 'Warning: Circular dependencies detected in workflow';
          vizContainer.appendChild(warning);
        }
      }
    }
    
    // Show step editor with smooth transitions
    function showStepEditor(step) {
      // Populate form fields
      const stepIdField = document.getElementById('stepId');
      const stepMenuNameField = document.getElementById('stepMenuName');
      const stepPromptField = document.getElementById('stepPrompt');
      const stepInstructionsField = document.getElementById('stepInstructions');
      const resetStepBtn = document.getElementById('resetStepBtn');
      const stepsGrid = document.getElementById('stepsGrid');
      const stepEditorContainer = document.getElementById('stepEditorContainer');
      
      if (!stepIdField || !stepMenuNameField || !stepPromptField || 
          !stepInstructionsField || !stepsGrid || !stepEditorContainer) {
        return;
      }
      
      stepIdField.value = step.id;
      stepMenuNameField.value = step.name;
      stepPromptField.value = step.content.stepPrompt;
      stepInstructionsField.value = step.content.llmInstructions;
      
      // Disable ID field if not virtual
      stepIdField.disabled = !step.isVirtual;
      
      // Show dependencies
      showStepDependencies(step);
      
      // Animate transition from grid to editor
      stepsGrid.style.transition = 'opacity 0.3s ease-out';
      stepsGrid.style.opacity = '0';
      
      setTimeout(() => {
        stepsGrid.classList.add('hidden');
        
        // Show editor
        stepEditorContainer.classList.remove('hidden');
        stepEditorContainer.style.opacity = '0';
        
        // Force reflow
        void stepEditorContainer.offsetWidth;
        
        // Fade in editor
        stepEditorContainer.style.transition = 'opacity 0.3s ease-in';
        stepEditorContainer.style.opacity = '1';
      }, 300);
      
      // Reset unsaved changes flag
      state.hasUnsavedChanges = false;
    }
    
    // Hide step editor with smooth transitions
    function hideStepEditor() {
      const stepEditorContainer = document.getElementById('stepEditorContainer');
      const stepsGrid = document.getElementById('stepsGrid');
      
      if (!stepEditorContainer || !stepsGrid) return;
      
      // Fade out editor
      stepEditorContainer.style.transition = 'opacity 0.3s ease-out';
      stepEditorContainer.style.opacity = '0';
      
      setTimeout(() => {
        // Hide editor
        stepEditorContainer.classList.add('hidden');
        
        // Show grid with fade
        stepsGrid.classList.remove('hidden');
        stepsGrid.style.opacity = '0';
        
        // Force reflow
        void stepsGrid.offsetWidth;
        
        // Fade in grid
        stepsGrid.style.transition = 'opacity 0.3s ease-in';
        stepsGrid.style.opacity = '1';
      }, 300);
      
      state.currentEditingStep = null;
      state.hasUnsavedChanges = false;
    }
    
    // Update variable picker
    function updateVariablePicker() {
      console.log("[UPDATE] Updating variable picker");
      
      const menu = document.getElementById('variablePickerMenu');
      console.log("[UPDATE] Menu element found:", !!menu, menu);
      
      if (!menu) {
        console.error("[UPDATE] Menu element not found!");
        return;
      }
      
      console.log("[UPDATE] Clearing menu content");
      menu.innerHTML = '';
      
      // Add message_content variable
      const variables = [
        { id: 'message_content', name: 'Message Content', category: 'Input' }
      ];
      
      // Add variables from all steps
      if (state.steps && state.steps.length) {
        console.log("[UPDATE] Adding variables from steps:", state.steps.length);
        
        state.steps.forEach(step => {
          if (step.id !== state.currentEditingStep) {
            variables.push({
              id: `${step.id}_output`,
              name: `${step.name || step.id} (Output)`,
              category: 'Step Output',
              dependency: step.id
            });
            
            variables.push({
              id: `${step.id}_summary`,
              name: `${step.name || step.id} (Summary)`,
              category: 'Step Summary',
              dependency: step.id
            });
          }
        });
      } else {
        console.log("[UPDATE] No steps found in state:", state.steps);
      }
      
      // Add history variables if available
      if (window.PersistenceManager && typeof window.PersistenceManager.getHistory === 'function') {
        try {
          const history = window.PersistenceManager.getHistory();
          console.log("[UPDATE] History retrieved:", history ? history.length : 0);
          
          if (history && history.length > 0) {
            const recentAnalysis = history[0].analysis;
            if (recentAnalysis) {
              console.log("[UPDATE] Recent analysis has keys:", Object.keys(recentAnalysis));
              
              Object.keys(recentAnalysis).forEach(stepId => {
                variables.push({
                  id: `history_${stepId}`,
                  name: `${stepId.replace(/_/g, ' ')} (Previous Analysis)`,
                  category: 'Analysis History',
                  historyData: true
                });
              });
            }
          }
        } catch (error) {
          console.error("[UPDATE] Error getting history:", error);
        }
      }
      
      console.log("[UPDATE] Total variables:", variables.length);
      
      // Group variables by category
      const categories = {};
      variables.forEach(variable => {
        if (!categories[variable.category]) {
          categories[variable.category] = [];
        }
        categories[variable.category].push(variable);
      });
      
      console.log("[UPDATE] Categories:", Object.keys(categories));
      
      try {
        // Add variables to menu
        Object.keys(categories).forEach((category, categoryIndex) => {
          console.log("[UPDATE] Adding category:", category);
          
          const header = document.createElement('h6');
          header.className = 'dropdown-header text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2';
          header.textContent = `${category} Variables`;
          menu.appendChild(header);
          
          categories[category].forEach(variable => {
            const item = document.createElement('a');
            item.className = 'flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150';
            item.href = '#';
            item.dataset.variable = `{${variable.id}}`;
            
            // Variable name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = variable.name;
            nameSpan.className = 'flex-grow';
            item.appendChild(nameSpan);
            
            // Add dependency badge if needed
            if (variable.dependency) {
              const dependencyBadge = document.createElement('span');
              dependencyBadge.className = 'ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full';
              dependencyBadge.textContent = 'Depends';
              item.appendChild(dependencyBadge);
            }
            
            // Add history badge if needed
            if (variable.historyData) {
              const historyBadge = document.createElement('span');
              historyBadge.className = 'ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full';
              historyBadge.textContent = 'History';
              item.appendChild(historyBadge);
            }
            
            // Add click event directly
            item.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();
              console.log("[UPDATE] Variable item clicked:", variable.id);
              insertVariableIntoPrompt(item.dataset.variable);
              menu.classList.add('hidden');
              return false;
            };
            
            menu.appendChild(item);
            console.log("[UPDATE] Added variable:", variable.id);
          });
          
          // Add divider between categories
          if (categoryIndex < Object.keys(categories).length - 1) {
            const divider = document.createElement('div');
            divider.className = 'border-t border-gray-200 my-1';
            menu.appendChild(divider);
          }
        });
        
        console.log("[UPDATE] Variable picker menu populated with items:", menu.children.length);
      } catch (error) {
        console.error("[UPDATE] Error populating variable picker:", error);
        // Fallback direct HTML insertion
        try {
          const fallbackHtml = `
            <h6 class="dropdown-header text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Input Variables</h6>
            <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150" 
               data-variable="{message_content}" onclick="insertVariableIntoPrompt('{message_content}'); return false;">
              Message Content
            </a>
          `;
          menu.innerHTML = fallbackHtml;
          console.log("[UPDATE] Fallback HTML inserted");
        } catch (fallbackError) {
          console.error("[UPDATE] Even fallback failed:", fallbackError);
        }
      }
    }
    
    // Toggle variable picker - Fixed to work with global jQuery implementation
    function toggleVariablePicker(e) {
      console.log("[VARIABLE] toggleVariablePicker called in settings.js");
      
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      const menu = document.getElementById('variablePickerMenu');
      const button = document.getElementById('variablePickerBtn');
      
      if (!menu || !button) {
        console.error("[VARIABLE] Menu or button not found");
        return;
      }
      
      // Toggle menu visibility
      if (menu.classList.contains('hidden')) {
        // Get variables from StepManager directly
        if (window.StepManager && typeof window.StepManager.getAvailableVariables === 'function') {
          console.log("[VARIABLE] Getting variables from StepManager");
          const variables = window.StepManager.getAvailableVariables();
          populateVariableMenu(menu, variables);
        } else {
          console.log("[VARIABLE] StepManager not available, using fallback variables");
          // Fallback variables if StepManager is not available
          const fallbackVariables = [
            { id: 'message_content', name: 'Message Content', category: 'Input' }
          ];
          populateVariableMenu(menu, fallbackVariables);
        }
        
        // Position the menu correctly
        positionVariableMenu(menu, button);
        menu.classList.remove('hidden');
      } else {
        menu.classList.add('hidden');
      }
    }
    
    // New helper function to populate the variable menu
    function populateVariableMenu(menu, variables) {
      // Clear existing content
      menu.innerHTML = '';
      
      // Group variables by category
      const categories = {};
      variables.forEach(variable => {
        if (!categories[variable.category]) {
          categories[variable.category] = [];
        }
        categories[variable.category].push(variable);
      });
      
      // Create menu items
      Object.keys(categories).forEach((category, categoryIndex) => {
        // Add category header
        const header = document.createElement('h6');
        header.className = 'dropdown-header text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2';
        header.textContent = `${category} Variables`;
        menu.appendChild(header);
        
        // Add variables in this category
        categories[category].forEach(variable => {
          const item = document.createElement('a');
          item.className = 'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150';
          item.href = '#';
          item.setAttribute('data-variable', `{${variable.id}}`);
          item.textContent = variable.name;
          
          // Add click handler
          item.addEventListener('click', function(e) {
            e.preventDefault();
            const variableText = this.getAttribute('data-variable');
            console.log("[UPDATE] Selected:", variableText);
            
            // Handle insertion
            insertVariableIntoPrompt(variableText);
            
            // Hide menu
            menu.classList.add('hidden');
          });
          
          menu.appendChild(item);
        });
        
        // Add separator if this isn't the last category
        if (categoryIndex < Object.keys(categories).length - 1) {
          const separator = document.createElement('div');
          separator.className = 'border-t border-gray-200 my-1';
          menu.appendChild(separator);
        }
      });
    }
    
    // New helper function to position the variable menu
    function positionVariableMenu(menu, button) {
      // Position the menu below the button
      const buttonRect = button.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      
      menu.style.top = (buttonRect.bottom + scrollTop) + 'px';
      menu.style.left = buttonRect.left + 'px';
      menu.style.width = '300px'; // Set appropriate width
      menu.style.maxHeight = '300px'; // Limit height for scrolling
      menu.style.overflowY = 'auto';
    }
    
    // Self-contained insertVariableIntoPrompt function
    function insertVariableIntoPrompt(variable) {
      console.log("[VARIABLE] Inserting variable:", variable);
      
      // Get the textarea element
      const textarea = document.getElementById('stepPrompt');
      if (!textarea) {
        console.error("[VARIABLE] Textarea not found");
        return;
      }
      
      // Get current cursor position and text
      const cursorPos = textarea.selectionStart;
      const text = textarea.value;
      
      // Insert the variable at cursor position
      const newText = text.slice(0, cursorPos) + variable + text.slice(cursorPos);
      textarea.value = newText;
      textarea.focus();
      
      // Set cursor position after the inserted variable
      const newCursorPos = cursorPos + variable.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      
      // Mark as having unsaved changes
      if (window.StepManager && typeof window.StepManager.markUnsavedChanges === 'function') {
        window.StepManager.markUnsavedChanges();
      }
    }
    
    // Handle step reorder
    function handleStepReorder() {
      if (!window.StepService) return;
      
      // Update positions based on current DOM order
      const items = document.querySelectorAll('#stepList li');
      items.forEach((item, index) => {
        const stepId = item.dataset.id;
        const step = state.steps.find(s => s.id === stepId);
        if (step) {
          step.position = index;
        }
      });
      
      // Save updated steps
      window.StepService.saveSteps(state.steps);
      
      // Update dependency visualization
      if (state.currentEditingStep) {
        const step = state.steps.find(s => s.id === state.currentEditingStep);
        if (step) {
          showStepDependencies(step);
        }
      }
    }
    
    // Handle add step
    function handleAddStep() {
      if (!window.StepService || !window.NotificationService) return;
      
      // Check for unsaved changes
      if (state.hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Discard changes?')) {
          return;
        }
      }
      
      window.StepService.createStep().then(step => {
        // Update state
        state.steps = window.StepService.getCurrentSteps();
        
        // Update UI
        renderStepList();
        
        // Edit the new step
        handleEditStep(step.id);
        
        window.NotificationService.success('New step created');
      });
    }
    
    // Handle edit step
    function handleEditStep(stepId) {
      // Check for unsaved changes
      if (state.hasUnsavedChanges && state.currentEditingStep !== stepId) {
        if (!confirm('You have unsaved changes. Discard changes?')) {
          return;
        }
      }
      
      const step = state.steps.find(s => s.id === stepId);
      if (!step) return;
      
      // Set current editing step
      state.currentEditingStep = JSON.parse(JSON.stringify(step)); // Clone step
      state.hasUnsavedChanges = false;
      
      // Show step editor
      showStepEditor(step);
      
      // Update variable picker
      updateVariablePicker();
    }
    
    // Handle clone step
    function handleCloneStep(stepId) {
      if (!window.StepService || !window.NotificationService) return;
      
      // Check for unsaved changes
      if (state.hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Discard changes?')) {
          return;
        }
      }
      
      window.StepService.cloneStep(stepId).then(clonedStep => {
        // Update state
        state.steps = window.StepService.getCurrentSteps();
        
        // Update UI
        renderStepList();
        
        // Edit the cloned step
        handleEditStep(clonedStep.id);
        
        window.NotificationService.success(`Step "${clonedStep.name}" created`);
      });
    }
    
    // Handle delete step
    function handleDeleteStep(stepId) {
      if (!window.StepService || !window.NotificationService) return;
      
      if (!confirm('Are you sure you want to delete this step?')) {
        return;
      }
      
      window.StepService.deleteStep(stepId).then(() => {
        // Update state
        state.steps = window.StepService.getCurrentSteps();
        
        // Update UI
        renderStepList();
        
        // Hide editor if we deleted the current step
        if (state.currentEditingStep === stepId) {
          hideStepEditor();
        }
        
        // Update variable picker
        updateVariablePicker();
        
        window.NotificationService.success('Step deleted successfully');
      });
    }
    
    // Handle back to steps
    function handleBackToSteps() {
      // Check for unsaved changes
      if (state.hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Discard changes?')) {
          return;
        }
      }
      
      hideStepEditor();
    }
    
    // Handle save step
    function handleSaveStep() {
      if (!window.StepService || !window.NotificationService) return;
      
      const stepId = state.currentEditingStep.id;
      if (!stepId) return;
      
      const stepMenuNameField = document.getElementById('stepMenuName');
      const stepPromptField = document.getElementById('stepPrompt');
      const stepInstructionsField = document.getElementById('stepInstructions');
      const stepIdField = document.getElementById('stepId');
      
      if (!stepMenuNameField || !stepPromptField || !stepInstructionsField || !stepIdField) {
        return;
      }
      
      const menuName = stepMenuNameField.value.trim();
      const stepPrompt = stepPromptField.value;
      const llmInstructions = stepInstructionsField.value;
      const newStepId = stepIdField.value.trim().toLowerCase().replace(/\s+/g, '_');
      
      window.StepService.saveStepChanges(
        stepId,
        menuName,
        stepPrompt,
        llmInstructions,
        stepId !== newStepId ? newStepId : null
      ).then(result => {
        if (result.success) {
          // Update state
          state.steps = window.StepService.getCurrentSteps();
          state.hasUnsavedChanges = false;
          
          // Update UI
          renderStepList();
          
          // Update variable picker
          updateVariablePicker();
          
          // If ID changed, update current editing step
          if (stepId !== result.step.id) {
            state.currentEditingStep = result.step;
            
            // Update form fields
            stepIdField.value = result.step.id;
          }
          
          // Update dependencies visualization
          showStepDependencies(result.step);
          
          window.NotificationService.success(result.message);
        } else {
          window.NotificationService.error(result.message);
        }
      });
    }
    
    // Handle cancel step edit
    function handleCancelStepEdit() {
      // Check for unsaved changes
      if (state.hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Discard changes?')) {
          return;
        }
      }
      
      hideStepEditor();
    }
    
    // Handle reset step
    function handleResetStep() {
      if (!window.StepService || !window.NotificationService) return;
      
      const stepId = state.currentEditingStep.id;
      if (!stepId) return;
      
      if (!confirm('Are you sure you want to reset this step to its original file content?')) {
        return;
      }
      
      window.StepService.resetStepToOriginal(stepId).then(step => {
        if (step) {
          // Update state
          state.steps = window.StepService.getCurrentSteps();
          state.hasUnsavedChanges = false;
          
          // Update UI
          showStepEditor(step);
          renderStepList();
          
          window.NotificationService.success('Step reset to original file content');
        } else {
          window.NotificationService.error('Failed to reset step');
        }
      });
    }
    
    // Handle export step
    function handleExportStep() {
      if (!window.NotificationService) return;
      
      const stepId = state.currentEditingStep.id;
      if (!stepId) return;
      
      const step = state.steps.find(s => s.id === stepId);
      if (!step) return;
      
      // Format step content
      const content = `[MENU_Name]\n${step.name}\n\n[STEP_PROMPT]\n${step.content.stepPrompt}\n\n[LLM_INSTRUCTIONS]\n${step.content.llmInstructions}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(content)
        .then(() => {
          window.NotificationService.success('Step content copied to clipboard');
        })
        .catch(err => {
          window.NotificationService.error('Failed to copy content: ' + err.message);
        });
    }
    
    // Handle import steps
    function handleImportSteps() {
      if (!window.ConfigService || !window.StepService || !window.NotificationService) return;
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const config = JSON.parse(e.target.result);
            
            // Validate
            if (!Array.isArray(config)) {
              throw new Error('Invalid steps configuration: not an array');
            }
            
            // Import steps
            window.ConfigService.saveSteps(config);
            
            // Reload steps
            window.StepService.getSteps(true).then(steps => {
              state.steps = steps;
              renderStepList();
              window.NotificationService.success('Steps imported successfully');
            });
          } catch (error) {
            window.NotificationService.error('Failed to import steps: ' + error.message);
          }
        };
        
        reader.readAsText(file);
      });
      
      input.click();
    }
    
    // Handle export steps
    function handleExportSteps() {
      if (!window.NotificationService) return;
      
      const config = state.steps.map(step => ({
        id: step.id,
        file: step.fileSource || `steps/${step.id}.txt`,
        position: step.position
      }));
      
      // Format as JSON
      const jsonStr = JSON.stringify(config, null, 2);
      
      // Create download link
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'steps-config.json';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      window.NotificationService.success('Steps configuration exported');
    }
    
    // Handle restore default steps
    function handleRestoreDefaultSteps() {
      if (!window.StepService || !window.NotificationService) return;
      
      if (!confirm('Are you sure you want to restore all default steps? This will overwrite any custom steps.')) {
        return;
      }
      
      window.StepService.restoreDefaultSteps().then(steps => {
        state.steps = steps;
        
        // Update UI
        renderStepList();
        
        // Hide editor
        hideStepEditor();
        
        // Update variable picker
        updateVariablePicker();
        
        window.NotificationService.success('Default steps restored');
      });
    }
    
    // Add global functions for cross-module access
    function addGlobalFunctions() {
      // Add global accessor for manual testing
      window.showVariablePicker = function() {
        console.log("[DEBUG] Manually showing variable picker");
        toggleVariablePicker({
          preventDefault: function() {},
          stopPropagation: function() {}
        });
      };
    }
    
    // Register module
    if (window.ModuleManager) {
      window.ModuleManager.registerModule({
        id: 'settings',
        name: 'Settings',
        template: 'modules/settings/settings.html',
        css: 'modules/settings/settings.css',
        init,
        mount,
        unmount
      });
    }
    
    // Return public API
    return {
      init,
      mount,
      unmount
    };
  })();