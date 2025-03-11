/***********************************************
 * analysis.js - Handles email analysis and 
 *               results display
 ***********************************************/
const AnalysisModule = (function() {
  // Module state
  const state = {
    currentAnalysis: null,
    isAnalyzing: false,
    currentStep: 0,
    totalSteps: 0
  };
  
  // Initialize module
  async function init() {
    // Subscribe to events
    if (window.EventBus) {
      console.log("Setting up EventBus subscriptions for analysis module");
      window.EventBus.subscribe('analysis:start', handleAnalysisStart);
      window.EventBus.subscribe('analysis:complete', displayResults);
      window.EventBus.subscribe('analysis:error', handleAnalysisError);
    } else {
      console.error("EventBus not available when initializing analysis module");
    }
    
    // Also listen for the app:startAnalysis event directly
    if (window.EventBus) {
      window.EventBus.subscribe('app:startAnalysis', () => {
        console.log("Received app:startAnalysis event in analysis module");
        startAnalysis().catch(err => {
          console.error("startAnalysis failed:", err);
        });
      });
    }
    
    console.log('Analysis module initialized');
    return true;
  }
  
  // Mount the module
  async function mount(container) {
    console.log('Mounting analysis module');
    try {
      // Load HTML template
      const response = await fetch('modules/analysis/analysis.html');
      const html = await response.text();
      container.innerHTML = html;
      
      // Set up event listeners for the export PDF button
      const savePdfBtn = document.getElementById('savePdfBtn');
      if (savePdfBtn) {
        savePdfBtn.addEventListener('click', exportAnalysisAsPdf);
      }
      
      // Create UI components using ComponentLoader if available
      if (window.ComponentLoader) {
        // We're not creating a PDF button here anymore - using the one from HTML template
        
        // Create the Analysis History card
        const historyContainer = document.getElementById('analysisHistoryContainer');
        if (historyContainer) {
          const historyCard = await window.ComponentLoader.createCard({
            id: 'analysisHistoryCard',
            title: 'Analysis History',
            content: '<div id="analysisHistory"><p class="text-gray-500">No previous analyses.</p></div>'
          });
          historyContainer.appendChild(historyCard);
        }
      } else {
        console.warn('ComponentLoader not available, falling back to direct DOM manipulation');
        
        // Set up event handlers for the Export PDF button (legacy approach)
        // Removed the duplicate PDF button creation
      }
      
      // Render history
      renderHistory();
      
      // Make sure progress bar has progress text element
      ensureProgressTextElement();
      
      console.log('Analysis module mounted successfully');
    } catch (error) {
      console.error('Error mounting analysis module:', error);
    }
  }
  
  // Ensure progress text element exists
  function ensureProgressTextElement() {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      const progressContainer = progressBar.parentElement;
      if (progressContainer && !document.getElementById('progress-text')) {
        const progressText = document.createElement('div');
        progressText.id = 'progress-text';
        progressText.innerHTML = `0% <span style="opacity: 0.9; font-size: 0.7rem;">(0 of 0 steps)</span>`;
        progressContainer.appendChild(progressText);
      }
    }
  }
  
  // Unmount the module
  function unmount() {
    // Clean up event handlers
    console.log('Analysis module unmounted');
  }
  
  /**
   * Now returns a Promise so that external code calling
   * startAnalysis().then(...) won't fail.
   */
  function startAnalysis() {
    return new Promise((resolve, reject) => {
      // Validate API key is set
      if (!window.ConfigService) {
        console.error("ConfigService not available");
        if (window.NotificationService) {
          window.NotificationService.error("Configuration service not available");
        }
        return reject(new Error("Configuration service not available"));
      }
      
      const config = window.ConfigService.getApiConfig();
      if (!config.apiKey) {
        if (window.NotificationService) {
          window.NotificationService.warning('Please configure your API key in settings');
        }
        if (window.ModalModules) {
          window.ModalModules.showModal('settings');
        }
        return reject(new Error("No API key configured"));
      }
      
      // Get message content
      const messageEl = document.getElementById('messageText');
      if (!messageEl) {
        console.error("Message text element not found");
        return reject(new Error("Message text element not found"));
      }
      
      const messageContent = messageEl.value.trim();
      if (!messageContent) {
        if (window.NotificationService) {
          window.NotificationService.error('Please provide message content to analyze');
        }
        return reject(new Error("No message content provided"));
      }
      
      console.log("Starting analysis with content length:", messageContent.length);
      
      // Set analyzing state
      state.isAnalyzing = true;
      
      // Trigger analysis start event
      if (window.EventBus) {
        console.log("Publishing analysis:start event");
        window.EventBus.publish('analysis:start', {
          content: messageContent,
          apiKey: config.apiKey,
          model: config.model
        });
        // Resolve immediately; the actual steps run in handleAnalysisStart
        resolve();
      } else {
        console.log("EventBus not available, calling handleAnalysisStart directly");
        handleAnalysisStart({
          content: messageContent,
          apiKey: config.apiKey,
          model: config.model
        })
        .then(() => resolve())
        .catch(err => reject(err));
      }
    });
  }
  
  /**
   * Called when 'analysis:start' is published.  
   * Also returns a Promise so the calling code can chain off it if needed.
   */
  function handleAnalysisStart(data) {
    console.log("Analysis start handler called with data:", !!data);
    
    if (!data || !data.content) {
      console.error("Invalid data received for analysis:start event");
      if (window.NotificationService) {
        window.NotificationService.error('Invalid analysis data received');
      }
      // Return a rejected Promise to maintain consistent promise flow
      return Promise.reject(new Error("Invalid analysis data received"));
    }
    
    state.isAnalyzing = true;
    state.currentAnalysis = {
      content: data.content,
      startTime: new Date(),
      results: {}
    };
    
    // Show spinner and progress
    showSpinner("Starting analysis...");
    updateProgressBar(0, 1);
    
    // Clear previous results (with null checks to avoid errors)
    clearResults();
    
    console.log("Starting analysis steps with content length:", data.content.length);
    
    return runAnalysisSteps(data.content, data.apiKey, data.model)
      .then(results => {
        console.log("Analysis completed successfully");
        state.currentAnalysis.results = results;
        state.currentAnalysis.endTime = new Date();
        state.isAnalyzing = false;
        
        if (window.EventBus) {
          window.EventBus.publish('analysis:complete', {
            content: data.content,
            results,
            startTime: state.currentAnalysis.startTime,
            endTime: state.currentAnalysis.endTime
          });
        }
      })
      .catch(error => {
        console.error("Analysis failed:", error);
        state.isAnalyzing = false;
        hideSpinner();
        
        if (window.NotificationService) {
          window.NotificationService.error('Analysis failed: ' + error.message);
        }
        
        if (window.EventBus) {
          window.EventBus.publish('analysis:error', {
            error,
            content: data.content
          });
        }
        
        // Re-throw so the caller can handle it
        throw error;
      });
  }
  
  /**
   * Called when 'analysis:error' is published.
   */
  function handleAnalysisError(data) {
    hideSpinner();
    if (window.NotificationService && data && data.error) {
      window.NotificationService.error('Analysis failed: ' + data.error.message);
    }
    console.error('Analysis error:', data ? data.error : '(no data)');
  }
  
  /**
   * Actually runs the multi-step analysis logic.
   */
  async function runAnalysisSteps(messageContent, apiKey, model) {
    try {
      console.log("Loading steps from StepService...");
      // Get steps from StepService
      let steps = [];
      
      if (window.StepService) {
        steps = await window.StepService.getSteps();
        console.log(`Loaded ${steps.length} steps from StepService`);
      } else {
        console.warn("StepService not available, using default step");
      }
      
      if (!steps || steps.length === 0) {
        console.log("No steps found, creating default step");
        // Create a default step if none are configured
        steps = [{
          id: "default_analysis",
          menuName: "Basic Analysis",
          position: 0,
          isVirtual: true, 
          content: {
            stepPrompt: "Analyze the following email content for potential phishing or security threats:\n\n{message_content}",
            llmInstructions: "Provide a detailed analysis identifying any suspicious elements, potential phishing attempts, or security concerns. Format your response with clear sections.\n\n[Response]\nYour detailed analysis goes here.\n[Response Summary]\nA brief summary of your findings."
          },
          dependencies: []
        }];
      }
      
      // Store total steps for progress tracking
      state.totalSteps = steps.length;
      state.currentStep = 0;
      
      updateProgressBar(0, steps.length);
      
      let stepResults = {};
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNumber = i + 1;
        
        // Update current step for progress tracking
        state.currentStep = stepNumber;
        
        console.log(`Processing step ${stepNumber}/${steps.length}: ${step.menuName}`);
        updateProgressBar(stepNumber - 1, steps.length);
        showSpinner(`Running Step ${stepNumber}: ${step.menuName}...`);
        
        try {
          let prompt = step.content.stepPrompt;
          prompt = prompt.replace("{message_content}", messageContent);
          
          // Replace variables from previous steps
          steps.forEach(prevStep => {
            const outputKey = `${prevStep.id}_output`;
            const summaryKey = `${prevStep.id}_summary`;
            if (stepResults[outputKey]) {
              const regex = new RegExp(`{${outputKey}}`, 'g');
              prompt = prompt.replace(regex, stepResults[outputKey]);
            }
            if (stepResults[summaryKey]) {
              const regex = new RegExp(`{${summaryKey}}`, 'g');
              prompt = prompt.replace(regex, stepResults[summaryKey]);
            }
          });
          
          prompt += "\n\n" + step.content.llmInstructions;
          
          console.log(`Calling API for step ${step.id}`);
          if (!window.ApiService) {
            throw new Error("API service not available");
          }
          
          const openaiResponse = await window.ApiService.callOpenAI(prompt, apiKey, model);
          console.log(`Got API response for step ${step.id}, parsing response`);
          
          const { responseContent, responseSummary } = window.ApiService.parseLLMResponse(openaiResponse);
          
          stepResults[`${step.id}_output`] = responseContent;
          stepResults[`${step.id}_summary`] = responseSummary;
          
          // Display the result
          displayResult({
            stepId: step.id,
            menuName: step.menuName,
            output: responseContent,
            summary: responseSummary,
            stepNumber,
            totalSteps: steps.length
          });
        } catch (stepError) {
          console.error(`Error in step ${step.id}:`, stepError);
          // Continue to next step but track the error
          stepResults[`${step.id}_output`] = `Error: ${stepError.message}`;
          stepResults[`${step.id}_summary`] = "An error occurred during analysis.";
          
          // Display error result
          displayResult({
            stepId: step.id,
            menuName: step.menuName,
            output: `Error: ${stepError.message}\n\nPlease check your API key and settings, then try again.`,
            summary: "Analysis failed for this step.",
            stepNumber,
            totalSteps: steps.length
          });
        }
      }
      
      updateProgressBar(steps.length, steps.length);
      hideSpinner();
      
      if (window.NotificationService) {
        window.NotificationService.success("Analysis completed successfully!");
      }
      
      // Save to history
      if (window.HistoryService) {
        window.HistoryService.saveAnalysis(messageContent, stepResults);
      }
      renderHistory();
      
      // Show export button
      const exportContainer = document.getElementById('exportContainer');
      if (exportContainer) {
        exportContainer.classList.remove('hidden');
      }
      
      return stepResults;
    } catch (error) {
      console.error("Error in runAnalysisSteps:", error);
      hideSpinner();
      throw error;
    }
  }
  
  /**
   * Display the final results event if needed (analysis:complete).
   */
  function displayResults(data) {
    // Step-by-step results are already displayed in displayResult.
    // We can do final updates here if needed:
    const exportContainer = document.getElementById('exportContainer');
    if (exportContainer) {
      exportContainer.classList.remove('hidden');
    }
  }
  
  /**
   * Clear previous results. Now with null checks
   * to avoid reading classList of a null element.
   */
  function clearResults() {
    const resultTabs = document.getElementById('resultTabs');
    const resultTabsContent = document.getElementById('resultTabsContent');
    const emptyResultsMessage = document.getElementById('emptyResultsMessage');
    const exportContainer = document.getElementById('exportContainer');
    
    if (resultTabs) {
      resultTabs.innerHTML = '';
    }
    if (resultTabsContent) {
      resultTabsContent.innerHTML = '';
    }
    if (emptyResultsMessage) {
      emptyResultsMessage.classList.remove('hidden');
    }
    if (exportContainer) {
      exportContainer.classList.add('hidden');
    }
  }
  
  /**
   * Display a single result step in a tab.
   */
  function displayResult(result) {
    // Hide empty message
    const emptyResultsMessage = document.getElementById('emptyResultsMessage');
    if (emptyResultsMessage) {
      emptyResultsMessage.classList.add('hidden');
    }
    
    const tabId = `content-${result.stepId}`;
    const resultTabs = document.getElementById('resultTabs');
    const resultContent = document.getElementById('resultTabsContent');
    
    if (!resultTabs || !resultContent) {
      return; // The module might not be mounted yet
    }
    
    // Check if tab already exists
    if (document.getElementById(`tab-${result.stepId}`)) {
      // Update existing tab content
      const existingTabContent = document.getElementById(tabId);
      if (existingTabContent) {
        const mdOutput = marked.parse(result.output || "");
        const sanitizedOutput = DOMPurify.sanitize(mdOutput);
        const mdSummary = marked.parse(result.summary || "");
        const sanitizedSummary = DOMPurify.sanitize(mdSummary);
        
        existingTabContent.querySelector('.result-summary').innerHTML = sanitizedSummary;
        existingTabContent.querySelector('.result-content').innerHTML = sanitizedOutput;
      }
      return;
    }
    
    // Create new tab
    const tabLink = document.createElement('a');
    tabLink.id = `tab-${result.stepId}`;
    tabLink.href = `#${tabId}`;
    tabLink.className = 'text-gray-500 hover:text-gray-700 hover:border-gray-300 px-3 py-2 font-medium text-sm border-b-2 border-transparent transition-all duration-200 flex-shrink-0';
    tabLink.setAttribute('role', 'tab');
    
    // Add status indicator (spinner or checkmark)
    if (result.stepNumber < state.currentStep) {
      // This is a completed step
      const completionMark = document.createElement('span');
      completionMark.className = 'icon icon-check icon-sm text-green-500 mr-2';
      tabLink.appendChild(completionMark);
    } else if (result.stepNumber === state.currentStep) {
      // This is the current in-progress step
      const spinner = document.createElement('span');
      spinner.className = 'icon icon-spinner icon-sm mr-2';
      tabLink.appendChild(spinner);
    }
    
    // Add tab text as a separate span
    const tabText = document.createElement('span');
    tabText.textContent = result.menuName;
    tabLink.appendChild(tabText);
    
    resultTabs.appendChild(tabLink);
    
    const mdOutput = marked.parse(result.output || "");
    const sanitizedOutput = DOMPurify.sanitize(mdOutput);
    const mdSummary = marked.parse(result.summary || "");
    const sanitizedSummary = DOMPurify.sanitize(mdSummary);
    
    // Create tab content
    const tabContent = document.createElement('div');
    tabContent.id = tabId;
    tabContent.className = 'tab-pane';
    tabContent.setAttribute('role', 'tabpanel');
    tabContent.style.display = 'none';
    
    tabContent.innerHTML = `
      <h3 class="text-xl font-semibold text-gray-800 mb-3">${DOMPurify.sanitize(result.menuName)}</h3>
      <div class="mb-4 bg-gray-50 p-4 rounded-md border border-gray-200 result-summary">
        <h4 class="text-base font-medium text-gray-700 mb-2">Summary</h4>
        ${sanitizedSummary}
      </div>
      <div class="prose max-w-none result-content">
        ${sanitizedOutput}
      </div>
    `;
    
    resultContent.appendChild(tabContent);
    
    // Set up tab switching
    tabLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Hide all tabs
      resultTabs.querySelectorAll('a').forEach(tab => {
        tab.classList.remove('border-brand-purple', 'text-brand-purple', 'bg-purple-50');
        tab.classList.add('text-gray-500', 'hover:text-gray-700', 'border-transparent');
      });
      
      resultContent.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
      });
      
      // Show active tab with better highlighting
      tabLink.classList.remove('text-gray-500', 'hover:text-gray-700', 'border-transparent');
      tabLink.classList.add('border-brand-purple', 'text-brand-purple', 'bg-purple-50');
      tabContent.style.display = 'block';
      
      // Scroll to make active tab visible
      tabLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    
    // Select the tab if it's the first one or the most recent completed step
    // Always select the most recent step that was completed or in progress
    const shouldSelectTab = (result.stepNumber === state.currentStep) || // Current step
                           (result.stepNumber === result.totalSteps) ||  // Final step
                           (resultTabs.children.length === 1);           // First step
    
    if (shouldSelectTab) {
      // Hide all other tabs
      resultTabs.querySelectorAll('a').forEach(tab => {
        tab.classList.remove('border-brand-purple', 'text-brand-purple', 'bg-purple-50');
        tab.classList.add('text-gray-500', 'hover:text-gray-700', 'border-transparent');
      });
      
      // Hide all other content panes
      resultContent.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
      });
      
      // Show this tab
      tabLink.classList.remove('text-gray-500', 'hover:text-gray-700', 'border-transparent');
      tabLink.classList.add('border-brand-purple', 'text-brand-purple', 'bg-purple-50');
      tabContent.style.display = 'block';
      
      // Scroll to this tab
      tabLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    // Convert previous step spinners to checkmarks
    if (result.stepNumber > 1) {
      resultTabs.querySelectorAll('.icon-spinner').forEach(spinner => {
        const tabElement = spinner.parentElement;
        if (tabElement && tabElement !== tabLink) {
          // Replace spinner with checkmark
          const checkmark = document.createElement('span');
          checkmark.className = 'icon icon-check icon-sm text-green-500 mr-2';
          spinner.parentNode.replaceChild(checkmark, spinner);
        }
      });
    }
  }
  
  /**
   * Render analysis history in the UI.
   */
  function renderHistory() {
    const historyContainer = document.getElementById('analysisHistory');
    if (!historyContainer) return;
    
    // Get history from persistence service
    const history = window.PersistenceManager ? window.PersistenceManager.getHistory() : [];
    
    if (history.length === 0) {
      historyContainer.innerHTML = '<p class="text-gray-500">No previous analyses.</p>';
      return;
    }
    
    // Create history items
    let historyHTML = '<div class="space-y-3">';
    
    history.forEach((item, index) => {
      const timestamp = new Date(item.timestamp).toLocaleString();
      const subject = item.analysis && item.analysis.data_extraction ? 
        item.analysis.data_extraction.subject || 'No subject' : 'No subject';
      
      if (window.ComponentLoader) {
        // Use ComponentLoader to create a mini card for each history item (will be added in the next update)
        historyHTML += `
          <div class="history-item p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer" data-index="${index}">
            <p class="font-medium">${subject}</p>
            <p class="text-sm text-gray-600">${timestamp}</p>
          </div>
        `;
      } else {
        // Legacy approach
        historyHTML += `
          <div class="history-item p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer" data-index="${index}">
            <p class="font-medium">${subject}</p>
            <p class="text-sm text-gray-600">${timestamp}</p>
          </div>
        `;
      }
    });
    
    historyHTML += '</div>';
    historyContainer.innerHTML = historyHTML;
    
    // Add event listeners to history items
    const historyItems = historyContainer.querySelectorAll('.history-item');
    historyItems.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index, 10);
        loadHistoryItem(index);
      });
    });
  }
  
  /**
   * Load a history item back into the UI.
   */
  function loadHistoryItem(index) {
    if (!window.HistoryService || !window.StepService) return;
    
    const historyItem = window.HistoryService.getHistoryItem(index);
    if (!historyItem) return;
    
    // Clear current results
    clearResults();
    
    // Load steps
    window.StepService.getSteps().then(steps => {
      // Display each step result
      let stepNumber = 1;
      state.totalSteps = steps.length;
      state.currentStep = steps.length; // All steps complete when loading history
      
      steps.forEach(step => {
        const output = historyItem.results[`${step.id}_output`] || "";
        const summary = historyItem.results[`${step.id}_summary`] || "";
        
        displayResult({
          stepId: step.id,
          menuName: step.menuName,
          output,
          summary,
          stepNumber,
          totalSteps: steps.length
        });
        
        stepNumber++;
      });
      
      // Show export button
      const exportContainer = document.getElementById('exportContainer');
      if (exportContainer) {
        exportContainer.classList.remove('hidden');
      }
      
      // Update progress bar to 100%
      updateProgressBar(steps.length, steps.length);
    });
  }
  
  /**
   * Export current analysis as PDF using PdfService.
   */
  function exportAnalysisAsPdf() {
    if (window.PdfService) {
      try {
        // Generate PDF and save it
        const doc = window.PdfService.generatePDF();
        doc.save('phishphind-analysis.pdf');
        
        if (window.NotificationService) {
          window.NotificationService.success("Analysis exported as PDF");
        }
      } catch (error) {
        console.error("Error generating PDF:", error);
        if (window.NotificationService) {
          window.NotificationService.error("Error generating PDF: " + error.message);
        }
      }
    } else {
      console.error("PdfService not available");
      if (window.NotificationService) {
        window.NotificationService.error("PDF service not available");
      }
    }
  }
  
  /**
   * Show spinner and set message
   */
  function showSpinner(message) {
    const spinnerContainer = document.getElementById('spinner-container');
    const spinnerMessage = document.getElementById('spinner-message');
    
    if (!spinnerContainer || !spinnerMessage) return;
    
    spinnerMessage.textContent = message || "Processing...";
    spinnerContainer.classList.remove('hidden');
  }
  
  /**
   * Hide spinner
   */
  function hideSpinner() {
    const spinnerContainer = document.getElementById('spinner-container');
    if (!spinnerContainer) return;
    
    spinnerContainer.classList.add('hidden');
  }
  
  /**
   * Update the progress bar
   */
  function updateProgressBar(current, total) {
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = progressBar ? progressBar.parentElement : null;
    
    if (!progressBar || !progressContainer) return;
    
    const pct = Math.round((current / total) * 100);
    progressBar.style.width = pct + "%";
    
    // Create or update the progress text element
    let progressText = document.getElementById('progress-text');
    if (!progressText) {
      progressText = document.createElement('div');
      progressText.id = 'progress-text';
      progressContainer.appendChild(progressText);
    }
    
    // Set progress text with both percentage and step count
    progressText.innerHTML = `${pct}% <span style="opacity: 0.9; font-size: 0.7rem;">(${current} of ${total} steps)</span>`;
    
    // Add completion animation when progress reaches 100%
    if (pct === 100) {
      progressBar.classList.add('complete');
      
      // Update all tab indicators when complete
      document.querySelectorAll('.icon-spinner').forEach(spinner => {
        // Create checkmark to replace spinner
        const checkmark = document.createElement('span');
        checkmark.className = 'icon icon-check icon-sm text-green-500 mr-2';
        
        // Replace spinner with checkmark
        spinner.parentNode.replaceChild(checkmark, spinner);
      });
    } else {
      progressBar.classList.remove('complete');
    }
  }
  
  // Register module with ModuleManager
  if (window.ModuleManager) {
    window.ModuleManager.registerModule({
      id: 'analysis',
      name: 'Analysis',
      template: 'modules/analysis/analysis.html',
      css: 'modules/analysis/analysis.css',
      init,
      mount,
      unmount,
      // Expose startAnalysis if you want to call it directly
      startAnalysis 
    });
  }
  
  // Return public API
  return {
    init,
    mount,
    unmount,
    startAnalysis
  };
})();