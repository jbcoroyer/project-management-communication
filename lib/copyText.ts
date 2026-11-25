import { toastError, toastSuccess } from "./toast";

/** Copie du texte dans le presse-papiers avec toast Tuesday. */
export async function copyText(text: string, successLabel = "Copié") {
  const value = text.trim();
  if (!value) {
    toastError("Rien à copier.");
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    toastSuccess(successLabel);
    return true;
  } catch {
    toastError("Copie impossible.");
    return false;
  }
}
