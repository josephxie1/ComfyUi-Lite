<template>
  <div class="flex size-full flex-col font-inter select-none" @contextmenu.prevent>
    <!-- Top Bar: Search -->
    <div class="flex items-center gap-3 px-6 pt-6 pb-2">
      <div class="w-[180px]">
        <div class="relative flex w-full cursor-text items-center rounded-lg bg-secondary-background text-base-foreground h-10 px-2 py-1.5">
          <i class="pointer-events-none absolute left-2.5 size-4 icon-[lucide--search]"></i>
          <input 
            v-model="searchQuery"
            type="text" 
            class="size-full border-none bg-transparent outline-none pl-8 text-sm placeholder:text-muted-foreground" 
            :placeholder="$t('g.searchPlaceholder', { subject: '' }) || '搜索...'" 
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2 text-muted-foreground hover:text-base-foreground bg-transparent border-none cursor-pointer">
            <i class="icon-[lucide--x] size-3"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Filter Row: View Type + Date Range + Sort -->
    <div class="relative flex flex-wrap justify-between gap-2 px-6 pb-4">
      <div class="flex flex-wrap gap-2">
        <!-- View Type Filter (dropdown) -->
        <SingleSelect
          v-model="viewFilter"
          :options="viewFilterOptions"
          option-label="name"
          option-value="value"
          class="h-10 w-36 text-sm bg-secondary-background rounded-lg border-none hover:bg-secondary-background-hover font-medium!"
          :show-clear="false"
        >
          <template #value>
            <div class="flex items-center gap-2 text-sm">
              <i v-if="viewFilter === 'favorites'" class="icon-[lucide--heart] size-3.5 text-red-500"></i>
              <i v-else class="icon-[lucide--filter] size-3.5 text-muted-foreground"></i>
              <span class="text-base-foreground">{{ getCurrentViewName(viewFilter) }}</span>
            </div>
          </template>
        </SingleSelect>

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
      </div>

      <!-- Sort -->
      <div>
        <SingleSelect
          v-model="sortBy"
          :options="sortOptions"
          option-label="name"
          option-value="value"
          placeholder="排序方式"
          class="h-10 w-48 text-sm bg-secondary-background rounded-lg border-none hover:bg-secondary-background-hover font-medium!"
          :show-clear="false"
        >
          <template #value>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-base-foreground">{{ getCurrentSortName(sortBy) }}</span>
            </div>
          </template>
        </SingleSelect>
      </div>
    </div>

    <!-- Main Content Area -->
    <div 
      ref="scrollContainerRef"
      class="flex-1 overflow-y-auto px-6 pb-20 mt-4 relative" 
      @click="handleEmptySpaceClick" 
      @scroll="handleScroll"
      @mousedown.left="onRubberBandStart"
    >
      <!-- Rubber Band Selection Overlay -->
      <div
        v-if="rubberBand.active"
        class="absolute border border-primary/60 bg-primary/10 rounded-sm pointer-events-none z-[100]"
        :style="rubberBandStyle"
      ></div>
      <div v-if="loading && mediaAssets.length === 0" class="flex items-center justify-center size-full text-muted-foreground">
        <i class="icon-[lucide--loader-2] size-6 animate-spin"></i>
      </div>
      <div v-else-if="groupedAssets.length === 0" class="flex items-center justify-center size-full text-muted-foreground">
        {{ $t('sidebar.noResults') || '没有找到资产' }}
      </div>
      
      <div v-else class="flex flex-col w-full h-full pb-8">
        <div class="flex flex-col gap-10">
          <div v-for="group in groupedAssets" :key="group.dateLabel" class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <span class="text-base font-semibold text-base-foreground">{{ group.dateLabel }}</span>
              <button 
                class="flex items-center gap-1.5 text-sm text-muted-foreground bg-transparent border-none cursor-pointer appearance-none outline-none transition-colors hover:text-base-foreground" 
                :title="$t('g.selectAll') || '全选'"
                @click.stop="toggleGroupSelection(group)"
              >
                <svg v-if="isGroupFullySelected(group)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="18" height="18">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="18" height="18">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ $t('g.selectAll') || '全选' }}</span>
              </button>
            </div>
            
            <div class="grid w-full gap-4 ui-grid-columns">
              <div 
                v-for="asset in group.items" 
                :key="asset.id" 
                :data-id="asset.id" 
                class="relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer border-[2px] border-solid border-transparent transition-all duration-200 hover:border-node-component-border hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group bg-muted/20"
                @click.stop="handleCardClick(asset)"
                @contextmenu.prevent.stop="openContextMenu($event, asset)"
              >
                <!-- Image Background -->
                <div 
                  v-if="asset.previewUrl"
                  class="absolute inset-0 bg-contain bg-center bg-no-repeat" 
                  :class="{ 'opacity-80 scale-95': selectedItems.has(asset.id) }"
                  :style="{ backgroundImage: `url(${asset.previewUrl})` }"
                ></div>
                
                <!-- Format icon fallback if no image preview available -->
                <div v-else class="absolute inset-0 flex items-center justify-center" :class="{ 'opacity-80 scale-95': selectedItems.has(asset.id) }">
                  <i :class="[getIconForType(asset.mediaType), 'size-12 text-muted-foreground opacity-30']"></i>
                </div>
                  
                <!-- Type Badge (top left) -->
                <div class="absolute top-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-md rounded px-1.5 py-0.5 text-[10px] text-white z-10">
                     <i :class="[getIconForType(asset.mediaType), 'size-3']"></i>
                     <span class="uppercase font-medium tracking-wide">{{ asset.mediaType }}</span>
                  </div>

                  <!-- Favorite Heart Button (top right) -->
                  <button
                    class="absolute top-2 right-2 z-10 size-7 flex items-center justify-center rounded-full transition-all duration-200 bg-black/30 backdrop-blur-md border-none cursor-pointer"
                    :class="favoriteIds.has(asset.id) ? 'text-red-500 hover:text-red-400' : 'text-white/50 hover:text-white opacity-0 group-hover:opacity-100'"
                    @click.stop="toggleFavorite(asset.id)"
                    :title="favoriteIds.has(asset.id) ? '取消收藏' : '收藏'"
                  >
                    <i class="icon-[lucide--heart] size-3.5" :class="{ 'fill-current': favoriteIds.has(asset.id) }"></i>
                  </button>

                  <!-- Selection Checkbox Info -->
                  <div 
                    v-if="isSelecting" 
                    class="absolute inset-0 z-10 transition-colors p-2 flex items-start justify-between"
                  >
                    <div 
                      class="size-6 rounded-full border-2 flex items-center justify-center transition-colors ml-auto mt-7"
                      :class="selectedItems.has(asset.id) ? 'bg-primary border-primary text-primary-foreground' : 'bg-black/20 border-white/70 text-transparent group-hover:bg-black/40'"
                    >
                      <i class="icon-[lucide--check] size-4"></i>
                    </div>
                  </div>
                  
                  <!-- Title Gradient Overlay -->
                  <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                  <div class="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5 drop-shadow-md">
                    <span class="text-white font-medium text-xs truncate" :title="asset.name">{{ asset.name }}</span>
                    <div class="flex items-center text-[10px] text-white/70">
                      <span>{{ asset.size }}</span>
                      <span class="mx-1.5">•</span>
                      <span>{{ asset.dimensions }}</span>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Loading More Indicator -->
        <div v-if="currentAssetsSource.isLoadingMore.value" class="flex justify-center p-4">
          <i class="icon-[lucide--loader-2] size-5 animate-spin text-muted-foreground"></i>
        </div>
      </div>
    </div>

    <!-- Floating Action Bar for Multiple Selection -->
    <FloatingActionBar
      :visible="isSelecting"
      :count="selectedItems.size"
      :label="$t('g.selected') || '已选择'"
      @close="toggleSelectMode"
    >
      <Button 
        variant="secondary"
        size="sm"
        class="rounded-full gap-1.5 shadow-none hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
        :disabled="selectedItems.size === 0"
        @click="batchDelete"
      >
        <i class="icon-[lucide--trash-2] size-4"></i>
        <span>{{ $t('g.delete') || '删除' }}</span>
      </Button>
      
      <Button 
        variant="secondary"
        size="sm"
        class="rounded-full gap-1.5 shadow-none"
        :disabled="selectedItems.size === 0"
        @click="batchDownload"
      >
        <i class="icon-[lucide--download] size-4"></i>
        <span>{{ $t('mediaAsset.selection.downloadSelected') || '下载' }}</span>
      </Button>
    </FloatingActionBar>

    <!-- Context Menu -->
    <Teleport to="body">
      <div v-if="contextMenu.visible" class="fixed inset-0 z-[9999]" @click="closeContextMenu" @contextmenu.prevent="closeContextMenu">
        <div
          class="fixed min-w-[160px] rounded-lg bg-comfy-panel-bg/95 backdrop-blur-xl border border-divider shadow-2xl py-1 z-[10000]"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          @click.stop
        >
          <button
            class="flex w-full items-center gap-3 px-3 py-2 text-sm text-base-foreground hover:bg-secondary-background transition-colors border-none bg-transparent cursor-pointer text-left"
            @click="contextMenuCopyImage"
          >
            <i class="icon-[lucide--copy] size-4 text-muted-foreground"></i>
            <span>复制图片</span>
          </button>
          <button
            class="flex w-full items-center gap-3 px-3 py-2 text-sm text-base-foreground hover:bg-secondary-background transition-colors border-none bg-transparent cursor-pointer text-left"
            @click="contextMenuToggleFavorite"
          >
            <i :class="contextMenu.asset && favoriteIds.has(contextMenu.asset.id) ? 'icon-[lucide--heart-off] size-4 text-red-500' : 'icon-[lucide--heart] size-4 text-muted-foreground'"></i>
            <span>{{ contextMenu.asset && favoriteIds.has(contextMenu.asset.id) ? '取消喜欢' : '喜欢' }}</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, reactive, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import SingleSelect from '@/components/input/SingleSelect.vue'
