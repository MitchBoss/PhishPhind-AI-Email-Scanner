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
      // Load HTML template
      const response = await fetch('modules/about/about.html');
      const html = await response.text();
      container.innerHTML = html;
      
      console.log('About module mounted');
    }
    
    // Unmount the module
    function unmount() {
      console.log('About module unmounted');
    }
    
    // Register module
    ModuleManager.registerModule({
      id: 'about',
      name: 'About',
      template: 'modules/about/about.html',
      css: 'modules/about/about.css',
      init,
      mount,
      unmount
    });
    
    // Return public API
    return {
      init,
      mount,
      unmount
    };
  })();