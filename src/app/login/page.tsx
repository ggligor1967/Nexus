import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main>
      <AuthForm mode="login" nextPath={next ?? "/dashboard"} />
      <section className="card">
        <p>
          No account yet? <Link href="/sign-up">Create one.</Link>
        </p>
      </section>
    </main>
  );
}
