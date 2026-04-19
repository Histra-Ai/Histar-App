import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-10 px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-500">
          Histra
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-zinc-950">
          Week 1 foundation is live.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-zinc-600">
          The app is wired for the first turn loop: Supabase persistence, one
          server route, and a test screen for running turns against the model.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          href="/turn"
        >
          Open Turn Tester
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          href="/games"
        >
          View Saved Games
        </Link>
        <a
          className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          href="https://supabase.com/dashboard"
          rel="noreferrer"
          target="_blank"
        >
          Open Supabase
        </a>
      </div>
    </main>
  );
}
