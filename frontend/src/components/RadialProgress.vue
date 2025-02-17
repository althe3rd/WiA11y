<template>
  <div class="radial-progress" :class="sizeClass">
    <svg viewBox="0 0 36 36" class="circular-chart">
      <!-- Background circle -->
      <circle
        class="circle-bg"
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        :stroke="backgroundStrokeColor"
        stroke-width="2.5"
      />
      <!-- Progress circle -->
      <circle
        class="circle"
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        :stroke="color"
        stroke-width="2.5"
        :stroke-dasharray="`${percentage}, 100`"
        stroke-linecap="round"
      />
      <text x="18" y="-17" class="percentage">{{ percentage }}%</text>
    </svg>
  </div>
</template>

<script>
export default {
  name: 'RadialProgress',
  props: {
    percentage: {
      type: [Number, String],
      required: true,
      validator: value => !isNaN(value) && value >= 0 && value <= 100
    },
    size: {
      type: String,
      default: 'medium',
      validator: value => ['small', 'medium', 'large'].includes(value)
    }
  },
  computed: {
    color() {
      const score = Number(this.percentage);
      if (score >= 90) return '#4CAF50';  // Excellent - Green
      if (score >= 70) return '#8BC34A';  // Good - Light Green
      if (score >= 50) return '#FFC107';  // Fair - Yellow
      return '#F44336';  // Poor - Red
    },
    backgroundStrokeColor() {
      return 'rgba(0, 0, 0, 0.1)';
    },
    sizeClass() {
      return `size-${this.size}`;
    }
  }
}
</script>

<style scoped>
.radial-progress {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.circular-chart {
  display: block;
  transform: rotate(-90deg);
  background: var(--card-background);
}

.circle-bg {
  fill: none;
}

.circle {
  fill: none;
  transition: stroke-dasharray 0.3s ease;
}

.percentage {
  transform: rotate(90deg);
  text-anchor: middle;
  dominant-baseline: middle;
  font-size: 10px;
  font-weight: 500;
  fill: var(--text-color);
}

/* Size variants */
.size-small svg {
  width: 40px;
  height: 40px;
}
.size-small .percentage {
  font-size: 8px;
}

.size-medium svg {
  width: 60px;
  height: 60px;
}
.size-medium .percentage {
  font-size: 8px;
}

.size-large svg {
  width: 80px;
  height: 80px;
}
.size-large .percentage {
  font-size: 12px;
}
</style> 