/**
 * componentLoader.js - Dynamic component loading and rendering
 * 
 * This module provides utilities for loading component templates
 * and rendering them with data.
 */

// Compatibility check - don't overwrite existing implementation
if (!window.ComponentLoader) {
  
  window.ComponentLoader = (function() {
    // Cache for loaded templates
    const templateCache = new Map();
    
    // Debug flags
    const DEBUG_ICONS = true; // Set to true to debug icon rendering
    
    /**
     * Initialize the component loader
     */
    function init() {
      console.log('ComponentLoader initializing...');
      
      try {
        // Check if we can load a test template to verify paths are correct
        fetch('components/card.html')
          .then(response => {
            if (!response.ok) {
              console.error('ComponentLoader initialization problem: Could not load card.html template. Check your file paths.');
            } else {
              console.log('ComponentLoader verified template loading path.');
            }
          })
          .catch(error => {
            console.error('ComponentLoader initialization error:', error);
          });
        
        console.log('ComponentLoader initialized successfully');
        return Promise.resolve(true);
      } catch (error) {
        console.error('ComponentLoader initialization failed:', error);
        return Promise.reject(error);
      }
    }
    
    /**
     * Load a component template from a file
     * @param {string} componentName - Component name/path
     * @returns {Promise<string>} - Template HTML string
     */
    async function loadTemplate(componentName) {
      // Check if template is already cached
      if (templateCache.has(componentName)) {
        return templateCache.get(componentName);
      }
      
      try {
        // Determine the correct path based on the component name
        let templatePath;
        
        // Special handling for components in subdirectories
        if (componentName.includes('/')) {
          // For components already with paths like 'form/text-input'
          templatePath = `components/${componentName}.html`;
        } else {
          // For simple components without subdirectory
          templatePath = `components/${componentName}.html`;
        }
        
        console.log(`Loading template from: ${templatePath}`);
        
        // Fetch the template file
        const response = await fetch(templatePath);
        if (!response.ok) {
          console.error(`Failed to load template from ${templatePath}`);
          throw new Error(`Failed to load template: ${componentName}`);
        }
        
        const template = await response.text();
        
        // Cache the template
        templateCache.set(componentName, template);
        
        return template;
      } catch (error) {
        console.error(`Error loading template ${componentName}:`, error);
        throw error;
      }
    }
    
    /**
     * Render a template with data
     * @param {string} template - Template HTML string
     * @param {Object} data - Data to inject into the template
     * @returns {string} - Rendered HTML
     */
    function renderTemplate(template, data) {
      if (!template) {
        console.error('Empty template provided to renderTemplate');
        return '';
      }
      
      // Make a copy of the template
      let rendered = template;
      let maxIterations = 10; // Increase max iterations to handle nested processing
      let iterations = 0;
      let lastRendered = '';
      
      // Create a custom version of getNestedValue that can trace path resolution
      function traceValue(obj, path, debug = false) {
        if (debug) console.log(`Tracing path: ${path} in`, obj);
        
        // Split by dots while respecting property access syntax
        const parts = path.split('.');
        let result = obj;
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          if (result === undefined || result === null) {
            if (debug) console.log(`Path resolution stopped at part ${i}:${part}, got undefined/null`);
            return undefined;
          }
          
          // Check if we have this property
          result = result[part];
          if (debug) console.log(`After part ${i}:${part}, got:`, result);
        }
        
        return result;
      }
      
      // Keep processing until no more changes or max iterations reached
      while (rendered !== lastRendered && iterations < maxIterations) {
        lastRendered = rendered;
        iterations++;
        
        try {
          // Process each loops {{#each array}}content with {{this}} or {{property}}{{/each}}
          rendered = rendered.replace(/\{\{#each\s+([^}]+?)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayPath, content) => {
            try {
              // Enable debug for specific paths to help with troubleshooting
              const debug = arrayPath.includes('items');
              const arrayValue = traceValue(data, arrayPath.trim(), debug);
              
              if (!Array.isArray(arrayValue)) {
                if (debug) {
                  console.warn(`Value at path "${arrayPath}" is not an array:`, arrayValue);
                  console.log('Context data:', data);
                }
                return '';
              }
              
              console.log(`Processing #each for ${arrayPath}, found ${arrayValue.length} items`);
              
              // Debug the first item to help diagnose nested property issues
              if (debug && arrayValue.length > 0) {
                console.log(`First item in ${arrayPath}:`, JSON.stringify(arrayValue[0]));
              }
              
              return arrayValue.map((item, index) => {
                // Create a context where 'this' refers to the current item
                const itemContext = { 
                  ...data,  // Keep parent context for access to variables outside the loop
                  this: item, // Add 'this' reference
                  index: index, // Add index
                  // For object items, spread properties to top level for direct access
                  ...(typeof item === 'object' ? item : {})
                };
                
                if (debug && index === 0) {
                  console.log(`Item context for first ${arrayPath} item:`, itemContext);
                }
                
                return renderTemplate(content, itemContext);
              }).join('');
            } catch (e) {
              console.error('Error processing each loop:', e, 'Array path:', arrayPath);
              return '';
            }
          });
          
          // Process conditionals with equality comparison {{#if var == 'value'}}content{{/if}}
          rendered = rendered.replace(/\{\{#if\s+([^}]+?)\s*==\s*['"]([^'"]+)['"]\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, variable, value, content) => {
            try {
              const variableValue = traceValue(data, variable.trim());
              return String(variableValue) === value 
                ? renderTemplate(content, data) 
                : '';
            } catch (e) {
              console.error('Error processing equality conditional:', e, match);
              return '';
            }
          });
          
          // Process conditionals with inequality comparison {{#if var != 'value'}}content{{/if}}
          rendered = rendered.replace(/\{\{#if\s+([^}]+?)\s*!=\s*['"]([^'"]+)['"]\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, variable, value, content) => {
            try {
              const variableValue = traceValue(data, variable.trim());
              return String(variableValue) !== value 
                ? renderTemplate(content, data) 
                : '';
            } catch (e) {
              console.error('Error processing inequality conditional:', e, match);
              return '';
            }
          });
          
          // Process if-else conditionals {{#if var}}content{{else}}alternative{{/if}}
          rendered = rendered.replace(/\{\{#if\s+([^}]+?)\s*\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content, alternative) => {
            try {
              const value = traceValue(data, condition.trim());
              return value 
                ? renderTemplate(content, data) 
                : renderTemplate(alternative, data);
            } catch (e) {
              console.error('Error processing if-else conditional:', e, match);
              return '';
            }
          });
          
          // Process simple conditionals {{#if var}}content{{/if}}
          rendered = rendered.replace(/\{\{#if\s+([^}]+?)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
            try {
              const value = traceValue(data, condition.trim());
              return value 
                ? renderTemplate(content, data) 
                : '';
            } catch (e) {
              console.error('Error processing simple conditional:', e, match);
              return '';
            }
          });
          
          // Replace HTML content with triple braces {{{var}}} - process this before normal variables
          // This will preserve HTML content including SVG tags
          rendered = rendered.replace(/\{\{\{([^}]+?)\}\}\}/g, (match, variable) => {
            try {
              const value = traceValue(data, variable.trim());
              // Ensure we're not returning undefined for HTML content
              return value !== undefined ? value : '';
            } catch (e) {
              console.error('Error replacing HTML content:', e, variable);
              return '';
            }
          });
          
          // Replace variables with their values {{var}}
          rendered = rendered.replace(/\{\{([^#\/][^}]*?)\}\}/g, (match, variable) => {
            try {
              const trimmedVar = variable.trim();
              // Skip if this is a closing tag for a conditional or an "else"
              if (trimmedVar.includes('#if') || trimmedVar.includes('/if') || trimmedVar === 'else') {
                return match;
              }
              const value = traceValue(data, trimmedVar);
              return value !== undefined ? String(value) : '';
            } catch (e) {
              console.error('Error replacing variable:', e, 'Variable:', variable);
              return '';
            }
          });
        } catch (e) {
          console.error('Error in renderTemplate:', e);
          break;
        }
      }
      
      // Final cleanup for any remaining Handlebars-like tags that couldn't be processed
      rendered = rendered.replace(/\{\{#if.*?\}\}/g, '');
      rendered = rendered.replace(/\{\{\/if\}\}/g, '');
      rendered = rendered.replace(/\{\{else\}\}/g, '');
      // Only remove #each tags if they're still in the template after processing
      rendered = rendered.replace(/\{\{#each\s+[^}]+?\}\}/g, '');
      rendered = rendered.replace(/\{\{\/each\}\}/g, '');
      rendered = rendered.replace(/\{\{#unless.*?\}\}/g, '');
      rendered = rendered.replace(/\{\{\/unless\}\}/g, '');
      // Catch any remaining template tags with a broad match (as a last resort)
      rendered = rendered.replace(/\{\{[^}]*\}\}/g, '');
      
      return rendered;
    }
    
    /**
     * Get a nested value from an object using dot notation
     * @param {Object} obj - Object to get value from
     * @param {string} path - Path to property (e.g. 'user.name')
     * @returns {*} - Property value
     */
    function getNestedValue(obj, path) {
      return path.split('.').reduce((value, key) => {
        return value && value[key] !== undefined ? value[key] : undefined;
      }, obj);
    }
    
    /**
     * Load and render a component
     * @param {string} componentName - Component name
     * @param {Object} data - Component data
     * @returns {Promise<string>} - Rendered HTML
     */
    async function renderComponent(componentName, data = {}) {
      try {
        const template = await loadTemplate(componentName);
        return renderTemplate(template, data);
      } catch (error) {
        console.error(`Error rendering component ${componentName}:`, error);
        throw error;
      }
    }
    
    /**
     * Create a DOM element from a component
     * @param {string} componentName - Component name
     * @param {Object} data - Component data
     * @returns {Promise<HTMLElement>} - DOM element
     */
    async function createComponent(componentName, data = {}) {
      try {
        console.log(`Creating component "${componentName}" with data:`, data);
        
        // Check if the component is in a subdirectory
        let templateName = componentName;
        
        const html = await renderComponent(templateName, data);
        
        // Create text node and then extract its decoded content
        const decoder = document.createElement('div');
        decoder.innerHTML = html.trim();
        
        // Check if the component was successfully created
        if (!decoder.firstChild) {
          console.error(`Failed to create component: ${componentName}. Rendered HTML was empty.`);
          console.log('Rendered HTML:', html);
          throw new Error(`Failed to create component: ${componentName}`);
        }
        
        return decoder.firstChild;
      } catch (error) {
        console.error(`Error creating component ${componentName}:`, error);
        throw error;
      }
    }
    
    /**
     * Render a component to a container
     * @param {string} componentName - Component name
     * @param {HTMLElement} container - Container element
     * @param {Object} data - Component data
     * @param {string} [position='append'] - append, prepend, or replace
     * @returns {Promise<HTMLElement>} - Component element
     */
    async function renderToContainer(componentName, container, data = {}, position = 'append') {
      if (!container) {
        throw new Error('Container element is required');
      }
      
      const component = await createComponent(componentName, data);
      
      switch (position) {
        case 'prepend':
          container.prepend(component);
          break;
        case 'replace':
          container.innerHTML = '';
          container.appendChild(component);
          break;
        case 'append':
        default:
          container.appendChild(component);
          break;
      }
      
      return component;
    }
    
    /**
     * Button component factory
     * @param {Object} config - Button configuration
     * @returns {Promise<HTMLElement>} - Button element
     */
    async function createButton(config) {
      const buttonData = {
        id: config.id || '',
        text: config.text || 'Button',
        type: config.type || 'button',
        modifier: config.variant ? `btn--${config.variant}` : '',
        disabled: !!config.disabled,
        icon: config.icon || null
      };
      
      const button = await createComponent('button', buttonData);
      
      if (config.onClick && typeof config.onClick === 'function') {
        button.addEventListener('click', config.onClick);
      }
      
      return button;
    }
    
    /**
     * Notification component factory
     * @param {Object} config - Notification configuration
     * @returns {Promise<HTMLElement>} - Notification element
     */
    async function createNotification(config) {
      const notificationData = {
        id: config.id || `notification-${Date.now()}`,
        title: config.title || '',
        message: config.message || '',
        modifier: `notification--${config.type || 'info'}`,
        icon: config.icon || getDefaultIcon(config.type),
        dismissible: config.dismissible !== false,
        autoClose: !!config.autoClose,
        duration: config.duration || 5000
      };
      
      const notification = await createComponent('notification', notificationData);
      
      if (config.dismissible !== false) {
        const closeButton = notification.querySelector('.notification__close');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            notification.classList.add('notification--exit');
            setTimeout(() => {
              notification.remove();
            }, 300);
          });
        }
      }
      
      if (config.autoClose) {
        // Set the timer duration using CSS variable
        const timerElement = notification.querySelector('.notification__timer-progress');
        if (timerElement) {
          timerElement.style.setProperty('--timer-duration', `${config.duration || 5000}ms`);
        }
        
        setTimeout(() => {
          notification.classList.add('notification--exit');
          setTimeout(() => {
            notification.remove();
          }, 300);
        }, config.duration || 5000);
      }
      
      return notification;
    }
    
    /**
     * Get default icon for notification type
     * @param {string} type - Notification type
     * @returns {string} - Icon HTML
     */
    function getDefaultIcon(type) {
      const iconMap = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>'
      };
      
      return iconMap[type] || iconMap.info;
    }
    
    /**
     * Show a notification
     * @param {Object} config - Notification configuration
     * @returns {Promise<HTMLElement>} - Notification element
     */
    async function showNotification(config) {
      // Find or create notification container
      let container = document.querySelector('.notification-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
      }
      
      const notification = await createNotification(config);
      container.appendChild(notification);
      
      return notification;
    }
    
    /**
     * Card component factory
     * @param {Object} config - Card configuration
     * @returns {Promise<HTMLElement>} - Card element
     */
    async function createCard(config) {
      const cardData = {
        id: config.id || `card-${Date.now()}`,
        title: config.title || '',
        subtitle: config.subtitle || '',
        content: config.content || '',
        image: config.image || '',
        imageAlt: config.imageAlt || '',
        imagePosition: config.imagePosition || 'top',
        headerContent: config.headerContent || '',
        footerContent: config.footerContent || '',
        header: !!(config.title || config.subtitle || config.headerContent),
        footer: !!(config.footerContent),
        modifier: config.modifier || (config.variant ? `card--${config.variant}` : ''),
        clickable: !!config.onClick,
        clickHandler: config.onClick ? `(${config.onClick.toString()})()` : ''
      };
      
      const card = await createComponent('card', cardData);
      
      // If onClick is provided and not using the template's event listener
      if (config.onClick && typeof config.onClick === 'function' && !config.useTemplateHandler) {
        card.classList.add('card--interactive');
        card.addEventListener('click', (event) => {
          // Prevent click if target is a button or link
          if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A' ||
              event.target.closest('button') || event.target.closest('a')) {
            return;
          }
          
          config.onClick(event);
        });
      }
      
      return card;
    }
    
    /**
     * Modal component factory
     * @param {Object} config - Modal configuration
     * @returns {Promise<Object>} - Modal object with element and control methods
     */
    async function createModal(config) {
      const modalId = config.id || `modal-${Date.now()}`;
      
      // Prepare modal data for the template
      const modalData = {
        id: modalId,
        title: config.title || '',
        content: config.content || '',
        footerContent: config.footerContent || '',
        header: config.title !== false,
        footer: !!config.footerContent,
        showClose: config.showClose !== false,
        size: config.size || null,
        visible: !!config.visible
      };
      
      // Create the modal element
      const modalElement = await createComponent('modal', modalData);
      
      // Add modal to the document if it's not already there
      if (!document.body.contains(modalElement)) {
        document.body.appendChild(modalElement);
      }
      
      // Set up event handlers
      const closeHandlers = [];
      const openHandlers = [];
      
      // Close button handler
      const closeButtons = modalElement.querySelectorAll('[data-modal-close]');
      closeButtons.forEach(button => {
        const handler = () => {
          hideModal();
        };
        button.addEventListener('click', handler);
        closeHandlers.push({ element: button, handler });
      });
      
      // Click outside handler (if dismissible)
      if (config.dismissible !== false) {
        const handler = (event) => {
          if (event.target === modalElement) {
            hideModal();
          }
        };
        modalElement.addEventListener('click', handler);
        closeHandlers.push({ element: modalElement, handler });
      }
      
      // ESC key handler
      if (config.closeOnEsc !== false) {
        const handler = (event) => {
          if (event.key === 'Escape' && isVisible()) {
            hideModal();
          }
        };
        document.addEventListener('keydown', handler);
        closeHandlers.push({ element: document, handler, type: 'keydown' });
      }
      
      // Helper function to check if modal is visible
      function isVisible() {
        return modalElement.classList.contains('modal__overlay--visible');
      }
      
      // Helper function to show the modal
      function showModal() {
        modalElement.classList.add('modal__overlay--visible');
        
        // Trigger onOpen callback
        if (config.onOpen && typeof config.onOpen === 'function') {
          config.onOpen();
        }
        
        // Trigger event handlers
        openHandlers.forEach(handler => handler());
        
        return modalAPI;
      }
      
      // Helper function to hide the modal
      function hideModal() {
        modalElement.classList.remove('modal__overlay--visible');
        
        // Trigger onClose callback
        if (config.onClose && typeof config.onClose === 'function') {
          config.onClose();
        }
        
        return modalAPI;
      }
      
      // Helper function to destroy the modal
      function destroyModal() {
        // Remove event listeners
        closeHandlers.forEach(({ element, handler, type = 'click' }) => {
          element.removeEventListener(type, handler);
        });
        
        // Remove element from DOM
        if (document.body.contains(modalElement)) {
          document.body.removeChild(modalElement);
        }
      }
      
      // Helper function to update modal content
      async function updateContent(newContent) {
        const contentElement = modalElement.querySelector('.modal__content');
        if (contentElement) {
          contentElement.innerHTML = newContent;
        }
        return modalAPI;
      }
      
      // Helper function to update modal title
      function updateTitle(newTitle) {
        const titleElement = modalElement.querySelector('.modal__title');
        if (titleElement) {
          titleElement.textContent = newTitle;
        }
        return modalAPI;
      }
      
      // Helper function to add an event handler when the modal opens
      function onOpen(handler) {
        if (typeof handler === 'function') {
          openHandlers.push(handler);
        }
        return modalAPI;
      }
      
      // Create the modal API
      const modalAPI = {
        element: modalElement,
        isVisible,
        show: showModal,
        hide: hideModal,
        toggle: () => isVisible() ? hideModal() : showModal(),
        destroy: destroyModal,
        updateContent,
        updateTitle,
        onOpen
      };
      
      // Show modal if initially visible
      if (config.visible) {
        showModal();
      }
      
      return modalAPI;
    }
    
    /**
     * Show a modal dialog
     * @param {Object} config - Modal configuration
     * @returns {Promise<Object>} - Modal API
     */
    async function showModal(config) {
      const modal = await createModal({
        ...config,
        visible: true
      });
      
      return modal;
    }
    
    /**
     * Creates a text input element
     * @param {Object} config - The configuration for the text input
     * @param {string} config.id - The id attribute for the input
     * @param {string} config.name - The name attribute for the input
     * @param {string} config.label - The label text (optional)
     * @param {string} config.placeholder - The placeholder text (optional)
     * @param {string} config.value - The initial value (optional)
     * @param {string} config.type - The input type (default: 'text')
     * @param {boolean} config.required - Whether the field is required (optional)
     * @param {boolean} config.disabled - Whether the field is disabled (optional)
     * @param {string} config.helpText - Help text to display below the input (optional)
     * @param {string} config.errorMessage - Error message to display (optional)
     * @param {Object} config.attributes - Additional attributes to add to the input (optional)
     * @returns {Promise<HTMLElement>} The created text input element
     */
    async function createTextInput(config) {
      const templateData = {
        id: config.id || `input-${Math.random().toString(36).substr(2, 9)}`,
        name: config.name || config.id,
        label: config.label,
        placeholder: config.placeholder,
        value: config.value || '',
        type: config.type || 'text',
        required: !!config.required,
        disabled: !!config.disabled,
        readonly: !!config.readonly,
        min: config.min,
        max: config.max,
        pattern: config.pattern,
        autocomplete: config.autocomplete,
        helpText: config.helpText,
        errorMessage: config.errorMessage,
        groupModifier: config.groupModifier
      };

      return createComponent('form/text-input', templateData);
    }
    
    /**
     * Creates a textarea element
     * @param {Object} config - The configuration for the textarea
     * @param {string} config.id - The id attribute for the textarea
     * @param {string} config.name - The name attribute for the textarea
     * @param {string} config.label - The label text (optional)
     * @param {string} config.placeholder - The placeholder text (optional)
     * @param {string} config.value - The initial value (optional)
     * @param {number} config.rows - The number of rows (optional)
     * @param {boolean} config.required - Whether the field is required (optional)
     * @param {boolean} config.disabled - Whether the field is disabled (optional)
     * @param {string} config.helpText - Help text to display below the textarea (optional)
     * @param {string} config.errorMessage - Error message to display (optional)
     * @returns {Promise<HTMLElement>} The created textarea element
     */
    async function createTextarea(config) {
      const templateData = {
        id: config.id || `textarea-${Math.random().toString(36).substr(2, 9)}`,
        name: config.name || config.id,
        label: config.label,
        placeholder: config.placeholder,
        value: config.value || '',
        rows: config.rows || 3,
        required: !!config.required,
        disabled: !!config.disabled,
        readonly: !!config.readonly,
        maxlength: config.maxlength,
        helpText: config.helpText,
        errorMessage: config.errorMessage,
        groupModifier: config.groupModifier
      };

      return createComponent('form/textarea', templateData);
    }
    
    /**
     * Creates a select dropdown element
     * @param {Object} config - The configuration for the select
     * @param {string} config.id - The id attribute for the select
     * @param {string} config.name - The name attribute for the select
     * @param {string} config.label - The label text (optional)
     * @param {Array<Object>} config.options - Array of option objects with value, text, selected (optional)
     * @param {string} config.placeholder - The placeholder text (optional)
     * @param {boolean} config.required - Whether the field is required (optional)
     * @param {boolean} config.disabled - Whether the field is disabled (optional)
     * @param {boolean} config.multiple - Whether multiple options can be selected (optional)
     * @param {string} config.helpText - Help text to display below the select (optional)
     * @param {string} config.errorMessage - Error message to display (optional)
     * @returns {Promise<HTMLElement>} The created select element
     */
    async function createSelect(config) {
      const templateData = {
        id: config.id || `select-${Math.random().toString(36).substr(2, 9)}`,
        name: config.name || config.id,
        label: config.label,
        placeholder: config.placeholder,
        required: !!config.required,
        disabled: !!config.disabled,
        multiple: !!config.multiple,
        size: config.size,
        options: config.options || [],
        helpText: config.helpText,
        errorMessage: config.errorMessage,
        groupModifier: config.groupModifier
      };

      return createComponent('form/select', templateData);
    }
    
    /**
     * Creates a checkbox element
     * @param {Object} config - The configuration for the checkbox
     * @param {string} config.id - The id attribute for the checkbox
     * @param {string} config.name - The name attribute for the checkbox
     * @param {string} config.label - The label text (optional)
     * @param {string} config.value - The value attribute (optional)
     * @param {boolean} config.checked - Whether the checkbox is checked initially (optional)
     * @param {boolean} config.required - Whether the field is required (optional)
     * @param {boolean} config.disabled - Whether the field is disabled (optional)
     * @param {string} config.helpText - Help text to display below the checkbox (optional)
     * @param {string} config.errorMessage - Error message to display (optional)
     * @returns {Promise<HTMLElement>} The created checkbox element
     */
    async function createCheckbox(config) {
      const templateData = {
        id: config.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`,
        name: config.name || config.id,
        label: config.label,
        value: config.value || 'on',
        checked: !!config.checked,
        required: !!config.required,
        disabled: !!config.disabled,
        helpText: config.helpText,
        errorMessage: config.errorMessage,
        groupModifier: config.groupModifier
      };

      return createComponent('form/checkbox', templateData);
    }
    
    /**
     * Creates a radio button group
     * @param {Object} config - The configuration for the radio group
     * @param {string} config.name - The name attribute for the radio buttons
     * @param {string} config.groupLabel - The label for the entire group (optional)
     * @param {Array<Object>} config.options - Array of radio option objects with id, value, label, checked (optional)
     * @param {boolean} config.required - Whether a selection is required (optional)
     * @param {boolean} config.disabled - Whether the entire group is disabled (optional)
     * @param {string} config.helpText - Help text to display below the radio group (optional)
     * @param {string} config.errorMessage - Error message to display (optional)
     * @returns {Promise<HTMLElement>} The created radio group element
     */
    async function createRadioGroup(config) {
      const options = (config.options || []).map(option => {
        return {
          id: option.id || `radio-${Math.random().toString(36).substr(2, 9)}`,
          value: option.value,
          label: option.label,
          checked: !!option.checked,
          disabled: !!option.disabled || !!config.disabled
        };
      });

      const templateData = {
        name: config.name,
        groupLabel: config.groupLabel,
        required: !!config.required,
        options: options,
        helpText: config.helpText,
        errorMessage: config.errorMessage,
        groupModifier: config.groupModifier
      };

      return createComponent('form/radio', templateData);
    }
    
    /**
     * Creates a switch toggle element
     * @param {Object} config - The configuration for the switch
     * @param {string} config.id - The id attribute for the switch
     * @param {string} config.name - The name attribute for the switch
     * @param {string} config.label - The label text
     * @param {string} config.value - The value attribute (optional)
     * @param {boolean} config.checked - Whether the switch is toggled on initially (optional)
     * @param {boolean} config.required - Whether the field is required (optional)
     * @param {boolean} config.disabled - Whether the switch is disabled (optional)
     * @param {string} config.helpText - Help text to display below the switch (optional)
     * @param {string} config.errorMessage - Error message to display (optional)
     * @returns {Promise<HTMLElement>} The created switch element
     */
    async function createSwitch(config) {
      const templateData = {
        id: config.id || `switch-${Math.random().toString(36).substr(2, 9)}`,
        name: config.name || config.id,
        label: config.label,
        value: config.value || 'on',
        checked: !!config.checked,
        required: !!config.required,
        disabled: !!config.disabled,
        helpText: config.helpText,
        errorMessage: config.errorMessage,
        groupModifier: config.groupModifier
      };

      return createComponent('form/switch', templateData);
    }
    
    /**
     * Creates a file upload element
     * @param {Object} config - The configuration for the file upload
     * @param {string} config.id - The id attribute for the file input
     * @param {string} config.name - The name attribute for the file input
     * @param {string} config.label - The label text (optional)
     * @param {string} config.buttonText - The text for the upload button
     * @param {string} config.accept - File types to accept (optional)
     * @param {boolean} config.multiple - Whether multiple files can be selected (optional)
     * @param {boolean} config.required - Whether a file is required (optional)
     * @param {boolean} config.disabled - Whether the upload is disabled (optional)
     * @param {string} config.helpText - Help text to display below the file upload (optional)
     * @param {string} config.errorMessage - Error message to display (optional)
     * @returns {Promise<HTMLElement>} The created file upload element
     */
    async function createFileUpload(config) {
      const templateData = {
        id: config.id || `file-${Math.random().toString(36).substr(2, 9)}`,
        name: config.name || config.id,
        label: config.label,
        buttonText: config.buttonText || 'Choose file',
        accept: config.accept,
        multiple: !!config.multiple,
        required: !!config.required,
        disabled: !!config.disabled,
        helpText: config.helpText,
        errorMessage: config.errorMessage,
        modifier: config.modifier,
        groupModifier: config.groupModifier
      };

      return createComponent('form/file-upload', templateData);
    }
    
    /**
     * Creates a form group container for organizing related form elements
     * @param {Object} config - The configuration for the form group
     * @param {string} config.heading - Optional heading for the group
     * @param {string} config.description - Optional description text
     * @param {HTMLElement|string} config.content - The form elements to include in this group
     * @param {string} config.helpText - Help text to display below the group (optional)
     * @param {string} config.errorMessage - Error message to display (optional)
     * @returns {Promise<HTMLElement>} The created form group element
     */
    async function createFormGroup(config) {
      const templateData = {
        heading: config.heading,
        description: config.description,
        content: config.content || '',
        helpText: config.helpText,
        errorMessage: config.errorMessage,
        modifier: config.modifier
      };

      return createComponent('form/form-group', templateData);
    }
    
    /**
     * Creates a complete form with optional title, description, and submit button
     * @param {Object} config - The configuration for the form
     * @param {string} config.id - The id for the form
     * @param {string} config.action - The form action URL (optional)
     * @param {string} config.method - The form method (default: 'post')
     * @param {string} config.title - Optional form title
     * @param {string} config.description - Optional form description
     * @param {HTMLElement|string} config.content - The form elements to include
     * @param {boolean} config.submitButton - Whether to show a submit button (default: true)
     * @param {string} config.submitButtonText - Text for the submit button (default: 'Submit')
     * @param {boolean} config.cancelButton - Whether to show a cancel button (default: false)
     * @param {string} config.cancelButtonText - Text for the cancel button (default: 'Cancel')
     * @param {boolean} config.novalidate - Whether to disable browser validation (optional)
     * @returns {Promise<HTMLElement>} The created form element
     */
    async function createForm(config) {
      const templateData = {
        id: config.id || `form-${Math.random().toString(36).substr(2, 9)}`,
        action: config.action,
        method: config.method || 'post',
        title: config.title,
        description: config.description,
        content: config.content || '',
        submitButton: config.submitButton !== false,
        submitButtonText: config.submitButtonText || 'Submit',
        submitButtonModifier: config.submitButtonModifier,
        cancelButton: !!config.cancelButton,
        cancelButtonText: config.cancelButtonText || 'Cancel',
        cancelButtonModifier: config.cancelButtonModifier,
        novalidate: !!config.novalidate,
        modifier: config.modifier
      };

      return createComponent('form/form', templateData);
    }
    
    /**
     * Create a tabs component
     * @param {Object} config - Tabs configuration
     * @param {string} [config.id] - Tabs container ID
     * @param {boolean} [config.vertical=false] - Whether to use vertical tabs
     * @param {boolean} [config.equalWidth=false] - Whether tab items should have equal width
     * @param {string} [config.modifier] - Additional CSS class for the tabs
     * @param {Array} config.tabs - Array of tab items
     * @param {string} config.tabs[].id - Tab ID
     * @param {string} config.tabs[].label - Tab label
     * @param {string} [config.tabs[].icon] - Tab icon HTML
     * @param {string} [config.tabs[].badge] - Tab badge text
     * @param {string} [config.tabs[].statusIndicator] - Tab status indicator (success, error, warning, info)
     * @param {string} [config.tabs[].content] - Tab panel content HTML
     * @param {boolean} [config.tabs[].active=false] - Whether the tab is active
     * @param {boolean} [config.emptyState=false] - Whether to show empty state
     * @param {string} [config.emptyStateId] - Empty state container ID
     * @param {string} [config.emptyStateIcon] - Empty state icon HTML
     * @param {string} [config.emptyStateTitle] - Empty state title
     * @param {string} [config.emptyStateDescription] - Empty state description
     * @returns {Promise<HTMLElement>} - Tabs element
     */
    async function createTabs(config) {
      // Ensure at least one tab is active
      let hasActiveTab = false;
      if (config.tabs && config.tabs.length > 0) {
        hasActiveTab = config.tabs.some(tab => tab.active);
        if (!hasActiveTab) {
          config.tabs[0].active = true;
        }
      }
      
      // Create the tabs component
      const tabs = await createComponent('tabs/tabs', {
        id: config.id || `tabs-${Date.now()}`,
        vertical: config.vertical || false,
        equalWidth: config.equalWidth || false,
        modifier: config.modifier || '',
        tabs: config.tabs || [],
        emptyState: config.emptyState || false,
        emptyStateId: config.emptyStateId || `empty-${Date.now()}`,
        emptyStateIcon: config.emptyStateIcon || '',
        emptyStateTitle: config.emptyStateTitle || 'No content',
        emptyStateDescription: config.emptyStateDescription || 'There is no content to display.'
      });
      
      // Add event listeners for tab switching
      const tabItems = tabs.querySelectorAll('.tabs__item');
      tabItems.forEach(tabItem => {
        tabItem.addEventListener('click', () => {
          // Deactivate all tabs
          tabItems.forEach(item => {
            item.classList.remove('tabs__item--active');
            item.setAttribute('aria-selected', 'false');
          });
          
          // Activate clicked tab
          tabItem.classList.add('tabs__item--active');
          tabItem.setAttribute('aria-selected', 'true');
          
          // Hide all panels
          const panels = tabs.querySelectorAll('.tabs__panel');
          panels.forEach(panel => {
            panel.classList.remove('tabs__panel--active');
          });
          
          // Show selected panel
          const tabId = tabItem.getAttribute('data-tab-id');
          const panel = tabs.querySelector(`#panel-${tabId}`);
          if (panel) {
            panel.classList.add('tabs__panel--active');
          }
          
          // Trigger event
          const tabChangeEvent = new CustomEvent('tab:change', {
            detail: { tabId, tabElement: tabItem, panelElement: panel }
          });
          tabs.dispatchEvent(tabChangeEvent);
        });
      });
      
      return tabs;
    }
    
    /**
     * Create a table component
     * @param {Object} config - Table configuration
     * @param {string} [config.id] - Table container ID
     * @param {string} [config.title] - Table title
     * @param {string} [config.headerActions] - HTML for header action buttons
     * @param {boolean} [config.responsive=true] - Whether the table should be responsive
     * @param {boolean} [config.striped=false] - Whether to use striped rows
     * @param {boolean} [config.bordered=false] - Whether to add borders
     * @param {boolean} [config.compact=false] - Whether to use compact styling
     * @param {string} [config.modifier] - Additional CSS class for the table
     * @param {boolean} [config.selectable=false] - Whether rows are selectable with checkboxes
     * @param {Array} config.columns - Array of column definitions
     * @param {string} config.columns[].key - Column data key
     * @param {string} config.columns[].label - Column header label
     * @param {boolean} [config.columns[].sortable=false] - Whether the column is sortable
     * @param {string} [config.columns[].sorted] - Current sort direction ('asc' or 'desc')
     * @param {string} [config.columns[].width] - Column width (CSS value)
     * @param {Array} config.rows - Array of row data objects
     * @param {string} config.rows[].id - Row ID
     * @param {boolean} [config.rows[].selected] - Whether the row is selected
     * @param {Array} [config.rowActions] - Array of row action definitions
     * @param {string} config.rowActions[].type - Action type (e.g., 'edit', 'delete')
     * @param {string} config.rowActions[].action - Action identifier
     * @param {string} config.rowActions[].label - Accessible label
     * @param {string} config.rowActions[].icon - Action icon HTML
     * @param {boolean} [config.rowActions[].disabled] - Whether the action is disabled
     * @param {string} [config.rowActions[].title] - Tooltip text
     * @param {string} [config.rowActionsWidth='80px'] - Width of the actions column
     * @param {Object} [config.pagination] - Pagination configuration
     * @param {number} config.pagination.startItem - First item index shown
     * @param {number} config.pagination.endItem - Last item index shown
     * @param {number} config.pagination.totalItems - Total number of items
     * @param {boolean} config.pagination.hasPrevious - Whether there's a previous page
     * @param {boolean} config.pagination.hasNext - Whether there's a next page
     * @param {Array} config.pagination.pages - Array of page definitions
     * @param {string|number} config.pagination.pages[].value - Page value
     * @param {string} config.pagination.pages[].label - Page label
     * @param {boolean} [config.pagination.pages[].active] - Whether this is the current page
     * @param {boolean} [config.emptyState=false] - Whether to show empty state
     * @param {string} [config.emptyStateId] - Empty state container ID
     * @param {string} [config.emptyStateIcon] - Empty state icon HTML
     * @param {string} [config.emptyStateTitle] - Empty state title
     * @param {string} [config.emptyStateDescription] - Empty state description
     * @returns {Promise<HTMLElement>} - Table element
     */
    async function createTable(config) {
      // Prepare table data for the template
      const tableData = {
        id: config.id || `table-${Date.now()}`,
        title: config.title || '',
        headerActions: config.headerActions || '',
        responsive: config.responsive !== false, // Default to true
        striped: config.striped || false,
        bordered: config.bordered || false,
        compact: config.compact || false,
        modifier: config.modifier || '',
        selectable: config.selectable || false,
        columns: config.columns || [],
        rows: config.data || [], // Support for 'data' property for backward compatibility
        rowActions: config.rowActions || [],
        rowActionsWidth: config.rowActionsWidth || '80px',
        pagination: config.pagination || null,
        emptyState: config.emptyState || (config.data && config.data.length === 0),
        emptyStateId: config.emptyStateId || `empty-${Date.now()}`,
        emptyStateIcon: config.emptyStateIcon || '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>',
        emptyStateTitle: config.emptyStateTitle || 'No data available',
        emptyStateDescription: config.emptyStateDescription || 'There are no items to display at this time.'
      };
      
      // Create the table component
      console.log("Creating table with data:", tableData);
      const table = await createComponent('table/table', tableData);
      
      // Apply custom column widths after component creation
      if (table) {
        // Set up event handlers for sortable columns
        const sortableHeaders = table.querySelectorAll('.table__header-cell--sortable');
        sortableHeaders.forEach(header => {
          header.addEventListener('click', () => {
            const columnId = header.dataset.column;
            const currentDirection = header.dataset.sort || 'none';
            
            // Update sort direction
            let newDirection;
            if (currentDirection === 'none') {
              newDirection = 'asc';
            } else if (currentDirection === 'asc') {
              newDirection = 'desc';
            } else {
              newDirection = 'none';
            }
            
            // Reset all headers
            sortableHeaders.forEach(h => {
              h.dataset.sort = 'none';
              h.classList.remove('table__header-cell--sorted-asc', 'table__header-cell--sorted-desc');
            });
            
            // Update clicked header
            if (newDirection !== 'none') {
              header.dataset.sort = newDirection;
              header.classList.add(`table__header-cell--sorted-${newDirection}`);
            }
            
            // Trigger sort event
            const sortEvent = new CustomEvent('table:sort', {
              detail: { column: columnId, direction: newDirection }
            });
            table.dispatchEvent(sortEvent);
          });
        });
        
        // Set up event handlers for row actions
        if (config.rowActions && config.rowActions.length > 0 && config.onRowAction) {
          const actionButtons = table.querySelectorAll('.table__row-action');
          actionButtons.forEach(button => {
            button.addEventListener('click', (event) => {
              event.stopPropagation(); // Prevent row click
              
              const action = button.dataset.action;
              const rowId = button.closest('tr').dataset.id;
              
              // Find row data
              const rowData = config.data.find(row => row.id.toString() === rowId);
              
              if (rowData && config.onRowAction) {
                config.onRowAction(action, rowData, event);
              }
            });
          });
        }
        
        // Set up event handlers for row selection
        if (config.selectable) {
          const selectAllCheckbox = table.querySelector('.table__select-all');
          const rowCheckboxes = table.querySelectorAll('.table__select-row');
          
          if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
              const checked = selectAllCheckbox.checked;
              
              // Update all row checkboxes
              rowCheckboxes.forEach(checkbox => {
                checkbox.checked = checked;
                const row = checkbox.closest('tr');
                if (row) {
                  if (checked) {
                    row.classList.add('table__row--selected');
                  } else {
                    row.classList.remove('table__row--selected');
                  }
                }
              });
              
              // Trigger selection event
              const selectionEvent = new CustomEvent('table:selection', {
                detail: {
                  allSelected: checked,
                  selectedRows: Array.from(rowCheckboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.closest('tr').dataset.id)
                }
              });
              table.dispatchEvent(selectionEvent);
            });
          }
          
          rowCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
              // Update row styling
              const row = checkbox.closest('tr');
              if (row) {
                if (checkbox.checked) {
                  row.classList.add('table__row--selected');
                } else {
                  row.classList.remove('table__row--selected');
                }
              }
              
              // Update select all checkbox
              if (selectAllCheckbox) {
                const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
                const anyChecked = Array.from(rowCheckboxes).some(cb => cb.checked);
                
                selectAllCheckbox.checked = allChecked;
                selectAllCheckbox.indeterminate = anyChecked && !allChecked;
              }
              
              // Trigger selection event
              const selectionEvent = new CustomEvent('table:selection', {
                detail: {
                  allSelected: Array.from(rowCheckboxes).every(cb => cb.checked),
                  selectedRows: Array.from(rowCheckboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.closest('tr').dataset.id)
                }
              });
              table.dispatchEvent(selectionEvent);
            });
          });
        }
      }
      
      return table;
    }
    
    /**
     * Create a navbar component
     * @param {Object} config - Navbar configuration
     * @param {string} [config.id] - Navbar ID
     * @param {string} [config.title] - Navbar title
     * @param {string} [config.subtitle] - Navbar subtitle
     * @param {string} [config.logo] - URL to logo image
     * @param {string} [config.logoAlt] - Alt text for logo
     * @param {boolean} [config.brand] - Whether to show the brand section
     * @param {boolean} [config.fixed] - Whether navbar is fixed to top
     * @param {string} [config.variant] - Variant (primary, secondary, transparent)
     * @param {boolean} [config.compact] - Whether to use compact styling
     * @param {boolean} [config.toggleButton] - Whether to show mobile toggle button
     * @param {Array} [config.items] - Array of navigation items
     * @param {Array} [config.actions] - Array of action buttons
     * @param {string} [config.content] - Additional content HTML
     * @param {string} [config.modifier] - Additional CSS class
     * @returns {Promise<HTMLElement>} - Navbar element
     */
    async function createNavbar(config) {
      const navbarData = {
        id: config.id || `navbar-${Date.now()}`,
        title: config.title || '',
        subtitle: config.subtitle || '',
        logo: config.logo || '',
        logoAlt: config.logoAlt || 'Logo',
        brand: config.hasOwnProperty('brand') ? config.brand : !!(config.title || config.logo),
        fixed: config.fixed || false,
        variant: config.variant || '',
        compact: config.compact || false,
        toggleButton: config.toggleButton || false,
        toggleActive: config.toggleActive || false,
        expanded: config.expanded || false,
        items: config.items || [],
        actions: config.actions || [],
        divider: config.divider || false,
        content: config.content || '',
        modifier: config.modifier || ''
      };
      
      // Debug icon rendering if enabled
      if (DEBUG_ICONS) {
        // Check for icons in navigation items
        if (navbarData.items && navbarData.items.length) {
          navbarData.items.forEach((item, index) => {
            if (item.icon) {
              console.log(`[DEBUG] Navbar item ${index} icon:`, item.icon);
            }
          });
        }
        
        // Check for icons in action buttons
        if (navbarData.actions && navbarData.actions.length) {
          navbarData.actions.forEach((action, index) => {
            if (action.icon) {
              console.log(`[DEBUG] Navbar action ${index} icon:`, action.icon);
            }
          });
        }
      }
      
      const navbar = await createComponent('navigation/navbar', navbarData);
      
      // Set up toggle functionality for mobile
      const toggleButton = navbar.querySelector('[data-navbar-toggle]');
      if (toggleButton) {
        toggleButton.addEventListener('click', () => {
          toggleButton.classList.toggle('navbar__toggle--active');
          navbar.classList.toggle('navbar--expanded');
          
          // Trigger event
          const event = new CustomEvent('navbar:toggle', {
            detail: { expanded: navbar.classList.contains('navbar--expanded') }
          });
          navbar.dispatchEvent(event);
        });
      }
      
      // Set up action handlers
      const actionButtons = navbar.querySelectorAll('.navbar__action');
      actionButtons.forEach(button => {
        button.addEventListener('click', (event) => {
          const action = button.dataset.action;
          if (action && config.onAction) {
            config.onAction(action, event);
          }
        });
      });
      
      return navbar;
    }
    
    /**
     * Create a sidebar component
     * @param {Object} config - Sidebar configuration
     * @param {string} [config.id] - Sidebar ID
     * @param {string} [config.title] - Sidebar title
     * @param {boolean} [config.header] - Whether to show the header
     * @param {boolean} [config.collapsible] - Whether sidebar can be collapsed
     * @param {boolean} [config.collapsed] - Whether sidebar is initially collapsed
     * @param {boolean} [config.right] - Whether sidebar is positioned on the right
     * @param {boolean} [config.dark] - Whether to use dark styling
     * @param {boolean} [config.hidden] - Whether sidebar is initially hidden
     * @param {boolean} [config.visible] - Whether sidebar is visible (mobile)
     * @param {boolean} [config.overlay] - Whether to show overlay on mobile
     * @param {Array} [config.items] - Array of navigation items
     * @param {Array} [config.sections] - Array of sections with title and items
     * @param {string} [config.content] - Additional content HTML
     * @param {string} [config.modifier] - Additional CSS class
     * @returns {Promise<Object>} - Sidebar object with element and control methods
     */
    async function createSidebar(config) {
      try {
        const sidebarData = {
          id: config.id || `sidebar-${Date.now()}`,
          title: config.title || '',
          header: config.hasOwnProperty('header') ? config.header : true,
          collapsible: config.collapsible || false,
          collapsed: config.collapsed || false,
          right: config.right || false,
          dark: config.dark || false,
          hidden: config.hasOwnProperty('hidden') ? config.hidden : (window.innerWidth < 768),
          visible: config.hasOwnProperty('visible') ? config.visible : false,
          overlay: config.hasOwnProperty('overlay') ? config.overlay : true,
          items: config.items || [],
          sections: config.sections || [],
          content: config.content || '',
          modifier: config.modifier || ''
        };
        
        console.log('Creating sidebar with ID:', sidebarData.id);
        console.log('Sidebar sections data:', JSON.stringify(sidebarData.sections));
        
        // Create the container for the sidebar
        const container = document.createElement('div');
        
        try {
          // Render the sidebar HTML
          const html = await renderComponent('navigation/sidebar', sidebarData);
          
          if (!html || typeof html !== 'string' || html.trim().length === 0) {
            throw new Error('Rendered sidebar HTML is empty or invalid');
          }
          
          console.log('Sidebar HTML rendered:', html.substring(0, 200) + '...');
          container.innerHTML = html;
          
          // Get the sidebar element (first child of container)
          const sidebar = container.firstElementChild;
          
          if (!sidebar || !(sidebar instanceof Element)) {
            throw new Error('No valid sidebar element found in rendered template');
          }
          
          console.log('Sidebar DOM created, contains items:', sidebar.querySelectorAll('.sidebar__item').length);
          
          // Append to document body if not already there
          if (!document.body.contains(sidebar)) {
            document.body.appendChild(sidebar);
          }
          
          console.log('Sidebar created successfully:', sidebar.id);
          return sidebar;
          
        } catch (error) {
          console.error('Error rendering sidebar template:', error);
          
          // Create a fallback sidebar manually
          console.log('Creating fallback sidebar');
          const fallbackSidebar = document.createElement('div');
          fallbackSidebar.className = 'sidebar';
          fallbackSidebar.id = sidebarData.id;
          
          // Add basic structure
          fallbackSidebar.innerHTML = `
            <div class="sidebar__header">
              <h2 class="sidebar__title">${sidebarData.title}</h2>
              ${sidebarData.collapsible ? '<button class="sidebar__toggle">Toggle</button>' : ''}
            </div>
            <div class="sidebar__content">
              ${sidebarData.sections.map(section => `
                <div class="sidebar__section">
                  ${section.title ? `<h3 class="sidebar__section-title">${section.title}</h3>` : ''}
                  <ul class="sidebar__list">
                    ${section.items.map(item => `
                      <li class="sidebar__item ${item.active ? 'sidebar__item--active' : ''}" data-id="${item.id}">
                        <span class="sidebar__icon">${item.icon || ''}</span>
                        <span class="sidebar__text">${item.text}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          `;
          
          // Append to document body
          document.body.appendChild(fallbackSidebar);
          
          console.log('Fallback sidebar created:', fallbackSidebar.id);
          return fallbackSidebar;
        }
      } catch (error) {
        console.error('Failed to create sidebar:', error);
        
        // Ultimate fallback
        const emergencySidebar = document.createElement('div');
        emergencySidebar.className = 'sidebar';
        emergencySidebar.id = config.id || `emergency-sidebar-${Date.now()}`;
        emergencySidebar.innerHTML = '<div class="sidebar__content">Sidebar Error</div>';
        
        // Append to document body
        document.body.appendChild(emergencySidebar);
        
        return emergencySidebar;
      }
    }
    
    // Public API
    return {
      init,
      loadTemplate,
      renderTemplate,
      renderComponent,
      createComponent,
      renderToContainer,
      createButton,
      createNotification,
      showNotification,
      createCard,
      createModal,
      showModal,
      createTextInput,
      createTextarea,
      createSelect,
      createCheckbox,
      createRadioGroup,
      createSwitch,
      createFileUpload,
      createFormGroup,
      createForm,
      createTabs,
      createTable,
      createNavbar,
      createSidebar
    };
  })();

} else {
  console.warn('ComponentLoader already exists. Not initializing new version.');
} 