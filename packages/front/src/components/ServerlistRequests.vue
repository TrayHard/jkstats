<template>
  <div class="serverlist-requests">
    <div class="serverlist-requests-description">
      <p style="margin-bottom: 10px;font-size: 14px; color: #888;">Note: This is the chart of from how many unique IP addresses serverlist (RavenSoft + JKHub MS) got requests. In other words - how many people are interested in playing JKA for a particular time period.</p>
      <ul style="margin: 0 0 0 16px; padding: 0;">
        <li style="font-size: 14px; color: #888;">It's not real-time, it's updated every 1 minute (actual data is updated every 5 minutes).</li>
        <li style="font-size: 14px; color: #888;">It's not number of requests, it's number of unique IP addresses per chosen time period. (so spamming "Get new list" will not affect this chart).</li>
        <li style="font-size: 14px; color: #888;">Timezone is set automatically to your browser's timezone.</li>
      </ul>
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
    <div class="serverlist-requests">
      <div class="chart-container-wrapper">
        <div ref="chartContainer" class="chart-container">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, inject, defineEmits } from 'vue';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';
import { setCache, getCache } from '../services/localCache';

interface ServerlistRequestPoint {
  t: string;
  count: number;
}

const INTERVALS = ['30m', '1h', '1d', '1w', '1M'];
const interval = ref('1h');
const getLocalStorageKey = (interval: string) => `serverlistRequestsData_${interval}`;
const CACHE_TTL = 2 * 60 * 1000;

const props = defineProps<{ activeTab: string }>();

const chartContainer = ref<HTMLElement | null>(null);
let chart: any = null;
let series: any = null;
let pendingChartData: { time: number; value: number }[] | null = null;
let hasData = false;
let resizeObserver: ResizeObserver | null = null;

const chartInitialized = ref(false);

const emit = defineEmits(['loading']);

const drawChartData = (chartData: { time: number; value: number }[]) => {
  if (series) {
    series.setData(chartData);
    hasData = true;
    chart.timeScale().fitContent();
  } else {
    pendingChartData = chartData;
  }
};

const fetchData = async (fromCache = false) => {
  emit('loading', true);
  try {
    const LOCAL_STORAGE_KEY = getLocalStorageKey(interval.value);
    if (fromCache) {
      const cached = getCache<ServerlistRequestPoint[]>(LOCAL_STORAGE_KEY);
      if (cached) {
        const trimmed = cached.slice(-500);
        const chartData = trimmed.map((item) => ({
          time: Math.floor(new Date(item.t).getTime() / 1000),
          value: Number(item.count),
        })).sort((a, b) => a.time - b.time);
        drawChartData(chartData);
        emit('loading', false);
        return;
      }
    }
    const response = await fetch(`http://localhost:3030/svlist?interval=${interval.value}`);
    const data: ServerlistRequestPoint[] = await response.json();
    setCache(LOCAL_STORAGE_KEY, data, CACHE_TTL);
    const trimmed = data.slice(-500);
    const chartData = trimmed.map((item) => ({
      time: Math.floor(new Date(item.t).getTime() / 1000),
      value: Number(item.count),
    })).sort((a, b) => a.time - b.time);
    drawChartData(chartData);
  } catch (error) {
  } finally {
    emit('loading', false);
  }
};

watch(
  () => props.activeTab,
  (val) => {
    if (val === 'requests') {
      fetchData(true);
      fetchData();
      nextTick(() => {
        chart?.timeScale().fitContent();
      });
    }
  },
  { immediate: true }
);

async function initChart() {
  if (chartInitialized.value || !chartContainer.value) return;
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
  if (pendingChartData) {
    series.setData(pendingChartData);
    pendingChartData = null;
    hasData = true;
  }
  chart.timeScale().fitContent();
  chartInitialized.value = true;
}

function onIntervalChange(newInterval: string) {
  if (interval.value !== newInterval) {
    interval.value = newInterval;
    fetchData(true);
    fetchData();
  }
}

onMounted(() => {
  nextTick(() => {
    initChart();
    fetchData(true);
    fetchData();
  });
});

onUnmounted(() => {
  if (resizeObserver && chartContainer.value) {
    resizeObserver.unobserve(chartContainer.value);
    resizeObserver = null;
  }
  if (chart) {
    chart.remove();
    chart = null;
    series = null;
    chartInitialized.value = false;
  }
});
</script>

<style scoped>
.serverlist-requests {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.serverlist-requests {
  color: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
}

.chart-container-wrapper {
  position: relative;
  width: 100%;
  margin-top: 16px;
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
}


.interval-btn.active {
  background: #4CAF50 !important;
  opacity: 1 !important;
}

.interval-btns-wrapper {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 600px) {
  .chart-container-wrapper {
    height: 220px;
    min-height: 0;
  }
  .chart-container {
    height: 220px;
    min-height: 0;
  }
  .interval-btns-wrapper {
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }
}
</style>
