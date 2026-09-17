import { AlertCircle } from "lucide-react";

type Props = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

/** Every error names the problem in plain words and gives one clear next step. */
export function ErrorNotice({ message, actionLabel, onAction }: Props) {
  return (
    <div className="glass p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive/12 text-destructive">
          <AlertCircle className="size-5" />
        </span>
        <p className="text-base text-ink">{message}</p>
      </div>
      <button onClick={onAction} className="mt-4 min-h-14 w-full rounded-2xl bg-clay text-base font-semibold text-white">
        {actionLabel}
      </button>
    </div>
  );
}
