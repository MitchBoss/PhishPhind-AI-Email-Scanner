/* notifications.js - Notification system */

const NotificationSystem = (function() {
    const container = document.getElementById('notification-container') || 
                      document.createElement('div');
    
    if (!document.getElementById('notification-container')) {
      container.id = 'notification-container';
      document.body.appendChild(container);
    }
    
    /**
     * Show a notification
     * @param {string} message - The notification message
     * @param {string} type - Type of notification (success, error, warning, info)
     * @param {string} title - Optional title
     * @param {number} duration - Duration in ms (default: 5000ms)
     */
    function show(message, type = 'info', title = '', duration = 5000) {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      
      // Add title if provided
      if (title) {
        const titleElement = document.createElement('div');
        titleElement.className = 'notification-title';
        titleElement.textContent = title;
        notification.appendChild(titleElement);
      }
      
      // Add message
      const messageElement = document.createElement('div');
      messageElement.className = 'notification-message';
      messageElement.textContent = message;
      notification.appendChild(messageElement);
      
      // Add timer bar
      const timerContainer = document.createElement('div');
      timerContainer.className = 'notification-timer';
      
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
    }
    
    function success(message, title = 'Success', duration = 5000) {
      show(message, 'success', title, duration);
    }
    
    function error(message, title = 'Error', duration = 5000) {
      show(message, 'error', title, duration);
    }
    
    function warning(message, title = 'Warning', duration = 5000) {
      show(message, 'warning', title, duration);
    }
    
    function info(message, title = 'Information', duration = 5000) {
      show(message, 'info', title, duration);
    }
    
    // Public API
    return {
      show,
      success,
      error,
      warning,
      info
    };
  })();
  