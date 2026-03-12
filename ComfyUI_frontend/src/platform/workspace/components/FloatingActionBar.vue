<template>
  <div 
    class="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
    :class="visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'"
  >
    <div class="bg-comfy-panel-bg/90 backdrop-blur-xl border border-divider shadow-2xl rounded-full px-2 py-2 flex items-center gap-2 pointer-events-auto">
      
      <div class="pl-4 pr-2 border-r border-divider">
        <span class="text-sm font-semibold whitespace-nowrap"><span class="text-primary">{{ count }}</span> {{ label }}</span>
      </div>

      <!-- Action buttons slot -->
      <slot />

      <div class="w-[1px] h-4 bg-divider mx-1"></div>

      <Button 
        variant="textonly"
        size="icon"
        class="rounded-full text-muted-foreground hover:text-base-foreground w-8 h-8"
        title="退出选择"
        @click="emit('close')"
      >
        <i class="icon-[lucide--x] size-4"></i>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue'

defineProps<{
  visible: boolean
  count: number
  label?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>
