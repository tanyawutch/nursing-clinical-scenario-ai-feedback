# Nursing Clinical Scenario AI Feedback

Scenario-based learning platform for nursing students. The current demo focuses
on an acute lower back pain case with step-by-step practice, rule-based keyword
checking, and Gemini-supported feedback.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7 with PostgreSQL
- Supabase Auth
- Google Gemini API for semantic evaluation

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Required environment variables:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
GOOGLE_AI_API_KEY="YOUR_GOOGLE_AI_API_KEY"
```

Generate Prisma Client:

```bash
npx prisma generate
```

Seed the demo scenario after the database is available:

```bash
npx prisma db seed
```

## Development

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run build
```

`npm run build` requires the environment variables above. Placeholder values are
enough for type/build checks, but real values are required for login, database
access, seeding, and AI feedback.

## Current Content Status

- Demo-ready: Acute Lower Back Pain
- Planned curriculum: 12 scenario slots across 6 clinical modules
- Pending work: validated clinical content, rubrics, tests, audit logging, and
  production deployment setup
