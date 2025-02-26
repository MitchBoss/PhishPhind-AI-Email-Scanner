/* app.js */

let STEPS = [];
let MODELS = [];

/* Load default JSON configurations from /config */
function loadDefaultConfigs() {
  return Promise.all([
    fetch('config/steps.json').then(res => res.json()),
    fetch('config/models.json').then(res => res.json())
  ]).then(([defaultSteps, defaultModels]) => {
    return { defaultSteps, defaultModels };
  });
}

/* Load stored settings from localStorage */
function loadSettings() {
  const configStr = localStorage.getItem("openai_config");
  const stepsConfigStr = localStorage.getItem("steps_config");
  const modelsConfigStr = localStorage.getItem("models_config");

  let apiConfig = configStr ? JSON.parse(configStr) : { apiKey: "", model: "" };
  let stepsConfig = stepsConfigStr ? JSON.parse(stepsConfigStr) : null;
  let modelsConfig = modelsConfigStr ? JSON.parse(modelsConfigStr) : null;

  return { apiConfig, stepsConfig, modelsConfig };
}

/* Save settings from UI into localStorage */
function saveSettings() {
  const apiKey = $('#apiKeyInput').val().trim();
  const model = $('#modelSelect').val();
  const config = { apiKey, model };
  localStorage.setItem("openai_config", JSON.stringify(config));

  // If editor containers are visible, use their content; otherwise use current STEPS and MODELS.
  if ($('#stepsEditorContainer').is(":visible")) {
    try {
      const stepsJson = JSON.parse($('#stepsEditor').val());
      localStorage.setItem("steps_config", JSON.stringify(stepsJson));
      STEPS = stepsJson;
    } catch (err) {
      showError("Invalid JSON in Workflow Steps configuration.");
      return;
    }
  }
  if ($('#modelsEditorContainer').is(":visible")) {
    try {
      const modelsJson = JSON.parse($('#modelsEditor').val());
      localStorage.setItem("models_config", JSON.stringify(modelsJson));
      MODELS = modelsJson;
    } catch (err) {
      showError("Invalid JSON in Models configuration.");
      return;
    }
  }
  populateModelDropdown();
  showSuccess("Settings saved!");
  // Close settings modal only if API key is provided
  if (apiKey) {
    $('#settingsModal').modal('hide');
  }
}

/* Reset configuration to defaults */
function resetToDefaults(keepAPIKey = true) {
  loadDefaultConfigs().then(({ defaultSteps, defaultModels }) => {
    localStorage.setItem("steps_config", JSON.stringify(defaultSteps));
    localStorage.setItem("models_config", JSON.stringify(defaultModels));
    STEPS = defaultSteps;
    MODELS = defaultModels;
    $('#stepsFileName').text("steps.json");
    $('#modelsFileName').text("models.json");
    if (!keepAPIKey) {
      localStorage.removeItem("openai_config");
      $('#apiKeyInput').val("");
    }
    populateModelDropdown();
    showSuccess("Configuration reset to defaults.");
  }).catch(err => {
    showError("Error resetting to defaults: " + err.message);
  });
}

/* Populate model dropdown using MODELS configuration */
function populateModelDropdown() {
  const modelSelect = $('#modelSelect');
  modelSelect.empty();
  if (MODELS && Array.isArray(MODELS)) {
    MODELS.forEach(modelObj => {
      const option = $('<option>').val(modelObj.id).text(modelObj.displayName);
      modelSelect.append(option);
    });
    const apiConfig = localStorage.getItem("openai_config");
    if (apiConfig) {
      const config = JSON.parse(apiConfig);
      modelSelect.val(config.model);
    }
  }
}

/* Load initial settings on page load */
function loadInitialSettings() {
  loadDefaultConfigs().then(({ defaultSteps, defaultModels }) => {
    let { apiConfig, stepsConfig, modelsConfig } = loadSettings();
    STEPS = stepsConfig || defaultSteps;
    MODELS = modelsConfig || defaultModels;

    $('#apiKeyInput').val(apiConfig.apiKey || "");
    populateModelDropdown();
    $('#stepsFileName').text("steps.json");
    $('#modelsFileName').text("models.json");
  }).catch(err => {
    showError("Error loading default configurations: " + err.message);
  });
}

