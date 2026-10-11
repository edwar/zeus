import Link from "next/link";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { QuoteStatus } from "@/lib/quote-flow";

const STEPS = ["new", "contacted", "confirmed", "approved"] as const;

/** Paso a paso de la solicitud: dónde está, qué sigue y qué hacer ahora. */
export function QuoteSteps({ t, lang, status, projectId, fulfillment }: { t: Dict; lang: Locale; status: QuoteStatus; projectId: string | null; fulfillment: "install" | "kit_only" | "unknown" }) {
  const s = t.app.quotes.steps;
  if (status === "discarded") {
    return <section className="panel qsteps qsteps--off" role="status"><p>{s.discarded}</p></section>;
  }
  // "Cálculo confirmado" puede volver a "contactada"; el paso actual es siempre el del estado.
  const cur = STEPS.indexOf(status as (typeof STEPS)[number]);
  const done = status === "approved";
  return (
    <section className="panel qsteps" aria-labelledby="steps-h">
      <h2 id="steps-h" className="sr-only">{s.title}</h2>
      <ol className="qsteps__list">
        {STEPS.map((k, i) => {
          const state = done || i < cur ? "done" : i === cur ? "cur" : "todo";
          return (
            <li key={k} className={`qsteps__item qsteps__item--${state}`} aria-current={state === "cur" ? "step" : undefined}>
              <span className="qsteps__dot" aria-hidden="true">{state === "done" ? "✓" : i + 1}</span>
              <span className="qsteps__label">
                {s.labels[k]}
                <small>{state === "done" ? s.done : state === "cur" ? s.now : k === "approved" ? (fulfillment === "kit_only" ? s.approvedKitOnly : s.approvedNote) : s.next}</small>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="qsteps__todo"><strong>{done ? "" : `${s.now}: `}</strong>{status === "approved" && fulfillment === "kit_only" ? s.todoKitOnly : s.todo[status as (typeof STEPS)[number]]}{" "}
        {projectId && fulfillment !== "kit_only" && <Link href={`/${lang}/app/projects/${projectId}`}>{s.project} →</Link>}
      </p>
    </section>
  );
}
