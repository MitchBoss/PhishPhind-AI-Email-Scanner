/* steps.js - Step management */

const StepManager = (function() {
    let currentSteps = [];
    let currentEditingStep = null;
    let hasUnsavedChanges = false;
  
    // Parse step file content
    function parseStepFile(content) {
      return {
        menuName: content.match(/\[MENU_Name\](.*?)(?=\[|\s*$)/s)?.[1]?.trim() || '',
        stepPrompt: content.match(/\[STEP_PROMPT\](.*?)(?=\[|\s*$)/s)?.[1]?.trim() || '',
        llmInstructions: content.match(/\[LLM_INSTRUCTIONS\](.*?)(?=\[|\s*$)/s)?.[1]?.trim() || ''
      };
    }
  
    /* Enhanced step loading with file support */
    async function loadSteps(forceLoadDefault = false) {
      try {
        // Load configuration
        const stepConfigResponse = await fetch('config/steps.json');
        const stepConfig = await stepConfigResponse.json();
        
        // Get user modifications from localStorage
        const userSteps = forceLoadDefault ? {} : 
                          JSON.parse(localStorage.getItem('user_steps') || '{}');
        const virtualSteps = forceLoadDefault ? [] : 
                            JSON.parse(localStorage.getItem('virtual_steps') || '[]');
        
        // Process each configured step
        const loadedSteps = await Promise.all(stepConfig.map(async (step) => {
          const stepObj = {
            id: step.id || step.name, // Support both formats
            position: step.position || 0,
            fileSource: step.file,
            isModified: false,
            isVirtual: false
          };
          
          // Check if user has modified this step
          if (userSteps[stepObj.id]) {
            stepObj.isModified = true;
            stepObj.content = userSteps[stepObj.id].content;
            stepObj.menuName = userSteps[stepObj.id].menuName;
          } else {
            // Load from file or use properties from config
            if (step.file) {
              try {
                const fileContent = await fetch(step.file).then(r => r.text());
                const parsed = parseStepFile(fileContent);
                stepObj.content = {
                  stepPrompt: parsed.stepPrompt,
                  llmInstructions: parsed.llmInstructions
                };
                stepObj.menuName = parsed.menuName;
              } catch (err) {
                console.error(`Failed to load step file: ${step.file}`, err);
                // Fall back to inline properties if available
                stepObj.content = {
                  stepPrompt: step.stepPrompt || '',
                  llmInstructions: step.llmInstructions || ''
                };
                stepObj.menuName = step.menuName || stepObj.id;
              }
            } else {
              // Use inline properties
              stepObj.content = {
                stepPrompt: step.stepPrompt || '',
                llmInstructions: step.llmInstructions || ''
              };
              stepObj.menuName = step.menuName || stepObj.id;
            }
          }
          
          return stepObj;
        }));
        
        // Add virtual steps
        const allSteps = [
          ...loadedSteps,
          ...virtualSteps.map(vs => ({...vs, isVirtual: true}))
        ];
        
        // Sort by position
        allSteps.sort((a, b) => a.position - b.position);
        
        // Analyze dependencies
        allSteps.forEach(step => {
          step.dependencies = detectDependencies(step, allSteps);
        });
  
        currentSteps = allSteps;
        return allSteps;
      } catch (error) {
        console.error("Error loading steps:", error);
        return [];
      }
    }
  
/* Detect step dependencies */
function detectDependencies(step, allSteps) {
    const dependencies = [];
    const pattern = /{([a-z_]+)_(?:output|summary)}/g;
    const content = step.content.stepPrompt;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const depId = match[1];
      if (depId !== step.id && allSteps.some(s => s.id === depId)) {
        if (!dependencies.includes(depId)) {
          dependencies.push(depId);
        }
      }
    }
    
    return dependencies;
  }
  
  /* Create new virtual step */
  function createNewStep() {
    // Generate unique ID
    const baseId = "custom_step";
    let id = baseId;
    let counter = 1;
    
    while (currentSteps.some(s => s.id === id)) {
      id = `${baseId}_${counter}`;
      counter++;
    }
    
    // Create new step object
    const newStep = {
      id: id,
      menuName: "New Step",
      isVirtual: true,
      isModified: false,
      position: currentSteps.length,
      content: {
        stepPrompt: "Enter your prompt here...",
        llmInstructions: "Enter your LLM instructions here..."
      },
      dependencies: []
    };
    
    // Add to current steps
    currentSteps.push(newStep);
    
    // Save
    saveUserSteps();
    
    return newStep;
  }
  
  /* Clone an existing step */
  function cloneStep(stepId) {
    const originalStep = currentSteps.find(s => s.id === stepId);
    if (!originalStep) return null;
    
    // Generate unique ID
    const baseId = `${originalStep.id}_clone`;
    let id = baseId;
    let counter = 1;
    
    while (currentSteps.some(s => s.id === id)) {
      id = `${baseId}_${counter}`;
      counter++;
    }
    
    // Create clone
    const clonedStep = {
      ...JSON.parse(JSON.stringify(originalStep)),
      id: id,
      menuName: `${originalStep.menuName} (Copy)`,
      isVirtual: true,
      isModified: false,
      position: currentSteps.length
    };
    
    // Add to current steps
    currentSteps.push(clonedStep);
    
    // Save
    saveUserSteps();
    
    return clonedStep;
  }
  
  /* Delete a step */
  function deleteStep(stepId) {
    // Find step index
    const index = currentSteps.findIndex(s => s.id === stepId);
    if (index === -1) return false;
    
    // Remove step
    currentSteps.splice(index, 1);
    
    // Recalculate positions
    currentSteps.forEach((step, idx) => {
      step.position = idx;
    });
    
    // Update dependencies for all steps
    currentSteps.forEach(step => {
      step.dependencies = detectDependencies(step, currentSteps);
    });
    
    // Reset editing state if needed
    if (currentEditingStep === stepId) {
      currentEditingStep = null;
      hasUnsavedChanges = false;
    }
    
    // Save
    saveUserSteps();
    
    return true;
  }
  
  /* Check for circular dependencies in the workflow */
  function checkForCircularDependencies() {
    // Simple cycle detection using DFS
    const visited = new Set();
    const recStack = new Set();
    let hasCycle = false;
    
    function dfs(stepId) {
      if (hasCycle) return;
      
      visited.add(stepId);
      recStack.add(stepId);
      
      const step = currentSteps.find(s => s.id === stepId);
      if (step) {
        for (const dep of step.dependencies) {
          if (!visited.has(dep)) {
            dfs(dep);
          } else if (recStack.has(dep)) {
            hasCycle = true;
            return;
          }
        }
      }
      
      recStack.delete(stepId);
    }
    
    for (const step of currentSteps) {
      if (!visited.has(step.id)) {
        dfs(step.id);
      }
    }
    
    return hasCycle;
  }
  
  /* Save user modified steps to localStorage */
  function saveUserSteps() {
    // Separate virtual and modified steps
    const userSteps = {};
    const virtualSteps = [];
    
    currentSteps.forEach(step => {
      if (step.isVirtual) {
        virtualSteps.push(step);
      } else if (step.isModified) {
        userSteps[step.id] = {
          menuName: step.menuName,
          content: step.content
        };
      }
    });
    
    // Save to localStorage
    localStorage.setItem('user_steps', JSON.stringify(userSteps));
    localStorage.setItem('virtual_steps', JSON.stringify(virtualSteps));
    
    // Update dependency info
    currentSteps.forEach(step => {
      step.dependencies = detectDependencies(step, currentSteps);
    });
  }
  
  /* Set current editing step */
  function setCurrentEditingStep(stepId) {
    currentEditingStep = stepId;
    hasUnsavedChanges = false;
  }
  
  /* Mark that changes have been made to current step */
  function markUnsavedChanges() {
    hasUnsavedChanges = true;
  }
  
  /* Check if there are unsaved changes */
  function hasUnsavedStepChanges() {
    return hasUnsavedChanges;
  }
  
  /* Reset step to original file content */
  async function resetStepToOriginal(stepId) {
    const step = currentSteps.find(s => s.id === stepId);
    if (!step || step.isVirtual || !step.fileSource) return null;
    
    try {
      // Reload from file
      const fileContent = await fetch(step.fileSource).then(r => r.text());
      const parsed = parseStepFile(fileContent);
      
      // Update step
      step.content = {
        stepPrompt: parsed.stepPrompt,
        llmInstructions: parsed.llmInstructions
      };
      step.menuName = parsed.menuName;
      step.isModified = false;
      
      // Save changes
      saveUserSteps();
      
      return step;
    } catch (err) {
      console.error(`Failed to reset step: ${step.fileSource}`, err);
      return null;
    }
  }
  
  /* Save changes to a step */
  function saveStepChanges(stepId, menuName, stepPrompt, llmInstructions, newStepId = null) {
    // Check if we're changing the ID
    const oldStepId = stepId;
    const newId = newStepId || oldStepId;
    
    // Validate inputs
    if (!newId || !menuName) {
      return { success: false, message: "Step ID and Menu Name are required" };
    }
    
    // Check for duplicate ID
    if (newId !== oldStepId && currentSteps.some(s => s.id === newId)) {
      return { success: false, message: "Step ID must be unique" };
    }
    
    // Find current step
    const step = currentSteps.find(s => s.id === oldStepId);
    if (!step) {
      return { success: false, message: "Step not found" };
    }
    
    // Update step properties
    step.menuName = menuName;
    step.content.stepPrompt = stepPrompt;
    step.content.llmInstructions = llmInstructions;
    
    // Handle ID change if needed (only for virtual steps)
    if (step.isVirtual && newId !== oldStepId) {
      step.id = newId;
      currentEditingStep = newId;
      
      // Update dependencies in all steps that reference this one
      currentSteps.forEach(s => {
        s.dependencies = s.dependencies.map(dep => dep === oldStepId ? newId : dep);
      });
    }
    
    // Mark as modified if it's a file-based step
    if (!step.isVirtual) {
      step.isModified = true;
    }
    
    // Update dependencies
    currentSteps.forEach(s => {
      s.dependencies = detectDependencies(s, currentSteps);
    });
    
    // Save changes
    saveUserSteps();
    hasUnsavedChanges = false;
    
    return { success: true, message: "Step saved successfully", step };
  }
  
  /* Get all available variables for the variable picker */
  function getAvailableVariables() {
    const variables = [
      { id: 'message_content', name: 'Message Content', category: 'Input' }
    ];
    
    // Add variables from all steps
    currentSteps.forEach(step => {
      if (step.id !== currentEditingStep) {
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
    
    return variables;
  }
  
  /* Run all steps sequentially */
  async function runSteps(messageContent, apiKey, model, callbacks = {}) {
    const { onStepStart, onStepComplete, onProgress, onComplete, onError } = callbacks;
    
    try {
      const steps = [...currentSteps];
      if (steps.length === 0) {
        throw new Error("No steps configured");
      }
      
      // Sort by position
      steps.sort((a, b) => a.position - b.position);
      
      let stepResults = {};
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNumber = i + 1;
        
        if (onProgress) {
          onProgress(stepNumber - 1, steps.length);
        }
        
        if (onStepStart) {
          onStepStart(step, stepNumber, steps.length);
        }
        
        let prompt = step.content.stepPrompt;
        prompt = prompt.replace("{message_content}", messageContent);
        
        // Replace variables from previous steps
        steps.forEach(prevStep => {
          const outputKey = `${prevStep.id}_output`;
          const summaryKey = `${prevStep.id}_summary`;
          if (stepResults[outputKey]) {
            prompt = prompt.replace(`{${outputKey}}`, stepResults[outputKey]);
          }
          if (stepResults[summaryKey]) {
            prompt = prompt.replace(`{${summaryKey}}`, stepResults[summaryKey]);
          }
        });
        
        prompt += "\n\n" + step.content.llmInstructions;
        
        const openaiResponse = await ApiService.callOpenAI(prompt, apiKey, model);
        const { responseContent, responseSummary } = ApiService.parseLLMResponse(openaiResponse);
        
        stepResults[`${step.id}_output`] = responseContent;
        stepResults[`${step.id}_summary`] = responseSummary;
        
        if (onStepComplete) {
          onStepComplete(step, {
            output: responseContent,
            summary: responseSummary,
            stepNumber,
            totalSteps: steps.length
          });
        }
      }
      
      if (onProgress) {
        onProgress(steps.length, steps.length);
      }
      
      if (onComplete) {
        onComplete(stepResults);
      }
      
      return stepResults;
    } catch (error) {
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }
  
  // Public API
  return {
    loadSteps,
    getCurrentSteps: () => currentSteps,
    createNewStep,
    cloneStep,
    deleteStep,
    setCurrentEditingStep,
    getCurrentEditingStep: () => currentEditingStep,
    markUnsavedChanges,
    hasUnsavedStepChanges,
    checkForCircularDependencies,
    resetStepToOriginal,
    saveStepChanges,
    getAvailableVariables,
    saveUserSteps,
    runSteps
  };
  })();
  