/* Utility functions */
function showSpinner(message) {
  $("#spinner-message").text(message);
  $("#spinner-container").show();
}
function hideSpinner() {
  $("#spinner-container").hide();
}
function showError(msg) {
  $("#error-message").text(msg).show();
  setTimeout(() => { $("#error-message").hide(); }, 5000);
}
function showSuccess(msg) {
  $("#success-message").text(msg).show();
  setTimeout(() => { $("#success-message").hide(); }, 5000);
}
function updateProgressBar(current, total) {
  const pct = Math.round((current / total) * 100);
  $("#progress-bar").css("width", pct + "%").text(pct + "%");
}

/* Parse LLM response to extract content and summary */
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

/* Call OpenAI API (currently supports only OpenAI) */
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

/* Run all analysis steps sequentially */
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
  updateProgressBar(0, STEPS.length);
  showSpinner("Starting analysis...");

  let stepResults = {};

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    const stepNumber = i + 1;
    updateProgressBar(stepNumber - 1, STEPS.length);
    showSpinner(`Running Step ${stepNumber}: ${step.menuName}...`);

    let prompt = step.stepPrompt;
    prompt = prompt.replace("{message_content}", messageContent);
    STEPS.forEach(prevStep => {
      const outputKey = `${prevStep.name}_output`;
      const summaryKey = `${prevStep.name}_summary`;
      if (stepResults[outputKey]) {
        prompt = prompt.replace(`{${outputKey}}`, stepResults[outputKey]);
      }
      if (stepResults[summaryKey]) {
        prompt = prompt.replace(`{${summaryKey}}`, stepResults[summaryKey]);
      }
    });
    prompt += "\n\n" + step.llmInstructions;
    try {
      const openaiResponse = await callOpenAI(prompt, config.apiKey, config.model);
      const { responseContent, responseSummary } = parseLLMResponse(openaiResponse);
      stepResults[`${step.name}_output`] = responseContent;
      stepResults[`${step.name}_summary`] = responseSummary;
      displayResult({
        stepName: step.name,
        menuName: step.menuName,
        output: responseContent,
        summary: responseSummary,
        stepNumber,
        totalSteps: STEPS.length
      });
    } catch (err) {
      showError("Error during step " + step.menuName + ": " + err.message);
      hideSpinner();
      return;
    }
  }
  updateProgressBar(STEPS.length, STEPS.length);
  hideSpinner();
  showSuccess("Analysis completed successfully!");
  saveAnalysisHistory(messageContent, stepResults);
}

/* Display result in a new tab */
function displayResult(result) {
  const tabId = `content-${result.stepName}`;
  const tabLink = $(`<a class="nav-link" data-toggle="tab" role="tab" href="#${tabId}">${result.menuName}</a>`).attr("id", `tab-${result.stepName}`);
  const tabItem = $("<li class='nav-item'></li>").append(tabLink);
  $("#resultTabs").append(tabItem);
  const mdOutput = marked.parse(result.output || "");
  const sanitizedOutput = DOMPurify.sanitize(mdOutput);
  const mdSummary = marked.parse(result.summary || "");
  const sanitizedSummary = DOMPurify.sanitize(mdSummary);
  const tabContent = $(`
    <div class="tab-pane fade" id="${tabId}" role="tabpanel">
      <h3 class="mt-3">${DOMPurify.sanitize(result.menuName)}</h3>
      <div class="mt-2"><strong>Summary:</strong><br>${sanitizedSummary}</div>
      <div class="mt-3">${sanitizedOutput}</div>
    </div>
  `);
  $("#resultTabsContent").append(tabContent);
  if (result.stepNumber === 1) {
    tabLink.addClass("active");
    tabContent.addClass("show active");
  }
}

/* Save analysis history to localStorage */
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

/* Render analysis history */
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
    const div = $(`
      <div class="border p-2 mb-2 history-item" data-index="${index}" style="cursor:pointer;">
        <strong>${date}</strong><br>${shortMsg} ...
      </div>
    `);
    container.append(div);
  });
}

