import { Loader2 } from "lucide-react";

import { ErrorNotice } from "@/components/ErrorNotice";
import type { Resource } from "@/hooks/use-resource";

type Props<T> = {
  resource: Resource<T>;
  /** Called to decide whether the loaded data should show the empty message. */
  isEmpty: (data: T) => boolean;
  emptyTitle: string;
  emptyDetail?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: (data: T) => React.ReactNode;
};

/** Loading, error and empty states so no screen is ever blank or broken. */
export function ResourceView<T>({
  resource,
  isEmpty,
  emptyTitle,
  emptyDetail,
  actionLabel,
  onAction,
  children,
}: Props<T>) {
  if (resource.status === "loading") {
    return (
      <div className="glass mt-8 flex items-center justify-center gap-3 p-8 text-base text-ink/60" aria-live="polite">
        <Loader2 className="size-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (resource.status === "error") {
    return (
      <div className="mt-8">
        <ErrorNotice
          message={resource.error ?? "Unable to load."}
          actionLabel={actionLabel ?? "Try again"}
          onAction={resource.reload}
        />
      </div>
    );
  }

  if (!resource.data) {
    return (
      <div className="glass mt-8 p-8 text-center">
        <p className="text-base text-ink/60">Nothing to show yet.</p>
      </div>
    );
  }

  if (isEmpty(resource.data)) {
    return (
      <div className="glass mt-8 p-8 text-center">
        <h2 className="text-xl">{emptyTitle}</h2>
        {emptyDetail ? <p className="mt-2 text-base text-ink/60">{emptyDetail}</p> : null}
        {actionLabel && onAction ? (
          <button onClick={onAction} className="mt-5 min-h-14 rounded-2xl bg-clay px-6 text-base font-semibold text-white">
            {actionLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return <>{children(resource.data)}</>;
}