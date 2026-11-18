import { toast } from "sonner";

export function toastError(message: string, opts?: { id?: string }) {
  toast.error(message, opts?.id ? { id: opts.id } : undefined);
}

export function toastSuccess(message: string, opts?: { id?: string }) {
  toast.success(message, opts?.id ? { id: opts.id } : undefined);
}

