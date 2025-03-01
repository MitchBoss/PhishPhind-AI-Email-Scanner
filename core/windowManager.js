/**
 * windowManager.js - Manages modals, panels, and windows
 */

window.WindowManager = (function() {
    // Active modals
    const activeModals = new Set();
    
    // Modal templates cache
    const modalTemplates = new Map();
    
    /**
     * Initialize the window manager
     */
    function init() {
      // Create modal container if it doesn't exist
      ensureModalContainer();
      
      // Register global ESC key handler
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeModals.size > 0) {
          // Close the most recent modal
          const lastModal = Array.from(activeModals).pop();
          hideModal(lastModal);
        }
      });
      
      console.log('WindowManager initialized');
      return Promise.resolve();
    }
    
    /**
     * Ensure modal container exists
     */
    function ensureModalContainer() {
      let container = document.getElementById('modalContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'modalContainer';
        container.className = 'modal-container';
        document.body.appendChild(container);
      }
      return container;
    }
    
    /**
     * Register a modal template
     * @param {string} modalId - Modal identifier
     * @param {string} template - HTML template
     */
    function registerModal(modalId, template) {
      modalTemplates.set(modalId, template);
    }
    
    /**
     * Show a modal
     * @param {string} modalId - Modal identifier
     * @param {object} data - Data to pass to the modal
     * @returns {Promise} - Resolves when modal is shown
     */
    async function showModal(modalId, data = {}) {
      try {
        let modalElement = document.getElementById(modalId);
        
        // Create modal element if it doesn't exist
        if (!modalElement) {
          // Get template from cache or fetch it
          let template = modalTemplates.get(modalId);
          if (!template) {
            // Try to fetch from modules
            template = await fetchModalTemplate(modalId);
            modalTemplates.set(modalId, template);
          }
          
          // Create modal element
          modalElement = createModalElement(modalId, template);
        }
        
        // Before showing modal, update content with data if needed
        if (data) {
          updateModalContent(modalElement, data);
        }
        
        // Show the modal
        modalElement.classList.remove('hidden');
        document.body.classList.add('modal-open');
        
        // Track active modal
        activeModals.add(modalId);
        
        // Setup close buttons
        setupCloseHandlers(modalElement, modalId);
        
        // Publish modal shown event
        if (window.EventBus) {
          window.EventBus.publish('modal:shown', { id: modalId, data });
        }
        
        return modalElement;
      } catch (error) {
        console.error(`Failed to show modal "${modalId}":`, error);
        throw error;
      }
    }
    
    /**
     * Hide a modal
     * @param {string} modalId - Modal identifier
     */
    function hideModal(modalId) {
      const modalElement = document.getElementById(modalId);
      if (!modalElement) return;
      
      // Hide the modal
      modalElement.classList.add('hidden');
      
      // Remove from active modals
      activeModals.delete(modalId);
      
      // If no modals are active, enable body scrolling
      if (activeModals.size === 0) {
        document.body.classList.remove('modal-open');
      }
      
      // Publish modal hidden event
      if (window.EventBus) {
        window.EventBus.publish('modal:hidden', { id: modalId });
      }
    }
    
    /**
     * Create modal element from template
     * @param {string} modalId - Modal identifier
     * @param {string} template - HTML template
     * @returns {HTMLElement} - Created modal element
     */
    function createModalElement(modalId, template) {
      const container = ensureModalContainer();
      
      // Create wrapper div
      const modalWrapper = document.createElement('div');
      modalWrapper.id = modalId;
      modalWrapper.className = 'modal hidden';
      modalWrapper.innerHTML = template;
      
      // Add to container
      container.appendChild(modalWrapper);
      
      return modalWrapper;
    }
    
    /**
     * Update modal content with data
     * @param {HTMLElement} modalElement - Modal element
     * @param {object} data - Data to update modal with
     */
    function updateModalContent(modalElement, data) {
      // Update text content
      for (const [key, value] of Object.entries(data)) {
        const element = modalElement.querySelector(`[data-content="${key}"]`);
        if (element) {
          element.textContent = value;
        }
      }
      
      // Update form fields
      for (const [key, value] of Object.entries(data)) {
        const element = modalElement.querySelector(`[name="${key}"]`);
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = !!value;
          } else {
            element.value = value;
          }
        }
      }
    }
    
    /**
     * Setup close handlers for a modal
     * @param {HTMLElement} modalElement - Modal element
     * @param {string} modalId - Modal identifier
     */
    function setupCloseHandlers(modalElement, modalId) {
      // Add click handlers to close buttons
      const closeButtons = modalElement.querySelectorAll('[data-close-modal]');
      closeButtons.forEach(button => {
        button.addEventListener('click', () => {
          hideModal(modalId);
        });
      });
      
      // Add click handler to backdrop if it exists
      const backdrop = modalElement.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) {
            hideModal(modalId);
          }
        });
      }
    }
    
    /**
     * Fetch modal template from modules
     * @param {string} modalId - Modal identifier
     * @returns {Promise<string>} - Modal template
     */
    async function fetchModalTemplate(modalId) {
      // Try to determine module from modal ID
      const parts = modalId.split('-');
      if (parts.length >= 2) {
        const moduleId = parts[0];
        const modalName = parts[1];
        
        try {
          const response = await fetch(`modules/${moduleId}/modals/${modalName}.html`);
          if (response.ok) {
            return await response.text();
          }
        } catch (error) {
          console.warn(`Failed to fetch modal template for "${modalId}"`, error);
        }
      }
      
      // Return a default template if we couldn't find the specific one
      return `
        <div class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 modal-backdrop transition-opacity bg-gray-500 bg-opacity-75"></div>
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 class="text-lg font-medium text-gray-900 mb-2">Modal Title</h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">Modal content placeholder</p>
                </div>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" data-close-modal class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-purple text-base font-medium text-white hover:bg-brand-purple-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple sm:ml-3 sm:w-auto sm:text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    /**
     * Create and show a confirmation dialog
     * @param {string} message - Confirmation message
     * @param {string} title - Dialog title
     * @param {object} options - Additional options
     * @returns {Promise<boolean>} - Resolves with user's choice
     */
    function confirm(message, title = 'Confirm', options = {}) {
      return new Promise((resolve) => {
        // Create modal if it doesn't exist
        const modalId = 'system-confirm';
        const modalElement = document.getElementById(modalId) || createConfirmModal(modalId);
        
        // Update content
        modalElement.querySelector('.confirm-title').textContent = title;
        modalElement.querySelector('.confirm-message').textContent = message;
        
        // Configure buttons
        const confirmBtn = modalElement.querySelector('.confirm-yes');
        const cancelBtn = modalElement.querySelector('.confirm-no');
        
        confirmBtn.textContent = options.confirmText || 'Yes';
        cancelBtn.textContent = options.cancelText || 'No';
        
        // Set button handlers
        const cleanup = () => {
          confirmBtn.removeEventListener('click', handleConfirm);
          cancelBtn.removeEventListener('click', handleCancel);
          hideModal(modalId);
        };
        
        const handleConfirm = () => {
          cleanup();
          resolve(true);
        };
        
        const handleCancel = () => {
          cleanup();
          resolve(false);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        
        // Show modal
        showModal(modalId);
      });
    }
    
    /**
     * Create confirmation modal
     * @param {string} modalId - Modal identifier
     * @returns {HTMLElement} - Created modal element
     */
    function createConfirmModal(modalId) {
      const template = `
        <div class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 modal-backdrop transition-opacity bg-gray-500 bg-opacity-75"></div>
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 class="confirm-title text-lg font-medium text-gray-900"></h3>
                <div class="mt-2">
                  <p class="confirm-message text-sm text-gray-500"></p>
                </div>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" class="confirm-yes w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-purple text-base font-medium text-white hover:bg-brand-purple-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple sm:ml-3 sm:w-auto sm:text-sm">Yes</button>
                <button type="button" class="confirm-no mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">No</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      return createModalElement(modalId, template);
    }
    
    // Register service if Services is available
    if (window.Services) {
      window.Services.register('WindowManager', {
        init,
        registerModal,
        showModal,
        hideModal,
        confirm
      });
    }
    
    // Return public API
    return {
      init,
      registerModal,
      showModal,
      hideModal,
      confirm
    };
  })();