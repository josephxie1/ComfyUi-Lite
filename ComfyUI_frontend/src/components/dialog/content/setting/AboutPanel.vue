<template>
  <div class="about-container flex flex-col gap-2" data-testid="about-panel">
    <h2 class="mb-2 text-2xl font-bold">
      {{ $t('g.about') }}
    </h2>
    <div class="mb-3">
      <p class="text-sm text-muted-foreground leading-relaxed m-0">
        ComfyUI Lite — 轻量化版本，无需 PyTorch 依赖，采用节点并发执行机制，可通过远程 API 调用 AI 模型。适用于轻量级部署与工作流编排场景。
      </p>
      <a
        href="https://github.com/josephxie1"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 mt-2 text-sm text-primary no-underline hover:underline"
      >
        <i class="icon-[lucide--github] size-3.5" />
        <span>josephxie1</span>
      </a>
    </div>
    <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">原版本</h3>
    <div class="space-y-2">
      <a
        v-for="badge in aboutPanelStore.badges"
        :key="badge.url"
        :href="badge.url"
        target="_blank"
        rel="noopener noreferrer"
        class="about-badge inline-flex items-center no-underline"
        :title="badge.url"
      >
        <Tag class="mr-2" :severity="badge.severity">
          <template #icon>
            <i :class="[badge.icon, 'mr-2 text-xl']" />
          </template>
          {{ badge.label }}
        </Tag>
      </a>
    </div>

    <Divider />

    <SystemStatsPanel
      v-if="systemStatsStore.systemStats"
      :stats="systemStatsStore.systemStats"
    />
  </div>
</template>

<script setup lang="ts">
import Divider from 'primevue/divider'
import Tag from 'primevue/tag'

import SystemStatsPanel from '@/components/common/SystemStatsPanel.vue'
import { useAboutPanelStore } from '@/stores/aboutPanelStore'
import { useSystemStatsStore } from '@/stores/systemStatsStore'

const systemStatsStore = useSystemStatsStore()
const aboutPanelStore = useAboutPanelStore()
</script>
