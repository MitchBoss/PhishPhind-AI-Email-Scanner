/**
 * About Module - Displays application information
 */

const AboutModule = (function() {
    // Initialize module
    function init() {
      console.log('About module initialized');
      return true;
    }
    
    // Mount the module
    async function mount(container) {
      // Create content
      const content = `
        <div class="text-center mb-6">
          <div class="flex justify-center mb-6">
            <div class="p-3 rounded-full bg-blue-100">
              <img src="assets/icons/icon.svg" class="h-16 w-16 text-blue-500" alt="PhishPhind Logo" 
                   onerror="this.onerror=null; this.src='data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234F46E5%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M12%203l8%204.5V15L12%2019.5%204%2015V7.5L12%203z%22%2F%3E%3C%2Fsvg%3E';">
            </div>
          </div>
        </div>

        <p class="mb-4">PhishPhind is an advanced tool that uses AI to analyze emails for potential phishing threats and malicious content.</p>

        <div class="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6">
          <p class="text-sm text-gray-700">
            <strong>Disclaimer:</strong> This project is a proof of concept demonstrating a UI for using LLMs to perform multi-step analysis 
            of emails for malicious content. It is not intended to be effective or reliable in its current state and should 
            not be used for real-world security analysis.
          </p>
        </div>

        <h3 class="text-lg font-medium text-gray-900 mb-2">Key features:</h3>
        <ul class="text-base text-gray-700 space-y-2 ml-5 list-disc">
          <li>Multi-step analysis of email content</li>
          <li>Detection of suspicious sender patterns</li>
          <li>Link and attachment investigation</li>
          <li>Contextual analysis for social engineering</li>
          <li>Detailed reports and recommendations</li>
        </ul>

        <div class="text-center mt-6 text-sm text-gray-500">
          Version alpha 0.1.0
          <br />
          <a 
            href="https://github.com/MitchBoss" 
            target="_blank" 
            class="text-blue-500 hover:underline"
          >
            https://github.com/MitchBoss
          </a>
        </div>
      `;

      // Create a card component for the about content
      const aboutCard = await ComponentLoader.createCard({
        title: 'PhishPhind AI Email Scanner',
        content: content,
        footerContent: '<button id="about-close-btn" class="button button--primary">Close</button>'
      });

      // Clear the container and append the card
      container.innerHTML = '';
      container.appendChild(aboutCard);

      // Add event listener for the close button
      const closeBtn = container.querySelector('#about-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          // Get the parent modal if it exists
          const modal = closeBtn.closest('.modal__overlay');
          if (modal && window.ComponentLoader) {
            // Find the modal in the component registry if it exists
            const modalInstance = document.querySelector('.modal__overlay');
            if (modalInstance && modalInstance.classList.contains('modal__overlay--visible')) {
              modalInstance.classList.remove('modal__overlay--visible');
            }
          }
        });
      }
      
      console.log('About module mounted using ComponentLoader');
    }
    
    // Unmount the module
    function unmount() {
      console.log('About module unmounted');
    }
    
    // Register module
    if (typeof ModuleManager !== 'undefined') {
      console.log('Registering AboutModule with ModuleManager');
      ModuleManager.registerModule({
        id: 'about',
        name: 'About',
        template: null, // No longer using a static template
        css: null, // Using component CSS now
        init,
        mount,
        unmount
      });
    } else {
      console.log('ModuleManager not found, exposing AboutModule globally');
      // Make the module globally available if ModuleManager is not defined
      window.AboutModule = {
        init,
        mount,
        unmount
      };
    }
    
    // Return public API
    return {
      init,
      mount,
      unmount
    };
  })();

console.log('About module loaded successfully');