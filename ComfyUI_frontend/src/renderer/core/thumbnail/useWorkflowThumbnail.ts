import { ref } from 'vue'

import type { ComfyWorkflow } from '@/platform/workflow/management/stores/workflowStore'
import { api } from '@/scripts/api'

import { createGraphThumbnail } from './graphThumbnailRenderer'

// Store thumbnails for each workflow
const workflowThumbnails = ref<Map<string, string>>(new Map())

// Persist user-selected covers to userdata (server-side, in the workflows folder)
const COVERS_FILE = 'workflows/.covers.json'

let _saveTimer: ReturnType<typeof setTimeout> | null = null

async function loadPersistedCovers(): Promise<Record<string, string>> {
  try {
    const resp = await api.getUserData(COVERS_FILE)
    if (resp.ok) {
      return await resp.json()
    }
  } catch {
    /* file doesn't exist yet — that's fine */
  }
  return {}
}

function savePersistedCovers(covers: Record<string, string>) {
  // Debounce saves to avoid spamming the API
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(async () => {
    try {
      await api.storeUserData(COVERS_FILE, covers, {
        overwrite: true,
        stringify: true,
        throwOnError: false
      })
    } catch (e) {
      console.warn('Failed to persist workflow covers:', e)
    }
  }, 500)
}

// Restore persisted covers asynchronously on module load
let _coversLoaded = false
async function ensureCoversLoaded() {
  if (_coversLoaded) return
  _coversLoaded = true
  const persistedCovers = await loadPersistedCovers()
  for (const [key, url] of Object.entries(persistedCovers)) {
    // Only set if not already overridden by an in-session thumbnail
    if (!workflowThumbnails.value.has(key)) {
      workflowThumbnails.value.set(key, url)
    }
  }
}

// Kick off the async load immediately
void ensureCoversLoaded()

export const useWorkflowThumbnail = () => {
  /**
   * Capture a thumbnail of the canvas
   */
  const createMinimapPreview = (): Promise<string | null> => {
    try {
      const thumbnailDataUrl = createGraphThumbnail()
      return Promise.resolve(thumbnailDataUrl)
    } catch (error) {
      console.error('Failed to capture canvas thumbnail:', error)
      return Promise.resolve(null)
    }
  }

  /**
   * Store a thumbnail for a workflow
   */
  const storeThumbnail = async (workflow: ComfyWorkflow) => {
    const thumbnail = await createMinimapPreview()
    if (thumbnail) {
      const existingThumbnail = workflowThumbnails.value.get(workflow.key)
      if (existingThumbnail) {
        URL.revokeObjectURL(existingThumbnail)
      }
      workflowThumbnails.value.set(workflow.key, thumbnail)
    }
  }

  /**
   * Get a thumbnail for a workflow
   */
  const getThumbnail = (workflowKey: string): string | undefined => {
    return workflowThumbnails.value.get(workflowKey)
  }

  /**
   * Clear a thumbnail for a workflow
   */
  const clearThumbnail = async (workflowKey: string) => {
    const thumbnail = workflowThumbnails.value.get(workflowKey)
    if (thumbnail) {
      URL.revokeObjectURL(thumbnail)
    }
    workflowThumbnails.value.delete(workflowKey)
    // Also remove from persisted covers
    const covers = await loadPersistedCovers()
    delete covers[workflowKey]
    savePersistedCovers(covers)
  }

  /**
   * Clear all thumbnails
   */
  const clearAllThumbnails = () => {
    for (const thumbnail of workflowThumbnails.value.values()) {
      URL.revokeObjectURL(thumbnail)
    }
    workflowThumbnails.value.clear()
    savePersistedCovers({})
  }

  /**
   * Move a thumbnail from one workflow key to another
   */
  const moveWorkflowThumbnail = async (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return

    const thumbnail = workflowThumbnails.value.get(oldKey)
    if (thumbnail) {
      workflowThumbnails.value.set(newKey, thumbnail)
      workflowThumbnails.value.delete(oldKey)
      // Sync persisted covers
      const covers = await loadPersistedCovers()
      if (covers[oldKey]) {
        covers[newKey] = covers[oldKey]
        delete covers[oldKey]
        savePersistedCovers(covers)
      }
    }
  }

  /**
   * Directly set a thumbnail URL for a workflow (e.g. from an asset image).
   * Persisted to server-side userdata for survival across page reloads.
   */
  const setThumbnailUrl = async (workflowKey: string, url: string) => {
    workflowThumbnails.value.set(workflowKey, url)
    // Persist to userdata
    const covers = await loadPersistedCovers()
    covers[workflowKey] = url
    savePersistedCovers(covers)
  }

  return {
    createMinimapPreview,
    storeThumbnail,
    getThumbnail,
    setThumbnailUrl,
    clearThumbnail,
    clearAllThumbnails,
    moveWorkflowThumbnail,
    workflowThumbnails
  }
}

