"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { formatPhone, whatsappUrl } from "@/lib/phone";
import { money } from "@/lib/format";
import { installFee } from "@/lib/install-fee";
import { type Team, useDeleteTeam, useSaveTeam, useTeam, useTeams, useTeamUsers } from "@/hooks/useTeams";
import { LocationPicker, type PickedLocation } from "@/components/LocationPicker";
import { PhoneField } from "@/components/PhoneField";
import { EmptyState } from "@/components/EmptyState";
import { KanbanSquare, MapPin } from "lucide-react";
import { useCan } from "@/components/RoleContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/Loading";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ConfirmProvider";

export function TeamsList({ t, lang }: { t: Dict; lang: Locale }) {
  const m = t.app.teams;
  const { data, isPending, isError, refetch } = useTeams();
  const rows = data ?? [];
  return (
    <div className="pb">
      <header className="ph">
        <div>
          <h1 className="ph__title">{m.title}</h1>
          <p className="ph__sub">{m.sub}</p>
        </div>
        <div className="ph__tools"><Button asChild><Link href={`/${lang}/app/teams/new`}>{m.add}</Link></Button></div>
      </header>
      {isPending ? <Loading label={m.loading} variant="table" cols={8} />
        : isError ? <p role="alert">{m.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{m.retry}</Button></p>
        : rows.length === 0 ? (
          <EmptyState icon={MapPin} title={t.app.empty.teams.title} description={t.app.empty.teams.desc}>
            <Button asChild><Link href={`/${lang}/app/teams/new`}>{t.app.empty.teams.action}</Link></Button>
          </EmptyState>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">{m.name}</th><th scope="col">{m.base}</th><th scope="col" className="num">{m.radius}</th>
                  <th scope="col" className="num">{m.load}</th><th scope="col">{m.fee}</th><th scope="col" className="num">{m.members}</th><th scope="col">{m.contact}</th><th scope="col">{m.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => <Row key={r.id} r={r} t={t} lang={lang} />)}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function Row({ r, t, lang }: { r: Team; t: Dict; lang: Locale }) {
  const m = t.app.teams;
  const full = r.maxActive != null && r.load >= r.maxActive;
  return (
    <tr>
      <th scope="row"><Link href={`/${lang}/app/teams/${r.id}`}>{r.name}</Link><span className="tbl__sub">{r.contactName}</span></th>
      <td>{r.city}{r.department ? `, ${r.department}` : ""}</td>
      <td className="num">{r.radiusKm} km</td>
      <td className="num">{r.load}{r.maxActive != null ? ` / ${r.maxActive}` : ""} {full && <Badge variant="warning">{m.full}</Badge>}</td>
      <td>{r.installBase == null && r.installPerKwp == null ? "—" : <>{r.installBase != null && money(lang, r.installBase, "COP")}{r.installBase != null && r.installPerKwp != null && " + "}{r.installPerKwp != null && `${money(lang, r.installPerKwp, "COP")}/kWp`}</>}</td>
      <td className="num">{r.memberCount}</td>
      <td>{whatsappUrl(r.phone) ? <a href={whatsappUrl(r.phone)!} target="_blank" rel="noopener noreferrer">{formatPhone(r.phone)}</a> : r.phone}</td>
      <td><Badge variant={r.active ? "default" : "secondary"}>{r.active ? m.active : m.inactive}</Badge></td>
    </tr>
  );
}

/** Alta y edición de un equipo: contacto, base en el mapa y hasta dónde se desplaza. */
export function TeamForm({ t, lang, id }: { t: Dict; lang: Locale; id?: string }) {
  const m = t.app.teams;
  const uid = useId().replace(/:/g, "");
  const router = useRouter();
  const canDelete = useCan("teams.delete");
  const existing = useTeam(id ?? "");
  const save = useSaveTeam(id);
  const del = useDeleteTeam();
  const confirm = useConfirm();
  const [error, setError] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lon: number } | null | undefined>(undefined);
  const [place, setPlace] = useState<{ city?: string; department?: string }>({});
  const users = useTeamUsers();
  const [picked, setPicked] = useState<string[] | null>(null); // integrantes elegidos; null = los que ya tiene
  const [rates, setRates] = useState<{ base: string; perKwp: string } | null>(null); // null = las que ya tiene
  const back = <Link href={`/${lang}/app/teams`} className="back">← {m.back}</Link>;

  const onPick = useCallback((p: PickedLocation) => {
    setLoc({ lat: p.lat, lon: p.lon });
    setPlace({ city: p.municipality ?? undefined, department: p.department ?? undefined });
  }, []);

  if (id && existing.isPending) return <div className="pb">{back}<Loading label={m.loading} variant="detail" /></div>;
  if (id && (existing.isError || !existing.data)) return <div className="pb">{back}<p role="alert">{m.notFound}</p></div>;
  const e = id ? existing.data : undefined;
  const members = picked ?? e?.members.map((u) => u.id) ?? [];
  const base = rates?.base ?? (e?.installBase != null ? String(e.installBase) : "");
  const perKwp = rates?.perKwp ?? (e?.installPerKwp != null ? String(e.installPerKwp) : "");
  const example = installFee({ installBase: base === "" ? null : Number(base), installPerKwp: perKwp === "" ? null : Number(perKwp) }, 5);
  const point = loc === undefined ? (e ? { lat: e.lat, lon: e.lon } : null) : loc;

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim();
    if (!point) { setError(m.errors.location); return; }
    setError("");
    save.mutate(
      {
        name: str("name"), contactName: str("contactName"), phone: str("phone"), email: str("email") || null,
        city: str("city"), department: str("department") || null, lat: point.lat, lon: point.lon,
        radiusKm: Number(str("radiusKm")), maxActive: str("maxActive") ? Number(str("maxActive")) : null,
        installBase: base === "" ? null : Number(base), installPerKwp: perKwp === "" ? null : Number(perKwp), memberIds: members,
        active: f.get("active") === "on", notes: str("notes") || null,
      },
      { onSuccess: () => router.push(`/${lang}/app/teams`), onError: (err) => setError((err as Error & { code?: string }).code === "unknown_user" ? m.errors.unknown_user : m.errors.generic) },
    );
  }

  async function onDelete() {
    if (!id || !(await confirm({ message: m.confirmDelete, confirmLabel: m.delete }))) return;
    del.mutate(id, {
      onSuccess: () => router.push(`/${lang}/app/teams`),
      onError: (err) => setError((err as Error & { code?: string }).code === "in_use" ? m.errors.in_use : m.errors.generic),
    });
  }

  return (
    <div className="pb">
      {back}
      <header className="ph"><div><h1 className="ph__title">{e ? e.name : m.newTitle}</h1><p className="ph__sub">{m.formSub}</p></div></header>
      <form className="panel kform" onSubmit={onSubmit}>
        <div className="kform__grid kform__grid--team">
          <div className="field"><label htmlFor={`${uid}n`}>{m.name}</label><Input id={`${uid}n`} name="name" required minLength={2} maxLength={100} defaultValue={e?.name} placeholder={m.namePh} /></div>
          <div className="field"><label htmlFor={`${uid}c`}>{m.contactName}</label><Input id={`${uid}c`} name="contactName" required minLength={2} maxLength={100} defaultValue={e?.contactName} autoComplete="off" /></div>
          <PhoneField name="phone" label={m.phone} countryLabel={m.country} lang={lang} defaultValue={e?.phone} />
          <div className="field"><label htmlFor={`${uid}e`}>{m.email}</label><Input id={`${uid}e`} name="email" type="email" maxLength={160} defaultValue={e?.email ?? ""} /></div>
        </div>

        <div className="field field--wide">
          <span className="label">{m.baseTitle}</span>
          <LocationPicker t={t} lat={e?.lat ?? null} lon={e?.lon ?? null} hint={e?.city ?? ""} place={[place.city ?? e?.city, place.department ?? e?.department].filter(Boolean).join(", ")} sun={null} onPick={onPick} showSun={false} />
        </div>

        <div className="kform__grid kform__grid--team">
          <div className="field"><label htmlFor={`${uid}ci`}>{m.city}</label><Input key={place.city ?? "c"} id={`${uid}ci`} name="city" required minLength={2} maxLength={80} defaultValue={place.city ?? e?.city} /></div>
          <div className="field"><label htmlFor={`${uid}d`}>{m.department}</label><Input key={place.department ?? "d"} id={`${uid}d`} name="department" maxLength={80} defaultValue={place.department ?? e?.department ?? ""} /></div>
          <div className="field"><label htmlFor={`${uid}r`}>{m.radius} (km)</label><Input id={`${uid}r`} name="radiusKm" type="number" required min={5} max={500} defaultValue={e?.radiusKm ?? 100} /><span className="wiz__hint">{m.radiusHint}</span></div>
          <div className="field"><label htmlFor={`${uid}m`}>{m.maxActive}</label><Input id={`${uid}m`} name="maxActive" type="number" min={1} max={100} defaultValue={e?.maxActive ?? ""} /><span className="wiz__hint">{m.maxActiveHint}</span></div>
        </div>
        <fieldset className="kform__sub">
          <legend>{m.installTitle}</legend>
          <div className="kform__grid kform__grid--team">
            <div className="field"><label htmlFor={`${uid}fb`}>{m.installBase}</label><MoneyInput id={`${uid}fb`} value={base} onValueChange={(v) => setRates({ base: v, perKwp })} /><span className="wiz__hint">{m.installBaseHint}</span></div>
            <div className="field"><label htmlFor={`${uid}fk`}>{m.installPerKwp}</label><MoneyInput id={`${uid}fk`} value={perKwp} onValueChange={(v) => setRates({ base, perKwp: v })} /><span className="wiz__hint">{m.installPerKwpHint}</span></div>
          </div>
          <p className="wiz__hint" aria-live="polite">{example == null ? m.noFee : m.feeExample.replace("{fee}", money(lang, example, "COP"))}</p>
        </fieldset>

        <fieldset className="kform__sub">
          <legend>{m.membersTitle}</legend>
          <p className="wiz__hint">{m.membersHint}</p>
          {users.isPending ? <Loading label={m.loading} rows={3} /> : (users.data ?? []).length === 0 ? <p className="panel__meta">{m.noUsers}</p> : (
            <ul className="members">
              {(users.data ?? []).map((u) => (
                <li key={u.id}>
                  <label>
                    <input type="checkbox" checked={members.includes(u.id)} onChange={(ev) => setPicked(ev.target.checked ? [...members, u.id] : members.filter((x) => x !== u.id))} />
                    <span><strong>{u.name}</strong><small>{u.email}</small></span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="field"><label htmlFor={`${uid}no`}>{m.notes}</label><Textarea id={`${uid}no`} name="notes" rows={3} maxLength={1000} defaultValue={e?.notes ?? ""} placeholder={m.notesPh} /></div>
        <label className="wiz__consent"><input type="checkbox" name="active" defaultChecked={e?.active ?? true} /> {m.activeHint}</label>

        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="flow__actions">
          <Button type="submit" disabled={save.isPending}>{save.isPending ? m.saving : m.save}</Button>
          <Button asChild variant="outline"><Link href={`/${lang}/app/teams`}>{m.cancel}</Link></Button>
          {id && canDelete && <Button type="button" variant="outline" disabled={del.isPending} onClick={onDelete}>{m.delete}</Button>}
        </div>
      </form>

      {e && (
        <section className="panel">
          <h2 className="panel__title">{m.projects}</h2>
          {e.projects.length === 0 ? <EmptyState compact icon={KanbanSquare} title={t.app.empty.teamProjects.title} description={t.app.empty.teamProjects.desc} /> : (
            <ul className="tasks">
              {e.projects.map((p) => (
                <li key={p.id}><time>{t.app.stages[p.stage as keyof typeof t.app.stages]}</time><div><strong><Link href={`/${lang}/app/projects/${p.id}`}>{p.name}</Link></strong><span>{p.town}</span></div></li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
