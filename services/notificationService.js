/**
 * notificationService.js - Notification management
 */

// Create the NotificationService
const NotificationService = (function() {
    const DEFAULT_DURATION = 5000; // 5 seconds
    let container;
    
    /**
     * Initialize notification service
     */
    function init() {
      container = document.getElementById('notification-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 w-80';
        document.body.appendChild(container);
      }
      
      console.log('NotificationService initialized');
      return Promise.resolve();
    }
    
    /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {string} title - Notification title
     * @param {number} duration - Duration in milliseconds
     */
    function show(message, type = 'info', title = '', duration = DEFAULT_DURATION) {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `mb-4 rounded-md shadow-lg overflow-hidden flex flex-col bg-white`;
      notification.style.animation = 'notification-slide-in 0.3s forwards';
      
      // Add left border based on type
      const leftBorderColor = type === 'success' ? '#4caf50' : 
                             type === 'error' ? '#f44336' : 
                             type === 'warning' ? '#ff9800' : '#2196f3';
      
      // Create content container
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'relative flex items-start p-0';
      contentWrapper.style.borderLeft = `4px solid ${leftBorderColor}`;
      
      // Add accent bar at left
      const accentBar = document.createElement('div');
      accentBar.className = 'absolute left-0 top-0 bottom-0 w-1';
      accentBar.style.backgroundColor = leftBorderColor;
      contentWrapper.appendChild(accentBar);
      
      // Add content container
      const content = document.createElement('div');
      content.className = 'p-4 flex-grow';
      
      // Add title if provided, otherwise use type name
      if (title) {
        const titleElement = document.createElement('div');
        titleElement.className = 'text-lg font-medium text-gray-900 mb-1';
        titleElement.textContent = title;
        content.appendChild(titleElement);
      }
      
      // Add message
      const messageElement = document.createElement('div');
      messageElement.className = 'text-sm text-gray-600';
      messageElement.textContent = message;
      content.appendChild(messageElement);
      
      contentWrapper.appendChild(content);
      notification.appendChild(contentWrapper);
      
      // Add progress bar
      const progressContainer = document.createElement('div');
      progressContainer.className = 'h-1 bg-gray-200 w-full relative';
      
      const progressBar = document.createElement('div');
      progressBar.className = 'absolute left-0 top-0 h-full';
      progressBar.style.backgroundColor = leftBorderColor;
      progressBar.style.width = '100%';
      progressBar.style.transition = `width ${duration}ms linear`;
      
      progressContainer.appendChild(progressBar);
      notification.appendChild(progressContainer);
      
      // Add notification to container
      container.appendChild(notification);
      
      // Start animation after DOM update
      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 10);
      
      // Remove notification after duration
      const timeout = setTimeout(() => {
        notification.style.animation = 'notification-slide-out 0.3s forwards';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, duration);
      
      // Allow clicking to dismiss early
      notification.addEventListener('click', () => {
        clearTimeout(timeout);
        notification.style.animation = 'notification-slide-out 0.3s forwards';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      });
      
      // Add animation styles if not already added
      if (!document.getElementById('notification-animations')) {
        const style = document.createElement('style');
        style.id = 'notification-animations';
        style.textContent = `
          @keyframes notification-slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes notification-slide-out {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Publish event if EventBus is available
      if (window.EventBus) {
        window.EventBus.publish('notification:shown', {
          type,
          title,
          message,
          duration
        });
      }
    }
    
    /**
     * Show a success notification
     * @param {string} message - Notification message
     * @param {string} title - Notification title
     * @param {number} duration - Duration in milliseconds
     */
    function success(message, title = 'Success', duration = DEFAULT_DURATION) {
      show(message, 'success', title, duration);
    }
    
    /**
     * Show an error notification
     * @param {string} message - Notification message
     * @param {string} title - Notification title
     * @param {number} duration - Duration in milliseconds
     */
    function error(message, title = 'Error', duration = DEFAULT_DURATION) {
      show(message, 'error', title, duration);
    }
    
    /**
     * Show a warning notification
     * @param {string} message - Notification message
     * @param {string} title - Notification title
     * @param {number} duration - Duration in milliseconds
     */
    function warning(message, title = 'Warning', duration = DEFAULT_DURATION) {
      show(message, 'warning', title, duration);
    }
    
    /**
     * Show an info notification
     * @param {string} message - Notification message
     * @param {string} title - Notification title
     * @param {number} duration - Duration in milliseconds
     */
    function info(message, title = 'Information', duration = DEFAULT_DURATION) {
      show(message, 'info', title, duration);
    }
    
    // Register the service if Services is available
    if (window.Services) {
      window.Services.register('NotificationService', {
        init,
        show,
        success,
        error,
        warning,
        info
      });
    }
    
    // Return the public API
    return {
      init,
      show,
      success,
      error,
      warning,
      info
    };
})();