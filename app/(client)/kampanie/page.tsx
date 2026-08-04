import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import * as campaignsRepo from "@/lib/db/campaignsRepo";
import * as notificationsRepo from "@/lib/db/notificationsRepo";
import { CAMPAIGN_STATUSES, type CampaignStatus } from "@/lib/constants";

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Szkic",
  pending_approval: "Oczekuje na akceptację",
  awaiting_payment: "Oczekuje na płatność",
  paid: "Opłacona",
  active: "Aktywna",
  completed: "Zakończona",
  cancelled: "Anulowana",
  rejected: "Odrzucona",
};

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_approval: "bg-amber-100 text-amber-800",
  awaiting_payment: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

export default async function MojeKampaniePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const statusFilter = params.status as CampaignStatus | undefined;

  let campaigns = await campaignsRepo.findByClient(session.user.id);


  campaigns.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );


  if (statusFilter && CAMPAIGN_STATUSES.includes(statusFilter as CampaignStatus)) {
    campaigns = campaigns.filter((c) => c.status === statusFilter);
  }


  const allCampaigns = await campaignsRepo.findByClient(session.user.id);
  const counts: Partial<Record<CampaignStatus, number>> = {};
  for (const c of allCampaigns) {
    counts[c.status] = (counts[c.status] || 0) + 1;
  }


  const activeCampaigns = allCampaigns.filter((c) => c.status === "active");
  const totalSpent = allCampaigns
    .filter((c) => ["paid", "active", "completed"].includes(c.status))
    .reduce((sum, c) => sum + c.totals.grandTotal, 0);
  const plannedCampaigns = allCampaigns.filter((c) =>
    ["pending_approval", "awaiting_payment", "paid"].includes(c.status)
  );
  const completedCampaigns = allCampaigns.filter((c) => c.status === "completed");


  const recentNotifications = await notificationsRepo.getByUserId(session.user.id, { limit: 5 });


  const user = session.user;
  const firstName = user?.name?.split(" ")[0] || "Użytkownik";

  return (
    <div>

      <div className="mb-8">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">Panel klienta</h1>

        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Witaj, {firstName}!
          </h2>
          <Link
            href="/kreator"
            className="rounded-full bg-pink-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-pink-700"
          >
            Stwórz kampanię
          </Link>
        </div>


        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

          <StatCard
            icon="campaigns"
            label="Aktywne kampanie"
            value={activeCampaigns.length.toString()}
          />


          <StatCard
            icon="spending"
            label="Wydatki całkowite"
            value={totalSpent.toLocaleString("pl-PL", {
              style: "currency",
              currency: "PLN",
            })}
          />

          <StatCard
            icon="calendar"
            label="Zaplanowane kampanie"
            value={plannedCampaigns.length.toString()}
          />


          <StatCard
            icon="checkmark"
            label="Zakończone kampanie"
            value={completedCampaigns.length.toString()}
          />
        </div>
      </div>


      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">

        <div className="lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Aktywne kampanie
          </h3>
          {activeCampaigns.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">
                Brak aktywnych kampanii w tym momencie.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </div>


        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Powiadomienia
          </h3>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            {recentNotifications.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                Brak powiadomień
              </p>
            ) : (
              recentNotifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  title={n.title}
                  description={n.message}
                  timestamp={formatTimeAgo(n.createdAt)}
                  campaignId={n.campaignId}
                  isRead={n.isRead}
                />
              ))
            )}
          </div>
        </div>
      </div>


      <div>
        <h2 className="mb-6 text-2xl font-bold text-slate-900">Moje kampanie</h2>


        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/kampanie"
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              !statusFilter
                ? "bg-pink-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Wszystkie ({allCampaigns.length})
          </Link>
          {CAMPAIGN_STATUSES.filter((s) => counts[s]).map((s) => (
            <Link
              key={s}
              href={`/kampanie?status=${s}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                statusFilter === s
                  ? "bg-pink-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {STATUS_LABELS[s]} ({counts[s]})
            </Link>
          ))}
        </div>


        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-slate-500">
              {statusFilter
                ? `Brak kampanii o statusie "${STATUS_LABELS[statusFilter]}".`
                : "Nie masz jeszcze żadnych kampanii."}
            </p>
            <Link
              href="/nosniki"
              className="mt-4 inline-block rounded-full bg-pink-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-pink-700"
            >
              Przeglądaj nośniki
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/kampanie/${c.id}`}
                className="block rounded-2xl border border-slate-200 p-5 transition hover:border-pink-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {c.name || `Kampania #${c.id.slice(0, 8)}`}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {c.items.length}{" "}
                      {c.items.length === 1
                        ? "nośnik"
                        : c.items.length < 5
                        ? "nośniki"
                        : "nośników"}
                      {" · "}
                      Ostatnia zmiana:{" "}
                      {new Date(c.updatedAt).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_COLORS[c.status]
                      }`}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {c.totals.grandTotal.toLocaleString("pl-PL", {
                        style: "currency",
                        currency: "PLN",
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: "campaigns" | "spending" | "calendar" | "checkmark";
  label: string;
  value: string;
}) {
  const getIcon = () => {
    switch (icon) {
      case "campaigns":
        return (
          <svg
            className="h-6 w-6 text-pink-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm6 12h4V4h-4v12z" />
          </svg>
        );
      case "spending":
        return (
          <svg
            className="h-6 w-6 text-pink-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.2 3.2.9-1.6-4.6-2.7V7z" />
          </svg>
        );
      case "calendar":
        return (
          <svg
            className="h-6 w-6 text-pink-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
          </svg>
        );
      case "checkmark":
        return (
          <svg
            className="h-6 w-6 text-pink-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
          {getIcon()}
        </div>
      </div>
    </div>
  );
}


function CampaignCard({
  campaign,
}: {
  campaign: Awaited<ReturnType<typeof campaignsRepo.findByClient>>[0];
}) {

  const starts = campaign.items.map((i) => new Date(i.startDate).getTime());
  const ends = campaign.items.map((i) => new Date(i.endDate).getTime());
  const startDate = new Date(Math.min(...starts));
  const endDate = new Date(Math.max(...ends));
  const now = new Date();
  const totalMs = endDate.getTime() - startDate.getTime();
  const elapsedMs = now.getTime() - startDate.getTime();
  const progress = totalMs > 0 ? Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100) : 0;

  return (
    <Link
      href={`/kampanie/${campaign.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-pink-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-slate-900">
            {campaign.name || `Kampania #${campaign.id.slice(0, 8)}`}
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            {startDate.toLocaleDateString("pl-PL")} -{" "}
            {endDate.toLocaleDateString("pl-PL")}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-pink-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {Math.round(progress)}% ukończenia
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-semibold text-slate-900">
            {campaign.totals.grandTotal.toLocaleString("pl-PL", {
              style: "currency",
              currency: "PLN",
            })}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              STATUS_COLORS[campaign.status]
            }`}
          >
            {STATUS_LABELS[campaign.status]}
          </span>
        </div>
      </div>
    </Link>
  );
}


function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "teraz";
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  return `${days} dn. temu`;
}


function NotificationItem({
  title,
  description,
  timestamp,
  campaignId,
  isRead,
}: {
  title: string;
  description: string;
  timestamp: string;
  campaignId?: string;
  isRead?: boolean;
}) {
  const content = (
    <div className={`flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 ${!isRead ? "bg-pink-50/30 -mx-2 px-2 rounded-lg" : ""}`}>
      <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${!isRead ? "bg-pink-600" : "bg-slate-300"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
        <p className="mt-1 text-xs text-slate-400">{timestamp}</p>
      </div>
    </div>
  );

  if (campaignId) {
    return <Link href={`/kampanie/${campaignId}`}>{content}</Link>;
  }
  return content;
}
