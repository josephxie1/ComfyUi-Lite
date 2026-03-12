<template>
  <TreeExplorerTreeNode :node="node">
    <template #actions>
      <!-- Version History Button -->
      <Button
        variant="muted-textonly"
        size="icon-sm"
        aria-label="版本历史"
        @click.stop="showVersionHistory = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
      </Button>

      <!-- Edit Cover Button -->
      <Button
        variant="muted-textonly"
        size="icon-sm"
        aria-label="编辑封面"
        @click.stop="showCoverPicker = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      </Button>

      <!-- Bookmark Button -->
      <Button
        variant="muted-textonly"
        size="icon-sm"
        :aria-label="$t('icon.bookmark')"
        @click.stop="handleBookmarkClick"
      >
        <i
          :class="[
            isBookmarked ? 'pi pi-bookmark-fill' : 'pi pi-bookmark',
            'size-3.5'
          ]"
        />
      </Button>
    </template>
  </TreeExplorerTreeNode>

  <!-- Cover Picker Dialog -->
  <WorkflowCoverPicker
    :visible="showCoverPicker"
    @close="showCoverPicker = false"
    @select="handleCoverSelect"
  />

  <!-- Version History Dialog -->
  <WorkflowVersionHistory
    :visible="showVersionHistory"
    :workflow-path="workflowRelPath"
    :workflow-name="node.label"
    @close="showVersionHistory = false"
    @reverted="handleReverted"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import TreeExplorerTreeNode from '@/components/common/TreeExplorerTreeNode.vue'
import Button from '@/components/ui/button/Button.vue'
import WorkflowCoverPicker from '@/components/sidebar/tabs/workflows/WorkflowCoverPicker.vue'
import WorkflowVersionHistory from '@/components/sidebar/tabs/workflows/WorkflowVersionHistory.vue'
import type { ComfyWorkflow } from '@/platform/workflow/management/stores/workflowStore'
import { useWorkflowBookmarkStore } from '@/platform/workflow/management/stores/workflowStore'
import { useWorkflowThumbnail } from '@/renderer/core/thumbnail/useWorkflowThumbnail'
import type { RenderedTreeExplorerNode } from '@/types/treeExplorerTypes'
import type { AssetItem } from '@/platform/assets/schemas/assetSchema'

const { node } = defineProps<{
  node: RenderedTreeExplorerNode<ComfyWorkflow>
}>()

const workflowBookmarkStore = useWorkflowBookmarkStore()
const { setThumbnailUrl } = useWorkflowThumbnail()

const isBookmarked = computed(
  () => node.data && workflowBookmarkStore.isBookmarked(node.data.path)
)

const handleBookmarkClick = async () => {
  if (node.data) {
    await workflowBookmarkStore.toggleBookmarked(node.data.path)
  }
}

// Cover picker
const showCoverPicker = ref(false)

const handleCoverSelect = (asset: AssetItem) => {
  if (node.data && asset.preview_url) {
    setThumbnailUrl(node.data.key, asset.preview_url)
  }
}

// Version history
const showVersionHistory = ref(false)

const workflowRelPath = computed(() => {
  // The node key is like "root/test.json", we need just "test.json"
  if (node.data?.path) {
    // path is like "test.json" or "subfolder/test.json"
    return node.data.path
  }
  return node.key?.replace(/^root\//, '') || ''
})

const handleReverted = () => {
  // The WorkflowVersionHistory component handles loading the reverted content
  // directly into the editor, so no page reload is needed.
}
</script>
