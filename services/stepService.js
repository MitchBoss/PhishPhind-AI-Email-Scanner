/**
 * stepService.js - Manage analysis steps
 */

const StepService = (function() {
    // Current steps
    let currentSteps = [];
    
    /**
     * Initialize the step service
     */
    async function init() {
      // Load steps
      await getSteps();
      
      console.log('StepService initialized');
    }
    
    /**
     * Parse step file content
     * @param {string} content - File content
     * @returns {Object} - Parsed step data
     */
    function parseStepFile(content) {
      return {
        menuName: content.match(/\[MENU_Name\](.*?)(?=\[|\s*$)/s)?.[1]?.trim() || '',
        stepPrompt: content.match(/\[STEP_PROMPT\](.*?)(?=\[|\s*$)/s)?.[1]?.trim() || '',
        llmInstructions: content.match(/\[LLM_INSTRUCTIONS\](.*?)(?=\[|\s*$)/s)?.[1]?.trim() || ''
      };
    }
    
    /**
     * Load steps from configuration
     * @param {boolean} forceLoadDefault - Force loading default steps
     * @returns {Promise<Array>} - Steps
     */
    async function getSteps(forceLoadDefault = false) {
      try {
        // Get steps configuration
        const stepConfig = ConfigService.getSteps();
        
        // Get user modifications from localStorage
        const userSteps = forceLoadDefault ? {} : 
                          JSON.parse(localStorage.getItem('user_steps') || '{}');
        const virtualSteps = forceLoadDefault ? [] : 
                            JSON.parse(localStorage.getItem('virtual_steps') || '[]');
        
        // Whether to use default or custom configuration
        const useDefaultConfig = forceLoadDefault || !localStorage.getItem('custom_steps_mode');
        
        // If we're in custom mode and have virtual steps, only use those
        if (!useDefaultConfig && virtualSteps.length > 0) {
          const customSteps = [...virtualSteps];
          
          // Sort by position
          customSteps.sort((a, b) => a.position - b.position);
          
          // Update dependencies
          customSteps.forEach(step => {
            step.dependencies = detectDependencies(step, customSteps);
          });
          
          currentSteps = customSteps;
          return customSteps;
        }
        
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
        
        // If we're in default mode, use the default steps + virtual ones
        // If we're in custom mode but have no virtual steps, convert to custom mode
        // with the loaded steps as a starting point
        let allSteps;
        if (useDefaultConfig) {
          allSteps = [
            ...loadedSteps,
            ...virtualSteps.map(vs => ({...vs, isVirtual: true}))
          ];
          
          // Store the current steps mode
          localStorage.setItem('custom_steps_mode', 'false');
        } else {
          // We're in custom mode but have no virtual steps - convert loaded steps to virtual
          allSteps = loadedSteps.map(step => ({
            ...step,
            isVirtual: true,
            // Keep original file reference for reset functionality
            originalFile: step.fileSource
          }));
          
          // Save these as virtual steps
          localStorage.setItem('virtual_steps', JSON.stringify(allSteps));
          localStorage.setItem('custom_steps_mode', 'true');
        }
        
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
    
    /**
     * Detect step dependencies
     * @param {Object} step - Step to analyze
     * @param {Array} allSteps - All steps
     * @returns {Array} - List of dependency IDs
     */
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
    
    /**
     * Create a new step
     * @returns {Promise<Object>} - Created step
     */
    async function createStep() {
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
      
      // Set to custom mode
      localStorage.setItem('custom_steps_mode', 'true');
      
      // Save
      saveSteps(currentSteps);
      
      return newStep;
    }
    
    /**
     * Clone an existing step
     * @param {string} stepId - ID of step to clone
     * @returns {Promise<Object>} - Cloned step
     */
    async function cloneStep(stepId) {
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
      
      // Set to custom mode
      localStorage.setItem('custom_steps_mode', 'true');
      
      // Save
      saveSteps(currentSteps);
      
      return clonedStep;
    }
    
    /**
     * Delete a step
     * @param {string} stepId - ID of step to delete
     * @returns {Promise<boolean>} - Success
     */
    async function deleteStep(stepId) {
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
      
      // If all steps are deleted, set custom mode
      if (currentSteps.length === 0) {
        localStorage.setItem('custom_steps_mode', 'true');
      }
      
      // Save
      saveSteps(currentSteps);
      
      return true;
    }
    
    /**
     * Check for circular dependencies
     * @param {Array} steps - Steps to check
     * @returns {boolean} - True if circular dependencies exist
     */
    function hasCircularDependencies(steps) {
      // Simple cycle detection using DFS
      const visited = new Set();
      const recStack = new Set();
      let hasCycle = false;
      
      function dfs(stepId) {
        if (hasCycle) return;
        
        visited.add(stepId);
        recStack.add(stepId);
        
        const step = steps.find(s => s.id === stepId);
        if (step && step.dependencies) {
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
      
      for (const step of steps) {
        if (!visited.has(step.id)) {
          dfs(step.id);
        }
      }
      
      return hasCycle;
    }
    
    /**
     * Reset step to original file content
     * @param {string} stepId - ID of step to reset
     * @returns {Promise<Object>} - Reset step
     */
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
        saveSteps(currentSteps);
        
        return step;
      } catch (err) {
        console.error(`Failed to reset step: ${step.fileSource}`, err);
        return null;
      }
    }
    
    /**
     * Save step changes
     * @param {string} stepId - ID of step to save
     * @param {string} menuName - Menu name
     * @param {string} stepPrompt - Step prompt
     * @param {string} llmInstructions - LLM instructions
     * @param {string} newStepId - New step ID (optional)
     * @returns {Promise<Object>} - Result
     */
    async function saveStepChanges(stepId, menuName, stepPrompt, llmInstructions, newStepId = null) {
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
      
      // Set custom mode
      localStorage.setItem('custom_steps_mode', 'true');
      
      // Handle ID change if needed (only for virtual steps)
      if (step.isVirtual && newId !== oldStepId) {
        step.id = newId;
        
        // Update dependencies in all steps that reference this one
        currentSteps.forEach(s => {
          if (s.dependencies && s.dependencies.includes(oldStepId)) {
            s.dependencies = s.dependencies.map(dep => dep === oldStepId ? newId : dep);
          }
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
      saveSteps(currentSteps);
      
      return { success: true, message: "Step saved successfully", step };
    }
    
    /**
     * Save steps to local storage
     * @param {Array} steps - Steps to save
     */
    function saveSteps(steps) {
      // Separate virtual and modified steps
      const userSteps = {};
      const virtualSteps = [];
      
      steps.forEach(step => {
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
      steps.forEach(step => {
        step.dependencies = detectDependencies(step, steps);
      });
      
      // Update current steps
      currentSteps = steps;
      
      return steps;
    }
    
    /**
     * Restore default steps
     * @returns {Promise<Array>} - Default steps
     */
    async function restoreDefaultSteps() {
      // Reset custom mode flag
      localStorage.setItem('custom_steps_mode', 'false');
      localStorage.removeItem('virtual_steps');
      localStorage.removeItem('user_steps');
      
      // Load default steps
      await ConfigService.loadDefaultSteps();
      
      // Reload steps
      return getSteps(true);
    }
    
    // Register service
    Services.register('StepService', {
      init,
      getSteps,
      createStep,
      cloneStep,
      deleteStep,
      hasCircularDependencies,
      resetStepToOriginal,
      saveStepChanges,
      saveSteps,
      restoreDefaultSteps,
      getCurrentSteps: () => currentSteps
    });
    
    // Return public API
    return {
      init,
      getSteps,
      createStep,
      cloneStep,
      deleteStep,
      hasCircularDependencies,
      resetStepToOriginal,
      saveStepChanges,
      saveSteps,
      restoreDefaultSteps,
      getCurrentSteps: () => currentSteps
    };
  })();