// Only load analytics if the NEW_RELIC_SCRIPT environment variable is set
// Ensure the environment variable exists before trying to execute it
if (typeof NEW_RELIC_SCRIPT !== "undefined" && NEW_RELIC_SCRIPT) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.innerHTML = NEW_RELIC_SCRIPT; // Execute the script dynamically
    document.head.appendChild(script);
    console.log("New Relic analytics script loaded from Cloudflare Pages environment variable.");
  } else {
    console.log("No New Relic script found. Running without analytics.");
  }
  