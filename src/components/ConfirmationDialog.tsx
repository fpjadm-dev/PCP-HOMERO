import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          iconColor: 'text-amber-600 bg-amber-50 border-amber-100',
          btnColor: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500'
        };
      case 'info':
        return {
          iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
          btnColor: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500'
        };
      case 'danger':
      default:
        return {
          iconColor: 'text-rose-600 bg-rose-50 border-rose-100',
          btnColor: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-3xs" id="custom-confirmation-dialog">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100 animate-scaleUp">
        <div className="p-5 flex gap-3.5">
          <div className={`p-2.5 rounded-full border h-11 w-11 flex items-center justify-center shrink-0 ${styles.iconColor}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-sans text-xs font-extrabold text-slate-900 mb-1 leading-snug uppercase tracking-wider">{title}</h3>
            <p className="font-sans text-3xs text-slate-500 leading-relaxed font-semibold">{message}</p>
          </div>
        </div>
        <div className="bg-slate-50 px-4 py-3 flex justify-end gap-2 border-t border-slate-150">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg font-sans text-3xs font-extrabold uppercase tracking-wide text-slate-500 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-3 py-1.5 rounded-lg font-sans text-3xs font-extrabold uppercase tracking-wide transition-colors cursor-pointer shadow-xs ${styles.btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
