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
      const usesResponsesApi = shouldUseResponsesApi(model);
      const url = usesResponsesApi
        ? "https://api.openai.com/v1/responses"
        : "https://api.openai.com/v1/chat/completions";
      const body = usesResponsesApi
        ? { model, input: prompt }
        : { model, messages: [{ role: "user", content: prompt }] };
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      };
      
      try {
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutMs = 90000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        console.log(`Calling OpenAI ${usesResponsesApi ? 'Responses' : 'Chat Completions'} API with model: ${model}, prompt length: ${prompt.length} chars`);
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
        return extractTextFromOpenAIResponse(data);
      } catch (error) {
        console.error("API call failed:", error);
        
        // Provide more specific error messages
        if (error.name === "AbortError") {
          throw new Error("API call timed out after 90 seconds");
        } else if (error.message.includes("Failed to fetch")) {
          throw new Error("Network error when contacting OpenAI API. Please check your internet connection.");
        }
        
        throw error;
      }
    }

    /**
     * Newer OpenAI models are exposed through the Responses API.
     * Keep legacy models on Chat Completions for backwards compatibility.
     * @param {string} model - The model ID
     * @returns {boolean} - Whether to call /v1/responses
     */
    function shouldUseResponsesApi(model) {
      return typeof model === 'string' && model.startsWith('gpt-5');
    }

    /**
     * Extract text from either Chat Completions or Responses API payloads.
     * @param {Object} data - OpenAI API response payload
     * @returns {string} - The response text
     */
    function extractTextFromOpenAIResponse(data) {
      if (typeof data?.output_text === 'string') {
        return data.output_text;
      }

      const chatContent = data?.choices?.[0]?.message?.content;
      if (typeof chatContent === 'string') {
        return chatContent;
      }
      if (Array.isArray(chatContent)) {
        return chatContent
          .map(part => part.text || part.content || '')
          .join('')
          .trim();
      }

      const responseText = extractTextFromResponsesOutput(data?.output);
      if (responseText) {
        return responseText;
      }

      throw new Error("OpenAI API response did not include readable text output");
    }

    /**
     * Extract text recursively from Responses API output arrays.
     * @param {Array} output - Responses API output
     * @returns {string} - Combined text output
     */
    function extractTextFromResponsesOutput(output) {
      if (!Array.isArray(output)) return '';

      return output
        .flatMap(item => {
          if (typeof item?.text === 'string') return [item.text];
          if (typeof item?.content === 'string') return [item.content];
          if (Array.isArray(item?.content)) {
            return item.content.map(part => part.text || part.content || '').filter(Boolean);
          }
          return [];
        })
        .join('')
        .trim();
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