import Button from '@/components/ui/button/Button.vue'
import DatePicker from 'primevue/datepicker'
import FloatingActionBar from './FloatingActionBar.vue'

import { useMediaAssets } from '@/platform/assets/composables/media/useMediaAssets'
import { useMediaAssetActions } from '@/platform/assets/composables/useMediaAssetActions'
import { getMediaTypeFromFilename } from '@/utils/formatUtil'
import type { AssetItem } from '@/platform/assets/schemas/assetSchema'

const { t, locale } = useI18n()

const searchQuery = ref('')
const viewFilter = ref<'output' | 'input' | 'favorites'>('output')
const sortBy = ref('newest')
const timeRange = ref()

const viewFilterOptions = computed(() => [
  { name: t('sideToolbar.labels.generated') || '已生成', value: 'output' as const },
  { name: t('sideToolbar.labels.imported') || '已导入', value: 'input' as const },
  { name: t('g.favoriteOnly') || '喜欢', value: 'favorites' as const }
])

const getCurrentViewName = (val: string) => {
  const opt = viewFilterOptions.value.find(o => o.value === val)
  return opt ? opt.name : '已生成'
}

// Favorites management (localStorage)
const FAVORITES_KEY = 'comfyui_asset_favorites'

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY)
    if (stored) return new Set(JSON.parse(stored))
  } catch { /* ignore */ }
  return new Set()
}

