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
    return new Promise((resolve) => {
      // Create a unique ID for this confirmation
      const id = this.counter++;
      
      // Create callbacks for confirm and cancel actions
      const onConfirm = () => {
        this.close(id);
        resolve(true);
      };
      
      const onCancel = () => {
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
        ...options
      };
      
      this.notifications.push(notification);
    });
  }
}

// Create a singleton instance
const notificationService = new NotificationService();

export default notificationService; 