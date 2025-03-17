// Only load analytics if the NEW_RELIC_SCRIPT environment variable is set
// Check if the environment variable has content (after replacement).
if (newRelicCode && newRelicCode.trim().length > 0) {
  // Execute the New Relic code directly.
  // Using the Function constructor to safely evaluate the code.
  new Function(newRelicCode)();
  console.log("New Relic analytics script executed from environment variable.");
} else {
  console.log("No New Relic script found. Running without analytics.");
}