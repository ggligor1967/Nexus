import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main>
      <section className="card error">
        <h1>404 — Not found</h1>
        <p>The requested resource does not exist or is not accessible to this user.</p>
        <Link className="button" href="/dashboard">
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
