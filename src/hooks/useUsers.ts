"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

import type { Role } from "@/lib/roles";
export type { Role };
const key = ["users"] as const;

type Result<T> = { data: T | null; error: { code?: string; message?: string } | null };

/** Better Auth devuelve { data, error }; TanStack Query espera que se lance el error. */
async function unwrap<T>(p: Promise<Result<T>>): Promise<T> {
  const { data, error } = await p;
  if (error || data === null) throw Object.assign(new Error(error?.message ?? "Error"), { code: error?.code });
  return data;
}

export function useUsers() {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const { users } = await unwrap(
        authClient.admin.listUsers({ query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" } }),
      );
      return users;
    },
  });
}

function useUserMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: key }) });
}

export const useCreateUser = () =>
  useUserMutation((v: { name: string; email: string; password: string; role: Role }) =>
    unwrap(authClient.admin.createUser(v)),
  );

export const useSetRole = () =>
  useUserMutation((v: { userId: string; role: Role }) => unwrap(authClient.admin.setRole(v)));

export const useSetBanned = () =>
  useUserMutation((v: { userId: string; banned: boolean }) =>
    unwrap(v.banned ? authClient.admin.banUser({ userId: v.userId }) : authClient.admin.unbanUser({ userId: v.userId })),
  );

/** Un admin define una contraseña temporal para otra cuenta; la persona tendrá que cambiarla al ingresar. */
export const useResetPassword = () =>
  useUserMutation(async (v: { userId: string; password: string }) => {
    const res = await fetch(`/api/users/${v.userId}/password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: v.password }) });
    if (!res.ok) throw new Error(String(res.status));
  });
