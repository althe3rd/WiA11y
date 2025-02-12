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
  name: 'AverageScoreTrendGraph',
  components: { Line },
  props: {
    crawls: {
      type: Array,
      required: true
    }
  },
  computed: {
    chartData() {
      // Group crawls by date and calculate average score for each day
      const dailyScores = this.crawls.reduce((acc, crawl) => {
        const date = new Date(crawl.createdAt).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = {
            scores: [],
            total: 0,
            count: 0
          };
        }
        const score = calculateScore(crawl);
        if (score !== '—') {
          acc[date].scores.push(score);
          acc[date].total += score;
          acc[date].count++;
        }
        return acc;
      }, {});

      // Calculate averages and sort by date
      const sortedData = Object.entries(dailyScores)
        .map(([date, data]) => ({
          date,
          average: data.count > 0 ? Math.round(data.total / data.count) : null
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      return {
        labels: sortedData.map(item => item.date),
        datasets: [{
          label: 'Average Score',
          data: sortedData.map(item => item.average),
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
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Average Score: ${context.parsed.y}%`;
              }
            }
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
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style> 