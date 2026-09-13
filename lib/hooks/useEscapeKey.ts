import { useEffect } from 'react';

/**
 * Global reusable hook to handle Escape key dismissal for modals, dialogs, and drawers.
 * Automatically cleans up event listeners on unmount or when modal closes.
 */
export function useEscapeKey(isOpen: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}
