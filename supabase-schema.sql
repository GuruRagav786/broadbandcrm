-- ============================================
-- Broadband CRM - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Customers
create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  email text,
  address text,
  plan text,
  plan_amount numeric(10,2),
  connection_date date,
  plan_due_date date,
  status text default 'active' check (status in ('active', 'suspended', 'disconnected')),
  birthday date,
  anniversary date,
  created_at timestamp with time zone default now()
);

-- 2. Invoices
create table if not exists invoices (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade,
  invoice_number text unique,
  amount numeric(10,2) not null,
  due_date date,
  paid_date date,
  status text default 'pending' check (status in ('pending', 'paid', 'overdue')),
  notes text,
  created_at timestamp with time zone default now()
);

-- 3. Tickets
create table if not exists tickets (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade,
  title text not null,
  description text,
  category text default 'other' check (category in ('connectivity', 'billing', 'hardware', 'relocation', 'speed', 'other')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  status text default 'open' check (status in ('open', 'in-progress', 'resolved', 'closed')),
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone
);

-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================
alter table customers enable row level security;
alter table invoices enable row level security;
alter table tickets enable row level security;

-- Allow all operations for anon key (for single-admin setup)
-- In production, replace with proper auth policies
create policy "Allow all for anon" on customers for all using (true) with check (true);
create policy "Allow all for anon" on invoices for all using (true) with check (true);
create policy "Allow all for anon" on tickets for all using (true) with check (true);

-- ============================================
-- Sample Data (optional - delete if not needed)
-- ============================================
insert into customers (name, phone, email, address, plan, plan_amount, connection_date, plan_due_date, status, birthday, anniversary)
values
  ('Rajesh Kumar', '9876543210', 'rajesh@email.com', '12 MG Road, Bangalore', '50 Mbps', 799, '2024-01-15', current_date + 5, 'active', '1990-04-05', '2015-11-20'),
  ('Priya Sharma', '9845001234', 'priya@email.com', '45 HSR Layout, Bangalore', '100 Mbps', 1299, '2024-02-01', current_date + 12, 'active', '1988-04-08', null),
  ('Mohammed Ali', '9900112233', null, '78 Koramangala, Bangalore', '25 Mbps', 499, '2023-12-01', current_date - 3, 'active', '1992-06-15', '2018-04-10'),
  ('Sunita Patel', '9123456789', 'sunita@email.com', '23 Indiranagar, Bangalore', '200 Mbps', 1799, '2024-03-01', current_date + 20, 'suspended', '1985-09-22', '2010-02-14');
