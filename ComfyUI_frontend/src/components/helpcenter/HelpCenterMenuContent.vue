<template>
  <div
    class="help-center-menu flex flex-col items-start gap-1"
    role="menu"
    :aria-label="$t('help.helpCenterMenu')"
  >
    <!-- About ComfyUI Lite -->
    <div class="w-full px-4 py-3">
      <div class="flex items-center gap-2 mb-2">
        <i class="icon-[lucide--zap] size-4 text-primary" />
        <span class="text-sm font-semibold text-base-foreground">ComfyUI Lite</span>
      </div>
      <p class="text-xs text-muted-foreground leading-relaxed m-0">
        轻量化版本，无需 PyTorch 依赖，采用节点并发执行机制，可通过远程 API 调用 AI 模型。适用于轻量级部署与工作流编排场景。
      </p>
      <a
        href="https://github.com/josephxie1"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 mt-2 text-xs text-primary no-underline hover:underline"
      >
        <i class="icon-[lucide--github] size-3" />
        <span>josephxie1</span>
      </a>
    </div>

    <div class="w-full px-2">
      <div class="w-full border-b border-white/[0.08]" />
    </div>

    <!-- Menu Items -->
    <div class="w-full">
      <nav class="flex w-full flex-col gap-2" role="menubar">
        <button
          v-for="menuItem in menuItems"
          v-show="menuItem.visible !== false"
          :key="menuItem.key"
          type="button"
          class="help-menu-item"
          role="menuitem"
          @click="menuItem.action"
        >
          <div class="help-menu-icon-container">
            <div class="help-menu-icon">
              <component
                :is="menuItem.icon"
                v-if="typeof menuItem.icon === 'object'"
                :size="16"
              />
              <i v-else :class="menuItem.icon" />
            </div>
            <div v-if="menuItem.showRedDot" class="menu-red-dot" />
          </div>
          <span class="menu-label">{{ menuItem.label }}</span>
          <i
            v-if="menuItem.showExternalIcon"
            class="ml-auto icon-[lucide--external-link] size-4 text-primary"
          />
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'

import PuzzleIcon from '@/components/icons/PuzzleIcon.vue'
import { useExternalLink } from '@/composables/useExternalLink'
import { isCloud } from '@/platform/distribution/types'
import { useTelemetry } from '@/platform/telemetry'
import { useConflictAcknowledgment } from '@/workbench/extensions/manager/composables/useConflictAcknowledgment'
import { useManagerState } from '@/workbench/extensions/manager/composables/useManagerState'
import { ManagerTab } from '@/workbench/extensions/manager/types/comfyManagerTypes'

// Types
interface MenuItem {
  key: string
  icon?: string | Component
  label?: string
  action?: () => void
  visible?: boolean
  type?: 'item' | 'divider'
  showRedDot?: boolean
  showExternalIcon?: boolean
}

// Composables
const { t } = useI18n()
const { staticUrls } = useExternalLink()
const telemetry = useTelemetry()

// Track when help center was opened
const openedAt = ref(Date.now())

// Emits
const emit = defineEmits<{
  close: []
}>()

// Use conflict acknowledgment state from composable
const { shouldShowRedDot: shouldShowManagerRedDot } =
  useConflictAcknowledgment()

// Utility Functions
const trackResourceClick = (
  resourceType:
    | 'docs'
    | 'discord'
    | 'github'
    | 'help_feedback'
    | 'manager'
    | 'release_notes',
  isExternal: boolean
): void => {
  telemetry?.trackHelpResourceClicked({
    resource_type: resourceType,
    is_external: isExternal,
    source: 'help_center'
  })
}

const openExternalLink = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    {
      key: 'github',
      type: 'item',
      icon: 'icon-[lucide--github]',
      label: t('helpCenter.github'),
      showExternalIcon: true,
      action: () => {
        trackResourceClick('github', true)
        openExternalLink(staticUrls.github)
        emit('close')
      }
    }
  ]

  // Extension manager - only in non-cloud distributions
  if (!isCloud) {
    items.push({
      key: 'manager',
      type: 'item',
      icon: PuzzleIcon,
      label: t('helpCenter.managerExtension'),
      showRedDot: shouldShowManagerRedDot.value,
      action: async () => {
        trackResourceClick('manager', false)
        await useManagerState().openManager({
          initialTab: ManagerTab.All,
          showToastOnLegacyError: false
        })
        emit('close')
      }
    })
  }

  return items
})

// Lifecycle
onMounted(() => {
  telemetry?.trackHelpCenterOpened({ source: 'sidebar' })
})

onBeforeUnmount(() => {
  const timeSpentSeconds = Math.round((Date.now() - openedAt.value) / 1000)
  telemetry?.trackHelpCenterClosed({ time_spent_seconds: timeSpentSeconds })
})
</script>

<style scoped>
.help-center-menu {
  width: 256px;
  max-height: 500px;
  overflow-y: auto;
  background: var(--interface-menu-surface);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 0.1);
  border: 1px solid var(--interface-menu-stroke);
  padding: 12px 8px;
  position: relative;
}

.help-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  min-height: 24px;
  padding: 8px;
  gap: 8px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.9rem;
  color: var(--text-primary);
  text-align: left;
}

.help-menu-item:hover {
  background-color: var(--interface-menu-component-surface-hovered);
}

.help-menu-item:focus,
.help-menu-item:focus-visible {
  outline: none;
  box-shadow: none;
}

.help-menu-icon-container {
  position: relative;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.help-menu-icon {
  width: 16px;
  height: 16px;
  font-size: 16px;
  color: var(--text-primary);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.help-menu-icon svg {
  width: 16px;
  height: 16px;
  color: var(--text-primary);
}

.menu-red-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background: #ff3b30;
  border-radius: 50%;
  border: 1.5px solid var(--p-content-background);
  z-index: 1;
}

.menu-label {
  flex: 1;
}

/* Scrollbar Styling */
.help-center-menu::-webkit-scrollbar {
  width: 6px;
}

.help-center-menu::-webkit-scrollbar-track {
  background: transparent;
}

.help-center-menu::-webkit-scrollbar-thumb {
  background: var(--interface-menu-stroke);
  border-radius: 3px;
}

.help-center-menu::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .help-menu-item {
    transition: none;
  }
}
</style>
