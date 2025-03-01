/**
 * apiService.js - API communication service
 */

const ApiService = (function() {
  
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
      
      try {
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout
        
        console.log(`Calling OpenAI API with model: ${model}, prompt length: ${prompt.length} chars`);
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error (${response.status}):`, errorText);
          throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        console.error("API call failed:", error);
        
        // Provide more specific error messages
        if (error.name === "AbortError") {
          throw new Error("API call timed out after 60 seconds");
        } else if (error.message.includes("Failed to fetch")) {
          throw new Error("Network error when contacting OpenAI API. Please check your internet connection.");
        }
        
        throw error;
      }
    }
  
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
    
    // Register service
    if (window.Services) {
      window.Services.register('ApiService', {
        callOpenAI,
        parseLLMResponse
      });
    } else {
      console.warn("Services module not available, ApiService not registered");
    }
    
    // Return public API
    return {
      callOpenAI,
      parseLLMResponse
    };
  })();