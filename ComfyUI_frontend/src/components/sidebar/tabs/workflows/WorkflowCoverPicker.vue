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
        class="relative w-[600px] max-h-[70vh] bg-comfy-panel-bg rounded-xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden z-10"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h3 class="text-base font-semibold text-base-foreground">选择封面图片</h3>
          <button
            class="size-8 flex items-center justify-center rounded-md bg-transparent border-none cursor-pointer text-muted-foreground hover:text-base-foreground hover:bg-secondary-background transition-colors"
            @click="emit('close')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <!-- Source Tabs -->
        <div class="flex items-center gap-2 px-5 py-3 border-b border-white/[0.08]">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors border-none cursor-pointer"
            :class="activeSource === tab.value ? 'bg-primary/15 text-primary' : 'bg-secondary-background text-muted-foreground hover:text-base-foreground'"
            @click="activeSource = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Image Grid -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="loading" class="flex items-center justify-center py-12">
            <svg class="animate-spin size-6 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
          <div v-else-if="imageAssets.length === 0" class="flex items-center justify-center py-12 text-muted-foreground text-sm">
            暂无图片
          </div>
          <div v-else class="grid grid-cols-4 gap-3">
            <div
              v-for="asset in imageAssets"
              :key="asset.id"
              class="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-solid border-transparent hover:border-primary transition-all duration-200 hover:shadow-lg"
              @click="selectCover(asset)"
            >
              <div
                class="w-full h-full bg-cover bg-center bg-no-repeat bg-muted/20"
                :style="{ backgroundImage: `url(${asset.preview_url})` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

import { useMediaAssets } from '@/platform/assets/composables/media/useMediaAssets'
import { getMediaTypeFromFilename } from '@/utils/formatUtil'
import type { AssetItem } from '@/platform/assets/schemas/assetSchema'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', asset: AssetItem): void
}>()

const activeSource = ref<'output' | 'input'>('output')

const tabs = [
  { label: '已生成', value: 'output' as const },
  { label: '已导入', value: 'input' as const }
]

const outputAssets = useMediaAssets('output')
const inputAssets = useMediaAssets('input')

const currentSource = computed(() =>
  activeSource.value === 'input' ? inputAssets : outputAssets
)

const loading = computed(() => currentSource.value.loading.value)

const imageAssets = computed(() => {
  const assets = currentSource.value.media.value || []
  return assets.filter(a => {
    const type = getMediaTypeFromFilename(a.name)
    return type === 'image'
  })
})

watch(() => props.visible, (v) => {
  if (v) {
    outputAssets.fetchMediaList()
    inputAssets.fetchMediaList()
  }
})

watch(activeSource, () => {
  currentSource.value.fetchMediaList()
})

const selectCover = (asset: AssetItem) => {
  emit('select', asset)
  emit('close')
}
</script>
