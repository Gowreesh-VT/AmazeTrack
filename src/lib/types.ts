export type TransactionType = "expense" | "income" | "debt" | "credit";

export type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  subcategoryId?: string;
  note?: string;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  splitRequestId?: string;
  recurringTemplateId?: string;
  location?: string;
  locationCoords?: { lat: number; lng: number };
  isAmortized?: boolean;
  amortizeMonths?: number;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Budget = {
  id: string;
  name: string;
  categoryIds: string[];
  limitAmount: number;
  periodType: "weekly" | "monthly" | "semester" | "custom";
  periodStart: string;
  periodEnd: string;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
};

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  billingDay: number;
  active: boolean;
  nextBillingAt?: string;
};

export type RecurringTemplate = {
  id: string;
  amount: number;
  categoryId: string;
  note: string;
  frequency: "weekly" | "monthly";
  startDate: string; // YYYY-MM-DD
  active: boolean;
  account?: string;
};

export type AllowanceConfig = {
  amount: number;
  cycleType: "monthly" | "semester";
  cycleStart: string;
  cycleEnd?: string;
};

export type DriveData = {
  version: 1;
  userId: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  subscriptions: Subscription[];
  recurringTemplates?: RecurringTemplate[];
  allowanceConfig?: AllowanceConfig;
  lastAggregateContribution?: {
    periodStart: string;
    byCategory: Record<string, number>;
  } | null;
  preferences?: {
    currency: string;
    currencySymbol: string;
    locale?: string;
    monthlyBudget?: number;
    onboardingComplete?: boolean;
  };
  updatedAt: string;
};

const now = "2026-01-01T00:00:00.000Z";

export const DEFAULT_HOSTEL_CATEGORIES: Category[] = [
  { id: "mess-canteen", name: "Mess/Canteen", color: "#2563eb", icon: "utensils", createdAt: now, updatedAt: now },
  { id: "auto-ola", name: "Auto/Ola", color: "#16a34a", icon: "car", createdAt: now, updatedAt: now },
  { id: "laundry", name: "Laundry", color: "#0891b2", icon: "shirt", createdAt: now, updatedAt: now },
  { id: "stationery-xerox", name: "Stationery/Xerox", color: "#7c3aed", icon: "copy", createdAt: now, updatedAt: now },
  { id: "outings", name: "Outings", color: "#db2777", icon: "map", createdAt: now, updatedAt: now },
  { id: "subscriptions", name: "Subscriptions", color: "#ea580c", icon: "repeat", createdAt: now, updatedAt: now },
  { id: "recharge-data", name: "Recharge/Data", color: "#4f46e5", icon: "wifi", createdAt: now, updatedAt: now },
  { id: "room-essentials", name: "Room Essentials", color: "#0f766e", icon: "home", createdAt: now, updatedAt: now },
  { id: "other", name: "Other", color: "#52525b", icon: "circle", createdAt: now, updatedAt: now },
];

export function emptyDriveData(userId: string): DriveData {
  const timestamp = new Date().toISOString();

  return {
    version: 1,
    userId,
    categories: DEFAULT_HOSTEL_CATEGORIES.map((category) => ({
      ...category,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    transactions: [],
    budgets: [],
    goals: [],
    subscriptions: [],
    recurringTemplates: [],
    preferences: {
      currency: "INR",
      currencySymbol: "₹",
    },
    updatedAt: timestamp,
  };
}
