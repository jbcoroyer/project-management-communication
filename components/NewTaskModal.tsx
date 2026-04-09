"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  FilePenLine,
  Flag,
  Info,
  ListChecks,
  Plus,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { priorities, type AdminId, type NewTaskFormState } from "../lib/types";
import type { ReferenceRecord } from "../lib/referenceData";
import { taskFormSchema, type TaskFormValues, type TaskFormValuesWithSubtasks, type PendingSubtask } from "../lib/validation/taskSchema";
import { normalizeProjectName } from "../lib/normalize";

const HALF_HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

function RequiredStar() {
  return <span className="ml-1 text-red-500">*</span>;
}

export default function NewTaskModal(props: {
  open: boolean;
  editingTaskId: string | null;
  initialValues: NewTaskFormState;
  admins: ReferenceRecord[];
  companies: ReferenceRecord[];
  domains: ReferenceRecord[];
  currentUserName?: string | null;
  onCancel: () => void;
  onSubmit: (values: TaskFormValuesWithSubtasks) => Promise<void> | void;
}) {
  const { open, editingTaskId, initialValues, admins, companies, domains, onCancel } = props;

  const onSubmit = (values: TaskFormValues) => {
    return props.onSubmit({
      ...values,
      projectName: normalizeProjectName(values.projectName),
      subtasks: pendingSubtasks,
    } as TaskFormValuesWithSubtasks);
  };
  const titleId = useId();
  const prefix = useId();
  const [timeUnit, setTimeUnit] = useState<"hours" | "days">("hours");
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [pendingSubtasks, setPendingSubtasks] = useState<PendingSubtask[]>([]);
  const [newSubName, setNewSubName] = useState("");
  const [newSubDeadline, setNewSubDeadline] = useState("");
  const [newSubAdmin, setNewSubAdmin] = useState("");

  const defaultValues = useMemo(
    () => initialValues as unknown as TaskFormValues,
    [initialValues],
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    trigger,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "projectedWork",
  });

  const watchedAdmins = useWatch({ control, name: "admins" }) ?? [];
  const isClientRequest = useWatch({ control, name: "isClientRequest" }) ?? false;
  const estimatedHoursStr = useWatch({ control, name: "estimatedHours" }) ?? "";
  const estimatedDaysStr = useWatch({ control, name: "estimatedDays" }) ?? "";
  const estimateError = errors.estimatedHours?.message || errors.estimatedDays?.message;
  const projectedWorkWatch = useWatch({ control, name: "projectedWork" }) ?? [];

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => {
      reset(defaultValues);
      setStep(0);
      setPendingSubtasks([]);
      setNewSubName("");
      setNewSubDeadline("");
      setNewSubAdmin(props.currentUserName ?? admins[0]?.name ?? "");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open, reset, defaultValues]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const daysNum = parseFloat(initialValues.estimatedDays || "0") || 0;
    const timeoutId = window.setTimeout(() => {
      setTimeUnit(daysNum > 0 ? "days" : "hours");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open, initialValues.estimatedDays]);

  useEffect(() => {
    if (!open) return;
    // Petite gestion d'a11y: mettre le focus sur le premier champ.
    const t = window.setTimeout(() => {
      const el = document.getElementById(`${prefix}-project-name`) as HTMLInputElement | null;
      el?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, prefix]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  const adminsError = errors.admins?.message;
  const clientNameError = errors.clientName?.message;
  const stepFields: Record<0 | 1 | 2, Array<keyof TaskFormValues>> = {
    0: ["projectName", "company", "domain", "priority", "admins"],
    1: ["deadline", "estimatedHours", "estimatedDays"],
    2: [],
  };

  const handleNextStep = async () => {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((prev) => Math.min(prev + 1, 2) as 0 | 1 | 2);
  };

  const handleStepKeyDown = (event: ReactKeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || step >= 2) return;
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    if (tagName === "textarea") return;
    event.preventDefault();
    void handleNextStep();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/30 px-4 py-8 backdrop-blur-md"
          onClick={onCancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-3xl rounded-3xl border border-[var(--line)] bg-[var(--surface)]/95 p-6 shadow-[0_34px_90px_rgba(20,17,13,0.2)] ring-1 ring-[color:var(--line)]/60 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id={titleId} className="ui-heading text-2xl font-semibold text-[var(--foreground)]">
                {editingTaskId ? "Modifier la tâche" : "Nouvelle tâche"}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                className="ui-transition rounded-full border border-transparent p-1.5 text-[color:var(--foreground)]/55 hover:border-[var(--line)] hover:bg-[var(--surface-soft)] hover:text-[color:var(--foreground)]/75"
              >
                <span className="sr-only">Fermer</span>
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} onKeyDown={handleStepKeyDown}>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 0, label: "Infos", icon: Info },
                  { id: 1, label: "Planning", icon: CalendarDays },
                  { id: 2, label: "Details", icon: FilePenLine },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStep(s.id as 0 | 1 | 2)}
                    aria-current={step === s.id ? "step" : undefined}
                    className={[
                      "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition",
                      step === s.id
                        ? "border-[var(--line-strong)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/75"
                        : "border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/65 hover:bg-[var(--surface-soft)]",
                    ].join(" ")}
                  >
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-[color:var(--foreground)]/55">
                Étape {step + 1} sur 3. Appuyez sur Entrée pour continuer.
              </p>

              {step === 0 && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--foreground)]/75">
                    <Building2 className="h-3.5 w-3.5 text-[color:var(--foreground)]/50" />
                    Nom du projet
                    <RequiredStar />
                  </label>
                  <input
                    id={`${prefix}-project-name`}
                    type="text"
                    {...register("projectName")}
                    className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:outline-none"
                    placeholder="Ex : Lancement gamme Nutrition"
                  />
                  {errors.projectName?.message && (
                    <p className="text-[11px] text-red-600">{errors.projectName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${prefix}-company`} className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--foreground)]/75">
                    <Building2 className="h-3.5 w-3.5 text-[color:var(--foreground)]/50" />
                    Société concernée
                    <RequiredStar />
                  </label>
                  <select
                    id={`${prefix}-company`}
                    {...register("company")}
                    className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:outline-none"
                  >
                    {companies.map((company) => (
                      <option key={company.id} value={company.name}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  {errors.company?.message && (
                    <p className="text-[11px] text-red-600">{errors.company.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${prefix}-domain`} className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--foreground)]/75">
                    <Info className="h-3.5 w-3.5 text-[color:var(--foreground)]/50" />
                    Domaine
                    <RequiredStar />
                  </label>
                  <select
                    id={`${prefix}-domain`}
                    {...register("domain")}
                    className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:outline-none"
                  >
                    {domains.map((domain) => (
                      <option key={domain.id} value={domain.name}>
                        {domain.name}
                      </option>
                    ))}
                  </select>
                  {errors.domain?.message && (
                    <p className="text-[11px] text-red-600">{errors.domain.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${prefix}-priority`} className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--foreground)]/75">
                    <Flag className="h-3.5 w-3.5 text-rose-500" />
                    Priorité
                    <RequiredStar />
                  </label>
                  <select
                    id={`${prefix}-priority`}
                    {...register("priority")}
                    className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:outline-none"
                  >
                    {priorities.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  {errors.priority?.message && (
                    <p className="text-[11px] text-red-600">{errors.priority.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--foreground)]/75">
                    <Users className="h-3.5 w-3.5 text-sky-500" />
                    Admin(s) responsable(s)
                    <RequiredStar />
                  </label>
                  <fieldset className="grid grid-cols-2 gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)] shadow-sm">
                    <legend className="sr-only">Admins responsables</legend>
                    {admins.map((adminOption) => {
                      const admin = adminOption.name;
                      const checked = watchedAdmins.includes(admin as AdminId);
                      return (
                        <label
                          key={admin}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 transition ${
                            checked ? "bg-[var(--accent)] text-[#fffdf9]" : "hover:bg-[var(--surface-soft)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...watchedAdmins, admin]
                                : watchedAdmins.filter((a) => a !== admin);
                              setValue("admins", next as AdminId[], { shouldValidate: true });
                            }}
                            className="h-3 w-3 rounded border-[var(--line-strong)] text-[color:var(--foreground)]/50 focus:ring-[var(--ring)]"
                          />
                          <span>{admin}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                  {adminsError && <p className="text-[11px] text-red-600">{adminsError}</p>}
                </div>
              </div>}

              {step === 1 && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor={`${prefix}-deadline`} className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--foreground)]/75">
                    <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
                    Échéance
                    <span className="ml-0.5 font-normal text-[color:var(--foreground)]/45">(optionnelle)</span>
                  </label>
                  <input
                    id={`${prefix}-deadline`}
                    type="date"
                    {...register("deadline")}
                    className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:outline-none"
                  />
                  {errors.deadline?.message && <p className="text-[11px] text-red-600">{errors.deadline.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${prefix}-budget`} className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--foreground)]/75">
                    <Info className="h-3.5 w-3.5 text-emerald-500" />
                    Budget
                  </label>
                  <input
                    id={`${prefix}-budget`}
                    type="text"
                    {...register("budget")}
                    className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:outline-none"
                    placeholder="Ex : 5 000 €"
                  />
                </div>
              </div>}

              {step === 1 && <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
                <div className="space-y-1.5">
                  <label htmlFor={`${prefix}-estimated-time`} className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--foreground)]/75">
                    <Clock3 className="h-3.5 w-3.5 text-[color:var(--foreground)]/50" />
                    Temps estimé (total)
                    <span className="ml-0.5 font-normal text-[color:var(--foreground)]/45">(optionnel)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const current = timeUnit === "hours" ? estimatedHoursStr : estimatedDaysStr;
                          setValue("estimatedHours", current, { shouldValidate: true });
                          setValue("estimatedDays", "", { shouldValidate: true });
                          setTimeUnit("hours");
                        }}
                        className={[
                          "rounded-md px-2 py-1 text-xs font-medium transition",
                          timeUnit === "hours" ? "bg-[var(--accent)] text-[#fffdf9]" : "text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]",
                        ].join(" ")}
                      >
                        h
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const current = timeUnit === "hours" ? estimatedHoursStr : estimatedDaysStr;
                          setValue("estimatedDays", current, { shouldValidate: true });
                          setValue("estimatedHours", "", { shouldValidate: true });
                          setTimeUnit("days");
                        }}
                        className={[
                          "rounded-md px-2 py-1 text-xs font-medium transition",
                          timeUnit === "days" ? "bg-[var(--accent)] text-[#fffdf9]" : "text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]",
                        ].join(" ")}
                      >
                        j
                      </button>
                    </div>

                    <input
                      id={`${prefix}-estimated-time`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={timeUnit === "hours" ? estimatedHoursStr : estimatedDaysStr}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (timeUnit === "hours") {
                          setValue("estimatedHours", v, { shouldValidate: true });
                          setValue("estimatedDays", "", { shouldValidate: true });
                        } else {
                          setValue("estimatedDays", v, { shouldValidate: true });
                          setValue("estimatedHours", "", { shouldValidate: true });
                        }
                      }}
                      className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:outline-none"
                      placeholder={timeUnit === "hours" ? "Ex : 3.5" : "Ex : 2"}
                    />
                  </div>

                  <input type="hidden" {...register("estimatedHours")} />
                  <input type="hidden" {...register("estimatedDays")} />

                  {estimateError && <p className="text-[11px] text-red-600">{estimateError}</p>}
                </div>
              </div>}

              {step === 1 && <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <h3 className="text-sm font-semibold text-[color:var(--foreground)]/85">Jours au calendrier</h3>
                <p className="text-xs text-[color:var(--foreground)]/65">
                  Bloquez des journées (durée en heures) ou des créneaux précis (début / fin) — visibles dans la vue Calendrier.
                </p>

                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const row = projectedWorkWatch[index] as
                      | { date?: string; hours?: number; startTime?: string; endTime?: string }
                      | undefined;
                    const isDayOnly = !row?.startTime && !row?.endTime;
                    return (
                      <div key={field.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)]/80 bg-[var(--surface)] p-2">
                        <input
                          type="date"
                          {...register(`projectedWork.${index}.date` as const)}
                          className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                        />
                        {isDayOnly ? (
                          <>
                            <label className="inline-flex items-center gap-1 text-xs text-[color:var(--foreground)]/65">
                              Durée (h)
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                {...register(`projectedWork.${index}.hours` as const, { valueAsNumber: true })}
                                className="ui-focus-ring w-20 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-sm"
                              />
                            </label>
                            <span className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-[10px] font-medium text-[color:var(--foreground)]/75">
                              Journée
                            </span>
                          </>
                        ) : (
                          <>
                            <select
                              {...register(`projectedWork.${index}.startTime` as const)}
                              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                            >
                              {HALF_HOUR_OPTIONS.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                            <span className="text-xs text-[color:var(--foreground)]/55">→</span>
                            <select
                              {...register(`projectedWork.${index}.endTime` as const)}
                              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                            >
                              {HALF_HOUR_OPTIONS.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                            <span className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-xs text-[color:var(--foreground)]/70">
                              Créneau
                            </span>
                            <input type="hidden" {...register(`projectedWork.${index}.hours` as const, { valueAsNumber: true })} />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3 w-3" />
                          Retirer
                        </button>
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        append({
                          date: format(new Date(), "yyyy-MM-dd"),
                          hours: 4,
                        })
                      }
                      className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)]/75 shadow-sm hover:bg-[var(--surface-soft)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Jour (durée)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        append({
                          date: format(new Date(), "yyyy-MM-dd"),
                          startTime: "08:00",
                          endTime: "10:00",
                          hours: 2,
                        })
                      }
                      className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)]/75 shadow-sm hover:bg-[var(--surface-soft)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Créneau (début / fin)
                    </button>
                  </div>
                </div>
              </div>}

              {step === 2 && <div className="space-y-2 rounded-lg bg-[var(--surface-soft)] p-3">
                <label className="flex items-center gap-2 text-xs font-medium text-[color:var(--foreground)]/75">
                  <input
                    type="checkbox"
                    {...register("isClientRequest")}
                    className="h-3.5 w-3.5 rounded border-[var(--line-strong)] text-[color:var(--foreground)]/50 focus:ring-[var(--ring)]"
                  />
                  <UserRound className="h-3.5 w-3.5 text-[color:var(--foreground)]/50" />
                  Demande d&apos;un client
                </label>

                {isClientRequest && (
                  <div className="mt-2 space-y-1.5">
                    <label htmlFor={`${prefix}-client-name`} className="text-xs font-medium text-[color:var(--foreground)]/75">Nom du client</label>
                    <input
                      id={`${prefix}-client-name`}
                      type="text"
                      {...register("clientName")}
                      className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:outline-none"
                      placeholder="Ex : Coopérative de l&apos;Ouest"
                    />
                    {clientNameError && <p className="text-[11px] text-red-600">{clientNameError}</p>}
                  </div>
                )}
              </div>}

              {step === 2 && <div className="space-y-1.5">
                <label htmlFor={`${prefix}-description`} className="text-xs font-medium text-[color:var(--foreground)]/75">Description du projet</label>
                <textarea
                  id={`${prefix}-description`}
                  {...register("description")}
                  className="ui-focus-ring min-h-[80px] w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:outline-none"
                  placeholder="Notes, objectifs, canaux, contraintes, etc."
                />
              </div>}

              {/* ── Étapes / sous-tâches (step 2 uniquement, pas à l'édition) ── */}
              {step === 2 && !editingTaskId && (
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-[color:var(--foreground)]/50" />
                    <p className="text-xs font-semibold text-[var(--foreground)]">
                      Étapes / Sous-tâches
                      {pendingSubtasks.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-[color:var(--foreground)]/12 px-1.5 py-0.5 text-[10px] text-[color:var(--foreground)]/85">
                          {pendingSubtasks.length}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Liste des étapes déjà ajoutées */}
                  {pendingSubtasks.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs">
                      <span className="flex-1 font-medium text-[var(--foreground)] truncate">{sub.name}</span>
                      {sub.deadline && (
                        <span className="text-[color:var(--foreground)]/55 shrink-0">{sub.deadline}</span>
                      )}
                      <span className="text-[color:var(--foreground)]/55 shrink-0">{sub.adminName.split(" ")[0]}</span>
                      <button
                        type="button"
                        onClick={() => setPendingSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                        className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Formulaire d'ajout d'étape */}
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        e.stopPropagation();
                        if (!newSubName.trim()) return;
                        setPendingSubtasks((prev) => [...prev, {
                          name: normalizeProjectName(newSubName),
                          deadline: newSubDeadline,
                          adminName: newSubAdmin || admins[0]?.name || "",
                        }]);
                        setNewSubName("");
                        setNewSubDeadline("");
                      }}
                      placeholder="Nom de l'étape (Entrée pour ajouter)"
                      className="ui-focus-ring flex-1 min-w-[160px] rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="date"
                      value={newSubDeadline}
                      onChange={(e) => setNewSubDeadline(e.target.value)}
                      className="ui-focus-ring w-36 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs"
                    />
                    <select
                      value={newSubAdmin}
                      onChange={(e) => setNewSubAdmin(e.target.value)}
                      className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs"
                    >
                      {admins.map((a) => (
                        <option key={a.id} value={a.name}>{a.name.split(" ")[0]}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newSubName.trim()) return;
                        setPendingSubtasks((prev) => [...prev, {
                          name: normalizeProjectName(newSubName),
                          deadline: newSubDeadline,
                          adminName: newSubAdmin || admins[0]?.name || "",
                        }]);
                        setNewSubName("");
                        setNewSubDeadline("");
                      }}
                      className="ui-transition flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter
                    </button>
                  </div>
                  <p className="text-[10px] text-[color:var(--foreground)]/45">
                    Les étapes seront créées automatiquement avec ce projet comme parent.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="ui-transition inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]"
                >
                  <X className="h-3.5 w-3.5" />
                  Annuler
                </button>
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((prev) => Math.max(prev - 1, 0) as 0 | 1 | 2)}
                    className="ui-transition inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)]/80 hover:bg-[var(--surface-soft)]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                  </button>
                )}
                {step < 2 ? (
                  <button
                    type="button"
                    onClick={() => void handleNextStep()}
                    className="ui-transition inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)]"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Continuer
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="ui-transition inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)] disabled:opacity-70"
                  >
                    <Check className="h-4 w-4" />
                    {editingTaskId ? "Enregistrer" : "Créer la tâche"}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

