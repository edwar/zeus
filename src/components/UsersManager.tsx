"use client";

import { useId, useState } from "react";
import type { Dict } from "@/i18n";
import { type Role, useCreateUser, useSetBanned, useSetRole, useUsers } from "@/hooks/useUsers";
import { ROLES, normalizeRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function UsersManager({ t, currentUserId }: { t: Dict; currentUserId: string }) {
  const u = t.app.users;
  const uid = useId().replace(/:/g, "");
  const { data: users, isPending, isError, refetch } = useUsers();
  const create = useCreateUser();
  const setRole = useSetRole();
  const setBanned = useSetBanned();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [formError, setFormError] = useState("");

  const fail = () => setMsg(u.actionError);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setFormError("");
    create.mutate(
      {
        name: String(f.get("name")).trim(),
        email: String(f.get("email")).trim(),
        password: String(f.get("password")),
        role: f.get("role") as Role,
      },
      {
        onSuccess: () => {
          form.reset();
          setOpen(false);
          setMsg(u.created);
        },
        onError: (err) => setFormError((err as { code?: string }).code === "USER_ALREADY_EXISTS" ? u.exists : u.actionError),
      },
    );
  }

  return (
    <div className="pb">
      <header className="ph">
        <div>
          <h1 className="ph__title">{u.title}</h1>
          <p className="ph__sub">{u.sub}</p>
        </div>
        <div className="ph__tools">
          <Button type="button" size="sm" aria-haspopup="dialog" onClick={() => { setFormError(""); setOpen(true); }}>
            {u.add}
          </Button>
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite">{msg}</p>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormError(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{u.add}</DialogTitle>
            <DialogDescription>{u.sub}</DialogDescription>
          </DialogHeader>
        <form className="uform uform--modal" onSubmit={onCreate}>
          <div className="field">
            <label htmlFor={`${uid}n`}>{u.name}</label>
            <Input id={`${uid}n`} name="name" autoComplete="off" required />
          </div>
          <div className="field">
            <label htmlFor={`${uid}e`}>{u.email}</label>
            <Input id={`${uid}e`} name="email" type="email" autoComplete="off" required />
          </div>
          <div className="field">
            <label htmlFor={`${uid}p`}>{u.password}</label>
            <Input id={`${uid}p`} name="password" type="text" minLength={8} autoComplete="off" required aria-describedby={`${uid}h`} />
            <span id={`${uid}h`} className="uform__hint">{u.passwordHint}</span>
          </div>
          <div className="field">
            <label htmlFor={`${uid}r`}>{u.role}</label>
            <Select name="role" defaultValue="equipo">
              <SelectTrigger id={`${uid}r`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{u.roles[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="field-error" role="alert" hidden={!formError}>{formError}</p>
          <div className="uform__actions">
            <Button type="submit" size="sm" disabled={create.isPending}>
              {create.isPending ? u.creating : u.create}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>{u.cancel}</Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>

      {isPending ? (
        <p role="status">{u.loading}</p>
      ) : isError ? (
        <p role="alert">
          {u.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{u.retry}</Button>
        </p>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{u.name}</th>
                <th scope="col">{u.email}</th>
                <th scope="col">{u.role}</th>
                <th scope="col">{u.status}</th>
                <th scope="col">{u.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const self = user.id === currentUserId;
                const role: Role = normalizeRole(user.role);
                const label = `${user.name}`;
                return (
                  <tr key={user.id}>
                    <th scope="row">{user.name}{self && <span className="pc__flag">{u.you}</span>}</th>
                    <td>{user.email}</td>
                    <td>
                      <Select
                        value={role}
                        disabled={self || setRole.isPending}
                        onValueChange={(v) => setRole.mutate({ userId: user.id, role: v as Role }, { onError: fail })}
                      >
                        <SelectTrigger size="sm" aria-label={`${u.role}: ${label}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{u.roles[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td>{user.banned ? u.disabled : u.active}</td>
                    <td>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`${user.banned ? u.enable : u.disable}: ${label}`}
                        disabled={self || setBanned.isPending}
                        onClick={() => setBanned.mutate({ userId: user.id, banned: !user.banned }, { onError: fail })}
                      >
                        {user.banned ? u.enable : u.disable}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
