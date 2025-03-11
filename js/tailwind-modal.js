/* tailwind-modal.js - Custom modal handler for Tailwind UI */

const TailwindModal = (function() {
    // Initialize modal functionality
    function init() {
      console.log("[MODAL] TailwindModal.init called");
      
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
      
      // Do NOT initialize drag and drop - let app.js handle it
      // initDragAndDrop();
      
      // Expose TailwindModal to the window
      window.TailwindModal = window.TailwindModal || {};
      window.TailwindModal.showModal = showModal;
      window.TailwindModal.hideModal = hideModal;
      
      console.log("[MODAL] TailwindModal initialized and exposed globally");
    }
    
    // This function is kept for reference but not called
    function initDragAndDrop() {
      console.log("[MODAL] initDragAndDrop would be called here, but we're letting app.js handle it");
      // All drag and drop functionality is now handled by app.js
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
      console.log("[DROPDOWN] Initializing dropdown for button:", btnId, "and menu:", menuId);
      
      // Skip initializing the variable picker as it's handled by settings.js
      if (btnId === 'variablePickerBtn') {
        console.log("[DROPDOWN] Skipping variablePickerBtn initialization since it's handled by settings.js");
        return;
      }
      
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      
      console.log("[DROPDOWN] Button found:", !!btn, "Menu found:", !!menu);
      
      if (!btn || !menu) return;
      
      btn.addEventListener('click', (e) => {
        console.log("[DROPDOWN] Button clicked for dropdown:", btnId);
        e.stopPropagation();
        menu.classList.toggle('hidden');
        console.log("[DROPDOWN] Menu visibility toggled to:", menu.classList.contains('hidden') ? "hidden" : "visible");
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        if (!menu.classList.contains('hidden')) {
          menu.classList.add('hidden');
          console.log("[DROPDOWN] Menu hidden by document click event");
        }
      });
      
      // Prevent dropdown from closing when clicking inside it
      menu.addEventListener('click', (e) => {
        console.log("[DROPDOWN] Click inside menu");
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