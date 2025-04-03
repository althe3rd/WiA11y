<template>
  <transition name="confirm-fade">
    <div v-if="show" class="confirm-overlay" @click.self="onCancel">
      <div class="confirm-dialog" :data-type="type">
        <div class="confirm-header">
          <div class="confirm-icon">
            <font-awesome-icon :icon="icon" />
          </div>
          <button class="confirm-close" @click="onCancel">
            <font-awesome-icon icon="times" />
          </button>
        </div>
        <div class="confirm-message">
          {{ message }}
        </div>
        <div class="confirm-actions">
          <button 
            class="confirm-btn-cancel" 
            @click="onCancel"
          >
            {{ cancelText }}
          </button>
          <button 
            class="confirm-btn-confirm" 
            @click="onConfirm"
            :class="{ 'confirm-btn-danger': type === 'danger' }"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';

export default {
  name: 'ConfirmDialog',
  props: {
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'warning',
      validator: (value) => ['warning', 'danger', 'info'].includes(value)
    },
    confirmText: {
      type: String,
      default: 'Confirm'
    },
    cancelText: {
      type: String,
      default: 'Cancel'
    }
  },
  emits: ['confirm', 'cancel'],
  setup(props, { emit }) {
    console.log('ConfirmDialog setup called with props:', props);
    const show = ref(false);

    const icon = computed(() => {
      switch (props.type) {
        case 'danger': return 'exclamation-triangle';
        case 'warning': return 'exclamation-circle';
        case 'info': return 'info-circle';
        default: return 'question-circle';
      }
    });

    const onConfirm = () => {
      console.log('ConfirmDialog: confirm button clicked');
      show.value = false;
      setTimeout(() => {
        emit('confirm');
      }, 300); // Wait for animation to finish
    };

    const onCancel = () => {
      console.log('ConfirmDialog: cancel button clicked');
      show.value = false;
      setTimeout(() => {
        emit('cancel');
      }, 300); // Wait for animation to finish
    };

    // Watch for changes to the props to reset visibility
    watch(() => props.message, (newVal) => {
      console.log('ConfirmDialog: message changed to:', newVal);
      if (newVal && !show.value) {
        show.value = true;
      }
    });

    onMounted(() => {
      // Start animation after mount
      console.log('ConfirmDialog mounted, showing dialog');
      show.value = true;
    });

    return {
      show,
      icon,
      onConfirm,
      onCancel
    };
  }
};
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.confirm-dialog {
  background-color: var(--card-background, #ffffff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  padding: 24px;
}

.confirm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.confirm-icon {
  font-size: 24px;
  color: var(--warning-color, #ff9800);
}

.confirm-dialog[data-type="danger"] .confirm-icon {
  color: var(--error-color, #f44336);
}

.confirm-dialog[data-type="info"] .confirm-icon {
  color: var(--info-color, #2196f3);
}

.confirm-close {
  background: none;
  border: none;
  color: var(--text-muted, #666666);
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.confirm-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.confirm-message {
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-color, #333333);
  margin: 16px 0 24px;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.confirm-btn-cancel {
  padding: 10px 16px;
  border: 1px solid var(--border-color, #e0e0e0);
  background-color: #f5f5f5;
  color: var(--text-color, #333333);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.confirm-btn-cancel:hover {
  background-color: #e0e0e0;
}

.confirm-btn-confirm {
  padding: 10px 16px;
  border: none;
  background-color: var(--primary-color, #4caf50);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.confirm-btn-confirm:hover {
  opacity: 0.9;
}

.confirm-btn-danger {
  background-color: var(--error-color, #f44336);
}

/* Transitions */
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.3s;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-active .confirm-dialog,
.confirm-fade-leave-active .confirm-dialog {
  transition: transform 0.3s, opacity 0.3s;
}

.confirm-fade-enter-from .confirm-dialog,
.confirm-fade-leave-to .confirm-dialog {
  transform: scale(0.9);
  opacity: 0;
}
</style> 