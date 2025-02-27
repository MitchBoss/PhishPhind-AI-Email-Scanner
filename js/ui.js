// ui.js - UI-related functions
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
  function renderStepList(steps, onEditClick, onCloneClick, onDeleteClick) {
    const stepList = $('#stepList');
    stepList.empty();
    
    if (steps.length === 0) {
      stepList.append('<li class="list-group-item text-center text-muted">No steps configured</li>');
      return;
    }
    
    steps.forEach(step => {
      const modifiedBadge = step.isModified ? '<span class="badge badge-warning ml-2">Modified</span>' : '';
      const virtualBadge = step.isVirtual ? '<span class="badge badge-info ml-2">Virtual</span>' : '';
      
      const item = $(`
        <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${step.id}">
          <div class="step-drag-handle mr-2">⋮⋮</div>
          <div class="flex-grow-1">
            ${step.menuName}
            ${modifiedBadge}
            ${virtualBadge}
          </div>
          <div class="step-actions">
            <button class="btn btn-sm btn-outline-primary edit-step">Edit</button>
            <button class="btn btn-sm btn-outline-success clone-step">Clone</button>
            <button class="btn btn-sm btn-outline-danger delete-step">Delete</button>
          </div>
        </li>
      `);
      
      stepList.append(item);
    });
    
    // Attach event handlers
    if (onEditClick) {
      stepList.find('.edit-step').on('click', function() {
        const stepId = $(this).closest('li').data('id');
        onEditClick(stepId);
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
      vizContainer.html('<p class="text-muted">Select a step to see dependencies</p>');
      return;
    }
    
    // Create step dependencies section
    const depTitle = $(`<h6>Dependencies for "${step.menuName}"</h6>`);
    vizContainer.append(depTitle);
    
    // This step depends on:
    if (step.dependencies && step.dependencies.length > 0) {
      const depList = $('<div class="mt-2"><strong>This step uses:</strong></div>');
      step.dependencies.forEach(depId => {
        const depStep = allSteps.find(s => s.id === depId);
        if (depStep) {
          depList.append(
            $(`<div class="dependency-node">
                <span class="dependency-arrow">→</span>
                ${depStep.menuName} (${depId})
              </div>`)
          );
        }
      });
      vizContainer.append(depList);
    } else {
      vizContainer.append('<div class="mt-2 text-muted">This step has no dependencies</div>');
    }
    
    // Steps that depend on this step
    const dependentSteps = allSteps.filter(s => s.dependencies.includes(step.id));
    if (dependentSteps.length > 0) {
      const depOn = $('<div class="mt-3"><strong>Used by:</strong></div>');
      dependentSteps.forEach(depStep => {
        depOn.append(
          $(`<div class="dependency-node">
              <span class="dependency-arrow">←</span>
              ${depStep.menuName} (${depStep.id})
            </div>`)
        );
      });
      vizContainer.append(depOn);
    } else {
      vizContainer.append('<div class="mt-2 text-muted">No steps depend on this step</div>');
    }
    
    // Add warning if there are circular dependencies
    const hasCycles = StepManager.checkForCircularDependencies();
    if (hasCycles) {
      vizContainer.append(
        $('<div class="alert alert-warning mt-3">Warning: Circular dependencies detected in workflow</div>')
      );
    }
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
      menu.append($(`<h6 class="dropdown-header">${category} Variables</h6>`));
      
      categories[category].forEach(variable => {
        const varItem = $(`<a class="dropdown-item" href="#" data-variable="{${variable.id}}">${variable.name}</a>`);
        menu.append(varItem);
        
        // Add click handler directly to this item
        varItem.on('click', function(e) {
          e.preventDefault();
          const variableText = $(this).data('variable');
          if (onVariableClick) {
            onVariableClick(variableText);
          }
        });
      });
      
      if (Object.keys(categories).length > 1) {
        menu.append($('<div class="dropdown-divider"></div>'));
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
    
    // Show editor panel
    $('#stepEditorPanel').show();
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
    const tabLink = $(`<a class="nav-link" data-toggle="tab" role="tab" href="#${tabId}">${result.menuName}</a>`).attr("id", `tab-${result.stepName}`);
    const tabItem = $("<li class='nav-item'></li>").append(tabLink);
    $(tabsSelector).append(tabItem);
    
    const mdOutput = marked.parse(result.output || "");
    const sanitizedOutput = DOMPurify.sanitize(mdOutput);
    const mdSummary = marked.parse(result.summary || "");
    const sanitizedSummary = DOMPurify.sanitize(mdSummary);
    
    const tabContent = $(
      `<div class="tab-pane fade" id="${tabId}" role="tabpanel">
        <h3 class="mt-3">${DOMPurify.sanitize(result.menuName)}</h3>
        <div class="mt-2"><strong>Summary:</strong><br>${sanitizedSummary}</div>
        <div class="mt-3">${sanitizedOutput}</div>
      </div>`
    );
    
    $(tabsContentSelector).append(tabContent);
    
    if (result.stepNumber === 1) {
      tabLink.addClass("active");
      tabContent.addClass("show active");
    }
  }
  
  /* Render analysis history */
  function renderHistory(history, containerSelector, onItemClick) {
    const container = $(containerSelector);
    container.empty();
    
    if (history.length === 0) {
      container.append("<p>No previous analyses.</p>");
      return;
    }
    
    history.forEach((item, index) => {
      const date = new Date(item.timestamp).toLocaleString();
      const shortMsg = item.message.substring(0, 80).replace(/\n/g, " ");
      const div = $(
        `<div class="border p-2 mb-2 history-item" data-index="${index}" style="cursor:pointer;">
          <strong>${date}</strong><br>${shortMsg} ...
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
    $("#spinner-container").show();
  }
  
  /* Hide spinner */
  function hideSpinner() {
    $("#spinner-container").hide();
  }
  
  /* Update progress bar */
  function updateProgressBar(current, total) {
    const pct = Math.round((current / total) * 100);
    $("#progress-bar").css("width", pct + "%").text(pct + "%");
  }
  
  /* Show unsaved changes confirmation modal */
  function showUnsavedChangesModal(onSave, onDiscard) {
    $('#unsavedChangesModal').modal('show');
    
    // Set up button handlers
    $('#saveChangesBtn').off('click').on('click', function() {
      $('#unsavedChangesModal').modal('hide');
      if (onSave) onSave();
    });
    
    $('#discardChangesBtn').off('click').on('click', function() {
      $('#unsavedChangesModal').modal('hide');
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
    showUnsavedChangesModal
  };
})();
