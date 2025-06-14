<template>
  <div class="players-online">
    <div class="players-online-description">
      <p style="margin-bottom: 10px;font-size: 14px; color: #888;">Note: This is the chart of the number of online players on every Jedi Academy server (excluding MBII) listed in the server list (using Ravensoft and JKHub). In other words - how many people are actually playing JKA for a particular time period.</p>
      <ml>
        <li style="font-size: 14px; color: #888;">It's not updated in real-time, but it's updated automatically every 1 minute (actual data is updated every 3 minutes).</li>
        <li style="font-size: 14px; color: #888;">When you change timeframe it takes average players count per chosen time period.</li>
        <li style="font-size: 14px; color: #888;">Timezone is set automatically to your browser's timezone.</li>
      </ml>
    </div>
    <div class="interval-btns-wrapper">
      <button
        v-for="int in INTERVALS"
        :key="int"
        :class="['interval-btn', { active: interval === int }]"
        @click="onIntervalChange(int)"
        style="padding: 4px 10px; border-radius: 4px; border: none; background: #222; color: #fff; cursor: pointer; outline: none; font-size: 14px; opacity: 0.8;"
        :style="interval === int ? 'background:#4CAF50;opacity:1;' : ''"
      >
        {{ int }}
      </button>
    </div>
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, defineEmits } from 'vue';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';
import { setCache, getCache } from '../services/localCache';
import { fetchOnlineData } from '../services/api';

const chartContainer = ref<HTMLElement | null>(null);
let chart: any = null;
let series: any = null;

const INTERVALS = ['30m', '1h', '1d', '1w', '1M'];
const interval = ref('1h');

const getLocalStorageKey = (interval: string) => `playersOnlineData_${interval}`;
const CACHE_TTL = 2 * 60 * 1000;

const emit = defineEmits(['loading']);

const initChart = async () => {
  if (!chartContainer.value) {
    return;
  }

  try {
    chart = await createChart(chartContainer.value, {
      layout: {
        background: { type: ColorType.Solid, color: '#181818' },
        textColor: '#888',
      },
      grid: {
        vertLines: { color: '#333' },
        horzLines: { color: '#333' },
      },
      autoSize: true,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 10,
      },
    });

    series = chart.addSeries(LineSeries, {
      color: '#4CAF50',
      lineWidth: 2,
    });

    chart.timeScale().fitContent();
  } catch (error) {
  }
};

const drawChartData = (chartData: any[]) => {
  if (series) {
    series.setData(chartData);
    chart.timeScale().fitContent();
  }
};

const fetchData = async (fromCache = false) => {
  emit('loading', true);
  try {
    const LOCAL_STORAGE_KEY = getLocalStorageKey(interval.value);
    if (fromCache) {
      const cached = getCache<any[]>(LOCAL_STORAGE_KEY);
      if (cached) {
        const trimmed = cached.slice(-500);
        const chartData = trimmed.map((item: any) => ({
          time: Math.floor(new Date(item.timestamp).getTime() / 1000),
          value: Number(item.totalPlayers),
        }));
        drawChartData(chartData);
        emit('loading', false);
        return;
      }
    }
    const data = await fetchOnlineData(interval.value);
    setCache(LOCAL_STORAGE_KEY, data, CACHE_TTL);
    const trimmed = data.slice(-500);
    const chartData = trimmed.map((item: any) => ({
      time: Math.floor(new Date(item.timestamp).getTime() / 1000),
      value: Number(item.totalPlayers),
    }));
    drawChartData(chartData);
  } catch (error) {
  } finally {
    emit('loading', false);
  }
};

onMounted(async () => {
  await nextTick();
  await initChart();
  await fetchData(true);
  fetchData();
  const intervalId = setInterval(() => fetchData(), 60000);
  onUnmounted(() => {
    clearInterval(intervalId);
    if (chart) {
      chart.remove();
    }
  });
});

function onIntervalChange(newInterval: string) {
  if (interval.value !== newInterval) {
    interval.value = newInterval;
    fetchData(true);
    fetchData();
  }
}
</script>

<script lang="ts">
export default {};
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 220px;
  margin-top: 16px;
  flex: 1 1 0%;
}

.players-online {
  color: #fff;
  /* height: 555px; */
  height: 100%;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
}

.interval-btns-wrapper {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
.interval-btn.active {
  background: #4CAF50 !important;
  opacity: 1 !important;
}

:host, html, body, #app {
  height: 100%;
}
</style>
