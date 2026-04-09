import { z } from "zod";
import {
  priorities,
} from "../types";

/** Échéance optionnelle ; si renseignée, format ISO date. */
const optionalDeadline = z
  .string()
  .trim()
  .refine((s) => s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s), { message: "Date invalide" });

const numberStringOrEmpty = z
  .string()
  .trim()
  .refine((s) => {
    if (s === "") return true;
    const normalized = s.replace(",", ".");
    return !Number.isNaN(Number(normalized));
  }, { message: "Nombre invalide" });

const projectedWorkItemSchema = z.object({
  date: z.string().trim().min(1, "Date requise"),
  hours: z.number().min(0, "Heures invalide"),
  startTime: z.string().trim().optional(),
  endTime: z.string().trim().optional(),
}).superRefine((val, ctx) => {
  if (!val.startTime || !val.endTime) {
    if (val.hours <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hours"],
        message: "Indiquez une durée (heures) pour ce jour au calendrier",
      });
    }
    return;
  }
  const timeRe = /^\d{2}:\d{2}$/;
  if (!timeRe.test(val.startTime) || !timeRe.test(val.endTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["startTime"],
      message: "Heure invalide",
    });
    return;
  }
  const [sh, sm] = val.startTime.split(":").map(Number);
  const [eh, em] = val.endTime.split(":").map(Number);
  const isHalfHour = (m: number) => m === 0 || m === 30;
  if (!isHalfHour(sm) || !isHalfHour(em)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["startTime"],
      message: "Utilisez uniquement des demi-heures (:00 ou :30)",
    });
  }
  if (eh * 60 + em <= sh * 60 + sm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endTime"],
      message: "L'heure de fin doit être après le début",
    });
  }
});

export type PendingSubtask = {
  name: string;
  deadline: string;
  adminName: string;
};

export const taskFormSchema = z
  .object({
    projectName: z.string().trim().min(1, "Nom du projet requis"),
    company: z.string().trim().min(1, "Société requise"),
    domain: z.string().trim().min(1, "Domaine requis"),
    admins: z.array(z.string().trim().min(1)).min(1, "Sélectionnez au moins un admin"),
    isClientRequest: z.boolean(),
    clientName: z.string().trim(),
    deadline: optionalDeadline,
    budget: z.string().trim(),
    description: z.string().trim(),
    priority: z.enum(priorities),
    projectedWork: z.array(projectedWorkItemSchema),
    estimatedHours: numberStringOrEmpty,
    estimatedDays: numberStringOrEmpty,
  })
  .superRefine((val, ctx) => {
    if (val.isClientRequest && !val.clientName.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clientName"],
        message: "Le nom du client est requis",
      });
    }

  });

export type TaskFormValues = z.infer<typeof taskFormSchema>;

/** TaskFormValues enrichi des sous-tâches gérées hors zod */
export type TaskFormValuesWithSubtasks = TaskFormValues & {
  subtasks: PendingSubtask[];
};

