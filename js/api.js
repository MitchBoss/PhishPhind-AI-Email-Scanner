/* api.js - API interaction */

const ApiService = (function() {
    /* Call OpenAI API */
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
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        console.error("API call failed:", error);
        throw error;
      }
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
    
    // Public API
    return {
      callOpenAI,
      parseLLMResponse
    };
  })();
  