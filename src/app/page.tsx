import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="card stack">
        <h1>Omni-Intellect Nexus</h1>
        <p>
          Turn messy software ideas into structured, ethical, build-ready product plans.
        </p>
        <div className="row">
          <Link className="button" href="/dashboard">
            Open Dashboard
          </Link>
          <Link className="button secondary" href="/login">
            Log in
          </Link>
          <Link className="button secondary" href="/sign-up">
            Sign up
          </Link>
        </div>
      </section>
    </main>
  );
}
