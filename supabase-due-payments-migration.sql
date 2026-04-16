-- Run this after supabase-schema.sql

alter table invoices
  add column if not exists payment_link_id text,
  add column if not exists payment_link_url text,
  add column if not exists payment_id text,
  add column if not exists source text default 'manual';

alter table invoices
  drop constraint if exists invoices_source_check;

alter table invoices
  add constraint invoices_source_check
  check (source in ('manual', 'razorpay'));