function saveFavorites(ids: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]))
}

const favoriteIds = ref<Set<string>>(loadFavorites())

const toggleFavorite = (id: string) => {
  if (favoriteIds.value.has(id)) {
    favoriteIds.value.delete(id)
  } else {
    favoriteIds.value.add(id)
  }
  // Trigger reactivity
  favoriteIds.value = new Set(favoriteIds.value)
  saveFavorites(favoriteIds.value)
}

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

// Media Assets Fetching logic
const inputAssetsSource = useMediaAssets('input')
const outputAssetsSource = useMediaAssets('output')

const currentAssetsSource = computed(() => 
  viewFilter.value === 'input' ? inputAssetsSource : outputAssetsSource
)

const loading = computed(() => {
  return currentAssetsSource.value.loading.value
})

const mediaAssets = computed(() => {
  if (viewFilter.value === 'favorites') {
    // Combine both sources and filter by favorites
    const inputAssets = inputAssetsSource.media.value || []
    const outputAssets = outputAssetsSource.media.value || []
    const allAssets = [...outputAssets, ...inputAssets]
    return allAssets.filter(a => favoriteIds.value.has(a.id) || favoriteIds.value.has(a.name))
  }
  const assets = currentAssetsSource.value.media.value || []
  return assets
})

// Dimensions cache: probe image dimensions from preview URLs
const dimensionsCache: Record<string, string> = reactive({})

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'])

function probeImageDimensions(assetId: string, url: string) {
  if (dimensionsCache[assetId] || !url) return
  const img = new Image()
  img.onload = () => {
    dimensionsCache[assetId] = `${img.naturalWidth}x${img.naturalHeight}`
  }
  img.src = url
}