/* Load a history analysis into the results view */
function loadHistoryAnalysis(index) {
  const historyStr = localStorage.getItem("analysis_history") || "[]";
  const history = JSON.parse(historyStr);
  const analysis = history[index];
  if (!analysis) return;
  $("#resultTabs").empty();
  $("#resultTabsContent").empty();
  let stepResults = analysis.results;
  let stepNumber = 1;
  STEPS.forEach(step => {
    const output = stepResults[`${step.name}_output`] || "";
    const summary = stepResults[`${step.name}_summary`] || "";
    displayResult({
      stepName: step.name,
      menuName: step.menuName,
      output,
      summary,
      stepNumber,
      totalSteps: STEPS.length
    });
    stepNumber++;
  });
}

/* Generate PDF using jsPDF */
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

/* Event handlers */
$(document).ready(function() {
  loadInitialSettings();

  // If API key is missing, force open the settings modal with a static backdrop.
  const initialApiKey = $('#apiKeyInput').val().trim();
  if (!initialApiKey) {
    $("#settingsModal").modal({ backdrop: 'static', keyboard: false });
    $("#settingsModal").modal('show');
  }

  // Prevent closing the settings modal if API key is empty.
  $('#settingsModal').on('hide.bs.modal', function(e) {
    const apiKey = $('#apiKeyInput').val().trim();
    if (!apiKey) {
      e.preventDefault();
      showError("API key is required to continue.");
    }
  });

  // Open settings modal via button
  $("#openSettingsBtn").click(function() {
    $("#settingsModal").modal("show");
  });

  // Save settings button inside modal
  $("#saveSettingsBtn").click(function() {
    saveSettings();
  });

  // Reset configuration buttons
  $("#resetConfigBtn").click(function() {
    resetToDefaults(true);
  });
  $("#fullResetBtn").click(function() {
    resetToDefaults(false);
  });

  // Edit buttons: show the hidden editor textarea populated with current JSON
  $("#editStepsBtn").click(function() {
    $("#stepsEditorContainer").show();
    $("#stepsEditor").val(JSON.stringify(STEPS, null, 2));
  });
  $("#editModelsBtn").click(function() {
    $("#modelsEditorContainer").show();
    $("#modelsEditor").val(JSON.stringify(MODELS, null, 2));
  });

  // Upload buttons for JSON override (steps and models)
  $("#uploadStepsBtn").click(function() {
    $("#stepsFileInput").click();
  });
  $("#uploadModelsBtn").click(function() {
    $("#modelsFileInput").click();
  });

  $("#stepsFileInput").on("change", function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const jsonData = JSON.parse(e.target.result);
          STEPS = jsonData;
          localStorage.setItem("steps_config", JSON.stringify(STEPS));
          $("#stepsFileName").text(file.name);
          showSuccess("Workflow steps updated from file.");
        } catch (err) {
          showError("Invalid JSON file for steps.");
        }
      };
      reader.readAsText(file);
    }
  });

  $("#modelsFileInput").on("change", function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const jsonData = JSON.parse(e.target.result);
          MODELS = jsonData;
          localStorage.setItem("models_config", JSON.stringify(MODELS));
          $("#modelsFileName").text(file.name);
          populateModelDropdown();
          showSuccess("Models configuration updated from file.");
        } catch (err) {
          showError("Invalid JSON file for models.");
        }
      };
      reader.readAsText(file);
    }
  });

  // When a file is chosen in the "Load Message" section, put its content into the message text area.
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

  // Start Analysis: always use content from the message text area.
  $("#startAnalysisBtn").click(function() {
    const messageContent = $("#messageText").val().trim();
    if (!messageContent) {
      showError("Please provide message content in the text area.");
      return;
    }
    runSteps(messageContent);
  });

  // Export PDF button
  $("#savePdfBtn").click(function() {
    generatePDF();
  });

  // Analysis History: click on a history item to load it
  $("#analysisHistory").on("click", ".history-item", function() {
    const index = $(this).data("index");
    loadHistoryAnalysis(index);
  });

  renderHistory();
});