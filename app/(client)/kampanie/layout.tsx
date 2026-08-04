import { auth } from "@/lib/auth";
import AdminBackButton from "./AdminBackButton";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;


  if (user?.role === "admin") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdminBackButton />
        <main className="min-w-0">{children}</main>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <main className="min-w-0">{children}</main>
    </div>
  );
}
