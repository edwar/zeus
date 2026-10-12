"use client";

import Link from "next/link";
import { Loading } from "@/components/Loading";
import { DataPagination } from "@/components/DataPagination";
import { useMemo, useState } from "react";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, pointerWithin, rectIntersection, type CollisionDetection, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type KeyboardCoordinateGetter, type DragStartEvent } from "@dnd-kit/core";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { type Project, type Stage, stages } from "@/data/types";
import { useMoveProject, useProjects } from "@/hooks/useProjects";
import { EmptyState } from "@/components/EmptyState";
import { KanbanSquare } from "lucide-react";
import { useCan } from "@/components/RoleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Con el teclado, las flechas izquierda/derecha saltan a la etapa vecina (en vez de moverse unos píxeles). */
const stageCoordinates: KeyboardCoordinateGetter = (event, { context: { droppableRects, droppableContainers, collisionRect }, currentCoordinates }) => {
  const dir = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
  if (!dir || !collisionRect) return undefined;
  event.preventDefault();
  const cols = droppableContainers.getEnabled().map((c) => ({ id: c.id, rect: droppableRects.get(c.id) })).filter((c): c is { id: typeof c.id; rect: NonNullable<typeof c.rect> } => Boolean(c.rect)).sort((a, b) => a.rect.left - b.rect.left);
  const x = collisionRect.left + collisionRect.width / 2;
  const here = cols.findIndex((c) => x >= c.rect.left && x <= c.rect.left + c.rect.width);
  const next = cols[Math.max(0, Math.min(cols.length - 1, (here < 0 ? 0 : here) + dir))];
  return next ? { x: next.rect.left + next.rect.width / 2 - collisionRect.width / 2 + (currentCoordinates.x - collisionRect.left), y: currentCoordinates.y } : undefined;
};

// Con puntero/dedo manda dónde está el cursor; con teclado no hay cursor y se usa la intersección del rectángulo.
const collision: CollisionDetection = (args) => (args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args));

const PAGE_SIZES = [10, 25, 50, 100] as const;
const tabClass = "px-4 text-[0.9rem] font-bold text-(--ink-soft) hover:text-(--ink) data-[state=active]:bg-white data-[state=active]:text-(--ink) data-[state=active]:shadow-sm";

function CardBody({ p, lang, t, ...rest }: { p: Project; lang: Locale; t: Dict } & React.ComponentProps<"article">) {
  const a = t.app.projects;
  const date = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }).format(new Date(p.due));
  return (
    <article {...rest}>
      <div className="pc__head">
        <h3 className="pc__name"><Link href={`/${lang}/app/projects/${p.id}`} draggable={false}>{p.name}</Link></h3>
        {p.blocked && <span className="pc__flag">{a.blocked}</span>}
        {(p.openAlerts ?? 0) > 0 && <span className="pc__flag">{p.openAlerts} {a.alerts}</span>}
      </div>
      <p className="pc__meta">{p.client} · {p.town}{p.team ? ` · ${p.team}` : ""}</p>
      <div className="pc__bar" role="img" aria-label={`${p.progress}%`}><i style={{ width: `${p.progress}%` }} /></div>
      <dl className="pc__row">
        <div><dt>{a.size}</dt><dd>{p.kwp} {a.kw}</dd></div>
        <div><dt>{a.due}</dt><dd>{date}</dd></div>
      </dl>
    </article>
  );
}

const cardClass = (p: Project, extra = "") => `pc ${p.blocked ? "pc--blocked" : ""} ${extra}`;

/** Tarjeta que se arrastra con el puntero, el dedo o el teclado (espacio + flechas). */
export function ProjectCard({ p, lang, t, movable }: { p: Project; lang: Locale; t: Dict; movable: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id, disabled: !movable });
  // Quien no puede cambiar la etapa (rol equipo) ve la tarjeta sin arrastre.
  if (!movable) return <CardBody p={p} lang={lang} t={t} className={cardClass(p)} />;
  return <CardBody p={p} lang={lang} t={t} ref={setNodeRef} className={cardClass(p, `pc--drag ${isDragging ? "pc--ghost" : ""}`)} {...attributes} {...listeners} role="group" aria-label={p.name} />;
}

function Column({ stage, t, count, children }: { stage: Stage; t: Dict; count: number; children: React.ReactNode }) {
  const a = t.app.projects;
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section ref={setNodeRef} className={`kan__col kan__col--${stage} ${isOver ? "is-over" : ""}`} aria-labelledby={`h-${stage}`} role="listitem">
      <h2 id={`h-${stage}`} className="kan__head">
        <span>{t.app.stages[stage]}</span>
        <span className="kan__count" aria-label={`${count} ${a.count}`}>{count}</span>
      </h2>
      <div className="kan__cards">{children}</div>
    </section>
  );
}

