import notificationService from '../services/notificationService';

const notify = {
  /**
   * Shows a success notification
   * @param {string} message - Message to display
   * @param {object} options - Optional configuration
   */
  success(message, options = {}) {
    return notificationService.success(message, options);
  },

  /**
   * Shows an error notification
   * @param {string} message - Message to display
   * @param {object} options - Optional configuration
   */
  error(message, options = {}) {
    return notificationService.error(message, options);
  },

  /**
   * Shows a warning notification
   * @param {string} message - Message to display
   * @param {object} options - Optional configuration
   */
  warning(message, options = {}) {
    return notificationService.warning(message, options);
  },

  /**
   * Shows an info notification
   * @param {string} message - Message to display
   * @param {object} options - Optional configuration
   */
  info(message, options = {}) {
    return notificationService.info(message, options);
  },

  /**
   * Shows a confirmation dialog
   * @param {string} message - Message to display
   * @param {object} options - Optional configuration including:
   *   - type: 'warning' | 'danger' | 'info'
   *   - confirmText: Text for confirm button
   *   - cancelText: Text for cancel button
   * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
   */
  confirm(message, options = {}) {
    return notificationService.confirm(message, options);
  }
};

export default notify; 