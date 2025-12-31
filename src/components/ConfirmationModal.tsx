import { SpinnerIcon, WarningIcon } from './icons'
import { theme } from '../styles/theme'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  isLoading?: boolean
}

const styles = {
  backdrop:
    'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
  modal: `${theme.bg.card} rounded-lg shadow-xl max-w-md w-full p-6`,
  header: 'flex items-center gap-3 mb-4',
  warningIcon:
    'flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center',
  title: `text-lg font-medium ${theme.text.h1}`,
  message: `${theme.text.body} mb-6`,
  actions: 'flex gap-3 justify-end'
} as const

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const confirmButtonClass = isDestructive
    ? theme.button.dangerSolid
    : theme.button.primary

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          {isDestructive && (
            <div className={styles.warningIcon}>
              <WarningIcon />
            </div>
          )}
          <h3 className={styles.title}>{title}</h3>
        </div>

        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={theme.button.secondary}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={confirmButtonClass}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <SpinnerIcon />
                Deleting...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
