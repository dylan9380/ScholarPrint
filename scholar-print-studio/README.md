# Scholar Print Studio

Online ordering portal for a conference/academic poster printing business —
customer accounts, poster order form with file upload, and an order-status
dashboard. Built with Next.js + Supabase (auth, database, file storage).

## What's here

- `/` — marketing homepage
- `/signup`, `/login` — customer accounts
- `/order/new` — order form + poster file upload
- `/dashboard` — a logged-in customer's own orders and their status
- `supabase/schema.sql` — the database tables, security rules, and storage
  bucket, meant to be run once in Supabase

## One-time setup

### 1. Run the database schema
In your Supabase project, go to **SQL Editor > New query**, paste in the
entire contents of `supabase/schema.sql`, and run it. This creates:
- a `profiles` table (auto-filled when someone signs up)
- an `orders` table
- an `order_files` table
- a private `poster-files` storage bucket for uploaded posters
- security rules so customers can only ever see their own orders/files

### 2. Add your environment variables
Copy `.env.local.example` to `.env.local` and fill in your Supabase project's
URL and anon key (found in **Settings > API** in the Supabase dashboard).

### 3. Install and run locally
```bash
npm install
npm run dev
```
Visit http://localhost:3000, sign up, and place a test order to confirm it
all works end to end.

### 4. Push to GitHub
```bash
git init
git add .
git commit -m "Initial Scholar Print Studio site"
git branch -M main
git remote add origin https://github.com/<your-username>/scholar-print-studio.git
git push -u origin main
```

### 5. Deploy on Vercel
- Go to vercel.com, click **New Project**, and import the GitHub repo
- In the project's **Environment Variables** settings, add the same two
  variables from your `.env.local`
- Deploy — you'll get a live URL immediately (e.g.
  `scholar-print-studio.vercel.app`)
- Every time you `git push`, Vercel redeploys automatically

### 6. Make yourself an admin
Sign up on the live site once with your own email, then in the Supabase
**SQL Editor**, run:
```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```
This doesn't unlock anything in the UI yet (there's no admin screen built
yet — that's a natural next step) but it's what the database security rules
already check for.

## Not built yet (good next steps)
- An admin view to see all orders and change their status
- Email notifications when an order's status changes
- Stripe checkout on the order form
- Pricing calculation (currently orders are saved without a price — you'd
  fill `price_cents` in manually or wire up the same pricing logic from the
  quote calculator)
