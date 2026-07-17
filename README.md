# Stock & Recall Portal

A login-based portal to track Amazon & Flipkart recall/return stock, manage inventory,
and view reports. Built with Next.js, Supabase (auth + database), and deployed on Vercel.
Visual style is inspired by apple.com/in/store — black top nav, white space, rounded cards.

## What's inside

- **Login / signup** — email + password via Supabase Auth. The very first account created
  automatically becomes the **admin**.
- **Roles** — `admin`, `staff`, `viewer`, enforced both in the UI and at the database level
  (Row Level Security), so a viewer literally cannot write data even if they try the API directly.
- **Stock** — product list with SKU, category, current stock, reorder level, quick +/- adjustments.
- **Recalls** — upload a CSV export from Amazon Seller Central or Flipkart Seller Hub, map its
  columns (every seller's export has different column names, so you map them once per upload),
  then track each item through Pending → Received → Restocked → Written off. Marking an item
  "Restocked" automatically adds those units back into the matching product's stock and logs it.
- **Reports** — stock by category, recall volume over time, status breakdown, CSV export.
- **Users** (admin only) — promote/demote teammates between admin / staff / viewer.

## 1. Create your Supabase project (free tier is fine)

1. Go to https://supabase.com → sign up / sign in → **New project**.
2. Pick a name (e.g. `stock-recall-portal`), a database password (save it somewhere safe),
   and a region close to you (e.g. Mumbai/Singapore for India).
3. Wait ~2 minutes for it to provision.
4. In the left sidebar go to **SQL Editor** → **New query**, paste the entire contents of
   `supabase/schema.sql` from this project, and click **Run**. This creates all tables,
   roles, and security policies in one go.
5. Go to **Project Settings → API**. You'll need two values for the next step:
   - **Project URL**
   - **anon public** key

## 2. Configure environment variables

In the project folder, copy `.env.example` to `.env.local` and fill in the two values above:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 3. Run it locally (optional but recommended first)

You'll need [Node.js 18+](https://nodejs.org) installed.

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll land on the login screen. Create an account; because it's
the first account in the project, it's automatically made **admin**. From there, go to the
**Users** page to invite/promote teammates once they sign up.

> By default Supabase requires email confirmation before sign-in works. For quick internal
> testing you can turn this off: **Authentication → Providers → Email → uncheck "Confirm email"**.
> For a real team, leave it on and just use real email addresses.

## 4. Deploy to Vercel

1. Push this project to a GitHub repository (create a new repo, then `git init`, `git add .`,
   `git commit -m "init"`, `git remote add origin <your repo url>`, `git push -u origin main`).
2. Go to https://vercel.com → sign up / sign in (you can use your GitHub account) →
   **Add New… → Project** → import the repo you just pushed.
3. In the **Environment Variables** step, add the same two variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. In about a minute you'll get a live URL like
   `https://stock-recall-portal.vercel.app`.
5. Share that URL with your team — each person creates their own login, and you (the first/admin
   account) set their role from the **Users** page.

Every time you push to the `main` branch on GitHub, Vercel redeploys automatically.

## Uploading recall/return files

1. Export your returns/recall report as **CSV** from Amazon Seller Central (Reports → Returns)
   or Flipkart Seller Hub (Returns → Export).
2. On the **Recalls** page, pick the marketplace, choose the file.
3. Map each of your file's columns to: SKU, product name, quantity (required), and optionally
   reason, order ID, return date. The portal tries to guess these automatically from common
   column names — double check before importing.
4. Click **Import**. Items start as "Pending"; move them to "Restocked" once you've physically
   checked the stock back in — this updates your live stock count automatically.

## Notes on scope / next steps

- CSV mapping is manual-per-upload rather than a live Amazon/Flipkart API integration, matching
  the "bulk CSV upload" approach — this avoids needing seller API approval, which can take
  Amazon/Flipkart weeks and requires a registered business.
- If you later want live API sync instead of CSV upload, that's a bigger addition (Amazon SP-API
  and Flipkart's seller API both need business verification) — happy to help wire that in once
  you have API access approved.
- Currently there's no email-invite flow — teammates sign themselves up and you promote their
  role from the Users page. If you want proper invite-only signup, that's a small addition.
