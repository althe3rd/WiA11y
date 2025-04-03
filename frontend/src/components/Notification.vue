<template>
  <transition name="notification-fade">
    <div 
      v-if="show" 
      class="notification-container"
      :class="[`notification-${type}`]"
      @click="onClose"
    >
      <div class="notification-content">
        <div class="notification-icon" v-if="type !== 'default'">
          <font-awesome-icon :icon="icon" />
        </div>
        <div class="notification-message">
          {{ message }}
        </div>
        <button class="notification-close" @click.stop="onClose">
          <font-awesome-icon icon="times" />
        </button>
      </div>
      <div v-if="autoClose" class="notification-progress">
        <div class="notification-progress-bar" :style="progressStyle"></div>
      </div>
    </div>
  </transition>
</template>

<script>
import { computed, ref, onMounted, watch } from 'vue';

export default {
  name: 'Notification',
  props: {
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'default',
      validator: (value) => ['success', 'error', 'warning', 'info', 'default'].includes(value)
    },
    duration: {
      type: Number,
      default: 4000 // 4 seconds
    },
    autoClose: {
      type: Boolean,
      default: true
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const show = ref(false);
    const progress = ref(100);
    let timer = null;
    let progressTimer = null;

    // Don't show this component if it's a confirmation type
    // as those should be handled by ConfirmDialog
    if (props.type === 'confirm') {
      console.warn('Confirmation dialogs should use ConfirmDialog component, not Notification');
      return { show: ref(false) };
    }

    const icon = computed(() => {
      switch (props.type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'bell';
      }
    });

    const progressStyle = computed(() => {
      return {
        width: `${progress.value}%`,
      };
    });

    const startProgressTimer = () => {
      if (!props.autoClose) return;
      
      const decrement = 100 / (props.duration / 10); // Update every 10ms
      progressTimer = setInterval(() => {
        progress.value = Math.max(0, progress.value - decrement);
      }, 10);
    };

    const onClose = () => {
      show.value = false;
      clearTimeout(timer);
      clearInterval(progressTimer);
      setTimeout(() => {
        emit('close');
      }, 300); // Wait for animation to finish
    };

    watch(() => props.message, () => {
      if (timer) {
        clearTimeout(timer);
        clearInterval(progressTimer);
        progress.value = 100;
      }
      
      if (props.autoClose) {
        timer = setTimeout(onClose, props.duration);
        startProgressTimer();
      }
    });

    onMounted(() => {
      // Start animation after mount
      show.value = true;
      
      // Set up auto-close timer
      if (props.autoClose) {
        timer = setTimeout(onClose, props.duration);
        startProgressTimer();
      }
    });

    return {
      show,
      icon,
      progressStyle,
      onClose
    };
  }
};
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 300px;
  max-width: 450px;
  background-color: var(--card-background, #ffffff);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  overflow: hidden;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 16px;
}

.notification-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 20px;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-color, #333333);
}

.notification-close {
  background: none;
  border: none;
  color: var(--text-muted, #666666);
  cursor: pointer;
  padding: 4px;
  margin-left: 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.notification-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.notification-progress {
  height: 4px;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.05);
}

.notification-progress-bar {
  height: 100%;
  transition: width 0.01s linear;
}

/* Types */
.notification-success {
  border-left: 4px solid #4caf50;
}

.notification-success .notification-icon {
  color: #4caf50;
}

.notification-success .notification-progress-bar {
  background-color: #4caf50;
}

.notification-error {
  border-left: 4px solid #f44336;
}

.notification-error .notification-icon {
  color: #f44336;
}

.notification-error .notification-progress-bar {
  background-color: #f44336;
}

.notification-warning {
  border-left: 4px solid #ff9800;
}

.notification-warning .notification-icon {
  color: #ff9800;
}

.notification-warning .notification-progress-bar {
  background-color: #ff9800;
}

.notification-info {
  border-left: 4px solid #2196f3;
}

.notification-info .notification-icon {
  color: #2196f3;
}

.notification-info .notification-progress-bar {
  background-color: #2196f3;
}

.notification-default {
  border-left: 4px solid #9e9e9e;
}

.notification-default .notification-progress-bar {
  background-color: #9e9e9e;
}

/* Transitions */
.notification-fade-enter-active,
.notification-fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.notification-fade-enter-from,
.notification-fade-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style> 