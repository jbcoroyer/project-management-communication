"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { ColumnId, Task } from "../../lib/types";
import { defaultColumns } from "../../lib/types";
import { celebrateTaskDone } from "../../lib/celebrateTaskDone";

type Props = {
  tasks: Task[];
  onMoveTask: (taskId: string, column: ColumnId) => void;
  onPlanning?: (task: Task) => void;
};

function DraggableCard(props: { task: Task; onPlanning?: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.task.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        "cursor-grab rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm active:cursor-grabbing",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
    >
      <p className="font-semibold text-[var(--foreground)]">{props.task.projectName}</p>
      {props.task.eventCategory ? (
        <p className="mt-0.5 text-[10px] text-[color:var(--foreground)]/50">{props.task.eventCategory}</p>
      ) : null}
      {props.task.deadline ? (
        <p className="mt-1 text-[10px] text-[color:var(--foreground)]/45">Échéance {props.task.deadline}</p>
      ) : null}
      {props.onPlanning ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onPlanning?.(props.task);
          }}
          className="mt-2 text-[10px] font-semibold text-[var(--accent)] hover:underline"
        >
          Planning
        </button>
      ) : null}
    </div>
  );
}

function DroppableCol(props: { id: string; title: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: props.id });
  return (
    <div
      ref={setNodeRef}
      className={[
        "flex min-w-[200px] flex-1 flex-col rounded-2xl border bg-[var(--surface)]/80",
        isOver ? "border-[var(--line-strong)] bg-[var(--surface-soft)]" : "border-[var(--line)]",
      ].join(" ")}
    >
      <div className="border-b border-[var(--line)] px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--foreground)]/55">
          {props.title}
        </p>
      </div>
      <div className="flex flex-col gap-2 p-2 min-h-[120px]">{props.children}</div>
    </div>
  );
}

export default function EventDetailKanban(props: Props) {
  const { tasks, onMoveTask, onPlanning } = props;
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of defaultColumns) map[col] = [];
    for (const t of tasks) {
      const col = defaultColumns.includes(t.column as (typeof defaultColumns)[number])
        ? t.column
        : defaultColumns[0];
      map[col].push(t);
    }
    return map;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const col = e.over?.id;
    if (!col || !activeId) return;
    const task = tasks.find((t) => t.id === activeId);
    if (!task || task.column === col) return;
    const wasDone = task.column === "Terminé";
    onMoveTask(activeId, col as ColumnId);
    if (col === "Terminé" && !wasDone) celebrateTaskDone();
  };

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-[color:var(--foreground)]/55">
        Aucune tâche. Utilisez le formulaire ci-dessus ou un modèle à la création.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {defaultColumns.map((col) => (
          <DroppableCol key={col} id={col} title={col}>
            {(byColumn[col] ?? []).map((t) => (
              <DraggableCard key={t.id} task={t} onPlanning={onPlanning} />
            ))}
          </DroppableCol>
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm shadow-lg">
            {activeTask.projectName}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
