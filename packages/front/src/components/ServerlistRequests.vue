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
import { ref, onMounted, onUnmounted, nextTick, watch, defineEmits } from 'vue';
import { setCache, getCache } from '../services/localCache';
import { fetchServerlistRequestsData } from '../services/api';

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

const emit = defineEmits(['loading']);

const toChart = (rows: ServerlistRequestPoint[]) =>
  (Array.isArray(rows) ? rows : [])
    .map((item) => ({
      time: Math.floor(new Date(item.t).getTime() / 1000),
      value: Number(item.count),
    }))
    .sort((a, b) => a.time - b.time);

const drawChartData = (chartData: { time: number; value: number }[]) => {
  if (series) {
    series.setData(chartData);
    chart.timeScale().fitContent();
  } else {
    pendingChartData = chartData;
  }
};

// Returns true if a fresh cache hit was drawn (no network needed).
const fetchData = async (fromCache = false): Promise<boolean> => {
  emit('loading', true);
  try {
    const KEY = getLocalStorageKey(interval.value);
    if (fromCache) {
      const cached = getCache<ServerlistRequestPoint[]>(KEY);
      if (cached) {
        drawChartData(toChart(cached));
        return true;
      }
      return false;
    }
    const data: ServerlistRequestPoint[] = await fetchServerlistRequestsData(interval.value);
    const trimmed = (Array.isArray(data) ? data : []).slice(-500);
    setCache(KEY, trimmed, CACHE_TTL); // cache only the trimmed points, not the raw payload
    drawChartData(toChart(trimmed));
    return true;
  } catch (error) {
    return false;
  } finally {
    emit('loading', false);
  }
};

const refresh = async () => {
  const served = await fetchData(true);
  if (!served) await fetchData(false);
};

async function initChart() {
  if (chart || !chartContainer.value) return;
  const { createChart, ColorType, AreaSeries } = await import('lightweight-charts');
  chart = await createChart(chartContainer.value, {
    layout: { background: { type: ColorType.Solid, color: '#181818' }, textColor: '#888' },
    grid: { vertLines: { color: '#333' }, horzLines: { color: '#333' } },
    autoSize: true,
    rightPriceScale: { borderVisible: true },
    kineticScroll: { mouse: true },
    timeScale: { timeVisible: true, secondsVisible: false, barSpacing: 10, borderVisible: false },
  });
  series = chart.addSeries(AreaSeries, {
    topColor: 'rgba(76, 175, 80, 0.56)',
    bottomColor: 'rgba(76, 175, 80, 0.04)',
    lineColor: 'rgba(76, 175, 80, 1)',
    color: '#4CAF50',
    lineWidth: 2,
  });
  if (pendingChartData) {
    series.setData(pendingChartData);
    pendingChartData = null;
  }
  chart.timeScale().fitContent();
}

// Re-fetch when the user returns to this tab (conditional: cache-first).
watch(
  () => props.activeTab,
  (val) => {
    if (val === 'requests') {
      refresh();
      nextTick(() => chart?.timeScale().fitContent());
    }
  }
);

function onIntervalChange(newInterval: string) {
  if (interval.value !== newInterval) {
    interval.value = newInterval;
    refresh();
  }
}

onMounted(() => {
  nextTick(async () => {
    await initChart();
    await refresh();
  });
});

onUnmounted(() => {
  if (chart) {
    chart.remove();
    chart = null;
    series = null;
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
