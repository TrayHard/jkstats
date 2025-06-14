<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <div class="app-container">
        <div class="main-card">
          <div class="main-card-header">
            <n-icon size="42" color="#4caf50" class="main-header-icon">
              <ChartAreaCustomIcon />
            </n-icon>
            JKA Stats
          </div>
          <div :class="['card-content', { blurred: showLoader }]">
            <n-tabs v-model:value="activeTab" type="line" animated>
              <n-tab-pane name="requests" tab="Serverlist Requests" :keep-alive="true">
                <div class="tab-content">
                  <ServerlistRequests :activeTab="activeTab" @loading="showLoader = $event" />
                </div>
              </n-tab-pane>
              <n-tab-pane name="players" tab="Players Online" :keep-alive="true">
                <div class="tab-content">
                  <PlayersOnline :activeTab="activeTab" @loading="showLoader = $event" />
                </div>
              </n-tab-pane>
            </n-tabs>
          </div>
          <div v-show="showLoader" class="card-loader">
            <div class="card-loader__backdrop"></div>
            <div class="global-loader__spinner"></div>
          </div>
        </div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NCard, NTabs, NTabPane, NConfigProvider, NMessageProvider, darkTheme, NIcon } from 'naive-ui'
import { ref } from 'vue';
import PlayersOnline from './components/PlayersOnline.vue'
import ServerlistRequests from './components/ServerlistRequests.vue'
import ChartAreaCustomIcon from './components/ChartAreaCustomIcon.vue'

const activeTab = ref('requests');
const showLoader = ref(true);
</script>

<style scoped lang="scss">
.app-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  min-height: 100%;
}

.main-card {
  width: 1050px;
  min-height: 95vh;
  max-height: 95vh;
  height: auto;
  background-color: #212121;
  padding: 0;
  overflow: hidden;
  transition: filter 0.2s;
  position: relative;
  border-radius: 16px;
  box-shadow: 0 4px 32px 0 #000a, 0 1.5px 4px 0 #0004;
  border: 1px solid #333;
}

.main-card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  text-align: center;
  background: #292929;
  color: #fff;
  font-size: 2rem;
  font-family: var(--font-family-heading, 'Oswald', sans-serif);
  font-weight: 600;
  padding: 18px 0 8px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid #333;
  letter-spacing: 1px;
  border-radius: 16px 16px 0 0;
}

.main-header-icon {
  transition: color 0.25s;
}
.main-card-header:hover .main-header-icon {
  color: #fff;
}

.card-content {
  position: relative;
  padding-top: 12px;
  transition: filter 0.2s;
  height: calc(100% - 100px);
}

.card-content.blurred {
  filter: blur(6px) grayscale(0.5) brightness(0.7);
  pointer-events: none;
  user-select: none;
}

.card-loader {
  position: absolute;
  z-index: 10;
  left: 0;
  top: 65px;
  width: 100%;
  height: calc(100% - 65px);
  pointer-events: all;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 0;
}
.card-loader__backdrop {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(20, 20, 20, 0.55);
  backdrop-filter: blur(4px);
  z-index: 1;
}
.global-loader__spinner {
  position: relative;
  width: 70px;
  height: 70px;
  border: 8px solid #4caf50;
  border-top: 8px solid #181818;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  z-index: 2;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

:deep(.n-tabs-nav-scroll-wrapper) {
  display: flex;
  justify-content: center;
}

.tab-content {
  padding: 20px;
  min-height: 300px;
  height: 100%;
}

@media (max-width: 600px) {
  .app-container {
    padding: 0;
  }
  .main-card {
    width: 100vw;
    min-width: 0;
    max-width: 100vw;
    min-height: 100vh;
    max-height: 100vh;
    height: auto;
    border-radius: 0;
    box-shadow: none;
    padding: 4px;
  }
  .tab-content {
    padding: 8px;
    min-height: 200px;
  }
  .main-card :deep(.n-card__content) {
    padding: 16px 8px !important;
  }
}
</style>

<style lang="scss">
.n-tabs, .n-tabs-pane-wrapper, .n-tab-pane, .chart-container-wrapper, .chart-container {
  height: 100%;
}
</style>