export function ProjectBoard({ t, lang }: { t: Dict; lang: Locale }) {
  const a = t.app.projects;
  const canMove = useCan("projects.manage");
  const canQuotes = useCan("quotes");
  const { data, isPending, isError, refetch } = useProjects();
  const items = useMemo(() => data ?? [], [data]);
  const moveProject = useMoveProject();
  const [view, setView] = useState<"board" | "list">("board");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [msg, setMsg] = useState("");
  const [dragging, setDragging] = useState<Project | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: stageCoordinates }),
  );
  const stageName = (id: unknown) => t.app.stages[id as Stage] ?? String(id);
  const nameOf = (id: unknown) => items.find((i) => i.id === id)?.name ?? "";
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    if (over && (stages as string[]).includes(String(over.id))) move(String(active.id), over.id as Stage);
  };
  const onDragStart = ({ active }: DragStartEvent) => setDragging(items.find((i) => i.id === active.id) ?? null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((p) => `${p.name} ${p.town} ${p.client}`.toLowerCase().includes(s)) : items;
  }, [items, q]);

  // La vista Lista se pagina en el cliente; el tablero siempre muestra todo para poder arrastrar entre etapas.
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const listPage = Math.min(page, pages);
  const rows = filtered.slice((listPage - 1) * pageSize, listPage * pageSize);

  const move = (id: string, stage: Stage) => {
    const p = items.find((i) => i.id === id);
    if (!p || p.stage === stage) return;
    moveProject.mutate(
      { id, stage },
      {
        onSuccess: () => setMsg(`${p.name} ${a.colMoved} ${t.app.stages[stage]}`),
        onError: () => setMsg(a.moveError),
      },
    );
  };

  return (
    <Tabs value={view} onValueChange={(v) => setView(v as "board" | "list")} className="pb gap-(--s5)">
      <header className="ph">
        <div>
          <h1 className="ph__title">{a.title}</h1>
          <p className="ph__sub">{a.sub}</p>
        </div>
        <div className="ph__tools">
          <div className="field field--inline field--search">
            <label htmlFor="pq" className="sr-only">{a.search}</label>
            <Input id="pq" type="search" placeholder={a.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <TabsList aria-label={a.view} className="bg-(--mist) p-1 group-data-[orientation=horizontal]/tabs:h-11">
            <TabsTrigger value="board" className={tabClass}>{a.board}</TabsTrigger>
            <TabsTrigger value="list" className={tabClass}>{a.list}</TabsTrigger>
          </TabsList>
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite">{msg}</p>

      {isPending ? (
        <Loading label={a.loading} variant="board" />
      ) : isError ? (
        <p role="alert">
          {a.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{a.retry}</Button>
        </p>
      ) : items.length === 0 ? (
        canMove ? (
          <EmptyState icon={KanbanSquare} title={t.app.empty.projects.title} description={t.app.empty.projects.desc}>
            {canQuotes && <Button asChild variant="outline"><Link href={`/${lang}/app/quotes`}>{t.app.empty.projects.action}</Link></Button>}
          </EmptyState>
        ) : (
          <EmptyState icon={KanbanSquare} title={t.app.empty.projectsTeam.title} description={t.app.empty.projectsTeam.desc} />
        )
      ) : (
        <>
        <TabsContent value="board">
        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragging(null)}
          accessibility={{
            screenReaderInstructions: { draggable: a.dnd.instructions },
            announcements: {
              onDragStart: ({ active }) => `${a.dnd.pickup} ${nameOf(active.id)}.`,
              onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} ${a.dnd.over} ${stageName(over.id)}.` : undefined),
              onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} ${a.dnd.dropped} ${stageName(over.id)}.` : `${a.dnd.cancel}`),
              onDragCancel: () => a.dnd.cancel,
            },
          }}
        >
          <div className="kan" role="list">
            {stages.map((s) => {
              const col = filtered.filter((p) => p.stage === s);
              return (
                <Column key={s} stage={s} t={t} count={col.length}>
                  {col.length ? col.map((p) => <ProjectCard key={p.id} p={p} lang={lang} t={t} movable={canMove} />) : <p className="kan__empty">{a.empty}</p>}
                </Column>
              );
            })}
          </div>
          <DragOverlay>{dragging ? <CardBody p={dragging} lang={lang} t={t} className={cardClass(dragging, "pc--overlay")} /> : null}</DragOverlay>
        </DndContext>
        </TabsContent>
        <TabsContent value="list">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{t.app.nav.projects}</th>
                <th scope="col">{a.client}</th>
                <th scope="col">{a.site}</th>
                <th scope="col">{a.value}</th>
                <th scope="col" className="num">{a.size}</th>
                <th scope="col">{a.due}</th>
                <th scope="col">{a.team}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <th scope="row"><Link href={`/${lang}/app/projects/${p.id}`}>{p.name}</Link>{p.blocked && <span className="pc__flag">{a.blocked}</span>}</th>
                  <td>{p.client}</td>
                  <td>{p.town}</td>
                  <td><span className={`stage stage--${p.stage}`}>{t.app.stages[p.stage]}</span></td>
                  <td className="num">{p.kwp} {a.kw}</td>
                  <td>{new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }).format(new Date(p.due))}</td>
                  <td>{p.team ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <DataPagination
            page={listPage}
            pages={pages}
            total={filtered.length}
            pageSize={pageSize}
            pageSizes={PAGE_SIZES}
            lang={lang}
            labels={{ ...t.app.pager, pageOf: a.pageOf, nav: a.title }}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          />
        )}
        </TabsContent>
        </>
      )}
    </Tabs>
  );
}
