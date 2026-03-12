<template>
  <img
    :src="logoSrc"
    :width="size"
    :height="size"
    :class="iconClass"
    alt="ComfyUI Logo"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useSettingStore } from '@/platform/settings/settingStore'

interface Props {
  size?: number | string
  color?: string
  class?: string
  mode?: 'outline' | 'fill'
}
const {
  size = 16,
  class: className
} = defineProps<Props>()

const iconClass = computed(() => className || '')
const settingStore = useSettingStore()

const isDark = computed(() => {
  const palette = settingStore.get('Comfy.ColorPalette')
  return palette !== 'light'
})

const logoSrc = computed(() =>
  isDark.value ? '/assets/darkthems_logo.svg' : '/assets/lighttheme_logo.svg'
)
</script>
