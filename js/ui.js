// ui.js - UI-related functions with Tailwind compatibility
const UIManager = (function() {
  let sortable = null;
  
  /* Initialize sortable functionality */
  function initSortable(selector, onEndCallback) {
    const el = document.querySelector(selector);
    if (el) {
      sortable = new Sortable(el, {
        handle: '.step-drag-handle',
        animation: 150,
        onEnd: onEndCallback
      });
      return sortable;
    }
    return null;
  }
  
  /* Render step list in the UI */
  function renderStepList(steps, onSelectClick, onCloneClick, onDeleteClick) {
    const stepList = $('#stepList');
    stepList.empty();
    
    if (steps.length === 0) {
      stepList.append('<li class="p-4 text-center text-gray-500">No steps configured</li>');
      return;
    }
    
    steps.forEach(step => {
      const modifiedBadge = step.isModified ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Modified</span>' : '';
      const virtualBadge = step.isVirtual ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Virtual</span>' : '';
      
      const item = $(`
        <li class="p-3 border-b border-gray-200 flex justify-between items-center" data-id="${step.id}">
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
        </li>
      `);
      
      stepList.append(item);
    });
    
    // Attach event handlers
    if (onSelectClick) {
      stepList.find('.select-step').on('click', function() {
        const stepId = $(this).closest('li').data('id');
        onSelectClick(stepId);
      });
    }
    
    if (onCloneClick) {
      stepList.find('.clone-step').on('click', function() {
        const stepId = $(this).closest('li').data('id');
        onCloneClick(stepId);
      });
    }
    
    if (onDeleteClick) {
      stepList.find('.delete-step').on('click', function() {
        const stepId = $(this).closest('li').data('id');
        onDeleteClick(stepId);
      });
    }
  }
  
  /* Show dependency visualization for a step */
  function showStepDependencies(step, allSteps, containerSelector) {
    const vizContainer = $(containerSelector);
    vizContainer.empty();
    
    if (!step) {
      vizContainer.html('<p class="text-gray-500">Select a step to see dependencies</p>');
      return;
    }
    
    // Create step dependencies section
    const depTitle = $(`<h6 class="text-sm font-medium text-gray-700">Dependencies for "${step.menuName}"</h6>`);
    vizContainer.append(depTitle);
    
    // This step depends on:
    if (step.dependencies && step.dependencies.length > 0) {
      const depList = $('<div class="mt-2"><span class="text-sm font-medium text-gray-700">This step uses:</span></div>');
      step.dependencies.forEach(depId => {
        const depStep = allSteps.find(s => s.id === depId);
        if (depStep) {
          depList.append(
            $(`<div class="dependency-node text-sm">
                <span class="dependency-arrow text-gray-500">→</span>
                <span class="font-medium">${depStep.menuName}</span> <span class="text-gray-500">(${depId})</span>
              </div>`)
          );
        }
      });
      vizContainer.append(depList);
    } else {
      vizContainer.append('<div class="mt-2 text-sm text-gray-500">This step has no dependencies</div>');
    }
    
    // Steps that depend on this step
    const dependentSteps = allSteps.filter(s => s.dependencies.includes(step.id));
    if (dependentSteps.length > 0) {
      const depOn = $('<div class="mt-3"><span class="text-sm font-medium text-gray-700">Used by:</span></div>');
      dependentSteps.forEach(depStep => {
        depOn.append(
          $(`<div class="dependency-node text-sm">
              <span class="dependency-arrow text-gray-500">←</span>
              <span class="font-medium">${depStep.menuName}</span> <span class="text-gray-500">(${depStep.id})</span>
            </div>`)
        );
      });
      vizContainer.append(depOn);
    } else {
      vizContainer.append('<div class="mt-2 text-sm text-gray-500">No steps depend on this step</div>');
    }
    
    // Add warning if there are circular dependencies
    const hasCycles = StepManager.checkForCircularDependencies();
    if (hasCycles) {
      vizContainer.append(
        $('<div class="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm">Warning: Circular dependencies detected in workflow</div>')
      );
    }
  }
  
  /* Show step editor mode */
  function showStepEditorMode() {
    // Hide the steps grid
    $('#stepsGrid').addClass('hidden');
    
    // Show the step editor container
    $('#stepEditorContainer').removeClass('hidden').addClass('slide-in');
    
    // Show the back button
    $('#backToStepsBtn').removeClass('hidden');
  }
  
  /* Hide step editor mode */
  function hideStepEditorMode() {
    // Hide the step editor container with animation
    $('#stepEditorContainer').removeClass('slide-in').addClass('slide-out');
    
    setTimeout(() => {
      $('#stepEditorContainer').addClass('hidden').removeClass('slide-out');
      
      // Show the steps grid
      $('#stepsGrid').removeClass('hidden').addClass('fade-in');
      
      // Hide the back button
      $('#backToStepsBtn').addClass('hidden');
      
      setTimeout(() => {
        $('#stepsGrid').removeClass('fade-in');
      }, 300);
    }, 300);
  }
  
  /* Populate variable picker dropdown */
  function updateVariablePicker(menuSelector, variables, onVariableClick) {
    const menu = $(menuSelector);
    menu.empty();
    
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
      menu.append($(`<h6 class="dropdown-header text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">${category} Variables</h6>`));
      
      categories[category].forEach(variable => {
        const varItem = $(`<a class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150" href="#" data-variable="{${variable.id}}">${variable.name}</a>`);
        menu.append(varItem);
        
        // Add click handler directly to this item
        varItem.on('click', function(e) {
          e.preventDefault();
          const variableText = $(this).data('variable');
          if (onVariableClick) {
            onVariableClick(variableText);
          }
          
          // Hide the dropdown
          menu.addClass('hidden');
        });
      });
      
      if (Object.keys(categories).length > 1) {
        menu.append($('<div class="border-t border-gray-200 my-1"></div>'));
      }
    });
  }
  
  /* Populate step editor form */
  function populateStepEditor(step) {
    $('#stepId').val(step.id);
    $('#stepMenuName').val(step.menuName);
    $('#stepPrompt').val(step.content.stepPrompt);
    $('#stepInstructions').val(step.content.llmInstructions);
    
    // Disable ID field if not virtual
    $('#stepId').prop('disabled', !step.isVirtual);
    
    // Show/hide reset button
    if (step.isVirtual || !step.fileSource) {
      $('#resetStepBtn').hide();
    } else {
      $('#resetStepBtn').show();
    }
    
    // Show step editor mode
    showStepEditorMode();
  }
  
  /* Populate model dropdown using MODELS configuration */
  function populateModelDropdown(models, selectedModel) {
    const modelSelect = $('#modelSelect');
    modelSelect.empty();
    
    if (models && Array.isArray(models)) {
      models.forEach(modelObj => {
        const option = $('<option>').val(modelObj.id).text(modelObj.displayName);
        modelSelect.append(option);
      });
      
      if (selectedModel) {
        modelSelect.val(selectedModel);
      }
    }
  }
  
  /* Display result in a new tab */
  function displayResult(result, tabsSelector, tabsContentSelector) {
    const tabId = `content-${result.stepName}`;
    
    // Show export button once we have results
    $('#exportContainer').removeClass('hidden');
    
    // Check if tab already exists
    if ($(`#tab-${result.stepName}`).length > 0) {
      // Update existing tab content
      const tabContent = $(`#${tabId}`);
      const mdOutput = marked.parse(result.output || "");
      const sanitizedOutput = DOMPurify.sanitize(mdOutput);
      const mdSummary = marked.parse(result.summary || "");
      const sanitizedSummary = DOMPurify.sanitize(mdSummary);
      
      tabContent.find('.result-summary').html(sanitizedSummary);
      tabContent.find('.result-content').html(sanitizedOutput);
      return;
    }
    
    // Create new tab
    const tabLink = $(`
      <a id="tab-${result.stepName}" href="#${tabId}" class="text-gray-500 hover:text-gray-700 hover:border-gray-300 px-4 py-2 font-medium text-sm border-b-2 border-transparent transition-all duration-200" role="tab">
        ${result.menuName}
      </a>
    `);
    
    $(tabsSelector).append(tabLink);
    
    const mdOutput = marked.parse(result.output || "");
    const sanitizedOutput = DOMPurify.sanitize(mdOutput);
    const mdSummary = marked.parse(result.summary || "");
    const sanitizedSummary = DOMPurify.sanitize(mdSummary);
    
    // Remove the 'fade' class which was causing issues with visibility
    const tabContent = $(`
      <div id="${tabId}" class="tab-pane" role="tabpanel" style="display: none;">
        <h3 class="text-xl font-semibold text-gray-800 mb-3">${DOMPurify.sanitize(result.menuName)}</h3>
        <div class="mb-4 bg-gray-50 p-4 rounded-md border border-gray-200 result-summary">
          <h4 class="text-base font-medium text-gray-700 mb-2">Summary</h4>
          ${sanitizedSummary}
        </div>
        <div class="prose max-w-none result-content">
          ${sanitizedOutput}
        </div>
      </div>
    `);
    
    $(tabsContentSelector).append(tabContent);
    
    // Set up tab switching
    tabLink.on('click', function(e) {
      e.preventDefault();
      
      // Hide all tabs
      $(`${tabsSelector} a`).removeClass('border-brand-purple text-brand-purple');
      $(`${tabsSelector} a`).addClass('text-gray-500 hover:text-gray-700 border-transparent');
      $(`${tabsContentSelector} .tab-pane`).hide();
      
      // Show active tab
      $(this).removeClass('text-gray-500 hover:text-gray-700 border-transparent');
      $(this).addClass('border-brand-purple text-brand-purple');
      $(`#${tabId}`).show();
    });
    
    // If this is the first tab, show it
    if (result.stepNumber === 1) {
      tabLink.removeClass('text-gray-500 hover:text-gray-700 border-transparent');
      tabLink.addClass('border-brand-purple text-brand-purple');
      tabContent.show();
    }
  }
  
  /* Render analysis history */
  function renderHistory(history, containerSelector, onItemClick) {
    const container = $(containerSelector);
    container.empty();
    
    if (history.length === 0) {
      container.append("<p class='text-gray-500'>No previous analyses.</p>");
      return;
    }
    
    history.forEach((item, index) => {
      const date = new Date(item.timestamp).toLocaleString();
      const shortMsg = item.message.substring(0, 80).replace(/\n/g, " ");
      const div = $(
        `<div class="border border-gray-200 rounded-md shadow-sm p-3 mb-3 history-item cursor-pointer hover:bg-gray-50 transition-all duration-200" data-index="${index}">
          <div class="font-medium text-gray-800">${date}</div>
          <div class="text-gray-600 text-sm">${shortMsg}${shortMsg.length >= 80 ? '...' : ''}</div>
        </div>`
      );
      container.append(div);
    });
    
    if (onItemClick) {
      container.find('.history-item').on('click', function() {
        const index = $(this).data('index');
        onItemClick(index);
      });
    }
  }
  
  /* Show spinner and update message */
  function showSpinner(message) {
    $("#spinner-message").text(message || "Processing...");
    $("#spinner-container").removeClass('hidden').addClass('fade-in');
  }
  
  /* Hide spinner */
  function hideSpinner() {
    $("#spinner-container").addClass('fade-out');
    setTimeout(() => {
      $("#spinner-container").addClass('hidden').removeClass('fade-out');
    }, 300);
  }
  
  /* Update progress bar */
  function updateProgressBar(current, total) {
    const pct = Math.round((current / total) * 100);
    $("#progress-bar").css("width", pct + "%").text(pct + "%");
  }
  
  /* Show unsaved changes confirmation modal */
  function showUnsavedChangesModal(onSave, onDiscard) {
    // Use our custom modal handler
    TailwindModal.showModal('unsavedChangesModal');
    
    // Set up button handlers
    $('#saveChangesBtn').off('click').on('click', function() {
      TailwindModal.hideModal('unsavedChangesModal');
      if (onSave) onSave();
    });
    
    $('#discardChangesBtn').off('click').on('click', function() {
      TailwindModal.hideModal('unsavedChangesModal');
      if (onDiscard) onDiscard();
    });
  }
  
  // Public API
  return {
    initSortable,
    renderStepList,
    showStepDependencies,
    updateVariablePicker,
    populateStepEditor,
    populateModelDropdown,
    displayResult,
    renderHistory,
    showSpinner,
    hideSpinner,
    updateProgressBar,
    showUnsavedChangesModal,
    showStepEditorMode,
    hideStepEditorMode
  };
})();