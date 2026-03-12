import { useDialogService } from '@/services/dialogService'
import { useDialogStore } from '@/stores/dialogStore'

import WorkspaceManageDialog from '../components/WorkspaceManageDialog.vue'

const DIALOG_KEY = 'workspace-manage'

export function useWorkspaceManageDialog() {
  const dialogService = useDialogService()
  const dialogStore = useDialogStore()

  function hide() {
    dialogStore.closeDialog({ key: DIALOG_KEY })
  }

  function show(initialPage?: 'workflows' | 'assets') {
    dialogService.showLayoutDialog({
      key: DIALOG_KEY,
      component: WorkspaceManageDialog,
      props: {
        onClose: hide,
        initialPage: initialPage || 'workflows'
      }
    })
  }

  return { show, hide }
}

