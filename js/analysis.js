/* analysis.js */

/**
 * Parse LLM response to extract content and summary
 * @param {string} output - The raw LLM output
 * @returns {Object} - Parsed response content and summary
 */
function parseLLMResponse(output) {
    const text = output || "";
    let responseContent = "";
    let responseSummary = "No summary provided.";
    const respPattern = /\[Response\](.*?)\[Response Summary\]/is;
    const summaryPattern = /\[Response Summary\](.*)$/is;
    const respMatch = text.match(respPattern);
    if (respMatch) {
      responseContent = respMatch[1].trim();
    } else {
      responseContent = text.trim();
    }
    const summaryMatch = text.match(summaryPattern);
    if (summaryMatch) {
      responseSummary = summaryMatch[1].trim();
    }
    return { responseContent, responseSummary };
  }
  
  /**
   * Call OpenAI API
   * @param {string} prompt - The prompt to send
   * @param {string} apiKey - The OpenAI API key
   * @param {string} model - The model ID to use
   * @returns {Promise<string>} - The response text
   */
  async function callOpenAI(prompt, apiKey, model) {
    const url = "https://api.openai.com/v1/chat/completions";
    const body = {
      model: model,
      messages: [{ role: "user", content: prompt }]
    };
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    };
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  /**
   * Run all analysis steps sequentially
   * @param {string} messageContent - The email message content to analyze
   */
  async function runSteps(messageContent) {
    const apiConfigStr = localStorage.getItem("openai_config");
    if (!apiConfigStr) {
      showError("Please set your API key in settings.");
      return;
    }
    const config = JSON.parse(apiConfigStr);
    if (!config.apiKey) {
      showError("Please provide a valid API key.");
      return;
    }
    $("#resultTabs").empty();
    $("#resultTabsContent").empty();
    
    // Use currentSteps instead of loading steps again
    let steps = [...currentSteps]; // Make a copy to avoid modifying the original
    
    // Make sure steps are sorted by position
    steps.sort((a, b) => a.position - b.position);
    
    updateProgressBar(0, steps.length);
    showSpinner("Starting analysis...");
  
    let stepResults = {};
  
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepNumber = i + 1;
      updateProgressBar(stepNumber - 1, steps.length);
      showSpinner(`Running Step ${stepNumber}: ${step.menuName}...`);
  
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
      
      try {
        const openaiResponse = await callOpenAI(prompt, config.apiKey, config.model);
        const { responseContent, responseSummary } = parseLLMResponse(openaiResponse);
        stepResults[`${step.id}_output`] = responseContent;
        stepResults[`${step.id}_summary`] = responseSummary;
        displayResult({
          stepName: step.id,
          menuName: step.menuName,
          output: responseContent,
          summary: responseSummary,
          stepNumber,
          totalSteps: steps.length
        });
      } catch (err) {
        showError("Error during step " + step.menuName + ": " + err.message);
        hideSpinner();
        return;
      }
    }
    updateProgressBar(steps.length, steps.length);
    hideSpinner();
    showSuccess("Analysis completed successfully!");
    saveAnalysisHistory(messageContent, stepResults);
  }
  
  /**
   * Display result in a new tab
   * @param {Object} result - The result to display
   */
  function displayResult(result) {
    const tabId = `content-${result.stepName}`;
    const tabLink = $(`<a class="nav-link" data-toggle="tab" role="tab" href="#${tabId}">${result.menuName}</a>`).attr("id", `tab-${result.stepName}`);
    const tabItem = $("<li class='nav-item'></li>").append(tabLink);
    $("#resultTabs").append(tabItem);
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
    $("#resultTabsContent").append(tabContent);
    if (result.stepNumber === 1) {
      tabLink.addClass("active");
      tabContent.addClass("show active");
    }
  }
  
  /**
   * Save analysis history to localStorage
   * @param {string} rawMessage - The original message
   * @param {Object} stepResults - The results from each step
   */
  function saveAnalysisHistory(rawMessage, stepResults) {
    const historyStr = localStorage.getItem("analysis_history") || "[]";
    const history = JSON.parse(historyStr);
    const timestamp = new Date().toISOString();
    history.unshift({
      timestamp,
      message: rawMessage,
      results: stepResults
    });
    while (history.length > 10) {
      history.pop();
    }
    localStorage.setItem("analysis_history", JSON.stringify(history));
    renderHistory();
  }
  
  /**
   * Render analysis history
   */
  function renderHistory() {
    const historyStr = localStorage.getItem("analysis_history") || "[]";
    const history = JSON.parse(historyStr);
    const container = $("#analysisHistory");
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
  }
  
  /**
   * Load a history analysis into the results view
   * @param {number} index - The history item index to load
   */
  async function loadHistoryAnalysis(index) {
    const historyStr = localStorage.getItem("analysis_history") || "[]";
    const history = JSON.parse(historyStr);
    const analysis = history[index];
    if (!analysis) return;
    $("#resultTabs").empty();
    $("#resultTabsContent").empty();
    
    // Load current steps
    let steps = await loadSteps();
    let stepResults = analysis.results;
    let stepNumber = 1;
    
    steps.forEach(step => {
      const output = stepResults[`${step.id}_output`] || "";
      const summary = stepResults[`${step.id}_summary`] || "";
      displayResult({
        stepName: step.id,
        menuName: step.menuName,
        output,
        summary,
        stepNumber,
        totalSteps: steps.length
      });
      stepNumber++;
    });
  }
  
  /**
   * Generate PDF using jsPDF
   */
  function generatePDF() {
    const doc = new jsPDF();
    const title = "Analysis Results";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, 105, 10, { align: "center" });
    let yPos = 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    $("#resultTabsContent .tab-pane").each((i, el) => {
      const $el = $(el);
      const heading = $el.find("h3").text();
      const summaryHtml = $el.find("div:nth-of-type(1)").html();
      const contentHtml = $el.find("div:nth-of-type(2)").html();
      doc.setFont("helvetica", "bold");
      doc.text(heading, 10, yPos);
      yPos += 8;
      doc.setFont("helvetica", "normal");
      const summaryText = $("<div>").html(summaryHtml).text();
      const lines = doc.splitTextToSize(summaryText, 180);
      lines.forEach(line => {
        doc.text(line, 10, yPos);
        yPos += 6;
      });
      yPos += 4;
      const outputText = $("<div>").html(contentHtml).text();
      const outLines = doc.splitTextToSize(outputText, 180);
      outLines.forEach(line => {
        doc.text(line, 10, yPos);
        yPos += 6;
      });
      yPos += 10;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    });
    doc.save("analysis_results.pdf");
  }
  