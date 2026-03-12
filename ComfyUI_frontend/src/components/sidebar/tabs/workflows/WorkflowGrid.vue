<template>
  <div class="flex flex-col gap-2">
    <!-- Navigation Header -->
    <div
      v-if="currentFolderKey !== rootKey"
      class="flex items-center gap-2 px-2 pb-2 text-sm text-muted-foreground"
    >
      <Button
        variant="textonly"
        size="icon-sm"
        @click="navigateUp"
        :aria-label="$t('g.back')"
      >
        <i class="icon-[lucide--chevron-left] size-4" />
      </Button>
      <span class="truncate font-medium">{{ currentFolderName }}</span>
    </div>

    <!-- Grid Layout -->
    <div
      v-if="currentNodes.length > 0"
      class="grid grid-cols-2 gap-2 px-2 2xl:grid-cols-3"
    >
      <template v-for="node in currentNodes" :key="node.key">
        <FolderCard
          v-if="!node.leaf"
          :node="node"
          @click="navigateTo(node.key)"
        />
        <WorkflowCard v-else :node="node" />
      </template>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="flex flex-col items-center justify-center p-4 text-muted-foreground"
    >
      <i class="icon-[lucide--folder-open] mb-2 size-8 opacity-50" />
      <span class="text-sm">{{ $t('g.empty') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import Button from '@/components/ui/button/Button.vue'
import type { ComfyWorkflow } from '@/platform/workflow/management/stores/workflowStore'
import type { TreeExplorerNode } from '@/types/treeExplorerTypes'

import FolderCard from './FolderCard.vue'
import WorkflowCard from './WorkflowCard.vue'

const props = defineProps<{
  root: TreeExplorerNode<ComfyWorkflow>
}>()

const rootKey = computed(() => props.root.key)
const currentFolderKey = ref(rootKey.value)

// Reset navigation if root changes completely
watch(rootKey, (newKey) => {
  currentFolderKey.value = newKey
})

// Recursively find nodes in a specific folder key
const findNodesInFolder = (
  nodes: TreeExplorerNode<ComfyWorkflow>[],
  targetKey: string
): TreeExplorerNode<ComfyWorkflow>[] | null => {
  for (const node of nodes) {
    if (node.key === targetKey) {
      return node.children || []
    }
    if (!node.leaf && node.children) {
      const found = findNodesInFolder(node.children, targetKey)
      if (found) return found
    }
  }
  return null
}

const currentNodes = computed(() => {
  if (currentFolderKey.value === rootKey.value) {
    // Top-level children
    return props.root.children || []
  }
  const nodes = findNodesInFolder(props.root.children || [], currentFolderKey.value)
  return nodes || []
})

// Find folder name for header
const findFolderName = (
  nodes: TreeExplorerNode<ComfyWorkflow>[],
  targetKey: string
): string | null => {
  for (const node of nodes) {
    if (node.key === targetKey) {
      return node.label
    }
    if (!node.leaf && node.children) {
      const found = findFolderName(node.children, targetKey)
      if (found) return found
    }
  }
  return null
}

const currentFolderName = computed(() => {
  if (currentFolderKey.value === rootKey.value) return ''
  return findFolderName(props.root.children || [], currentFolderKey.value) || ''
})

const navigateTo = (key: string) => {
  currentFolderKey.value = key
}

const navigateUp = () => {
  // Simple parent logic: key is usually path separated by /
  // However, litegraph trees or custom tree keys might hold custom logic.
  // Using the path segments based on how it was built in the `buildWorkflowTree`.
  const parts = currentFolderKey.value.split('/')
  parts.pop()

  if (parts.length === 1 && parts[0] === rootKey.value) {
    currentFolderKey.value = rootKey.value
  } else if (parts.length > 0) {
    currentFolderKey.value = parts.join('/')
  } else {
    currentFolderKey.value = rootKey.value
  }
}
</script>
