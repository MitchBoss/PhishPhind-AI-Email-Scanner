/**
 * modalModules.js - Handles modal-style modules with dynamic content loading and resizing
 */

window.ModalModules = (function() {
  const modals = new Map();
  let activeTabSizes = {};
  let lastClickTime = 0;
  const doubleClickThreshold = 300; // milliseconds
  
  // Initialize modal system
  function init() {
    // Create container for modals if it doesn't exist
    let container = document.getElementById('modalContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modalContainer';
      document.body.appendChild(container);
    }
    
    // Register event handlers for modal trigger buttons
    document.querySelectorAll('[data-module]').forEach(element => {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        const moduleId = element.getAttribute('data-module');
        showModal(moduleId);
      });
    });
    
    // Set default tab sizes for settings
    activeTabSizes = {
      apiSettings: { width: 600, height: 'auto' },
      stepManager: { width: 800, height: 'auto' },
      advancedSettings: { width: 700, height: 'auto' }
    };
    
    console.log('Modal Modules system initialized');
    return Promise.resolve();
  }
  
  /**
   * Show a modal
   * @param {string} moduleId - ID of the module to show as modal
   * @returns {Promise} - Resolves when modal is shown
   */
  async function showModal(moduleId) {
    try {
      // Fetch the module HTML content
      const htmlContent = await fetchModuleHtml(moduleId);
      
      // Get or create modal element
      let modalElement = document.getElementById(`modal-${moduleId}`);
      if (modalElement) {
        // If modal already exists, remove it (to ensure fresh content)
        modalElement.parentNode.removeChild(modalElement);
      }
      
      // Create modal element
      modalElement = document.createElement('div');
      modalElement.id = `modal-${moduleId}`;
      modalElement.className = 'modal-overlay';
      
      // Create content wrapper for animation
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'modal-content';
      contentWrapper.innerHTML = htmlContent;
      
      // For settings modal, make it wider initially
      if (moduleId === 'settings') {
        contentWrapper.style.maxWidth = '600px';
        contentWrapper.style.transition = 'all 0.3s ease-in-out';
      }
      
      // Add to modal
      modalElement.appendChild(contentWrapper);
      
      // Add to DOM
      document.body.appendChild(modalElement);
      
      // Start animation
      setTimeout(() => {
        contentWrapper.classList.add('modal-enter');
      }, 10);
      
      // Add close handlers
      modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
          const now = new Date().getTime();
          
          // For settings modal, require double-click to close
          if (moduleId === 'settings') {
            if (now - lastClickTime < doubleClickThreshold) {
              // This is a double click, close the modal
              hideModal(moduleId);
              lastClickTime = 0; // Reset timer
            } else {
              // This is a first click, update timestamp and show a subtle hint
              lastClickTime = now;
              
              // Show hint tooltip that disappears after a short time
              const hint = document.createElement('div');
              hint.className = 'tooltip-hint';
              hint.style.position = 'absolute';
              hint.style.left = e.clientX + 'px';
              hint.style.top = e.clientY + 'px';
              hint.style.background = 'rgba(0,0,0,0.7)';
              hint.style.color = '#fff';
              hint.style.padding = '5px 10px';
              hint.style.borderRadius = '4px';
              hint.style.fontSize = '12px';
              hint.style.zIndex = '9999';
              hint.textContent = 'Double-click to close';
              document.body.appendChild(hint);
              
              // Remove hint after a delay
              setTimeout(() => {
                if (hint.parentNode) {
                  hint.parentNode.removeChild(hint);
                }
              }, 1500);
            }
          } else {
            // For other modals, single click is enough to close
            hideModal(moduleId);
          }
        }
      });
      
      const closeButtons = modalElement.querySelectorAll('.close-modal-btn, .close-modal');
      closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          hideModal(moduleId);
        });
      });
      
      // Add ESC key handler
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          hideModal(moduleId);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
      
      // Special handlers for certain modules
      if (moduleId === 'settings') {
        setupSettingsModalHandlers(modalElement);
      }
      
      return modalElement;
    } catch (error) {
      console.error(`Failed to show ${moduleId} modal:`, error);
      if (window.NotificationService) {
        window.NotificationService.error(`Failed to load ${moduleId}: ${error.message}`);
      }
    }
  }
  
  /**
   * Hide a modal
   * @param {string} moduleId - ID of the module modal to hide
   */
  function hideModal(moduleId) {
    const modalElement = document.getElementById(`modal-${moduleId}`);
    if (!modalElement) return;
    
    const contentWrapper = modalElement.querySelector('.modal-content');
    if (contentWrapper) {
      contentWrapper.classList.remove('modal-enter');
      contentWrapper.classList.add('modal-leave');
    }
    
    // Remove after animation
    setTimeout(() => {
      if (modalElement.parentNode) {
        modalElement.parentNode.removeChild(modalElement);
      }
    }, 300);
  }
  
  /**
   * Fetch module HTML content
   * @param {string} moduleId - Module ID
   * @returns {Promise<string>} - HTML content
   */
  async function fetchModuleHtml(moduleId) {
    try {
      const response = await fetch(`modules/${moduleId}/${moduleId}.html`);
      if (!response.ok) {
        throw new Error(`Failed to fetch module HTML: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Error fetching ${moduleId} HTML:`, error);
      
      // Fallback content for common modules
      if (moduleId === 'about') {
        return getAboutFallbackHtml();
      } else if (moduleId === 'settings') {
        return getSettingsFallbackHtml();
      }
      
      throw error;
    }
  }
  
  /**
   * Setup special handlers for settings modal
   * @param {HTMLElement} modalElement - Modal element
   */
  function setupSettingsModalHandlers(modalElement) {
    // First set up tab switching
    const tabLinks = modalElement.querySelectorAll('.tab-link');
    const tabContents = modalElement.querySelectorAll('.tab-content');
    const modalContent = modalElement.querySelector('.modal-content');
    
    // Setup tab navigation
    tabLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Get target tab
        const tabId = link.getAttribute('data-tab');
        
        // Hide all tab contents
        tabContents.forEach(content => {
          content.classList.add('hidden');
        });
        
        // Show target tab content
        const targetTab = document.getElementById(tabId);
        if (targetTab) {
          targetTab.classList.remove('hidden');
          
          // Resize modal based on tab content
          resizeModalForTab(modalContent, tabId);
        }
        
        // Update active tab styling
        tabLinks.forEach(tab => {
          tab.classList.remove('border-brand-purple', 'text-brand-purple');
          tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        });
        
        link.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        link.classList.add('border-brand-purple', 'text-brand-purple');
      });
    });
    
    // Set up API settings functionality
    const saveSettingsBtn = modalElement.querySelector('#saveSettingsBtn');
    const apiKeyInput = modalElement.querySelector('#apiKeyInput');
    const modelSelect = modalElement.querySelector('#modelSelect');
    
    if (saveSettingsBtn && apiKeyInput && modelSelect) {
      saveSettingsBtn.addEventListener('click', function() {
        const apiKey = apiKeyInput.value;
        const model = modelSelect.value;
        
        if (window.ConfigService) {
          window.ConfigService.saveApiConfig(apiKey, model);
          if (window.NotificationService) {
            window.NotificationService.success('Settings saved');
          }
          if (window.EventBus) {
            window.EventBus.publish('app:api:check');
          }
          // Hide the modal after saving
          hideModal('settings');
        }
      });
      
      // Populate with current settings
      if (window.ConfigService) {
        const config = window.ConfigService.getApiConfig();
        if (config.apiKey) {
          apiKeyInput.value = config.apiKey;
        }
        if (config.model) {
          modelSelect.value = config.model;
        }
      }
    }
    
    // Set up save API settings button
    const saveApiSettingsBtn = modalElement.querySelector('#saveApiSettingsBtn');
    if (saveApiSettingsBtn && apiKeyInput && modelSelect) {
      saveApiSettingsBtn.addEventListener('click', function() {
        const apiKey = apiKeyInput.value;
        const model = modelSelect.value;
        
        if (window.ConfigService) {
          window.ConfigService.saveApiConfig(apiKey, model);
          if (window.NotificationService) {
            window.NotificationService.success('API settings saved');
          }
        }
      });
    }
    
    // Set up reset buttons
    const resetConfigBtn = modalElement.querySelector('#resetConfigBtn');
    const fullResetBtn = modalElement.querySelector('#fullResetBtn');
    
    if (resetConfigBtn) {
      resetConfigBtn.addEventListener('click', function() {
        if (confirm('Reset configuration to defaults? API key will be preserved.')) {
          if (window.ConfigService) {
            window.ConfigService.resetToDefaults(true);
            if (window.NotificationService) {
              window.NotificationService.success('Configuration reset to defaults');
            }
            
            // Refresh modal content
            hideModal('settings');
            setTimeout(() => {
              showModal('settings');
            }, 300);
          }
        }
      });
    }
    
    if (fullResetBtn) {
      fullResetBtn.addEventListener('click', function() {
        if (confirm('Full reset will clear all settings including API key. Continue?')) {
          if (window.ConfigService) {
            window.ConfigService.resetToDefaults(false);
            if (window.NotificationService) {
              window.NotificationService.success('All settings reset to defaults');
            }
            
            // Refresh modal content
            hideModal('settings');
            setTimeout(() => {
              showModal('settings');
            }, 300);
          }
        }
      });
    }
    
    // Load steps for Step Manager
    if (modalElement.querySelector('#stepManager')) {
      setupStepManager(modalElement);
    }
    
    // Setup Advanced tab
    if (modalElement.querySelector('#advancedSettings')) {
      setupAdvancedSettings(modalElement);
    }
  }
  
  /**
   * Setup Step Manager tab
   * @param {HTMLElement} modalElement - Modal element
   */
  function setupStepManager(modalElement) {
    const stepList = modalElement.querySelector('#stepList');
    if (!stepList) return;
    
    // Initialize the step list
    if (window.StepService) {
      window.StepService.getSteps().then(steps => {
        renderStepList(steps, stepList, modalElement);
      });
    }
    
    // Set up add step button
    const addStepBtn = modalElement.querySelector('#addStepBtn');
    if (addStepBtn) {
      addStepBtn.addEventListener('click', function() {
        if (window.StepService) {
          window.StepService.createStep().then(newStep => {
            // Update step list
            window.StepService.getSteps().then(steps => {
              renderStepList(steps, stepList, modalElement);
              // Edit the new step
              showStepEditor(newStep, modalElement);
            });
          });
        }
      });
    }
    
    // Set up restore default steps button
    const restoreDefaultStepsBtn = modalElement.querySelector('#restoreDefaultStepsBtn');
    if (restoreDefaultStepsBtn) {
      restoreDefaultStepsBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to restore all default steps? This will overwrite any custom steps.')) {
          if (window.StepService) {
            window.StepService.restoreDefaultSteps().then(steps => {
              renderStepList(steps, stepList, modalElement);
              hideStepEditor(modalElement);
            });
          }
        }
      });
    }
    
    // Set up export steps button
    const exportStepsBtn = modalElement.querySelector('#exportStepsBtn');
    if (exportStepsBtn) {
      exportStepsBtn.addEventListener('click', function() {
        if (window.StepService) {
          const steps = window.StepService.getCurrentSteps();
          const config = steps.map(step => ({
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
          
          if (window.NotificationService) {
            window.NotificationService.success('Steps configuration exported');
          }
        }
      });
    }
    
    // Set up back to steps button
    const backToStepsBtn = modalElement.querySelector('#backToStepsBtn');
    if (backToStepsBtn) {
      backToStepsBtn.addEventListener('click', function() {
        hideStepEditor(modalElement);
      });
    }
    
    // Set up step editor save button
    const saveStepBtn = modalElement.querySelector('#saveStepBtn');
    if (saveStepBtn) {
      saveStepBtn.addEventListener('click', function() {
        saveStepChanges(modalElement, stepList);
      });
    }
    
    // Set up step editor cancel button
    const cancelStepEditBtn = modalElement.querySelector('#cancelStepEditBtn');
    if (cancelStepEditBtn) {
      cancelStepEditBtn.addEventListener('click', function() {
        hideStepEditor(modalElement);
      });
    }
  }
  
  /**
   * Setup Advanced Settings tab
   * @param {HTMLElement} modalElement - Modal element
   */
  function setupAdvancedSettings(modalElement) {
    const stepsEditor = modalElement.querySelector('#stepsEditor');
    const modelsEditor = modalElement.querySelector('#modelsEditor');
    const saveAdvancedBtn = modalElement.querySelector('#saveAdvancedBtn');
    
    if (stepsEditor && modelsEditor && window.ConfigService) {
      // Populate editors
      stepsEditor.value = JSON.stringify(window.ConfigService.getSteps(), null, 2);
      modelsEditor.value = JSON.stringify(window.ConfigService.getModels(), null, 2);
      
      // Set up save button
      if (saveAdvancedBtn) {
        saveAdvancedBtn.addEventListener('click', function() {
          try {
            const stepsJson = JSON.parse(stepsEditor.value);
            const modelsJson = JSON.parse(modelsEditor.value);
            
            window.ConfigService.saveSteps(stepsJson);
            window.ConfigService.saveModels(modelsJson);
            
            if (window.NotificationService) {
              window.NotificationService.success('Advanced settings saved');
            }
          } catch (error) {
            if (window.NotificationService) {
              window.NotificationService.error('Invalid JSON: ' + error.message);
            }
          }
        });
      }
    }
  }
  
  /**
   * Render step list
   * @param {Array} steps - Steps to render
   * @param {HTMLElement} stepList - Step list element
   * @param {HTMLElement} modalElement - Modal element
   */
  function renderStepList(steps, stepList, modalElement) {
    stepList.innerHTML = '';
    
    if (steps.length === 0) {
      stepList.innerHTML = '<li class="p-4 text-center text-gray-500">No steps configured</li>';
      return;
    }
    
    steps.forEach(step => {
      const modifiedBadge = step.isModified ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Modified</span>' : '';
      const virtualBadge = step.isVirtual ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Virtual</span>' : '';
      
      const li = document.createElement('li');
      li.className = 'p-3 border-b border-gray-200 flex justify-between items-center';
      li.dataset.id = step.id;
      
      li.innerHTML = `
        <div class="step-drag-handle mr-2 text-gray-400">⋮⋮</div>
        <div class="flex-grow-1 flex items-center">
          <span class="font-medium text-gray-700">${step.menuName}</span>
          ${modifiedBadge}
          ${virtualBadge}
        </div>
        <div class="flex space-x-2">
          <button class="select-step inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-brand-purple text-brand-purple bg-white hover:bg-brand-purple hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-colors duration-200">
            Select
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
      
      // Add event handlers
      li.querySelector('.select-step').addEventListener('click', function() {
        showStepEditor(step, modalElement);
      });
      
      li.querySelector('.clone-step').addEventListener('click', function() {
        if (window.StepService) {
          window.StepService.cloneStep(step.id).then(clonedStep => {
            // Update step list
            window.StepService.getSteps().then(steps => {
              renderStepList(steps, stepList, modalElement);
              // Edit the cloned step
              showStepEditor(clonedStep, modalElement);
            });
          });
        }
      });
      
      li.querySelector('.delete-step').addEventListener('click', function() {
        if (confirm(`Are you sure you want to delete the "${step.menuName}" step?`)) {
          if (window.StepService) {
            window.StepService.deleteStep(step.id).then(success => {
              if (success) {
                // Update step list
                window.StepService.getSteps().then(steps => {
                  renderStepList(steps, stepList, modalElement);
                });
                
                if (window.NotificationService) {
                  window.NotificationService.success('Step deleted');
                }
              }
            });
          }
        }
      });
    });
    
    // Initialize sortable with updated drag settings:
    // Allow dragging anywhere in the list item except on the action buttons.
    if (window.Sortable) {
      new Sortable(stepList, {
        filter: '.select-step, .clone-step, .delete-step',
        preventOnFilter: false,
        animation: 150,
        onStart: function(evt) {
           evt.item.classList.add('drag-active');
        },
        onEnd: function(evt) {
          evt.item.classList.remove('drag-active');
          // Update positions based on current DOM order
          const items = stepList.querySelectorAll('li');
          const steps = window.StepService.getCurrentSteps();
          
          items.forEach((item, index) => {
            const stepId = item.dataset.id;
            const step = steps.find(s => s.id === stepId);
            if (step) {
              step.position = index;
            }
          });
          
          // Save updated steps
          window.StepService.saveSteps(steps);
        }
      });
    }
  }
  
  /**
   * Show step editor
   * @param {Object} step - Step to edit
   * @param {HTMLElement} modalElement - Modal element
   */
  function showStepEditor(step, modalElement) {
    const stepsGrid = modalElement.querySelector('#stepsGrid');
    const stepEditorContainer = modalElement.querySelector('#stepEditorContainer');
    
    if (!stepsGrid || !stepEditorContainer) return;
    
    // Populate form
    modalElement.querySelector('#stepId').value = step.id;
    modalElement.querySelector('#stepMenuName').value = step.menuName;
    modalElement.querySelector('#stepPrompt').value = step.content.stepPrompt;
    modalElement.querySelector('#stepInstructions').value = step.content.llmInstructions;
    
    // Disable ID field if not virtual
    modalElement.querySelector('#stepId').disabled = !step.isVirtual;
    
    // Show/hide reset button
    if (step.isVirtual || !step.fileSource) {
      modalElement.querySelector('#resetStepBtn').style.display = 'none';
    } else {
      modalElement.querySelector('#resetStepBtn').style.display = 'inline-flex';
    }
    
    // Show dependencies
    showStepDependencies(step, modalElement);
    
    // Show editor
    stepsGrid.classList.add('hidden');
    stepEditorContainer.classList.remove('hidden');
    
    // Resize modal for editor
    const modalContent = modalElement.querySelector('.modal-content');
    modalContent.style.maxWidth = '800px';
    
    // Store the current step ID
    modalElement.dataset.currentStep = step.id;
  }
  
  /**
   * Hide step editor
   * @param {HTMLElement} modalElement - Modal element
   */
  function hideStepEditor(modalElement) {
    const stepsGrid = modalElement.querySelector('#stepsGrid');
    const stepEditorContainer = modalElement.querySelector('#stepEditorContainer');
    
    if (!stepsGrid || !stepEditorContainer) return;
    
    // Hide editor
    stepEditorContainer.classList.add('hidden');
    stepsGrid.classList.remove('hidden');
    
    // Reset current step
    delete modalElement.dataset.currentStep;
    
    // Resize modal
    resizeModalForTab(modalElement.querySelector('.modal-content'), 'stepManager');
  }
  
  /**
   * Save step changes
   * @param {HTMLElement} modalElement - Modal element
   * @param {HTMLElement} stepList - Step list element
   */
  function saveStepChanges(modalElement, stepList) {
    const stepId = modalElement.dataset.currentStep;
    if (!stepId) return;
    
    const menuName = modalElement.querySelector('#stepMenuName').value.trim();
    const stepPrompt = modalElement.querySelector('#stepPrompt').value;
    const llmInstructions = modalElement.querySelector('#stepInstructions').value;
    const newStepId = modalElement.querySelector('#stepId').value.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (window.StepService) {
      window.StepService.saveStepChanges(
        stepId,
        menuName,
        stepPrompt,
        llmInstructions,
        stepId !== newStepId ? newStepId : null
      ).then(result => {
        if (result.success) {
          // Update step list
          window.StepService.getSteps().then(steps => {
            renderStepList(steps, stepList, modalElement);
          });
          
          // Hide editor
          hideStepEditor(modalElement);
          
          if (window.NotificationService) {
            window.NotificationService.success(result.message);
          }
        } else {
          if (window.NotificationService) {
            window.NotificationService.error(result.message);
          }
        }
      });
    }
  }
  
  /**
   * Show step dependencies
   * @param {Object} step - Step to show dependencies for
   * @param {HTMLElement} modalElement - Modal element
   */
  function showStepDependencies(step, modalElement) {
    const vizContainer = modalElement.querySelector('#dependencyVisualization');
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
    
    const allSteps = window.StepService ? window.StepService.getCurrentSteps() : [];
    
    // This step depends on:
    if (step.dependencies && step.dependencies.length > 0) {
      const depList = document.createElement('div');
      depList.className = 'mt-2';
      depList.innerHTML = '<span class="text-sm font-medium text-gray-700">This step uses:</span>';
      
      step.dependencies.forEach(depId => {
        const depStep = allSteps.find(s => s.id === depId);
        if (depStep) {
          const depNode = document.createElement('div');
          depNode.className = 'dependency-node text-sm';
          depNode.innerHTML = `
            <span class="dependency-arrow text-gray-500">→</span>
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
    const dependentSteps = allSteps.filter(s => s.dependencies && s.dependencies.includes(step.id));
    if (dependentSteps.length > 0) {
      const depOn = document.createElement('div');
      depOn.className = 'mt-3';
      depOn.innerHTML = '<span class="text-sm font-medium text-gray-700">Used by:</span>';
      
      dependentSteps.forEach(depStep => {
        const depNode = document.createElement('div');
        depNode.className = 'dependency-node text-sm';
        depNode.innerHTML = `
          <span class="dependency-arrow text-gray-500">←</span>
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
  }
  
  /**
   * Resize modal based on tab content
   * @param {HTMLElement} modalContent - Modal content element
   * @param {string} tabId - Tab ID
   */
  function resizeModalForTab(modalContent, tabId) {
    const tabSizes = {
      apiSettings: { width: 600, height: 'auto' },
      stepManager: { width: 800, height: 'auto' },
      advancedSettings: { width: 700, height: 'auto' }
    };
    
    const size = activeTabSizes[tabId] || tabSizes[tabId] || { width: 600, height: 'auto' };
    
    modalContent.style.transition = 'max-width 0.3s ease-in-out, max-height 0.3s ease-in-out';
    modalContent.style.maxWidth = typeof size.width === 'number' ? `${size.width}px` : size.width;
    
    if (size.height !== 'auto') {
      modalContent.style.maxHeight = typeof size.height === 'number' ? `${size.height}px` : size.height;
    }
  }
  
  /**
   * Get fallback HTML for About modal
   * @returns {string} - HTML content
   */
  function getAboutFallbackHtml() {
    return `
      <h2 class="text-2xl font-semibold text-center mb-6">PhishPhind AI Email Scanner</h2>
      <div class="text-center mb-6">
        <div class="flex justify-center mb-6">
          <div class="p-3 rounded-full bg-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
          </div>
        </div>
      </div>
      
      <p class="mb-4">PhishPhind is an advanced tool that uses AI to analyze emails for potential phishing threats and malicious content.</p>
      
      <div class="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6">
        <p class="text-sm text-gray-700">
          <strong>Disclaimer:</strong> This project is a proof of concept demonstrating a UI for using LLMs to perform multi-step analysis 
          of emails for malicious content. It is not intended to be effective or reliable in its current state and should 
          not be used for real-world security analysis.
        </p>
      </div>
    
      <h3 class="text-lg font-medium text-gray-900 mb-2">Key features:</h3>
      <ul class="text-base text-gray-700 space-y-2 ml-5 list-disc">
        <li>Multi-step analysis of email content</li>
        <li>Detection of suspicious sender patterns</li>
        <li>Link and attachment investigation</li>
        <li>Contextual analysis for social engineering</li>
        <li>Detailed reports and recommendations</li>
      </ul>
      
      <div class="text-center mt-6 text-sm text-gray-500">
        Version alpha 0.1.0
        <br />
        <a 
          href="https://github.com/MitchBoss" 
          target="_blank" 
          class="text-blue-500 hover:underline"
        >
          https://github.com/MitchBoss
        </a>
      </div>
      
      <div class="mt-6 text-center">
        <button class="close-modal-btn inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-purple hover:bg-brand-purple-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-all duration-200">
          Close
        </button>
      </div>
    `;
  }
  
  /**
   * Get fallback HTML for Settings modal
   * @returns {string} - HTML content
   */
  function getSettingsFallbackHtml() {
    // This uses the updated settings HTML with tabs
    return `
      <h2 class="text-2xl font-semibold text-center mb-6">Settings</h2>

      <!-- Tab Navigation -->
      <div class="border-b border-gray-200 mb-6">
        <nav class="flex space-x-8" id="settingsTabs">
          <a href="#" data-tab="apiSettings" class="border-brand-purple text-brand-purple whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm tab-link">
            API Settings
          </a>
          <a href="#" data-tab="stepManager" class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm tab-link">
            Step Manager
          </a>
          <a href="#" data-tab="advancedSettings" class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm tab-link">
            Advanced
          </a>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="tab-content-container">
        <!-- API Settings Tab -->
        <div id="apiSettings" class="tab-content block">
          <div class="bg-white rounded p-4 mb-6">
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
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Save API Settings
            </button>
          </div>
        </div>
        
        <!-- Step Manager Tab (Simplified for fallback) -->
        <div id="stepManager" class="tab-content hidden">
          <div class="text-center p-4 bg-gray-50 rounded-md">
            <p>Step Manager functionality requires the full application. Please ensure all modules are properly loaded.</p>
          </div>
        </div>
        
        <!-- Advanced Settings Tab -->
        <div id="advancedSettings" class="tab-content hidden">
          <div class="mb-4">
            <label for="stepsEditor" class="block text-sm font-medium text-gray-700 mb-2">Workflow Steps JSON</label>
            <textarea id="stepsEditor" rows="8" class="font-mono shadow-sm focus:ring-brand-purple focus:border-brand-purple block w-full sm:text-sm border-gray-300 rounded-md transition-all duration-200 p-2 border"></textarea>
          </div>
          <div class="mb-4">
            <label for="modelsEditor" class="block text-sm font-medium text-gray-700 mb-2">Models JSON</label>
            <textarea id="modelsEditor" rows="4" class="font-mono shadow-sm focus:ring-brand-purple focus:border-brand-purple block w-full sm:text-sm border-gray-300 rounded-md transition-all duration-200 p-2 border"></textarea>
          </div>
          <button id="saveAdvancedBtn" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-purple hover:bg-brand-purple-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-all duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Save Changes
          </button>
        </div>
      </div>

      <!-- Reset Buttons -->
      <div class="mt-8 pt-4 border-t border-gray-200 flex justify-between">
        <div class="flex gap-2">
          <button id="fullResetBtn" class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200">
            Full Reset
          </button>
          <button id="resetConfigBtn" class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-100 text-base font-medium text-yellow-700 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200">
            Reset Defaults
          </button>
        </div>
        <div class="flex gap-2">
          <button class="close-modal-btn inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-all duration-200">
            Close
          </button>
          <button id="saveSettingsBtn" class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-purple text-base font-medium text-white hover:bg-brand-purple-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-all duration-200">
            Save Settings
          </button>
        </div>
      </div>
    `;
  }
  
  // Return public API
  return {
    init,
    showModal,
    hideModal
  };
})();
