# 📡 Broadband Admin CRM

A clean, modern CRM for broadband/ISP businesses — built with React + Vite + Tailwind CSS + Supabase.

## Features

| Module | What it does |
|---|---|
| 📊 Dashboard | Stats overview, today's wishes, recent tickets |
| 👥 Customers | Add, edit, view, delete customers with full profile |
| 💳 Invoices | Create invoices, track payments, mark paid/overdue, print preview |
| 🎫 Tickets | Service request management with priority & status |
| 🎂 Wishes | Birthday & Anniversary reminders with ready-to-send messages |

---

## 🚀 Setup Guide

### Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project**
3. Go to **SQL Editor** and paste the contents of `supabase-schema.sql`
4. Click **Run** — this creates all tables and sample data

### Step 2 — Get your API Keys

1. In your Supabase project → **Settings → API**
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key

### Step 3 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4 — Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173/broadband-crm](http://localhost:5173/broadband-crm)

---

## 🌐 Deploy to GitHub Pages (Free Hosting)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/broadband-crm.git
git push -u origin main
```

### Step 2 — Add Secrets to GitHub

1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Add two secrets:
   - `VITE_SUPABASE_URL` → your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key

### Step 3 — Enable GitHub Pages

1. Go to **Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. Push any commit to `main` — the site will build and deploy automatically

Your CRM will be live at:
```
https://YOUR_USERNAME.github.io/broadband-crm/
```

---

## 🗄️ Database Schema

```
customers       → id, name, phone, email, address, plan, plan_amount,
                  connection_date, plan_due_date, status, birthday, anniversary

invoices        → id, customer_id, invoice_number, amount, due_date,
                  paid_date, status, notes

tickets         → id, customer_id, title, description, category,
                  priority, status, resolved_at
```

---

## 🛠 Tech Stack

- **React 18** + **Vite 5**
- **Tailwind CSS 3**
- **Supabase** (Postgres + REST API)
- **React Router 6**
- **date-fns** for date calculations
- **lucide-react** for icons
- **react-hot-toast** for notifications

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Layout.jsx       # Main layout wrapper
│   ├── Sidebar.jsx      # Navigation sidebar
│   └── Modal.jsx        # Reusable modal
├── pages/
│   ├── Dashboard.jsx    # Overview & widgets
│   ├── Customers.jsx    # Customer CRUD
│   ├── Invoices.jsx     # Billing management
│   ├── Tickets.jsx      # Service requests
│   └── Wishes.jsx       # Birthday & anniversary
├── lib/
│   └── supabase.js      # Supabase client
├── App.jsx              # Routes
├── main.jsx             # Entry point
└── index.css            # Global styles
```

---

Built with ❤️ for broadband operators.
