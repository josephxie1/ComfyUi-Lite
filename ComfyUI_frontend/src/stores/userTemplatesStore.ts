import { defineStore } from 'pinia'
import { ref } from 'vue'

import { api } from '@/scripts/api'
import { app } from '@/scripts/app'
import type { ComfyWorkflowJSON } from '@/platform/workflow/validation/schemas/workflowSchema'

export interface UserTemplateInfo {
  name: string
  description: string
  createdAt: string
  hasThumbnail: boolean
}

const INDEX_FILE = 'user_templates/index.json'

function templateWorkflowFile(name: string) {
  return `user_templates/${name}.json`
}

function templateThumbnailFile(name: string) {
  return `user_templates/${name}.webp`
}

export const useUserTemplatesStore = defineStore('userTemplates', () => {
  const templates = ref<UserTemplateInfo[]>([])
  const isLoaded = ref(false)

  async function loadUserTemplates() {
    try {
      const resp = await api.getUserData(INDEX_FILE)
      if (resp.status === 200) {
        templates.value = await resp.json()
      } else {
        templates.value = []
      }
    } catch {
      templates.value = []
    }
    isLoaded.value = true
  }

  async function saveIndex() {
    await api.storeUserData(INDEX_FILE, templates.value, {
      overwrite: true,
      stringify: true,
      throwOnError: false
    })
  }

  async function saveUserTemplate(
    name: string,
    description: string,
    thumbnailBlob?: Blob | null
  ) {
    // Serialize current graph
    const workflow = app.rootGraph.serialize() as unknown as ComfyWorkflowJSON

    // Save workflow JSON
    await api.storeUserData(
      templateWorkflowFile(name),
      workflow,
      { overwrite: true, stringify: true, throwOnError: true }
    )

    // Save thumbnail if provided
    let hasThumbnail = false
    if (thumbnailBlob) {
      await api.storeUserData(
        templateThumbnailFile(name),
        thumbnailBlob,
        { overwrite: true, stringify: false, throwOnError: false }
      )
      hasThumbnail = true
    }

    // Update index
    const existing = templates.value.findIndex((t) => t.name === name)
    const info: UserTemplateInfo = {
      name,
      description,
      createdAt: new Date().toISOString(),
      hasThumbnail
    }

    if (existing >= 0) {
      templates.value[existing] = info
    } else {
      templates.value.unshift(info)
    }
    // Trigger reactivity
    templates.value = [...templates.value]

    await saveIndex()
  }

  async function deleteUserTemplate(name: string) {
    templates.value = templates.value.filter((t) => t.name !== name)
    await saveIndex()
    // Best effort delete files (no error if missing)
    try {
      await api.storeUserData(templateWorkflowFile(name), '', {
        overwrite: true,
        stringify: false,
        throwOnError: false
      })
    } catch { /* ignore */ }
  }

  async function getUserTemplateWorkflow(
    name: string
  ): Promise<ComfyWorkflowJSON> {
    const resp = await api.getUserData(templateWorkflowFile(name))
    if (resp.status !== 200) {
      throw new Error(`Failed to load user template: ${name}`)
    }
    return await resp.json()
  }

  function getThumbnailUrl(name: string): string {
    return api.apiURL(
      `/userdata/${encodeURIComponent(templateThumbnailFile(name))}`
    )
  }

  return {
    templates,
    isLoaded,
    loadUserTemplates,
    saveUserTemplate,
    deleteUserTemplate,
    getUserTemplateWorkflow,
    getThumbnailUrl
  }
})
