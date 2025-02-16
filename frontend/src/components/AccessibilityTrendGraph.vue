<template>
  <div class="trend-graph">
    <Line
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>

<script>
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { calculateScore } from '../utils/scoreCalculator'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default {
  name: 'AccessibilityTrendGraph',
  components: { Line },
  props: {
    crawls: {
      type: Array,
      required: true
    }
  },
  computed: {
    chartData() {
      const sortedCrawls = [...this.crawls].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return {
        labels: sortedCrawls.map(crawl => new Date(crawl.createdAt).toLocaleDateString()),
        datasets: [{
          label: 'Accessibility Score',
          data: sortedCrawls.map(crawl => {
            const score = calculateScore(crawl);
            return score === '—' ? null : score;
          }),
          borderColor: function(context) {
            const score = context.raw;
            if (score === null) return '#666666';
            if (score >= 90) return '#4CAF50';  // Excellent - Green
            if (score >= 70) return '#8BC34A';  // Good - Light Green
            if (score >= 50) return '#FFC107';  // Fair - Yellow
            return '#F44336';  // Poor - Red
          },
          backgroundColor: function(context) {
            const score = context.raw;
            if (score === null) return 'rgba(102, 102, 102, 0.1)';
            if (score >= 90) return 'rgba(76, 175, 80, 0.1)';
            if (score >= 70) return 'rgba(139, 195, 74, 0.1)';
            if (score >= 50) return 'rgba(255, 193, 7, 0.1)';
            return 'rgba(244, 67, 54, 0.1)';
          },
          segment: {
            borderColor: function(context) {
              const score = context.p1.raw;
              if (score === null) return '#666666';
              if (score >= 90) return '#4CAF50';
              if (score >= 70) return '#8BC34A';
              if (score >= 50) return '#FFC107';
              return '#F44336';
            }
          },
          fill: true,
          tension: 0.4
        }]
      }
    },
    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Score (%)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    }
  }
}
</script>

<style scoped>
.trend-graph {
  height: 300px;
  margin: 20px 0;
}
</style> 