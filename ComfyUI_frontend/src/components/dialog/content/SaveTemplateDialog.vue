<template>
  <div class="flex flex-col gap-4 p-4" style="min-width: 360px">
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-base-foreground">
        {{ $t('userTemplates.name') }}
      </label>
      <InputText
        v-model="templateName"
        :placeholder="$t('userTemplates.namePlaceholder')"
        autofocus
        @keyup.enter="onSave"
      />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-base-foreground">
        {{ $t('userTemplates.description') }}
      </label>
      <Textarea
        v-model="templateDescription"
        :placeholder="$t('userTemplates.descriptionPlaceholder')"
        rows="2"
        autoResize
      />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-base-foreground">
        {{ $t('userTemplates.thumbnail') }}
        <span class="text-xs text-muted-foreground ml-1">
          ({{ $t('userTemplates.optional') }})
        </span>
      </label>
      <div
        class="thumbnail-upload-area"
        :class="{ 'has-image': thumbnailPreview }"
        @click="selectThumbnail"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <img
          v-if="thumbnailPreview"
          :src="thumbnailPreview"
          class="thumbnail-preview"
        />
        <div v-else class="thumbnail-placeholder">
          <i class="icon-[lucide--image-plus] text-2xl text-muted-foreground" />
          <span class="text-xs text-muted-foreground">
            {{ $t('userTemplates.clickToUpload') }}
          </span>
        </div>
        <button
          v-if="thumbnailPreview"
          class="thumbnail-remove"
          @click.stop="removeThumbnail"
        >
          <i class="icon-[lucide--x] text-sm" />
        </button>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFileSelected"
      />
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button severity="secondary" @click="onCancel">
        {{ $t('g.cancel') }}
      </Button>
      <Button :disabled="!templateName.trim()" @click="onSave">
        {{ $t('g.save') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { ref } from 'vue'

import Button from '@/components/ui/button/Button.vue'
import { useDialogStore } from '@/stores/dialogStore'
import { useUserTemplatesStore } from '@/stores/userTemplatesStore'

const props = defineProps<{
  onSaved?: () => void
}>()

const templateName = ref('')
const templateDescription = ref('')
const thumbnailBlob = ref<Blob | null>(null)
const thumbnailPreview = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const selectThumbnail = () => {
  fileInputRef.value?.click()
}

const onFileSelected = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    setThumbnail(file)
  }
}

const onDrop = (e: DragEvent) => {
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    setThumbnail(file)
  }
}

const setThumbnail = (file: File) => {
  thumbnailBlob.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    thumbnailPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const removeThumbnail = () => {
  thumbnailBlob.value = null
  thumbnailPreview.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const onSave = async () => {
  const name = templateName.value.trim()
  if (!name) return

  const userTemplatesStore = useUserTemplatesStore()
  await userTemplatesStore.saveUserTemplate(
    name,
    templateDescription.value.trim(),
    thumbnailBlob.value
  )

  useDialogStore().closeDialog()
  props.onSaved?.()
}

const onCancel = () => {
  useDialogStore().closeDialog()
}
</script>

<style scoped>
.thumbnail-upload-area {
  position: relative;
  width: 100%;
  height: 120px;
  border: 2px dashed var(--border-color, #666);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: border-color 0.2s;
}

.thumbnail-upload-area:hover {
  border-color: var(--fg-color, #aaa);
}

.thumbnail-upload-area.has-image {
  border-style: solid;
}

.thumbnail-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.thumbnail-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.thumbnail-remove:hover {
  background: rgba(0, 0, 0, 0.8);
}
</style>