watch(mediaAssets, (assets) => {
  for (const asset of assets) {
    if (asset.metadata?.width && asset.metadata?.height) continue
    if (dimensionsCache[asset.id]) continue
    const ext = asset.name.split('.').pop()?.toLowerCase() || ''
    if (!IMAGE_EXTENSIONS.has(ext)) continue
    if (asset.preview_url) {
      probeImageDimensions(asset.id, asset.preview_url)
    }
  }
}, { immediate: true })

// Utility formatters
const formatBytes = (bytes: number, decimals = 1) => {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

const getIconForType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'image': return 'icon-[lucide--image]'
    case 'video': return 'icon-[lucide--video]'
    case 'audio': return 'icon-[lucide--music]'
    case '3d': return 'icon-[lucide--box]'
    default: return 'icon-[lucide--file]'
  }
}

// Transform raw assets
interface AssetDisplayItem {
  id: string
  name: string
  dateLabel: string
  timestamp: number
  previewUrl: string | undefined
  mediaType: string
  size: string
  dimensions: string
  rawAsset: AssetItem
}

interface AssetGroup {
  dateLabel: string
  timestamp: number
  items: AssetDisplayItem[]
}

const dateFormatter = computed(() => new Intl.DateTimeFormat(locale.value || 'zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}))

const filteredAssetList = computed(() => {
  let list = [...mediaAssets.value]

  // Text search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(a => a.name.toLowerCase().includes(q))
  }

  // Date range filter
  if (timeRange.value && Array.isArray(timeRange.value) && timeRange.value[0]) {
    const start = timeRange.value[0].getTime()
    const end = timeRange.value[1] ? timeRange.value[1].getTime() + 86399999 : new Date(start).setHours(23, 59, 59, 999)
    list = list.filter(a => {
      const ts = a.created_at ? new Date(a.created_at).getTime() : 0
      return ts >= start && ts <= end
    })
  }

  // Favorites filter (only applicable if not already in favorites view)
  // In favorites view, filtering is already done in mediaAssets computed

  // Transform
  const displayItems: AssetDisplayItem[] = list.map(asset => {
    const ts = asset.created_at ? new Date(asset.created_at).getTime() : 0
    let dimensions = ''
    if (asset.metadata?.width && asset.metadata?.height) {
      dimensions = `${asset.metadata.width}x${asset.metadata.height}`
    } else if (dimensionsCache[asset.id]) {
      dimensions = dimensionsCache[asset.id]
    }
    
    return {
      id: asset.id,
      name: asset.name,
      timestamp: ts,
      dateLabel: ts > 0 ? dateFormatter.value.format(ts) : 'Unknown Date',
      previewUrl: asset.preview_url,
      mediaType: getMediaTypeFromFilename(asset.name),
      size: formatBytes(asset.size || 0),
      dimensions,
      rawAsset: asset
    }
  })

  // Sort
  displayItems.sort((a, b) => {
    switch (sortBy.value) {
      case 'newest': return b.timestamp - a.timestamp
      case 'oldest': return a.timestamp - b.timestamp
      case 'name_asc': return a.name.localeCompare(b.name)
      case 'name_desc': return b.name.localeCompare(a.name)
      default: return b.timestamp - a.timestamp
    }
  })

  return displayItems
})

const groupedAssets = computed<AssetGroup[]>(() => {
  const groups = new Map<string, AssetGroup>()

  filteredAssetList.value.forEach(asset => {
    const dateLabel = asset.dateLabel
    if (!groups.has(dateLabel)) {
      groups.set(dateLabel, {
        dateLabel,
        timestamp: new Date(asset.timestamp).setHours(0,0,0,0),
        items: []
      })
    }
    groups.get(dateLabel)!.items.push(asset)
  })

  return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp)
})

// Selection Logic
const isSelecting = ref(false)
const selectedItems = ref<Set<string>>(new Set())

// Auto refresh on filter change
watch(viewFilter, () => {
  if (viewFilter.value === 'favorites') {
    // Fetch both sources for favorites view
    inputAssetsSource.fetchMediaList()
    outputAssetsSource.fetchMediaList()
  } else {
    currentAssetsSource.value.fetchMediaList()
  }
  selectedItems.value.clear()
  isSelecting.value = false
}, { immediate: true })

