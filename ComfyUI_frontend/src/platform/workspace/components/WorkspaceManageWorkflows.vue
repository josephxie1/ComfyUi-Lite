<template>
  <div class="h-full flex flex-col">
    <!-- pt-6 added for top margin -->
    <div class="relative flex flex-wrap justify-between gap-2 px-6 pt-6 pb-4">
      <div class="flex flex-wrap gap-2">
        <!-- Date Range Filter -->
        <div class="w-[280px] relative inline-flex items-center cursor-pointer select-none h-10 rounded-lg bg-secondary-background text-base-foreground transition-all duration-200 ease-in-out hover:bg-secondary-background-hover border-[2.5px] border-solid border-transparent focus-within:border-base-foreground">
          <div class="flex items-center pl-3">
            <i class="icon-[lucide--calendar] text-muted-foreground" />
          </div>
          <DatePicker
            v-model="timeRange"
            selectionMode="range"
            :manualInput="false"
            :placeholder="$t('g.timeFilterPlaceholder') || '选择时间区间'"
            dateFormat="yy-mm-dd"
            class="flex-1 bg-transparent [&_.p-inputtext]:bg-transparent [&_.p-inputtext]:border-none [&_.p-inputtext]:shadow-none [&_.p-inputtext]:w-full [&_.p-inputtext]:text-sm [&_.p-inputtext]:px-2 [&_.p-inputtext]:py-0 [&_.p-inputtext]:h-full outline-none focus:outline-none"
          />
          <button
            v-if="timeRange && timeRange.length > 0 && timeRange[0]"
            class="absolute right-1.5 z-50 inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-base-foreground hover:bg-white/10 transition-colors border-none cursor-pointer appearance-none bg-transparent"
            title="重置时间筛选"
            @click.stop="timeRange = undefined"
          >
            <i class="icon-[lucide--x] size-3.5" />
          </button>
        </div>

        <!-- Filter Bookmarked -->
        <button
          class="relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap appearance-none border-none h-10 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 px-4"
          :class="onlyBookmarked ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary-background text-base-foreground hover:bg-secondary-background-hover'"
          @click="onlyBookmarked = !onlyBookmarked"
        >
          <i class="icon-[lucide--heart]" :class="{ 'fill-current': onlyBookmarked }" />
          <span>{{ $t('g.favoriteOnly') || '只看喜欢' }}</span>
        </button>
      </div>

      <!-- Sort Options -->
      <div>
        <SingleSelect
          v-model="sortBy"
          :options="sortOptions"
          option-value="value"
          option-label="name"
          class="w-48 relative inline-flex cursor-pointer items-center select-none h-10 rounded-lg bg-secondary-background text-base-foreground transition-all duration-200 ease-in-out hover:bg-secondary-background-hover border-[2.5px] border-solid border-transparent focus-within:border-node-component-border"
        >
          <template #value="{ value }">
            <div class="flex items-center gap-2 text-sm pl-2">
              <i class="icon-[lucide--arrow-up-down] text-muted-foreground" />
              <span class="text-base-foreground">{{ getCurrentSortName(value) }}</span>
            </div>
          </template>
          <template #dropdownicon>
            <i class="icon-[lucide--chevron-down] text-muted-foreground" />
          </template>
        </SingleSelect>
      </div>
    </div>
    
    <div class="flex-1 overflow-y-auto px-6 pb-20">
      <div class="flex flex-col w-full h-full pb-8">
        <div class="flex flex-col gap-10">
          <div v-for="group in groupedWorkflows" :key="group.dateLabel" class="flex flex-col gap-4">
            <div class="flex items-center justify-between pointer-events-none">
              <span class="text-base font-semibold text-base-foreground">{{ group.dateLabel }}</span>
              <button 
                class="flex items-center gap-1.5 text-sm text-muted-foreground bg-transparent border-none cursor-pointer appearance-none outline-none transition-colors hover:text-base-foreground pointer-events-auto" 
                :title="$t('g.selectAll') || '全选'"
                v-if="isSelecting"
                @click="toggleGroupSelection(group)"
              >
                <i class="icon-[lucide--check-circle-2]" v-if="isGroupFullySelected(group)"></i>
                <i class="icon-[lucide--circle]" v-else></i>
                <span>{{ isGroupFullySelected(group) ? ($t('g.deselectAll') || '取消全选') : ($t('g.selectAll') || '全选') }}</span>
              </button>
            </div>
            
            <div class="grid w-full gap-4 ui-grid-columns">
              <div 
                v-for="workflow in group.items" 
                :key="workflow.id" 
                :data-id="workflow.id" 
                class="relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer border-[2px] border-solid border-transparent transition-all duration-200 hover:border-node-component-border hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
                @click="handleCardClick(workflow)"
              >
                <div 
                  class="w-full h-full bg-cover bg-center bg-no-repeat transition-transform duration-500 ease-out group-hover:scale-105 bg-muted/20 flex flex-col items-center justify-center relative" 
                  :class="{ 'opacity-80 scale-95 group-hover:scale-95': selectedItems.has(workflow.id) }"
                  :style="workflow.image ? { backgroundImage: `url(${workflow.image})` } : {}"
                >
                  <i v-if="!workflow.image" class="icon-[lucide--workflow] size-10 text-muted-foreground opacity-40"></i>
                  <!-- Selection Checkbox Info -->
                  <div 
                    v-if="isSelecting" 
                    class="absolute inset-0 z-10 transition-colors p-2 flex items-start justify-between"
                  >
                    <div 
                      class="size-6 rounded-full border-2 flex items-center justify-center transition-colors"
                      :class="selectedItems.has(workflow.id) ? 'bg-primary border-primary text-primary-foreground' : 'bg-black/20 border-white/70 text-transparent group-hover:bg-black/40'"
                    >
                      <i class="icon-[lucide--check] size-4"></i>
                    </div>
                  </div>

                  <!-- Like Badge -->
                  <div v-if="workflow.liked && !isSelecting" class="absolute top-3 right-3 text-[#ff4b4b] drop-shadow-md bg-black/20 p-1.5 rounded-full backdrop-blur-sm transition-transform duration-200 hover:scale-110">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M16.5532 2.00002C15.1056 2 14.1724 2.17246 13.1027 2.69607C12.7066 2.88993 12.335 3.12339 11.99 3.39576C11.6582 3.13866 11.3015 2.91592 10.9218 2.72813C9.83132 2.18878 8.85028 2 7.45455 2C3.71644 2 1 5.09727 1 9.11988C1 12.1578 2.69383 15.0923 5.84884 17.9299C7.50489 19.4193 9.61932 20.8933 11.1336 21.6775L12 22.1261L12.8664 21.6775C14.3807 20.8933 16.4951 19.4193 18.1512 17.9299C21.3062 15.0923 23 12.1578 23 9.11988C23 5.13984 20.2579 2.01536 16.5532 2.00002Z" />
                    </svg>
                  </div>
                  
                  <!-- Title Gradient Overlay -->
                  <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                  <div class="absolute bottom-2 left-2 right-2 text-white font-medium text-xs truncate drop-shadow-md">
                    {{ workflow.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="infinite-scroll-container">
          <div class="infinite-scroll-sentinel" />
        </div>
      </div>
    </div>

    <!-- Floating Action Bar -->
    <FloatingActionBar
      :visible="isSelecting"
      :count="selectedItems.size"
      label="已选择"
      @close="toggleSelectMode"
    >
      <Button 
        variant="secondary"
        size="sm"
        class="rounded-full gap-1.5 shadow-none"
        :disabled="selectedItems.size === 0"
        @click="batchToggleLike"
      >
        <i class="icon-[lucide--heart] size-4"></i>
        <span>喜欢</span>
      </Button>

      <Button 
        variant="secondary"
        size="sm"
        class="rounded-full gap-1.5 shadow-none hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
        :disabled="selectedItems.size === 0"
        @click="batchDelete"
      >
        <i class="icon-[lucide--trash-2] size-4"></i>
        <span>删除</span>
      </Button>
    </FloatingActionBar>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DatePicker from 'primevue/datepicker'

import SingleSelect from '@/components/input/SingleSelect.vue'
import Button from '@/components/ui/button/Button.vue'
import FloatingActionBar from './FloatingActionBar.vue'
import { useWorkflowStore, useWorkflowBookmarkStore, type ComfyWorkflow } from '@/platform/workflow/management/stores/workflowStore'
import { useWorkflowThumbnail } from '@/renderer/core/thumbnail/useWorkflowThumbnail'
import { useWorkflowService } from '@/platform/workflow/core/services/workflowService'

const { t, locale } = useI18n()
const workflowStore = useWorkflowStore()
const bookmarkStore = useWorkflowBookmarkStore()
const { getThumbnail } = useWorkflowThumbnail()
const workflowService = useWorkflowService()

const timeRange = ref()
const onlyBookmarked = ref(false)

const sortBy = ref('newest')

const sortOptions = computed(() => [
  { name: t('g.sortDefault') || '默认排序', value: 'default' },
  { name: t('g.sortNewest') || '最新创建', value: 'newest' },
  { name: t('g.sortOldest') || '最早创建', value: 'oldest' },
  { name: t('g.sortNameAsc') || '名称 A-Z', value: 'name_asc' },
  { name: t('g.sortNameDesc') || '名称 Z-A', value: 'name_desc' }
])

const getCurrentSortName = (val: string) => {
  const opt = sortOptions.value.find(o => o.value === val)
  return opt ? opt.name : t('g.sortDefault') || '排序'
}

interface WorkflowItem {
  id: string
  name: string
  dateLabel: string
  image: string | undefined
  liked: boolean
  workflow: ComfyWorkflow
}

interface WorkflowGroup {
  dateLabel: string
  timestamp: number
  items: WorkflowItem[]
}

const dateFormatter = computed(() => new Intl.DateTimeFormat(locale.value || 'zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}))

const filteredWorkflows = computed(() => {
  let list = workflowStore.persistedWorkflows

  if (onlyBookmarked.value) {
    list = list.filter(wf => bookmarkStore.isBookmarked(wf.path))
  }

  // Time Range filter
  if (timeRange.value && Array.isArray(timeRange.value) && timeRange.value[0]) {
    const start = timeRange.value[0].getTime()
    // if end date is null, just use start date or end of day
    const end = timeRange.value[1] ? timeRange.value[1].getTime() : new Date(start).setHours(23, 59, 59, 999)
    list = list.filter(wf => wf.lastModified >= start && wf.lastModified <= end)
  }

  // Sort
  list.sort((a, b) => {
    switch (sortBy.value) {
      case 'newest': return b.lastModified - a.lastModified
      case 'oldest': return a.lastModified - b.lastModified
      case 'name_asc': return a.filename.localeCompare(b.filename)
      case 'name_desc': return b.filename.localeCompare(a.filename)
      default: return b.lastModified - a.lastModified
    }
  })

  return list
})

const groupedWorkflows = computed<WorkflowGroup[]>(() => {
  const groups = new Map<string, WorkflowGroup>()

  filteredWorkflows.value.forEach(wf => {
    const dateLabel = dateFormatter.value.format(wf.lastModified)
    
    if (!groups.has(dateLabel)) {
      groups.set(dateLabel, {
        dateLabel,
        timestamp: new Date(wf.lastModified).setHours(0,0,0,0),
        items: []
      })
    }
    
    groups.get(dateLabel)!.items.push({
      id: wf.key,
      name: wf.filename,
      dateLabel,
      image: getThumbnail(wf.key),
      liked: bookmarkStore.isBookmarked(wf.path),
      workflow: wf
    })
  })

  // Sort groups by timestamp descending
  return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp)
})

// Selection Logic
const isSelecting = ref(false)
const selectedItems = ref<Set<string>>(new Set())

const toggleSelectMode = () => {
  isSelecting.value = !isSelecting.value
  if (!isSelecting.value) {
    selectedItems.value.clear()
  }
}

const handleCardClick = (workflow: WorkflowItem) => {
  if (isSelecting.value) {
    if (selectedItems.value.has(workflow.id)) {
      selectedItems.value.delete(workflow.id)
    } else {
      selectedItems.value.add(workflow.id)
    }
  } else {
    // Regular click behavior (e.g. preview)
    selectedItems.value.clear()
    selectedItems.value.add(workflow.id)
    isSelecting.value = true
  }
}

const isGroupFullySelected = (group: WorkflowGroup) => {
  return group.items.every(item => selectedItems.value.has(item.id))
}

const toggleGroupSelection = (group: WorkflowGroup) => {
  if (isGroupFullySelected(group)) {
    group.items.forEach(item => selectedItems.value.delete(item.id))
  } else {
    group.items.forEach(item => selectedItems.value.add(item.id))
  }
}

const batchDelete = async () => {
  if (selectedItems.value.size === 0) return
  
  const workflowsToDelete = Array.from(selectedItems.value)
    .map(id => workflowStore.persistedWorkflows.find(wf => wf.key === id))
    .filter((wf): wf is ComfyWorkflow => !!wf)
  
  if (workflowsToDelete.length > 0) {
    for (const wf of workflowsToDelete) {
      await workflowService.deleteWorkflow(wf)
    }
  }
  
  selectedItems.value.clear()
  isSelecting.value = false
}

const batchToggleLike = async () => {
  if (selectedItems.value.size === 0) return
  
  // Mark all selected as liked (or toggle if all are liked)
  const allLiked = Array.from(selectedItems.value).every(id => {
    for (const group of groupedWorkflows.value) {
      const item = group.items.find(i => i.id === id)
      if (item) return item.liked
    }
    return false
  })
  
  for (const id of Array.from(selectedItems.value)) {
    const wf = workflowStore.persistedWorkflows.find(w => w.key === id)
    if (wf) {
      if (allLiked) {
        // Remove bookmark
        if (bookmarkStore.isBookmarked(wf.path)) {
          await bookmarkStore.toggleBookmarked(wf.path)
        }
      } else {
        // Add bookmark
        if (!bookmarkStore.isBookmarked(wf.path)) {
          await bookmarkStore.toggleBookmarked(wf.path)
        }
      }
    }
  }
  
  selectedItems.value.clear()
  isSelecting.value = false
}
</script>

<style scoped>
.ui-grid-columns {
  grid-template-columns: repeat(auto-fill, minmax(160px, 200px));
}
</style>
