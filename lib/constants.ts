export const VOIVODESHIPS = [
  "dolnoslaskie",
  "kujawsko-pomorskie",
  "lubelskie",
  "lubuskie",
  "lodzkie",
  "malopolskie",
  "mazowieckie",
  "opolskie",
  "podkarpackie",
  "podlaskie",
  "pomorskie",
  "slaskie",
  "swietokrzyskie",
  "warminsko-mazurskie",
  "wielkopolskie",
  "zachodniopomorskie",
] as const;

export type VoivodeshipCode = (typeof VOIVODESHIPS)[number];

export const VOIVODESHIP_LABELS: Record<VoivodeshipCode, string> = {
  "dolnoslaskie": "dolnośląskie",
  "kujawsko-pomorskie": "kujawsko-pomorskie",
  "lubelskie": "lubelskie",
  "lubuskie": "lubuskie",
  "lodzkie": "łódzkie",
  "malopolskie": "małopolskie",
  "mazowieckie": "mazowieckie",
  "opolskie": "opolskie",
  "podkarpackie": "podkarpackie",
  "podlaskie": "podlaskie",
  "pomorskie": "pomorskie",
  "slaskie": "śląskie",
  "swietokrzyskie": "świętokrzyskie",
  "warminsko-mazurskie": "warmińsko-mazurskie",
  "wielkopolskie": "wielkopolskie",
  "zachodniopomorskie": "zachodniopomorskie",
};

export const ROAD_TYPES = [
  "krajowa",
  "wojewodzka",
  "powiatowa",
  "gminna",
  "ekspresowa",
  "autostrada",
  "miejska",
] as const;

export type RoadType = (typeof ROAD_TYPES)[number];

export const ROAD_TYPE_LABELS: Record<RoadType, string> = {
  krajowa: "droga krajowa",
  wojewodzka: "droga wojewódzka",
  powiatowa: "droga powiatowa",
  gminna: "droga gminna",
  ekspresowa: "droga ekspresowa",
  autostrada: "autostrada",
  miejska: "droga miejska",
};

export const EXPOSITION_TYPES = ["baner", "plakat"] as const;
export type ExpositionType = (typeof EXPOSITION_TYPES)[number];


export const PERIOD_DAYS = [30, 90, 180, 365] as const;
export type PeriodDays = (typeof PERIOD_DAYS)[number];

export const PERIOD_LABELS: Record<PeriodDays, string> = {
  30: "1 miesiąc",
  90: "3 miesiące",
  180: "6 miesięcy",
  365: "12 miesięcy",
};

export const PERIOD_PRICE_FIELD: Record<
  PeriodDays,
  "month1" | "month3" | "month6" | "month12"
> = {
  30: "month1",
  90: "month3",
  180: "month6",
  365: "month12",
};


export const MIN_BOOKING_LEAD_DAYS = 14;

export const CANCELLATION_CUTOFF_DAYS = 7;

export const DEFAULT_HOLD_TIMEOUT_MINUTES = 15;

export const VAT_RATE = 0.23;

export const ROLES = ["client", "representative", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const MEDIA_STATUSES = [
  "pending",
  "published",
  "rejected",
  "archived",
] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "pending_approval",
  "awaiting_payment",
  "paid",
  "active",
  "completed",
  "cancelled",
  "rejected",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const PAYMENT_METHODS = ["proforma", "p24", "payu"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  proforma: "Faktura pro forma",
  p24: "Przelewy24",
  payu: "PayU",
};

export const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PHOTOS_PER_MEDIA = 10;
export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
