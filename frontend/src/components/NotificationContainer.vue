<template>
  <div class="notifications-wrapper">
    <!-- Regular notifications -->
    <div class="notification-container">
      <transition-group name="notification-list">
        <Notification 
          v-for="notification in regularNotifications" 
          :key="notification.id"
          :message="notification.message"
          :type="notification.type"
          :duration="notification.duration"
          :autoClose="notification.autoClose"
          @close="closeNotification(notification.id)"
        />
      </transition-group>
    </div>
    
    <!-- Confirmation dialogs - must be rendered separately -->
    <div class="confirm-container">
      <ConfirmDialog
        v-if="activeConfirmation"
        :message="activeConfirmation.message"
        :type="activeConfirmation.dialogType || 'warning'"
        :confirmText="activeConfirmation.confirmText || 'Yes'"
        :cancelText="activeConfirmation.cancelText || 'No'"
        @confirm="onConfirm(activeConfirmation)"
        @cancel="onCancel(activeConfirmation)"
      />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import Notification from './Notification.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import notificationService from '../services/notificationService';

export default {
  name: 'NotificationContainer',
  components: {
    Notification,
    ConfirmDialog
  },
  setup() {
    // Get all regular (non-confirm) notifications
    const regularNotifications = computed(() => {
      return notificationService.notifications.filter(
        notification => notification.type !== 'confirm'
      );
    });
    
    // Get the active confirmation dialog (if any)
    const activeConfirmation = computed(() => {
      return notificationService.notifications.find(
        notification => notification.type === 'confirm'
      );
    });
    
    // Close a notification by ID
    const closeNotification = (id) => {
      notificationService.close(id);
    };
    
    // Handle confirmation dialog actions
    const onConfirm = (confirmation) => {
      if (confirmation.onConfirm) {
        confirmation.onConfirm();
      }
    };
    
    const onCancel = (confirmation) => {
      if (confirmation.onCancel) {
        confirmation.onCancel();
      }
    };
    
    return {
      regularNotifications,
      activeConfirmation,
      closeNotification,
      onConfirm,
      onCancel
    };
  }
};
</script>

<style scoped>
.notifications-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9000;
}

.notification-container {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9000;
  pointer-events: none;
}

.notification-container > * {
  pointer-events: auto;
}

.confirm-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9500;
  pointer-events: none;
}

.confirm-container > * {
  pointer-events: auto;
}

/* List transitions */
.notification-list-enter-active,
.notification-list-leave-active {
  transition: all 0.3s ease;
}

.notification-list-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.notification-list-move {
  transition: transform 0.3s ease;
}
</style> 