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
          data: sortedCrawls.map(crawl => crawl.accessibilityScore),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
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