const toggleSelectMode = () => {
  isSelecting.value = !isSelecting.value
  if (!isSelecting.value) {
    selectedItems.value.clear()
  }
}

const handleCardClick = (asset: AssetDisplayItem) => {
  // Skip click if a rubber band drag just finished
  if (rubberBandDidDrag.value) {
    rubberBandDidDrag.value = false
    return
  }
  if (!isSelecting.value) {
    isSelecting.value = true
    selectedItems.value.add(asset.id)
  } else {
    if (selectedItems.value.has(asset.id)) {
      selectedItems.value.delete(asset.id)
      if (selectedItems.value.size === 0) {
        isSelecting.value = false
      }
    } else {
      selectedItems.value.add(asset.id)
    }
  }
}

const handleEmptySpaceClick = () => {
  if (rubberBandDidDrag.value) {
    rubberBandDidDrag.value = false
    return
  }
  if (isSelecting.value) {
    toggleSelectMode()
  }
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  // Check if we approach the bottom (within 200px)
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 200) {
    if (viewFilter.value !== 'favorites' && currentAssetsSource.value.hasMore.value && !currentAssetsSource.value.isLoadingMore.value) {
      currentAssetsSource.value.loadMore()
    }
  }
}

// -----------------------------------------------
// Rubber Band (Lasso) Selection
// -----------------------------------------------
const scrollContainerRef = ref<HTMLElement | null>(null)

const rubberBand = reactive({
  active: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0
})

// Track which items were selected BEFORE the drag started
const preRubberBandSelection = ref<Set<string>>(new Set())
const rubberBandDidDrag = ref(false)

