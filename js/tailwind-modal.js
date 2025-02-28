/* tailwind-modal.js - Custom modal handler for Tailwind UI */

const TailwindModal = (function() {
    // Initialize modal functionality
    function init() {
      // Settings modal
      initModal('settingsModal', 'openSettingsBtn', '.closeSettings', 'settingsModalBackdrop');
      
      // About modal
      initModal('aboutModal', 'aboutBtn', '#closeAboutBtn', 'aboutModalBackdrop');
      
      // Unsaved changes modal
      initModal('unsavedChangesModal');
      
      // Settings tabs
      initTabs();
      
      // Initialize variable picker dropdown
      initDropdown('variablePickerBtn', 'variablePickerMenu');
      
      // Initialize drag and drop
      initDragAndDrop();
    }
    
    // Initialize drag and drop functionality
    function initDragAndDrop() {
      const dropzone = document.getElementById('dropzone');
      const fileInput = document.getElementById('messageFile');
      
      if (!dropzone || !fileInput) return;
      
      // Handle click on dropzone
      dropzone.addEventListener('click', () => {
        fileInput.click();
      });
      
      // Handle drag events
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
      });
      
      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Handle dragenter and dragover
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
          dropzone.classList.add('drag-over');
        }, false);
      });
      
      // Handle dragleave and drop
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
          dropzone.classList.remove('drag-over');
        }, false);
      });
      
      // Handle file drop
      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
          fileInput.files = files;
          // Trigger change event
          const event = new Event('change');
          fileInput.dispatchEvent(event);
        }
      }, false);
    }
    
    // Initialize a specific modal
    function initModal(modalId, openBtnId, closeBtnSelector, backdropId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      
      // Add open button handler if provided
      if (openBtnId) {
        const openBtn = document.getElementById(openBtnId);
        if (openBtn) {
          openBtn.addEventListener('click', () => {
            showModal(modalId);
          });
        }
      }
      
      // Add close button handlers if provided
      if (closeBtnSelector) {
        const closeButtons = document.querySelectorAll(closeBtnSelector);
        closeButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            hideModal(modalId);
          });
        });
      }
      
      // Add backdrop click handler if provided
      if (backdropId) {
        const backdrop = document.getElementById(backdropId);
        if (backdrop) {
          backdrop.addEventListener('click', () => {
            hideModal(modalId);
          });
        }
      }
      
      // Add ESC key handler
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
          hideModal(modalId);
        }
      });
    }
    
    // Initialize tabs
    function initTabs() {
      const tabLinks = document.querySelectorAll('#settingsTabs a');
      const tabContents = document.querySelectorAll('.tab-content');
      
      tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Get target tab
          const tabId = link.getAttribute('data-tab');
          
          // Hide all tab contents
          tabContents.forEach(content => {
            content.classList.add('hidden');
          });
          
          // Show target tab content
          document.getElementById(tabId).classList.remove('hidden');
          
          // Update active tab styling
          tabLinks.forEach(tab => {
            tab.classList.remove('border-brand-purple', 'text-brand-purple');
            tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
          });
          
          link.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
          link.classList.add('border-brand-purple', 'text-brand-purple');
        });
      });
    }
    
    // Initialize dropdown
    function initDropdown(btnId, menuId) {
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      
      if (!btn || !menu) return;
      
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        if (!menu.classList.contains('hidden')) {
          menu.classList.add('hidden');
        }
      });
      
      // Prevent dropdown from closing when clicking inside it
      menu.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    
    // Show a modal
    function showModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      
      // Make sure body doesn't scroll
      document.body.style.overflow = 'hidden';
      
      // Show modal with animation
      modal.classList.remove('hidden');
    }
    
    // Hide a modal
    function hideModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      
      // Allow body to scroll again
      document.body.style.overflow = '';
      
      // Hide modal with animation
      modal.classList.add('hidden');
    }
    
    // Public API
    return {
      init,
      showModal,
      hideModal
    };
  })();
  
  // Initialize when document is ready
  document.addEventListener('DOMContentLoaded', () => {
    TailwindModal.init();
  });