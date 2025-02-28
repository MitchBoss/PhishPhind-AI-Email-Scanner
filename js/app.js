/* app.js - Main application logic */

$(document).ready(function() {
  // App state
  let targetEditStepId = null; // Used for tracking step change when unsaved changes exist
  
  // Initialize app
  initialize();
  
  // Initialize with unsaved changes handler
  function handleUnsavedChanges(proceedCallback) {
    if (StepManager.hasUnsavedStepChanges()) {
      UIManager.showUnsavedChangesModal(
        // Save callback
        function() {
          saveStepChanges();
          proceedCallback();
        },
        // Discard callback
        function() {
          StepManager.markUnsavedChanges(false);
          proceedCallback();
        }
      );
      return true;
    }
    return false;
  }
  
  // Initialize app
  async function initialize() {
    try {
      // Initialize configurations
      const { models, steps, apiConfig } = await ConfigManager.initialize();
      
      // Load steps
      const loadedSteps = await StepManager.loadSteps();
      
      // Populate API settings
      $('#apiKeyInput').val(apiConfig.apiKey || "");
      UIManager.populateModelDropdown(models, apiConfig.model);
      
      // Update advanced editors
      $('#stepsEditor').val(JSON.stringify(steps, null, 2));
      $('#modelsEditor').val(JSON.stringify(models, null, 2));
      
      // Render step list
      UIManager.renderStepList(
        loadedSteps, 
        handleEditStepClick,
        handleCloneStepClick,
        handleDeleteStepClick
      );
      
      // Initialize sortable
      UIManager.initSortable('#stepList', handleStepReorder);
      
      // Render history
      UIManager.renderHistory(
        HistoryManager.getAnalysisHistory(),
        '#analysisHistory',
        handleHistoryItemClick
      );
      
      // If we have at least one step in editor mode, show variables menu
      if (loadedSteps.length > 0) {
        updateVariablePicker();
      }
      
      // Check if API key is missing and force open settings
      if (!apiConfig.apiKey) {
        TailwindModal.showModal('settingsModal');
      }
      
      // Initialize back button for step editor
      $('#backToStepsBtn').on('click', function() {
        handleBackToSteps();
      });
    } catch (error) {
      NotificationSystem.error("Failed to initialize application: " + error.message);
      console.error("Initialization error:", error);
    }
  }
  
  // Handle back button click
  function handleBackToSteps() {
    if (handleUnsavedChanges(() => {
      UIManager.hideStepEditorMode();
      StepManager.setCurrentEditingStep(null);
    })) {
      return;
    }
    
    UIManager.hideStepEditorMode();
    StepManager.setCurrentEditingStep(null);
  }
  
  // Update the variable picker with current steps
  function updateVariablePicker() {
    const variables = StepManager.getAvailableVariables();
    UIManager.updateVariablePicker('#variablePickerMenu', variables, function(variable) {
      insertVariableIntoPrompt(variable);
    });
  }
  
  // Handle step reordering
  function handleStepReorder() {
    // Update positions based on current DOM order
    $('#stepList li').each(function(index) {
      const stepId = $(this).data('id');
      const steps = StepManager.getCurrentSteps();
      const step = steps.find(s => s.id === stepId);
      if (step) {
        step.position = index;
      }
    });
    
    // Resort and save
    StepManager.saveUserSteps();
    
    // Update dependency visualization
    const currentStepId = StepManager.getCurrentEditingStep();
    if (currentStepId) {
      const step = StepManager.getCurrentSteps().find(s => s.id === currentStepId);
      if (step) {
        UIManager.showStepDependencies(step, StepManager.getCurrentSteps(), '#dependencyVisualization');
      }
    }
    
    // Mark that we're using custom steps
    StepManager.setCustomStepsMode(true);
  }
  
  // Handle edit step click
  function handleEditStepClick(stepId) {
    if (StepManager.getCurrentEditingStep() === stepId) {
      return; // Already editing this step
    }
    
    // If we have unsaved changes, confirm first
    if (handleUnsavedChanges(() => {
      editStep(stepId);
    })) {
      targetEditStepId = stepId;
      return;
    }
    
    // Otherwise, just edit the step
    editStep(stepId);
  }
  
  // Edit a step
  function editStep(stepId) {
    const steps = StepManager.getCurrentSteps();
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    
    // Set current editing step
    StepManager.setCurrentEditingStep(stepId);
    
    // Populate form
    UIManager.populateStepEditor(step);
    
    // Update variable picker
    updateVariablePicker();
    
    // Show dependencies
    UIManager.showStepDependencies(step, steps, '#dependencyVisualization');
  }
  
  // Handle clone step click
  function handleCloneStepClick(stepId) {
    // Check for unsaved changes first
    if (handleUnsavedChanges(() => {
      cloneStep(stepId);
    })) {
      return;
    }
    
    cloneStep(stepId);
  }
  
  // Clone a step
  function cloneStep(stepId) {
    const clonedStep = StepManager.cloneStep(stepId);
    if (clonedStep) {
      // Re-render step list
      UIManager.renderStepList(
        StepManager.getCurrentSteps(),
        handleEditStepClick,
        handleCloneStepClick,
        handleDeleteStepClick
      );
      
      // Edit the new step
      editStep(clonedStep.id);
      
      NotificationSystem.success(`Step "${clonedStep.menuName}" created.`);
    }
  }
  
  // Handle delete step click
  function handleDeleteStepClick(stepId) {
    if (!confirm(`Are you sure you want to delete this step?`)) {
      return;
    }
    
    if (StepManager.deleteStep(stepId)) {
      // Re-render step list
      UIManager.renderStepList(
        StepManager.getCurrentSteps(),
        handleEditStepClick,
        handleCloneStepClick,
        handleDeleteStepClick
      );
      
      // Hide editor if we deleted the current step
      if (StepManager.getCurrentEditingStep() === null) {
        UIManager.hideStepEditorMode();
      }
      
      // Update variable picker
      updateVariablePicker();
      
      NotificationSystem.success("Step deleted successfully");
    }
  }
  
  // Handle save step changes
  function saveStepChanges() {
    const stepId = StepManager.getCurrentEditingStep();
    if (!stepId) return;
    
    const menuName = $('#stepMenuName').val().trim();
    const stepPrompt = $('#stepPrompt').val();
    const llmInstructions = $('#stepInstructions').val();
    const newStepId = $('#stepId').val().trim().toLowerCase().replace(/\s+/g, '_');
    
    const result = StepManager.saveStepChanges(
      stepId,
      menuName,
      stepPrompt,
      llmInstructions,
      stepId !== newStepId ? newStepId : null
    );
    
    if (result.success) {
      // Re-render step list
      UIManager.renderStepList(
        StepManager.getCurrentSteps(),
        handleEditStepClick,
        handleCloneStepClick,
        handleDeleteStepClick
      );
      
      // Update variable picker
      updateVariablePicker();
      
      // If ID changed, update editor
      if (stepId !== result.step.id) {
        editStep(result.step.id);
      } else {
        // Update dependencies
        UIManager.showStepDependencies(
          result.step, 
          StepManager.getCurrentSteps(), 
          '#dependencyVisualization'
        );
      }
      
      NotificationSystem.success(result.message);
      
      // If we had a target step, edit it now
      if (targetEditStepId) {
        editStep(targetEditStepId);
        targetEditStepId = null;
      }
    } else {
      NotificationSystem.error(result.message);
    }
  }
  
  // Insert variable into prompt
  function insertVariableIntoPrompt(variable) {
    const textarea = $('#stepPrompt');
    const cursorPos = textarea.prop('selectionStart');
    const text = textarea.val();
    const newText = text.slice(0, cursorPos) + variable + text.slice(cursorPos);
    textarea.val(newText);
    textarea.focus();
    
    // Mark as changed
    StepManager.markUnsavedChanges();
  }
  
  // Handle reset step to original
  function resetStepToOriginal() {
    const stepId = StepManager.getCurrentEditingStep();
    if (!stepId) return;
    
    if (!confirm("Are you sure you want to reset this step to its original file content?")) {
      return;
    }
    
    StepManager.resetStepToOriginal(stepId)
      .then(step => {
        if (step) {
          UIManager.populateStepEditor(step);
          
          // Re-render step list
          UIManager.renderStepList(
            StepManager.getCurrentSteps(),
            handleEditStepClick,
            handleCloneStepClick,
            handleDeleteStepClick
          );
          
          NotificationSystem.success("Step reset to original file content");
        }
      })
      .catch(err => {
        NotificationSystem.error("Failed to reset step: " + err.message);
      });
  }
  
  // Handle history item click
  function handleHistoryItemClick(index) {
    const historyItem = HistoryManager.getHistoryItem(index);
    if (!historyItem) return;
    
    // Clear current results
    $("#resultTabs").empty();
    $("#resultTabsContent").empty();
    
    // Load steps
    StepManager.loadSteps().then(steps => {
      // Display each step result
      let stepNumber = 1;
      steps.forEach(step => {
        const output = historyItem.results[`${step.id}_output`] || "";
        const summary = historyItem.results[`${step.id}_summary`] || "";
        
        UIManager.displayResult(
          {
            stepName: step.id,
            menuName: step.menuName,
            output,
            summary,
            stepNumber,
            totalSteps: steps.length
          },
          '#resultTabs',
          '#resultTabsContent'
        );
        
        stepNumber++;
      });

      // Show export button
      $('#exportContainer').removeClass('hidden');
    });
  }
  
  // Start analysis
  function startAnalysis() {
    const messageContent = $("#messageText").val().trim();
    if (!messageContent) {
      NotificationSystem.error("Please provide message content in the text area.");
      return;
    }
    
    const apiConfigStr = localStorage.getItem("openai_config");
    if (!apiConfigStr) {
      NotificationSystem.error("Please set your API key in settings.");
      return;
    }
    
    const config = JSON.parse(apiConfigStr);
    if (!config.apiKey) {
      NotificationSystem.error("Please provide a valid API key.");
      return;
    }
    
    // Clear current results
    $("#resultTabs").empty();
    $("#resultTabsContent").empty();
    
    // Show spinner and progress
    UIManager.showSpinner("Starting analysis...");
    UIManager.updateProgressBar(0, 1);
    
    // Run analysis
    StepManager.runSteps(
      messageContent,
      config.apiKey,
      config.model,
      {
        onStepStart: (step, stepNumber, totalSteps) => {
          UIManager.updateProgressBar(stepNumber - 1, totalSteps);
          UIManager.showSpinner(`Running Step ${stepNumber}: ${step.menuName}...`);
        },
        onStepComplete: (step, result) => {
          UIManager.displayResult(
            {
              stepName: step.id,
              menuName: step.menuName,
              output: result.output,
              summary: result.summary,
              stepNumber: result.stepNumber,
              totalSteps: result.totalSteps
            },
            '#resultTabs',
            '#resultTabsContent'
          );
        },
        onProgress: (current, total) => {
          UIManager.updateProgressBar(current, total);
        },
        onComplete: (stepResults) => {
          UIManager.hideSpinner();
          UIManager.updateProgressBar(1, 1);
          NotificationSystem.success("Analysis completed successfully!");
          
          // Save to history
          const history = HistoryManager.saveAnalysisHistory(messageContent, stepResults);
          UIManager.renderHistory(
            history,
            '#analysisHistory',
            handleHistoryItemClick
          );

          // Show export button
          $('#exportContainer').removeClass('hidden');
        },
        onError: (error) => {
          UIManager.hideSpinner();
          NotificationSystem.error("Analysis error: " + error.message);
        }
      }
    ).catch(error => {
      UIManager.hideSpinner();
      NotificationSystem.error("Analysis failed: " + error.message);
    });
  }
  
  // Save settings
  function saveSettings() {
    const apiKey = $('#apiKeyInput').val().trim();
    const model = $('#modelSelect').val();
    
    ConfigManager.saveApiSettings(apiKey, model);
    
    // If we're on the advanced tab, save the JSON editors
    if ($('#advancedSettings').hasClass('active')) {
      saveAdvancedSettings();
    }
    
    NotificationSystem.success("Settings saved!");
    
    // Close settings modal only if API key is provided
    if (apiKey) {
      TailwindModal.hideModal('settingsModal');
    } else {
      NotificationSystem.warning("API key is required to continue.");
    }
  }
  
  // Save advanced settings
  function saveAdvancedSettings() {
    try {
      const stepsJson = JSON.parse($('#stepsEditor').val());
      const modelsJson = JSON.parse($('#modelsEditor').val());
      
      ConfigManager.saveAdvancedSettings(stepsJson, modelsJson);
      
      // Reload steps and models
      StepManager.loadSteps().then(steps => {
        UIManager.renderStepList(
          steps,
          handleEditStepClick,
          handleCloneStepClick,
          handleDeleteStepClick
        );
      });
      
      UIManager.populateModelDropdown(modelsJson, $('#modelSelect').val());
      
      NotificationSystem.success("Advanced settings saved!");
    } catch (err) {
      NotificationSystem.error("Invalid JSON: " + err.message);
    }
  }
  
  // Restore default steps
  function restoreDefaultSteps() {
    if (!confirm("Are you sure you want to restore all default steps? This will overwrite any custom steps.")) {
      return;
    }
    
    // Reset custom mode flag
    StepManager.setCustomStepsMode(false);
    
    // Load default steps
    StepManager.loadSteps(true).then(steps => {
      UIManager.renderStepList(
        steps,
        handleEditStepClick,
        handleCloneStepClick,
        handleDeleteStepClick
      );
      
      // Update variable picker
      updateVariablePicker();
      
      // Hide editor panel
      UIManager.hideStepEditorMode();
      StepManager.setCurrentEditingStep(null);
      
      NotificationSystem.success("Default steps restored!");
    });
  }
  
  // Reset to defaults
  function resetToDefaults(keepAPIKey = true) {
    if (!confirm(keepAPIKey ? 
                "Reset configuration to defaults? API key will be preserved." : 
                "Full reset will clear all settings including API key. Continue?")) {
      return;
    }
    
    // Reset custom mode flag
    StepManager.setCustomStepsMode(false);
    
    ConfigManager.resetToDefaults(keepAPIKey).then(({ defaultSteps, defaultModels }) => {
      // Update UI
      UIManager.populateModelDropdown(defaultModels);
      
      if (!keepAPIKey) {
        $('#apiKeyInput').val("");
      }
      
      // Reload steps
      StepManager.loadSteps(true).then(steps => {
        UIManager.renderStepList(
          steps,
          handleEditStepClick,
          handleCloneStepClick,
          handleDeleteStepClick
        );
        
        // Update variable picker
        updateVariablePicker();
        
        // Hide editor panel
        UIManager.hideStepEditorMode();
        StepManager.setCurrentEditingStep(null);
      });
      
      // Update advanced editors
      $('#stepsEditor').val(JSON.stringify(defaultSteps, null, 2));
      $('#modelsEditor').val(JSON.stringify(defaultModels, null, 2));
      
      NotificationSystem.success("Configuration reset to defaults!");
    });
  }
  
  // Export steps configuration
  function exportStepsConfig() {
    const config = StepManager.getCurrentSteps().map(step => ({
      id: step.id,
      file: step.fileSource || `steps/${step.id}.txt`,
      position: step.position
    }));
    
    // Format as JSON
    const jsonStr = JSON.stringify(config, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(jsonStr)
      .then(() => {
        NotificationSystem.success("Steps configuration copied to clipboard");
      })
      .catch(err => {
        NotificationSystem.error("Failed to copy configuration: " + err.message);
      });
  }
  
  // Export step as text
  function exportStepAsText() {
    const stepId = StepManager.getCurrentEditingStep();
    if (!stepId) return;
    
    const step = StepManager.getCurrentSteps().find(s => s.id === stepId);
    if (!step) return;
    
    // Format step content
    const content = `[MENU_Name]\n${step.menuName}\n\n[STEP_PROMPT]\n${step.content.stepPrompt}\n\n[LLM_INSTRUCTIONS]\n${step.content.llmInstructions}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(content)
      .then(() => {
        NotificationSystem.success("Step content copied to clipboard");
      })
      .catch(err => {
        NotificationSystem.error("Failed to copy content: " + err.message);
      });
  }
  
  // Create new step
  function createNewStep() {
    // Check for unsaved changes first
    if (handleUnsavedChanges(() => {
      addNewStep();
    })) {
      return;
    }
    
    addNewStep();
  }
  
  // Add new step implementation
  function addNewStep() {
    const newStep = StepManager.createNewStep();
    
    // Re-render step list
    UIManager.renderStepList(
      StepManager.getCurrentSteps(),
      handleEditStepClick,
      handleCloneStepClick,
      handleDeleteStepClick
    );
    
    // Update variable picker
    updateVariablePicker();
    
    // Edit the new step
    editStep(newStep.id);
    
    NotificationSystem.success("New step created");
  }
  
  // Track changes in step form fields
  function trackStepChanges() {
    StepManager.markUnsavedChanges();
  }
  
  // Generate PDF
  function generatePdf() {
    PdfGenerator.generatePDF('#resultTabsContent');
    NotificationSystem.success("PDF generated successfully!");
  }
  
  // EVENT HANDLERS
  
  // When a file is chosen in the "Upload Message File" section
  $("#messageFile").on("change", function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        $("#messageText").val(e.target.result);
      };
      reader.readAsText(file);
    }
  });
  
  // Open settings button
  $("#openSettingsBtn").click(function() {
    StepManager.loadSteps().then(steps => {
      UIManager.renderStepList(
        steps,
        handleEditStepClick,
        handleCloneStepClick,
        handleDeleteStepClick
      );
      
      // Update variable picker
      updateVariablePicker();
      
      TailwindModal.showModal("settingsModal");
    });
  });
  
  // Save settings button
  $("#saveSettingsBtn").click(saveSettings);
  
  // Save advanced settings button
  $("#saveAdvancedBtn").click(saveAdvancedSettings);
  
  // Add step button
  $("#addStepBtn").click(createNewStep);
  
  // Export steps button
  $("#exportStepsBtn").click(exportStepsConfig);
  
  // Restore default steps button
  $("#restoreDefaultStepsBtn").click(restoreDefaultSteps);
  
  // Save step button
  $("#saveStepBtn").click(saveStepChanges);
  
  // Cancel step editing button
  $("#cancelStepEditBtn").click(function() {
    if (handleUnsavedChanges(() => {
      UIManager.hideStepEditorMode();
      StepManager.setCurrentEditingStep(null);
    })) {
      return;
    }
    
    UIManager.hideStepEditorMode();
    StepManager.setCurrentEditingStep(null);
  });
  
  // Reset step button
  $("#resetStepBtn").click(resetStepToOriginal);
  
  // Export step button
  $("#exportStepBtn").click(exportStepAsText);
  
  // Start analysis button
  $("#startAnalysisBtn").click(startAnalysis);
  
  // Export PDF button
  $("#savePdfBtn").click(generatePdf);
  
  // Reset configuration buttons
  $("#resetConfigBtn").click(function() {
    resetToDefaults(true);
  });
  
  $("#fullResetBtn").click(function() {
    resetToDefaults(false);
  });
  
  // Track changes in step form fields
  $("#stepId, #stepMenuName, #stepPrompt, #stepInstructions").on('input', trackStepChanges);
});