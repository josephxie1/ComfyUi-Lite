<template>
  <div class="flex flex-col">
    <button
      class="relative inline-flex items-center justify-center gap-2 cursor-pointer touch-manipulation whitespace-nowrap appearance-none border-none font-medium font-inter transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([width]):not([height])]:size-4 [&_svg]:shrink-0 bg-transparent text-base-foreground hover:bg-secondary-background-hover h-8 rounded-lg p-2 text-xs w-full"
      @click="handleViewModeChange('list')"
    >
      <span class="flex w-full items-center gap-2">
        <i class="icon-[lucide--table-of-contents] size-4" />
        <span>{{ $t('sideToolbar.queueProgressOverlay.viewList') }}</span>
        <i
          class="ml-auto icon-[lucide--check] size-4"
          :class="viewMode !== 'list' && 'opacity-0'"
        />
      </span>
    </button>
    <button
      class="relative inline-flex items-center justify-center gap-2 cursor-pointer touch-manipulation whitespace-nowrap appearance-none border-none font-medium font-inter transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([width]):not([height])]:size-4 [&_svg]:shrink-0 bg-transparent text-base-foreground hover:bg-secondary-background-hover h-8 rounded-lg p-2 text-xs w-full"
      @click="handleViewModeChange('grid')"
    >
      <span class="flex w-full items-center gap-2">
        <i class="icon-[lucide--layout-grid] size-4" />
        <span>{{ $t('sideToolbar.queueProgressOverlay.viewGrid') }}</span>
        <i
          class="ml-auto icon-[lucide--check] size-4"
          :class="viewMode !== 'grid' && 'opacity-0'"
        />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
const viewMode = defineModel<'list' | 'grid'>('viewMode', { required: true })

const emit = defineEmits<{
  close: []
}>()

function handleViewModeChange(value: 'list' | 'grid') {
  viewMode.value = value
  emit('close')
}
</script>
