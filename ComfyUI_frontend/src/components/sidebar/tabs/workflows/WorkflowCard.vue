<template>
  <div
    class="group/card relative flex cursor-pointer flex-col overflow-hidden rounded-md border border-border-default bg-comfy-panel-bg shadow-sm transition-all hover:border-[var(--hover-border-color)] hover:bg-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    tabindex="0"
    :title="node.label"
    @click="handleClick"
    @keydown.enter.space.prevent="handleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- Thumbnail Area -->
    <div
      class="relative aspect-video w-full shrink-0 overflow-hidden bg-muted/20"
    >
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        class="h-full w-full object-cover"
        loading="lazy"
        alt=""
      />
      <div v-else class="flex h-full items-center justify-center opacity-40">
        <i class="icon-[lucide--workflow] size-8 text-muted-foreground" />
      </div>

      <!-- Bookmark button (shows on hover or if bookmarked) -->
      <Button
        variant="textonly"
        size="icon-sm"
        class="absolute right-1 top-1 z-10 opacity-0 transition-opacity group-hover/card:opacity-100"
        :class="{ 'opacity-100!': isBookmarked }"
        :aria-label="$t('icon.bookmark')"
        @click.stop="handleBookmarkClick"
      >
        <i
          class="size-4"
          :class="
            isBookmarked
              ? 'icon-[ph--star-fill] text-yellow-400'
              : 'icon-[lucide--star] text-white drop-shadow-md'
          "
        />
      </Button>

      <!-- Modified Badge -->
      <div
        v-if="isModified"
        class="absolute bottom-1 right-1 flex h-4 items-center rounded bg-primary/80 px-1 text-[10px] font-bold text-primary-foreground shadow-sm"
        title="Unsaved Changes"
      >
        *
      </div>
    </div>

    <!-- Info Area -->
    <div class="flex flex-col p-2">
      <div class="truncate text-xs font-medium leading-tight">
        {{ node.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import Button from '@/components/ui/button/Button.vue'
import type { ComfyWorkflow } from '@/platform/workflow/management/stores/workflowStore'
import { useWorkflowBookmarkStore } from '@/platform/workflow/management/stores/workflowStore'
import { useWorkflowThumbnail } from '@/renderer/core/thumbnail/useWorkflowThumbnail'
import type { TreeExplorerNode } from '@/types/treeExplorerTypes'

const { node } = defineProps<{
  node: TreeExplorerNode<ComfyWorkflow>
}>()

const workflow = computed(() => node.data)
const isModified = computed(
  () => workflow.value?.isModified || !workflow.value?.isPersisted
)

const { getThumbnail } = useWorkflowThumbnail()
const thumbnailUrl = computed(() => {
  if (!workflow.value) return undefined
  return getThumbnail(workflow.value.key)
})

const bookmarkStore = useWorkflowBookmarkStore()
const isBookmarked = computed(() => {
  if (!workflow.value) return false
  return bookmarkStore.isBookmarked(workflow.value.path)
})

const handleBookmarkClick = async () => {
  if (workflow.value) {
    await bookmarkStore.toggleBookmarked(workflow.value.path)
  }
}

const handleClick = (e: MouseEvent | KeyboardEvent) => {
  if (node.handleClick) {
    node.handleClick(e as MouseEvent)
  }
}

const handleContextMenu = (_e: MouseEvent) => {
  // We can emit this event or trigger a context menu component
  // For now, TreeExplorer's standard context menu takes over if implemented correctly,
  // but since we bypass TreeExplorer, we might need to recreate the context menu.
  // We will leave this stubbed or let a parent handle it.
}
</script>

<style scoped>
.group\/card:hover {
  --hover-border-color: var(--p-primary-color);
}
</style>
