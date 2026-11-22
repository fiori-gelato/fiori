"use client";

import { useId, useMemo, useState } from "react";
import { Beaker, FileDown, GitBranch, Lock, Plus, Trash2 } from "lucide-react";
import { useVault } from "../VaultProvider";
import { Card, Chip, Empty, Field, Modal, SectionTitle } from "../ui";
import { forkRecipe, recordTrial } from "@/lib/os/actions";
import {
  batchesAvailable,
  recipeCost,
  rememberedIngredients,
  rememberedUnitTypes,
} from "@/lib/os/calc";
import { ZAR, dateLabel, today, uid } from "@/lib/os/format";
import {
  STAGE_LABEL,
  type Recipe,
  type RecipeStage,
  type Unit,
} from "@/lib/os/types";

const STAGES: RecipeStage[] = ["idea", "trial", "testing", "approved", "archived"];
const UNITS: Unit[] = ["g", "kg", "ml", "L", "unit"];

export default function Recipes() {
  const { vault, update } = useVault();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RecipeStage | "all">("all");

  const recipes = useMemo(() => {
    if (!vault) return [];
    return [...vault.recipes]
      .filter((r) => filter === "all" || r.stage === filter)
      .sort((a, b) => a.name.localeCompare(b.name) || b.version - a.version);
  }, [vault, filter]);

  if (!vault) return null;
  const open = vault.recipes.find((r) => r.id === openId) ?? null;

  /* A new flavour starts with the last unit type used, since a kitchen
     settles on one or two formats and repeats them. */
  function addRecipe() {
    const id = uid("rec_");
    const lastUnitType = rememberedUnitTypes(vault!)[0];
    update((d) => {
      d.recipes.push({
        id,
        name: "",
        version: 1,
        stage: "idea",
        yieldKg: 5,
        outputUnits: 20,
        unitType: lastUnitType,
        ingredients: [],
        notes: "",
        createdAt: today(),
      });
    });
    setOpenId(id);
  }

  return (
    <div className="os-stack">
      <div className="os-flex">
        <div className="os-stages">
          <button
            className="os-stage-pip"
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All ({vault.recipes.length})
          </button>
          {STAGES.map((s) => (
            <button
              key={s}
              className="os-stage-pip"
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
            >
              {STAGE_LABEL[s]} ({vault.recipes.filter((r) => r.stage === s).length})
            </button>
          ))}
        </div>
        <button className="os-btn os-right" onClick={addRecipe}>
          <Plus size={15} /> New flavour
        </button>
      </div>

      {recipes.length ? (
        <div className="os-grid os-grid--3">
          {recipes.map((r) => {
            const cost = recipeCost(vault, r);
            return (
              <Card key={r.id}>
                <button
                  onClick={() => setOpenId(r.id)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    display: "block",
                    width: "100%",
                  }}
                >
                  <div className="os-flex" style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 16 }}>
                      {r.name || "Untitled flavour"}
                    </strong>
                    <span className="os-muted os-small">v{r.version}</span>
                    <span className="os-right">
                      <Chip tone={r.stage === "approved" ? "accent" : undefined}>
                        {STAGE_LABEL[r.stage]}
                      </Chip>
                    </span>
                  </div>
                  <div className="os-small os-muted" style={{ display: "grid", gap: 3 }}>
                    <span>
                      <strong>{ZAR(cost.costPerUnit, 2)}</strong> each
                      {r.unitType ? ` · ${r.unitType}` : ""}
                    </span>
                    <span>
                      Batch makes {r.outputUnits} from {r.yieldKg} kg ·{" "}
                      {ZAR(cost.costPerKg, 2)}/kg
                    </span>
                    <span>
                      {r.ingredients.length} ingredient
                      {r.ingredients.length === 1 ? "" : "s"} · stock supports{" "}
                      {batchesAvailable(vault, r)} batch
                      {batchesAvailable(vault, r) === 1 ? "" : "es"}
                    </span>
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty
          title="No flavours yet"
          body="A flavour is a name, what a batch yields, and what goes into it. The cost works itself out from your stock."
          action={
            <button className="os-btn" onClick={addRecipe}>
              <Plus size={15} /> New flavour
            </button>
          }
        />
      )}

      {open && <RecipeEditor recipe={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function RecipeEditor({
  recipe,
  onClose,
}: {
  recipe: Recipe;
  onClose: () => void;
}) {
  const { vault, update } = useVault();
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialBatches, setTrialBatches] = useState(1);
  const [trialNote, setTrialNote] = useState("");
  const unitListId = useId();
  const ingredientListId = useId();
  if (!vault) return null;

  const locked = !!recipe.lockedAt;
  const cost = recipeCost(vault, recipe);
  const known = rememberedIngredients(vault);
  const unitTypes = rememberedUnitTypes(vault);
  const versions = vault.recipes
    .filter((r) => r.name === recipe.name)
    .sort((a, b) => b.version - a.version);

  const set = (fn: (r: Recipe) => void) =>
    update((d) => {
      const r = d.recipes.find((x) => x.id === recipe.id);
      if (r) fn(r);
    });

  /**
   * One field for the ingredient, whether it is stocked or not.
   *
   * Typing a name that matches something in stock links the line to it, so
   * its cost follows what was paid. Anything else stays as typed, and
   * comes back as a suggestion on the next recipe with the unit and cost it
   * had here.
   */
  function nameIngredient(idx: number, typed: string) {
    const match = known.find(
      (k) => k.name.toLowerCase() === typed.trim().toLowerCase()
    );
    set((r) => {
      const l = r.ingredients[idx];
      if (match?.itemId) {
        l.itemId = match.itemId;
        l.name = undefined;
        l.unit = undefined;
        l.cost = undefined;
        return;
      }
      l.itemId = undefined;
      l.name = typed;
      l.unit = l.unit ?? match?.unit ?? "g";
      l.cost = l.cost ?? match?.cost ?? 0;
    });
  }

  return (
    <Modal title={recipe.name || "New flavour"} onClose={onClose}>
      <div className="os-stack">
        {locked && (
          <div className="os-locked-note">
            <Lock size={15} />
            Approved on {dateLabel(recipe.lockedAt!)} — read-only. Create a new
            version to make changes.
          </div>
        )}

        <datalist id={unitListId}>
          {unitTypes.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <datalist id={ingredientListId}>
          {known.map((k) => (
            <option key={k.name} value={k.name}>
              {k.itemId ? "in stock" : "used before"}
            </option>
          ))}
        </datalist>

        <div className="os-row os-no-print">
          <Field label="Name">
            <input
              className="os-input"
              value={recipe.name}
              placeholder="Pistachio"
              autoFocus={!recipe.name}
              disabled={locked}
              onChange={(e) => set((r) => void (r.name = e.target.value))}
            />
          </Field>
          <Field label="Stage">
            <select
              className="os-select"
              value={recipe.stage}
              disabled={locked}
              onChange={(e) =>
                set((r) => void (r.stage = e.target.value as RecipeStage))
              }
            >
              {STAGES.filter((s) => s !== "approved" || locked).map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="os-row">
          <Field label="Yield (kg)">
            <input
              className="os-input"
              type="number"
              step="any"
              min="0"
              value={recipe.yieldKg}
              disabled={locked}
              onChange={(e) => set((r) => void (r.yieldKg = Number(e.target.value)))}
            />
          </Field>
          <Field label="Units per batch">
            <input
              className="os-input"
              type="number"
              min="0"
              value={recipe.outputUnits}
              disabled={locked}
              onChange={(e) =>
                set((r) => void (r.outputUnits = Number(e.target.value)))
              }
            />
          </Field>
          <Field label="Unit type">
            <input
              className="os-input"
              list={unitListId}
              value={recipe.unitType ?? ""}
              placeholder="120ml cup"
              disabled={locked}
              onChange={(e) => set((r) => void (r.unitType = e.target.value))}
            />
          </Field>
        </div>
        <p className="os-small os-muted" style={{ margin: "-4px 0 0" }}>
          Type a unit once and it is offered on every flavour after this one.
        </p>

        <SectionTitle>Ingredients</SectionTitle>
        {recipe.ingredients.map((line, idx) => {
          const item = line.itemId
            ? vault.inventory.find((i) => i.id === line.itemId)
            : undefined;
          const free = !line.itemId;
          const lineCost = free ? (line.cost ?? 0) : (item?.unitCost ?? 0) * line.qty;
          return (
            <Card key={idx} style={{ marginBottom: 10 }}>
              <div className="os-row">
                <Field label="Ingredient">
                  <input
                    className="os-input"
                    list={ingredientListId}
                    value={item ? item.name : (line.name ?? "")}
                    placeholder="Milk"
                    disabled={locked}
                    onChange={(e) => nameIngredient(idx, e.target.value)}
                  />
                </Field>

                <Field label={`How much${item ? ` (${item.unit})` : ""}`}>
                  <input
                    className="os-input"
                    type="number"
                    step="any"
                    min="0"
                    value={line.qty}
                    disabled={locked}
                    onChange={(e) =>
                      set((r) => void (r.ingredients[idx].qty = Number(e.target.value)))
                    }
                  />
                </Field>

                {free && (
                  <Field label="Unit">
                    <select
                      className="os-select"
                      value={line.unit ?? "g"}
                      disabled={locked}
                      onChange={(e) =>
                        set((r) => void (r.ingredients[idx].unit = e.target.value as Unit))
                      }
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {free ? (
                  <Field label="Cost of that (R)">
                    <input
                      className="os-input"
                      type="number"
                      step="any"
                      min="0"
                      value={line.cost ?? 0}
                      disabled={locked}
                      onChange={(e) =>
                        set((r) => void (r.ingredients[idx].cost = Number(e.target.value)))
                      }
                    />
                  </Field>
                ) : (
                  <Field label={`Cost per ${item?.unit ?? "unit"} (R)`}>
                    <input
                      className="os-input"
                      type="number"
                      step="any"
                      min="0"
                      value={item?.unitCost ?? 0}
                      disabled={locked || !item}
                      onChange={(e) =>
                        update((d) => {
                          const t = d.inventory.find((i) => i.id === line.itemId);
                          if (t) t.unitCost = Number(e.target.value);
                        })
                      }
                    />
                  </Field>
                )}

                <span className="os-shrink">
                  <button
                    className="os-btn os-btn--ghost os-btn--sm"
                    disabled={locked}
                    aria-label="Remove ingredient"
                    onClick={() => set((r) => void r.ingredients.splice(idx, 1))}
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
              <p className="os-small os-muted" style={{ margin: 0 }}>
                <strong>{ZAR(lineCost, 2)}</strong> a batch
                {item
                  ? " · follows what you paid for it"
                  : " · typed in, so not counted in stock"}
              </p>
            </Card>
          );
        })}
        {!locked && (
          <button
            className="os-btn os-btn--ghost os-btn--sm"
            onClick={() => set((r) => r.ingredients.push({ qty: 1, name: "", unit: "g", cost: 0 }))}
          >
            <Plus size={13} /> Add an ingredient
          </button>
        )}

        <Card>
          <div className="os-grid os-grid--3">
            <div>
              <div className="os-stat-label">Cost per batch</div>
              <div className="os-stat-value" style={{ fontSize: 21 }}>
                {ZAR(cost.totalCost, 2)}
              </div>
              <div className="os-stat-sub">{recipe.ingredients.length} ingredients</div>
            </div>
            <div>
              <div className="os-stat-label">Cost per {recipe.unitType || "unit"}</div>
              <div className="os-stat-value" style={{ fontSize: 21 }}>
                {ZAR(cost.costPerUnit, 2)}
              </div>
              <div className="os-stat-sub">{recipe.outputUnits} a batch</div>
            </div>
            <div>
              <div className="os-stat-label">Cost per kg</div>
              <div className="os-stat-value" style={{ fontSize: 21 }}>
                {ZAR(cost.costPerKg, 2)}
              </div>
              <div className="os-stat-sub">{recipe.yieldKg} kg a batch</div>
            </div>
          </div>
          {cost.missingPrice && (
            <p className="os-small" style={{ color: "var(--os-danger)", marginTop: 10 }}>
              Something here has no price yet, so this is lower than the truth.
            </p>
          )}
          <p className="os-small os-muted" style={{ marginTop: 10, marginBottom: 0 }}>
            What it sells for is decided on the sale itself, so there is no
            price to set here.
          </p>
        </Card>

        <Field label="Which finished stock a batch makes (optional)">
          <select
            className="os-select"
            value={recipe.outputItemId ?? ""}
            disabled={locked}
            onChange={(e) =>
              set((r) => void (r.outputItemId = e.target.value || undefined))
            }
          >
            <option value="">— not tracked in the freezer —</option>
            {vault.inventory
              .filter((i) => i.category === "finished")
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
          </select>
        </Field>

        <Field label="Notes">
          <textarea
            className="os-textarea"
            value={recipe.notes}
            disabled={locked}
            onChange={(e) => set((r) => void (r.notes = e.target.value))}
          />
        </Field>

        {versions.length > 1 && (
          <p className="os-small os-muted">
            Versions: {versions.map((v) => `v${v.version}`).join(", ")}
          </p>
        )}

        <div className="os-flex os-no-print" style={{ marginTop: 6 }}>
          {!locked && recipe.stage !== "archived" && (
            <button className="os-btn os-btn--accent" onClick={() =>
              set((r) => {
                r.stage = "approved";
                r.lockedAt = today();
              })
            }>
              <Lock size={15} /> Approve &amp; lock
            </button>
          )}
          {locked && (
            <button
              className="os-btn"
              onClick={() => {
                update((d) => void forkRecipe(d, recipe.id));
                setTimeout(onClose, 0);
              }}
            >
              <GitBranch size={15} /> New version
            </button>
          )}
          <button
            className="os-btn os-btn--ghost os-btn--sm"
            disabled={!recipe.ingredients.length}
            onClick={() => setTrialOpen(true)}
          >
            <Beaker size={13} /> Log a trial batch
          </button>
          <button className="os-btn os-btn--ghost os-btn--sm" onClick={() => window.print()}>
            <FileDown size={13} /> Export PDF
          </button>
          <button
            className="os-btn os-btn--danger os-btn--sm os-right"
            onClick={() => {
              update((d) => void (d.recipes = d.recipes.filter((r) => r.id !== recipe.id)));
              onClose();
            }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {trialOpen && (
        <Modal
          title="Log a trial batch"
          onClose={() => setTrialOpen(false)}
          footer={
            <>
              <button
                className="os-btn os-btn--ghost"
                onClick={() => setTrialOpen(false)}
              >
                Cancel
              </button>
              <button
                className="os-btn"
                onClick={() => {
                  update((d) => recordTrial(d, recipe.id, trialBatches, trialNote));
                  setTrialOpen(false);
                  setTrialNote("");
                }}
              >
                Record trial
              </button>
            </>
          }
        >
          <p className="os-small os-muted">
            A trial takes the ingredients out of stock without producing
            sellable units — the cost lands in R&amp;D rather than in finished
            goods.
          </p>
          <div className="os-row">
            <Field label="How many batches">
              <input
                className="os-input"
                type="number"
                min={1}
                value={trialBatches}
                onChange={(e) => setTrialBatches(Number(e.target.value))}
              />
            </Field>
            <Field label="Note">
              <input
                className="os-input"
                value={trialNote}
                placeholder="What you were testing"
                onChange={(e) => setTrialNote(e.target.value)}
              />
            </Field>
          </div>
          <Card>
            <div className="os-small">
              <strong>Comes out of stock:</strong>
              <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                {recipe.ingredients.map((line, i) => {
                  const item = vault.inventory.find((x) => x.id === line.itemId);
                  if (!item) return null;
                  const need = line.qty * trialBatches;
                  return (
                    <div key={i} className="os-flex">
                      <span>{item.name}</span>
                      <span
                        className="os-right"
                        style={{
                          color: need > item.stock ? "var(--os-danger)" : undefined,
                        }}
                      >
                        {need} {item.unit} of {Number(item.stock.toFixed(2))}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="os-muted" style={{ marginTop: 10, marginBottom: 0 }}>
                Ingredient cost of this trial:{" "}
                <strong>{ZAR(cost.ingredientCost * trialBatches, 2)}</strong>
              </p>
            </div>
          </Card>
        </Modal>
      )}
    </Modal>
  );
}
