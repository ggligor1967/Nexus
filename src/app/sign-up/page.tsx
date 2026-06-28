import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main>
      <AuthForm mode="sign-up" nextPath={next ?? "/dashboard"} />
      <section className="card">
        <p>
          Already have an account? <Link href="/login">Log in.</Link>
        </p>
      </section>
    </main>
  );
}
