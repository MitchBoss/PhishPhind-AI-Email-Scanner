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
    apiSettings: { width: 800, height: 'auto' },
    stepManager: { width: 800, height: 'auto' },
    advancedSettings: { width: 800, height: 'auto' }
  };
  
  // Track sortable list
  let sortable = null;
  
  // Initialize module
  async function init() {
    // Subscribe to events
    if (window.EventBus) {
      window.EventBus.subscribe('config:api:updated', handleApiConfigUpdate);
      window.EventBus.subscribe('config:models:updated', handleModelsUpdate);
      window.EventBus.subscribe('config:steps:updated', handleStepsUpdate);
      window.EventBus.subscribe('modal:shown', handleModalShown);
    }
    
    // Preload data
    if (window.ConfigService) {
      state.models = window.ConfigService.getModels();
    }
    
    if (window.StepService) {
      state.steps = await window.StepService.getSteps();
    }
    
    console.log('Settings module initialized');
    return true;
  }
  
  // Mount the module
  async function mount(container) {
    // Load HTML template
    const response = await fetch('modules/settings/settings.html');
    const html = await response.text();
    container.innerHTML = html;
    
    // Initialize tabs
    initTabs();
    
    // Populate forms
    populateApiSettings();
    populateModels();
    populateStepManager();
    populateAdvancedSettings();
    
    // Initialize sortable
    initSortable();
    
    // Set up event handlers
    setupEventHandlers();
    
    console.log('Settings module mounted');
  }
  
  // Unmount the module
  function unmount() {
    // Check for unsaved changes
    if (state.hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard changes?')) {
        return false;
      }
      state.hasUnsavedChanges = false;
    }
    
    // Clean up sortable
    if (sortable) {
      sortable.destroy();
      sortable = null;
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
    
    // Variable Picker
    const variablePickerBtn = document.getElementById('variablePickerBtn');
    if (variablePickerBtn) {
      variablePickerBtn.addEventListener('click', toggleVariablePicker);
    }
    
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('variablePickerMenu');
      const btn = document.getElementById('variablePickerBtn');
      if (menu && btn && !menu.contains(e.target) && e.target !== btn) {
        menu.classList.add('hidden');
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
      option.textContent = model.displayName;
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
      
      li.innerHTML = `
        <div class="step-drag-handle mr-2 text-gray-400"><span class="icon icon-drag-handle"></span></div>
        <div class="flex-grow-1 flex items-center">
          <span class="font-medium text-gray-700">${step.menuName}</span>
          ${modifiedBadge}
          ${virtualBadge}
        </div>
        <div class="flex space-x-2">
          <button class="select-step inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-brand-purple text-brand-purple bg-white hover:bg-brand-purple hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-colors duration-200">
            <span class="icon icon-settings icon-xs mr-1"></span>
            Select
          </button>
          <button class="clone-step inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-green-500 text-green-600 bg-white hover:bg-green-500 hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200">
            <span class="icon icon-copy icon-xs mr-1"></span>
            Clone
          </button>
          <button class="delete-step inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-red-500 text-red-600 bg-white hover:bg-red-500 hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200">
            <span class="icon icon-trash icon-xs mr-1"></span>
            Delete
          </button>
        </div>
      `;
      
      stepList.appendChild(li);
      
      // Add event listeners
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
    depTitle.textContent = `Dependencies for "${step.menuName}"`;
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
            <span class="icon icon-right-arrow icon-xs text-gray-500 mr-1"></span>
            <span class="font-medium">${depStep.menuName}</span> <span class="text-gray-500">(${depId})</span>
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
          <span class="icon icon-right-arrow icon-xs text-gray-500 mr-1" style="transform: rotate(180deg);"></span>
          <span class="font-medium">${depStep.menuName}</span> <span class="text-gray-500">(${depStep.id})</span>
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
    stepMenuNameField.value = step.menuName;
    stepPromptField.value = step.content.stepPrompt;
    stepInstructionsField.value = step.content.llmInstructions;
    
    // Disable ID field if not virtual
    stepIdField.disabled = !step.isVirtual;
    
    // Show/hide reset button
    if (step.isVirtual || !step.fileSource) {
      resetStepBtn.style.display = 'none';
    } else {
      resetStepBtn.style.display = 'inline-flex';
    }
    
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
    const menu = document.getElementById('variablePickerMenu');
    if (!menu) return;
    
    menu.innerHTML = '';
    
    // Add message_content variable
    const variables = [
      { id: 'message_content', name: 'Message Content', category: 'Input' }
    ];
    
    // Add variables from all steps
    state.steps.forEach(step => {
      if (step.id !== state.currentEditingStep) {
        variables.push({
          id: `${step.id}_output`,
          name: `${step.menuName} (Output)`,
          category: 'Step Output'
        });
        
        variables.push({
          id: `${step.id}_summary`,
          name: `${step.menuName} (Summary)`,
          category: 'Step Summary'
        });
      }
    });
    
    // Group variables by category
    const categories = {};
    variables.forEach(variable => {
      if (!categories[variable.category]) {
        categories[variable.category] = [];
      }
      categories[variable.category].push(variable);
    });
    
    // Add variables to menu
    Object.keys(categories).forEach(category => {
      const header = document.createElement('h6');
      header.className = 'dropdown-header text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2';
      header.textContent = `${category} Variables`;
      menu.appendChild(header);
      
      categories[category].forEach(variable => {
        const item = document.createElement('a');
        item.className = 'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150';
        item.href = '#';
        item.dataset.variable = `{${variable.id}}`;
        item.textContent = variable.name;
        
        item.addEventListener('click', (e) => {
          e.preventDefault();
          insertVariableIntoPrompt(item.dataset.variable);
          menu.classList.add('hidden');
        });
        
        menu.appendChild(item);
      });
      
      if (Object.keys(categories).length > 1) {
        const divider = document.createElement('div');
        divider.className = 'border-t border-gray-200 my-1';
        menu.appendChild(divider);
      }
    });
  }
  
  // Toggle variable picker
  function toggleVariablePicker(e) {
    if (e) e.stopPropagation();
    
    const menu = document.getElementById('variablePickerMenu');
    if (!menu) return;
    
    menu.classList.toggle('hidden');
  }
  
  // Insert variable into prompt
  function insertVariableIntoPrompt(variable) {
    const textarea = document.getElementById('stepPrompt');
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    const newText = text.slice(0, cursorPos) + variable + text.slice(cursorPos);
    textarea.value = newText;
    textarea.focus();
    
    // Mark as changed
    state.hasUnsavedChanges = true;
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
    state.currentEditingStep = stepId;
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
      
      window.NotificationService.success(`Step "${clonedStep.menuName}" created`);
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
    
    const stepId = state.currentEditingStep;
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
          state.currentEditingStep = result.step.id;
          
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
    
    const stepId = state.currentEditingStep;
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
    
    const stepId = state.currentEditingStep;
    if (!stepId) return;
    
    const step = state.steps.find(s => s.id === stepId);
    if (!step) return;
    
    // Format step content
    const content = `[MENU_Name]\n${step.menuName}\n\n[STEP_PROMPT]\n${step.content.stepPrompt}\n\n[LLM_INSTRUCTIONS]\n${step.content.llmInstructions}`;
    
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