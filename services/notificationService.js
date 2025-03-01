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
      notification.className = `notification notification-${type} rounded shadow-lg`;
      
      // Add title if provided
      if (title) {
        const titleElement = document.createElement('div');
        titleElement.className = 'notification-title text-gray-800 font-semibold';
        titleElement.textContent = title;
        notification.appendChild(titleElement);
      }
      
      // Add message
      const messageElement = document.createElement('div');
      messageElement.className = 'notification-message text-gray-600';
      messageElement.textContent = message;
      notification.appendChild(messageElement);
      
      // Add timer bar
      const timerContainer = document.createElement('div');
      timerContainer.className = 'notification-timer mt-2';
      
      const timerBar = document.createElement('div');
      timerBar.className = 'notification-timer-progress';
      timerContainer.appendChild(timerBar);
      notification.appendChild(timerContainer);
      
      // Add notification to container
      container.prepend(notification);
      
      // Animate timer
      timerBar.style.width = '100%';
      timerBar.style.transitionDuration = `${duration}ms`;
      
      // Start animation after DOM update
      setTimeout(() => {
        timerBar.style.width = '0%';
      }, 10);
      
      // Remove notification after duration
      const timeout = setTimeout(() => {
        notification.style.animation = 'notificationFadeOut 0.3s forwards';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, duration);
      
      // Allow clicking to dismiss early
      notification.addEventListener('click', () => {
        clearTimeout(timeout);
        notification.style.animation = 'notificationFadeOut 0.3s forwards';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      });
      
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
    } else {
      console.warn('Services not available, NotificationService not registered');
      
      // Still make it globally available
      window.NotificationService = {
        init,
        show,
        success,
        error,
        warning,
        info
      };
    }
    
    // Return public API
    return {
      init,
      show,
      success,
      error,
      warning,
      info
    };
  })();