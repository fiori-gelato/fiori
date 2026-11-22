/**
 * Starting vault. Seeded from the July 2026 investor information pack so the
 * app is immediately usable: the loan, the Phase 1 capital purchases, the
 * supplier, the pricing formats and the launch plan are already in place.
 */

import type {
  CapitalPlanItem,
  ExpenseCategory,
  ProductionBatch,
  Recipe,
  Vault,
} from "./types";
import { uid } from "./format";

export function seedVault(): Vault {
  const supplier = { id: "sup_italy", name: "Italian supplier (via SA agent)" };
  const packSupplier = { id: "sup_pack", name: "Packaging supplier" };

  const tub500 = {
    id: "inv_tub500",
    name: "500ml tub + lid",
    category: "packaging" as const,
    unit: "unit" as const,
    unitCost: 0,
    stock: 0,
    reorderLevel: 200,
    supplierId: packSupplier.id,
  };
  const cup175 = {
    id: "inv_cup175",
    name: "175ml cup + lid",
    category: "packaging" as const,
    unit: "unit" as const,
    unitCost: 3.5,
    stock: 0,
    reorderLevel: 200,
    supplierId: packSupplier.id,
  };
  const base = {
    id: "inv_base",
    name: "Gelato base & flavour paste",
    category: "ingredient" as const,
    unit: "L" as const,
    /* No opening stock or cost is invented — both come from your purchases. */
    unitCost: 0,
    stock: 0,
    reorderLevel: 15,
    supplierId: supplier.id,
  };
  const finished500 = {
    id: "inv_fin500",
    name: "Finished 500ml tub",
    category: "finished" as const,
    unit: "unit" as const,
    unitCost: 0,
    stock: 0,
    reorderLevel: 0,
    recipeId: "rec_house",
  };

  const recipe = {
    id: "rec_house",
    name: "House 500ml tub",
    version: 1,
    stage: "trial" as const,
    yieldKg: 5,
    outputItemId: finished500.id,
    outputUnits: 16,
    unitType: "500ml tub",
    ingredients: [
      { itemId: base.id, qty: 8 },
      { itemId: tub500.id, qty: 16 },
    ],
    notes:
      "Batch freezer produces roughly 8 litres of finished gelato per hour of practical output.",
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const plan: [string, number, ExpenseCategory][] = [
    ["Cubo 2 batch freezer", 170000, "equipment"],
    ["Storage freezer (500L)", 11000, "equipment"],
    ["Blender", 8000, "equipment"],
    ["Small equipment", 14000, "equipment"],
    ["Packaging R&D", 5000, "packaging"],
    ["First production packaging", 7000, "packaging"],
    ["Recipe development ingredients", 12000, "ingredients"],
    ["First production ingredients", 20000, "ingredients"],
    ["Halaal certification (MJC)", 5000, "certification"],
    ["Branding", 5000, "branding"],
    ["Display stand & freezer", 38000, "equipment"],
    ["Contingency", 25000, "other"],
  ];
  const capitalPlan: CapitalPlanItem[] = plan.map(([name, amount, category]) => ({
    id: uid("cp_"),
    name,
    amount,
    category,
  }));

  return {
    version: 1,
    settings: {
      businessName: "Fiori Gelato",
      loanCapital: 320000,
      theme: "system",
    },
    capitalPlan,
    suppliers: [supplier, packSupplier],
    inventory: [base, tub500, cup175, finished500],
    purchases: [],
    recipes: [recipe],
    packaging: [],
    production: [],
    sales: [],
    customers: [],
    expenses: [],
    capital: [
      {
        id: uid("cap_"),
        date: new Date().toISOString().slice(0, 10),
        kind: "loan" as const,
        amount: 320000,
        note: "Phase 1 capital loan",
      },
    ],
    equipment: [],
    surveys: [],
    plan: [
      { id: uid("pl_"), date: `${new Date().getFullYear()}-08-15`, title: "Procure and install the machine; supplier training", kind: "milestone" as const },
      { id: uid("pl_"), date: `${new Date().getFullYear()}-09-15`, title: "Develop packaging, flavours and brand; send out samples", kind: "milestone" as const },
      { id: uid("pl_"), date: `${new Date().getFullYear()}-10-15`, title: "First production runs; approach stockists", kind: "production" as const },
      { id: uid("pl_"), date: `${new Date().getFullYear()}-11-15`, title: "Trial a market; Uber Eats listing goes live", kind: "event" as const },
      { id: uid("pl_"), date: `${new Date().getFullYear()}-12-05`, title: "Launch into markets and begin selling across channels", kind: "milestone" as const },
    ],
    docs: [],
    docCategories: [],
    adjustments: [],
  };
}

/**
 * Brings a vault opened from anywhere — this device, the cloud, a backup
 * file — up to the shape the app expects now.
 *
 * Collections added since a vault was last written come from the seed; the
 * stored ones always win. Records are then nudged forward where a field has
 * been renamed. Fields the app no longer reads are left alone rather than
 * stripped: an old recipe's photographs and tasting notes are no longer
 * shown, but they are still in the file, so nothing is thrown away by an
 * upgrade.
 */
export function adopt(data: Partial<Vault> | Vault): Vault {
  const v: Vault = { ...seedVault(), ...(data as Vault) };

  type OldRecipe = { yieldLitres?: number };
  v.recipes = (v.recipes ?? []).map((r) => {
    if (typeof r.yieldKg === "number") return r;
    /* Yield used to be counted in litres. The number is carried across as
       it stands rather than converted, because no density is known — it
       only drives the cost-per-kg reading, never a cost per unit. */
    const litres = (r as Recipe & OldRecipe).yieldLitres;
    return { ...r, yieldKg: typeof litres === "number" ? litres : 0 };
  });

  type OldBatch = { litresProduced?: number };
  v.production = (v.production ?? []).map((b) => {
    if (typeof b.kgProduced === "number") return b;
    const litres = (b as ProductionBatch & OldBatch).litresProduced;
    return { ...b, kgProduced: typeof litres === "number" ? litres : 0 };
  });

  return v;
}
