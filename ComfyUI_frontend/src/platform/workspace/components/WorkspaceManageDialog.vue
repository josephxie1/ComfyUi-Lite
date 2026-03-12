<template>
  <BaseModalLayout :content-title="activePage.label" data-testid="workspace-manage-dialog" size="lg">
    <template #leftPanelHeaderTitle>
      <i class="icon-[lucide--folder-cog]" />
      <h2 class="text-neutral text-base">{{ $t('g.manage') || '管理' }}</h2>
    </template>

    <template #leftPanel>
      <nav class="flex scrollbar-hide flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        <div class="flex flex-col gap-2">
          <NavItem
            v-for="item in pages"
            :key="item.id"
            :data-nav-id="item.id"
            :icon="item.icon"
            :active="activePageId === item.id"
            @click="activePageId = item.id"
          >
            {{ item.label }}
          </NavItem>
        </div>
      </nav>
    </template>

    <template #content>
      <div v-if="activePageId === 'workflows'" class="size-full">
        <WorkspaceManageWorkflows />
      </div>
      <div v-else-if="activePageId === 'assets'" class="size-full">
        <WorkspaceManageAssets />
      </div>
    </template>
  </BaseModalLayout>
</template>

<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import BaseModalLayout from '@/components/widget/layout/BaseModalLayout.vue'
import NavItem from '@/components/widget/nav/NavItem.vue'
import { OnCloseKey } from '@/types/widgetTypes'

import WorkspaceManageWorkflows from './WorkspaceManageWorkflows.vue'
import WorkspaceManageAssets from './WorkspaceManageAssets.vue'

const { onClose, initialPage = 'workflows' } = defineProps<{
  onClose: () => void
  initialPage?: 'workflows' | 'assets'
}>()

provide(OnCloseKey, onClose)

const { t } = useI18n()

type PageId = 'workflows' | 'assets'

const pages = computed(() => [
  {
    id: 'workflows' as PageId,
    icon: 'icon-[lucide--workflow]',
    label: t('sideToolbar.labels.workflows') || '工作流'
  },
  {
    id: 'assets' as PageId,
    icon: 'icon-[lucide--box]',
    label: t('sideToolbar.labels.assets') || '资产'
  }
])

const activePageId = ref<PageId>(initialPage as PageId)

const activePage = computed(() => 
  pages.value.find(p => p.id === activePageId.value) || pages.value[0]
)
</script>
