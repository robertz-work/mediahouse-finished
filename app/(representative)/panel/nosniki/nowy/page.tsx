"use client";

/**
 * /panel/nosniki/nowy — create a new media item.
 */

import { useRouter } from "next/navigation";
import MediaForm from "@/components/media/MediaForm";

export default function NewMediaPage() {
  const router = useRouter();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Dodaj nowy nośnik
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Nośnik zostanie przesłany do zatwierdzenia przez administratora.
      </p>
      <MediaForm
        mode="create"
        onSuccess={() => router.push("/panel/nosniki")}
      />
    </div>
  );
}
