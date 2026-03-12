<template>
  <div
    class="group/folder flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-border-default bg-comfy-panel-bg p-4 shadow-sm transition-all hover:border-[var(--hover-border-color)] hover:bg-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    tabindex="0"
    :title="node.label"
  >
    <i class="icon-[lucide--folder] size-10 text-muted-foreground transition-colors group-hover/folder:text-primary" />
    <span class="truncate text-xs font-medium text-secondary-foreground">{{
      node.label
    }}</span>
    <span v-if="itemCount !== undefined" class="text-[10px] text-muted-foreground">{{
      $t('g.itemsCount', { count: itemCount }, '{count} items')
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ComfyWorkflow } from '@/platform/workflow/management/stores/workflowStore'
import type { TreeExplorerNode } from '@/types/treeExplorerTypes'

const { node } = defineProps<{
  node: TreeExplorerNode<ComfyWorkflow>
}>()

const itemCount = computed(() => {
  if (node.children) {
    return node.children.length
  }
  return undefined
})
</script>

<style scoped>
.group\/folder:hover {
  --hover-border-color: var(--p-primary-color);
}
</style>
