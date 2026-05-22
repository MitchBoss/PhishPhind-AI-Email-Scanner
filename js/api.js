/* api.js - API interaction */

const ApiService = (function() {
    /* Call OpenAI API */
    async function callOpenAI(prompt, apiKey, model) {
      const usesResponsesApi = typeof model === 'string' && model.startsWith('gpt-5');
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
        if (typeof data?.output_text === 'string') {
          return data.output_text;
        }
        if (typeof data?.choices?.[0]?.message?.content === 'string') {
          return data.choices[0].message.content;
        }
        if (Array.isArray(data?.output)) {
          const outputText = data.output
            .flatMap(item => Array.isArray(item?.content) ? item.content : [item])
            .map(part => part?.text || part?.content || '')
            .join('')
            .trim();
          if (outputText) return outputText;
        }
        throw new Error("OpenAI API response did not include readable text output");
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
  