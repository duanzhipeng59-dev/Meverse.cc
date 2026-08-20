create policy "deny client access to admin users"
  on public.admin_users for all to anon, authenticated
  using (false) with check (false);

create policy "deny client access to admin order notes"
  on public.admin_order_notes for all to anon, authenticated
  using (false) with check (false);

create policy "deny client access to admin audit logs"
  on public.admin_audit_logs for all to anon, authenticated
  using (false) with check (false);

create index if not exists admin_order_notes_actor_idx
  on public.admin_order_notes (actor_user_id, created_at desc);
