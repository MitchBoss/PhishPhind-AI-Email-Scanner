// Only load analytics if the NEW_RELIC_SCRIPT environment variable is set
(function() {
  // Check if the NEW_RELIC_SCRIPT environment variable exists
  if (typeof window.NEW_RELIC_SCRIPT !== 'undefined' && window.NEW_RELIC_SCRIPT) {
    // Create a script element
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = window.NEW_RELIC_SCRIPT;
    
    // Append the script to the document head
    document.head.appendChild(script);
    console.log('NewRelic analytics script loaded from environment variable.');
  } else {
    // Log a message if the environment variable is not found
    console.log('No environment variable for new relic script found. Running without analytics.');
  }
})();