const rubberBandStyle = computed(() => {
  if (!rubberBand.active) return { display: 'none' }
  const x = Math.min(rubberBand.startX, rubberBand.currentX)
  const y = Math.min(rubberBand.startY, rubberBand.currentY)
  const w = Math.abs(rubberBand.currentX - rubberBand.startX)
  const h = Math.abs(rubberBand.currentY - rubberBand.startY)
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`
  }
})

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

function getSelectedIdsInRect(): Set<string> {
  const result = new Set<string>()
  if (!scrollContainerRef.value) return result

  const containerRect = scrollContainerRef.value.getBoundingClientRect()
  const scrollTop = scrollContainerRef.value.scrollTop
  const scrollLeft = scrollContainerRef.value.scrollLeft

  // Rubber band rect is in container-relative (content) coordinates
  const rx = Math.min(rubberBand.startX, rubberBand.currentX)
  const ry = Math.min(rubberBand.startY, rubberBand.currentY)
  const rw = Math.abs(rubberBand.currentX - rubberBand.startX)
  const rh = Math.abs(rubberBand.currentY - rubberBand.startY)

  // Convert rubber band to viewport coordinates for comparison with getBoundingClientRect
  const bandViewport = {
    left: rx - scrollLeft + containerRect.left,
    top: ry - scrollTop + containerRect.top,
    right: rx + rw - scrollLeft + containerRect.left,
    bottom: ry + rh - scrollTop + containerRect.top
  }

  const cards = scrollContainerRef.value.querySelectorAll('[data-id]')
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect()
    if (rectsIntersect(bandViewport, { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom })) {
      const id = card.getAttribute('data-id')
      if (id) result.add(id)
    }
  })
  return result
}

function onRubberBandStart(e: MouseEvent) {
  // Don't start rubber band on interactive elements
  const target = e.target as HTMLElement
  if (target.closest('button, input, a, [role="button"]')) return
  if (!scrollContainerRef.value) return

  const containerRect = scrollContainerRef.value.getBoundingClientRect()
  const scrollTop = scrollContainerRef.value.scrollTop
  const scrollLeft = scrollContainerRef.value.scrollLeft

  // Store coordinates relative to the container's content (accounting for scroll)
  const relX = e.clientX - containerRect.left + scrollLeft
  const relY = e.clientY - containerRect.top + scrollTop

  rubberBand.active = true
  rubberBand.startX = relX
  rubberBand.startY = relY
  rubberBand.currentX = relX
  rubberBand.currentY = relY

  // Snapshot current selection for additive behavior
  preRubberBandSelection.value = new Set(selectedItems.value)
  rubberBandDidDrag.value = false

  window.addEventListener('mousemove', onRubberBandMove)
  window.addEventListener('mouseup', onRubberBandEnd)
}

function onRubberBandMove(e: MouseEvent) {
  if (!rubberBand.active || !scrollContainerRef.value) return
  e.preventDefault()

  const containerRect = scrollContainerRef.value.getBoundingClientRect()
  const scrollTop = scrollContainerRef.value.scrollTop
  const scrollLeft = scrollContainerRef.value.scrollLeft

  rubberBand.currentX = e.clientX - containerRect.left + scrollLeft
  rubberBand.currentY = e.clientY - containerRect.top + scrollTop

  // Live selection update  
  const dragW = Math.abs(rubberBand.currentX - rubberBand.startX)
  const dragH = Math.abs(rubberBand.currentY - rubberBand.startY)
  if (dragW > 5 || dragH > 5) {
    rubberBandDidDrag.value = true
    if (!isSelecting.value) {
      isSelecting.value = true
    }
    const idsInRect = getSelectedIdsInRect()
    // Merge with pre-drag selection
    const merged = new Set(preRubberBandSelection.value)
    idsInRect.forEach(id => merged.add(id))
    selectedItems.value = merged
  }
}

function onRubberBandEnd() {
  rubberBand.active = false
  window.removeEventListener('mousemove', onRubberBandMove)
  window.removeEventListener('mouseup', onRubberBandEnd)

  if (selectedItems.value.size === 0) {
    isSelecting.value = false
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onRubberBandMove)
  window.removeEventListener('mouseup', onRubberBandEnd)
})

// -----------------------------------------------
// Context Menu
// -----------------------------------------------
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  asset: null as AssetDisplayItem | null
})

function openContextMenu(e: MouseEvent, asset: AssetDisplayItem) {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.asset = asset
}

function closeContextMenu() {
  contextMenu.visible = false
  contextMenu.asset = null
}

async function contextMenuCopyImage() {
  if (!contextMenu.asset?.previewUrl) {
    closeContextMenu()
    return
  }
  try {
    const response = await fetch(contextMenu.asset.previewUrl)
    const blob = await response.blob()
    // Convert to PNG for clipboard compatibility
    const pngBlob = blob.type === 'image/png' ? blob : await convertToPng(blob)
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ])
  } catch (err) {
    console.error('Failed to copy image:', err)
  }
  closeContextMenu()
}

function convertToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('Canvas toBlob failed'))
      }, 'image/png')
    }
    img.onerror = reject
    img.src = URL.createObjectURL(blob)
  })
}

function contextMenuToggleFavorite() {
  if (contextMenu.asset) {
    toggleFavorite(contextMenu.asset.id)
  }
  closeContextMenu()
}

const isGroupFullySelected = (group: AssetGroup) => {
  return group.items.length > 0 && group.items.every(asset => selectedItems.value.has(asset.id))
}

const toggleGroupSelection = (group: AssetGroup) => {
  const allSelected = isGroupFullySelected(group)
  if (allSelected) {
    group.items.forEach(asset => selectedItems.value.delete(asset.id))
    if (selectedItems.value.size === 0) {
      isSelecting.value = false
    }
  } else {
    group.items.forEach(asset => selectedItems.value.add(asset.id))
    if (!isSelecting.value) isSelecting.value = true
  }
}

// Media Actions
const { downloadMultipleAssets, deleteAssets } = useMediaAssetActions()

const batchDelete = async () => {
  if (selectedItems.value.size === 0) return
  
  const assetsToDelete = Array.from(selectedItems.value)
    .map(id => filteredAssetList.value.find(a => a.id === id)?.rawAsset)
    .filter((a): a is AssetItem => !!a)
  
  if (assetsToDelete.length > 0) {
    await deleteAssets(assetsToDelete)
    await currentAssetsSource.value.fetchMediaList() // Refresh the view
  }
  
  selectedItems.value.clear()
  isSelecting.value = false
}

const batchDownload = () => {
  if (selectedItems.value.size === 0) return
  
  const assetsToDownload = Array.from(selectedItems.value)
    .map(id => filteredAssetList.value.find(a => a.id === id)?.rawAsset)
    .filter((a): a is AssetItem => !!a)

  if (assetsToDownload.length > 0) {
    downloadMultipleAssets(assetsToDownload)
  }
  
  selectedItems.value.clear()
  isSelecting.value = false
}
</script>

<style scoped>
.ui-grid-columns {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}
</style>
