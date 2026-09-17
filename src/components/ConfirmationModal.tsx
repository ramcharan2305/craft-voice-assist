type Props = {
  open: boolean;
  title: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationModal({
  open,
  title,
  detail,
  confirmLabel = "Yes, do it",
  cancelLabel = "No, go back",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/30 p-4 backdrop-blur-sm sm:place-items-center">
      <div role="dialog" aria-modal className="sheet-up glass-strong w-full max-w-md p-6">
        <h2 className="text-xl">{title}</h2>
        {detail ? <p className="mt-2 text-base text-ink/65">{detail}</p> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onConfirm}
            className={`min-h-14 flex-1 rounded-2xl px-5 text-base font-semibold text-white ${danger ? "bg-destructive" : "bg-clay"}`}
          >
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="chip min-h-14 flex-1 px-5 text-base font-medium text-ink">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
