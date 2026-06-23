<template>
  <div class="players-online">
    <div class="players-online-description">
      <p style="margin-bottom: 10px;font-size: 14px; color: #888;">Note: This is the chart of the number of online players on every Jedi Academy server (excluding MBII) listed in the server list (using Ravensoft and JKHub). In other words - how many people are actually playing JKA for a particular time period.</p>
      <ul>
        <li style="font-size: 14px; color: #888;">It's not updated in real-time, but it's updated automatically every 1 minute (actual data is updated every 3 minutes).</li>
        <li style="font-size: 14px; color: #888;">When you change timeframe it takes average players count per chosen time period.</li>
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
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, defineEmits } from 'vue';
import { setCache, getCache } from '../services/localCache';
import { fetchOnlineData } from '../services/api';

const props = defineProps<{ activeTab: string }>();

const chartContainer = ref<HTMLElement | null>(null);
let chart: any = null;
let series: any = null;
let pendingChartData: { time: number; value: number }[] | null = null;

const INTERVALS = ['30m', '1h', '1d', '1w', '1M'];
const interval = ref('1h');

const getLocalStorageKey = (interval: string) => `playersOnlineData_${interval}`;
const CACHE_TTL = 2 * 60 * 1000;
const POLL_MS = 60000;
let pollId: ReturnType<typeof setInterval> | null = null;

const emit = defineEmits(['loading']);

const toChart = (rows: any[]) =>
  (Array.isArray(rows) ? rows : [])
    .map((item: any) => ({
      time: Math.floor(new Date(item.timestamp).getTime() / 1000),
      value: Number(item.totalPlayers),
    }));

const drawChartData = (chartData: { time: number; value: number }[]) => {
  if (series) {
    series.setData(chartData);
    chart.timeScale().fitContent();
  } else {
    pendingChartData = chartData;
  }
};

const initChart = async () => {
  if (chart || !chartContainer.value) return;
  try {
    const { createChart, ColorType, AreaSeries } = await import('lightweight-charts');
    chart = createChart(chartContainer.value, {
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
  } catch (error) {
    // ignore
  }
};

// Returns true if a fresh cache hit was drawn (no network needed).
const fetchData = async (fromCache = false): Promise<boolean> => {
  emit('loading', true);
  try {
    const KEY = getLocalStorageKey(interval.value);
    if (fromCache) {
      const cached = getCache<any[]>(KEY);
      if (cached) {
        drawChartData(toChart(cached));
        return true;
      }
      return false;
    }
    const data = await fetchOnlineData(interval.value);
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

// Draw from fresh cache if possible; only hit the network when the cache is stale/missing.
const refresh = async () => {
  const served = await fetchData(true);
  if (!served) await fetchData(false);
};

const onPoll = () => {
  if (props.activeTab === 'players' && document.visibilityState === 'visible') {
    fetchData(false);
  }
};

onMounted(async () => {
  await nextTick();
  await initChart();
  await refresh();
  pollId = setInterval(onPoll, POLL_MS);
});

onUnmounted(() => {
  if (pollId) clearInterval(pollId);
  if (chart) {
    chart.remove();
    chart = null;
    series = null;
  }
});

function onIntervalChange(newInterval: string) {
  if (interval.value !== newInterval) {
    interval.value = newInterval;
    refresh();
  }
}
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
