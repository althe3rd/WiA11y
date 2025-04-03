import { reactive } from 'vue';

class NotificationService {
  notifications = reactive([]);
  counter = 0;

  show(message, options = {}) {
    const id = this.counter++;
    const notification = {
      id,
      message,
      type: options.type || 'default',
      duration: options.duration || 4000,
      autoClose: options.autoClose !== undefined ? options.autoClose : true
    };
    
    this.notifications.push(notification);
    return id;
  }

  close(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
    }
  }

  closeAll() {
    this.notifications.splice(0, this.notifications.length);
  }

  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }

  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  // For confirm dialogs that need user interaction
  confirm(message, options = {}) {
    console.log('Creating confirmation dialog:', message, options);
    return new Promise((resolve) => {
      // Create a unique ID for this confirmation
      const id = this.counter++;
      
      // Create callbacks for confirm and cancel actions
      const onConfirm = () => {
        console.log('Confirmation dialog confirmed');
        this.close(id);
        resolve(true);
      };
      
      const onCancel = () => {
        console.log('Confirmation dialog cancelled');
        this.close(id);
        resolve(false);
      };
      
      // Add notification with confirm type and the callbacks
      const notification = {
        id,
        message,
        type: 'confirm',
        autoClose: false,
        onConfirm,
        onCancel,
        confirmText: options.confirmText || 'Yes',
        cancelText: options.cancelText || 'No',
        dialogType: options.type || 'warning'
      };
      
      // Close any existing confirmation dialogs
      const existingConfirmIndex = this.notifications.findIndex(n => n.type === 'confirm');
      if (existingConfirmIndex !== -1) {
        this.notifications.splice(existingConfirmIndex, 1);
      }
      
      // Add the new confirmation
      this.notifications.push(notification);
      
      console.log('Current notifications:', [...this.notifications]);
    });
  }
}

// Create a singleton instance
const notificationService = new NotificationService();

export default notificationService; 