<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-[9999] flex items-center justify-center"
      @click="emit('close')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <!-- Dialog -->
      <div
        class="relative w-[480px] max-h-[70vh] bg-comfy-panel-bg rounded-xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden z-10"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            <h3 class="text-base font-semibold text-base-foreground">版本历史</h3>
          </div>
          <button
            class="size-8 flex items-center justify-center rounded-md bg-transparent border-none cursor-pointer text-muted-foreground hover:text-base-foreground hover:bg-secondary-background transition-colors"
            @click="emit('close')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <!-- Workflow Name -->
        <div class="px-5 py-2.5 border-b border-white/[0.08] bg-secondary-background/50">
          <span class="text-xs text-muted-foreground">{{ workflowName }}</span>
        </div>

        <!-- Version List -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="loading" class="flex items-center justify-center py-12">
            <svg class="animate-spin size-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
          <div v-else-if="versions.length === 0" class="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-40"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            <span class="text-sm">暂无版本历史</span>
            <span class="text-xs">保存工作流后会自动创建版本</span>
          </div>
          <div v-else class="divide-y divide-white/[0.06]">
            <div
              v-for="(version, index) in versions"
              :key="version.id"
              class="px-5 py-3 flex items-center justify-between hover:bg-secondary-background/50 transition-colors group"
            >
              <div class="flex items-center gap-3 min-w-0">
                <!-- Timeline dot -->
                <div class="flex flex-col items-center">
                  <div
                    class="size-2.5 rounded-full shrink-0"
                    :class="index === 0 ? 'bg-primary' : 'bg-muted-foreground/40'"
                  ></div>
                </div>
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="text-sm text-base-foreground">{{ formatTime(version.timestamp) }}</span>
                  <div class="flex items-center gap-2 text-xs text-muted-foreground">
                    <span class="px-1.5 py-0.5 rounded bg-secondary-background text-[10px] font-medium uppercase">{{ version.type }}</span>
                    <code v-if="version.hash" class="px-1 py-0.5 rounded bg-secondary-background text-[10px] font-mono text-muted-foreground/70">#{{ version.hash }}</code>
                    <span>{{ formatSize(version.size) }}</span>
                  </div>
                </div>
              </div>

              <!-- Revert Button -->
              <button
                v-if="index > 0"
                class="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary-background hover:bg-secondary-background-hover text-base-foreground border-none cursor-pointer transition-all"
                @click="handleRevert(version.id)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                <span>恢复</span>
              </button>
              <span v-else class="text-[10px] text-primary font-medium px-2 py-1 rounded bg-primary/10">当前</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface VersionInfo {
  id: string
  timestamp: number
  type: string
  size: number
  hash: string
}

const props = defineProps<{
  visible: boolean
  workflowPath: string  // relative path, e.g. "workflows/test.json"
  workflowName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'reverted'): void
}>()

const loading = ref(false)
const reverting = ref(false)
const versions = ref<VersionInfo[]>([])

const fetchVersions = async () => {
  loading.value = true
  try {
    const resp = await fetch(`/internal/workflow-versions/${encodeURIComponent(props.workflowPath)}`)
    if (resp.ok) {
      versions.value = await resp.json()
    }
  } catch (e) {
    console.error('Failed to load versions:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (v) => {
  if (v) fetchVersions()
})

const handleRevert = async (versionId: string) => {
  if (reverting.value) return
  reverting.value = true
  try {
    // 1. Revert the file on disk
    const resp = await fetch(
      `/internal/workflow-version-revert/${encodeURIComponent(props.workflowPath)}?version_id=${versionId}`,
      { method: 'POST' }
    )
    if (!resp.ok) {
      console.error('Revert failed:', resp.status)
      return
    }

    // 2. Fetch the reverted content to store for reload
    const contentResp = await fetch(
      `/internal/workflow-version-content/${encodeURIComponent(props.workflowPath)}?version_id=${versionId}`
    )
    if (contentResp.ok) {
      const { content } = await contentResp.json()
      if (content) {
        // Store reverted content in sessionStorage so the app loads it on reload
        sessionStorage.setItem('workflow_revert_data', content)
      }
    }

    emit('reverted')
    emit('close')

    // Reload the page — app.ts will check sessionStorage for reverted data
    window.location.reload()
  } catch (e) {
    console.error('Failed to revert:', e)
  } finally {
    reverting.value = false
  }
}

const formatTime = (ts: number) => {
  const d = new Date(ts * 1000)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  if (isToday) return `今天 ${timeStr}`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + timeStr
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
</script>
