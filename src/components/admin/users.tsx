"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { deleteUser, inviteUser, setUserRole, setUserSuspended, type ActionResult } from "@/app/admin/actions";
import { Pagination, Panel, buttonClass, inputClass } from "./ui";

export type UserRow = {
  id: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended";
  created_at: string;
  last_sign_in_at: string | null;
  images: number;
  isSelf: boolean;
};

type Filters = { q: string; role: string; status: string };

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Never";
}

export function UsersView({
  rows,
  total,
  page,
  hasNext,
  filters,
}: {
  rows: UserRow[];
  total: number;
  page: number;
  hasNext: boolean;
  filters: Filters;
}) {
  const hrefFor = (p: number) => {
    const params = new URLSearchParams({ ...filters, page: String(p) });
    [...params.entries()].forEach(([k, v]) => !v && params.delete(k));
    return `/admin/users?${params}`;
  };

  return (
    <div className="space-y-12">
      <InviteForm />

      <Panel title={`Users (${total.toLocaleString()})`}>
        <form method="get" className="flex flex-col gap-4 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search by email</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input name="q" defaultValue={filters.q} placeholder="Search by email" className={`${inputClass} w-full pl-12`} />
          </label>
          <select name="role" defaultValue={filters.role} aria-label="Role" className={`${inputClass}`}>
            <option value="">All roles</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </select>
          <select name="status" defaultValue={filters.status} aria-label="Status" className={`${inputClass}`}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button type="submit" className={buttonClass.primary}>
            Filter
          </button>
        </form>

        {rows.length === 0 ? (
          <p className="text-muted">No users match these filters.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <UserItem key={row.id} row={row} />
            ))}
          </ul>
        )}

        <Pagination page={page} hasNext={hasNext} hrefFor={hrefFor} />
      </Panel>
    </div>
  );
}

function UserItem({ row }: { row: UserRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (fn: () => Promise<ActionResult>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  };

  return (
    <li
      className="flex flex-col gap-4 rounded-card bg-surface px-4 py-4 lg:flex-row lg:items-center"
      aria-busy={pending}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-ink">{row.email || "No email"}</span>
          {row.isSelf && <span className="text-sm text-muted">(you)</span>}
          {row.role === "admin" && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Admin</span>
          )}
          {row.status === "suspended" && (
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">Suspended</span>
          )}
        </p>
        <p className="text-sm text-muted">
          Joined {formatDate(row.created_at)}. Last sign in {formatDate(row.last_sign_in_at)}. {row.images} saved image
          {row.images === 1 ? "" : "s"}.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {!row.isSelf && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className={buttonClass.secondary}
            onClick={() => act(() => setUserRole(row.id, row.role === "admin" ? "user" : "admin"))}
          >
            {row.role === "admin" ? "Remove admin" : "Make admin"}
          </button>
          <button
            type="button"
            disabled={pending}
            className={buttonClass.secondary}
            onClick={() =>
              act(
                () => setUserSuspended(row.id, row.status !== "suspended"),
                row.status === "suspended" ? undefined : `Suspend ${row.email}? They will be signed out and can not save images.`,
              )
            }
          >
            {row.status === "suspended" ? "Reactivate" : "Suspend"}
          </button>
          <button
            type="button"
            disabled={pending}
            className={buttonClass.danger}
            onClick={() =>
              act(() => deleteUser(row.id), `Delete ${row.email} and all of their saved images? This can not be undone.`)
            }
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <Panel title="Invite someone">
      <form
        className="flex flex-col gap-4 md:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const res = await inviteUser(email);
            setResult(res);
            if (res.ok) {
              setEmail("");
              router.refresh();
            }
          });
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          aria-label="Email to invite"
          className={`${inputClass} flex-1`}
        />
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Sending" : "Send invite"}
        </button>
      </form>
      {result && (
        <p className={`text-sm ${result.ok ? "text-success" : "text-danger"}`}>{result.ok ? result.message : result.error}</p>
      )}
    </Panel>
  );
}
