"use client";

import { useState } from "react";
import { Copy, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { useVault } from "../VaultProvider";
import { Card, Empty, Field, SectionTitle } from "../ui";
import { packagingCost } from "@/lib/os/calc";
import { ZAR, uid } from "@/lib/os/format";
import type { PackagingComponent, PackagingType } from "@/lib/os/types";

/**
 * Packaging: the ways the gelato goes out of the door.
 *
 * Early on the format isn't settled, so these are made up as they are tried.
 * A type is a name, the volume of gelato it holds, and the parts that make it
 * up — cup, lid, sticker, spoon — each either a stocked item, so its cost
 * follows what was paid, or a figure typed in. The total is the packaging's
 * cost per unit, and a sale adds it to the gelato for the real cost of one
 * serving.
 */
export default function Packaging() {
  const { vault, update } = useVault();
  if (!vault) return null;
  const v = vault;
  const types = v.packaging.filter((p) => !p.archived);

  function add() {
    update((d) =>
      d.packaging.push({
        id: uid("pkg_"),
        name: "New packaging",
        volumeMl: 120,
        components: [],
      })
    );
  }

  return (
    <div className="os-stack">
      <div className="os-flex">
        <p className="os-small os-muted" style={{ margin: 0, maxWidth: 560 }}>
          Build up what each format costs you. A part can point at something in
          stock, so its cost follows your purchases, or carry its own figure
          for anything you buy as you go. Lock a type once you&rsquo;re quoting
          off it.
        </p>
        <button className="os-btn os-right" onClick={add}>
          <Plus size={15} /> New packaging
        </button>
      </div>

      {types.length === 0 ? (
        <Empty
          title="No packaging yet"
          body="Add a format — a 120ml cup, say — then list the cup, lid, sticker and spoon that go into it. The total becomes the packaging cost on every sale that uses it."
          action={
            <button className="os-btn" onClick={add}>
              <Plus size={15} /> New packaging
            </button>
          }
        />
      ) : (
        <div className="os-grid os-grid--2">
          {types.map((pkg) => (
            <PackagingCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  );
}

function PackagingCard({ pkg }: { pkg: PackagingType }) {
  const { vault, update } = useVault();
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!vault) return null;
  const v = vault;
  const cost = packagingCost(v, pkg);
  const locked = !!pkg.locked;

  const set = (fn: (p: PackagingType) => void) =>
    update((d) => {
      const t = d.packaging.find((x) => x.id === pkg.id);
      if (t) fn(t);
    });

  const setComponent = (cid: string, fn: (c: PackagingComponent) => void) =>
    set((p) => {
      const c = p.components.find((x) => x.id === cid);
      if (c) fn(c);
    });

  /* Anything not a finished tub of gelato can be part of a packaging type. */
  const parts = v.inventory.filter((i) => !i.archived && i.category !== "finished");

  return (
    <Card pad>
      <div className="os-row">
        <Field label="Name">
          <input
            className="os-input"
            value={pkg.name}
            disabled={locked}
            onChange={(e) => set((p) => void (p.name = e.target.value))}
          />
        </Field>
        <Field label="Holds (ml)">
          <input
            className="os-input"
            type="number"
            value={pkg.volumeMl}
            disabled={locked}
            onChange={(e) => set((p) => void (p.volumeMl = Number(e.target.value)))}
          />
        </Field>
      </div>

      <SectionTitle>What goes into it</SectionTitle>
      {pkg.components.length === 0 && (
        <p className="os-small os-muted">
          Nothing listed yet — add the cup, the lid, the sticker, the spoon.
        </p>
      )}

      <div className="os-stack" style={{ gap: 8 }}>
        {pkg.components.map((c) => {
          const stocked = c.itemId ? v.inventory.find((i) => i.id === c.itemId) : undefined;
          const each = stocked ? stocked.unitCost : c.unitCost;
          return (
            <Card key={c.id}>
              <div className="os-row">
                <Field label="Part">
                  <select
                    className="os-select"
                    value={c.itemId ?? ""}
                    disabled={locked}
                    onChange={(e) =>
                      setComponent(c.id, (x) => {
                        x.itemId = e.target.value || undefined;
                        const it = parts.find((i) => i.id === e.target.value);
                        if (it) x.name = it.name;
                      })
                    }
                  >
                    <option value="">— type it in myself —</option>
                    {parts.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {!c.itemId && (
                  <Field label="Called">
                    <input
                      className="os-input"
                      value={c.name}
                      disabled={locked}
                      onChange={(e) => setComponent(c.id, (x) => void (x.name = e.target.value))}
                    />
                  </Field>
                )}
                <Field label="How many">
                  <input
                    className="os-input"
                    type="number"
                    step="any"
                    value={c.qty}
                    disabled={locked}
                    onChange={(e) => setComponent(c.id, (x) => void (x.qty = Number(e.target.value)))}
                  />
                </Field>
                <Field label={stocked ? "Cost each (from stock)" : "Cost each"}>
                  <input
                    className="os-input"
                    type="number"
                    step="any"
                    value={stocked ? stocked.unitCost : c.unitCost}
                    disabled={locked || !!stocked}
                    onChange={(e) =>
                      setComponent(c.id, (x) => void (x.unitCost = Number(e.target.value)))
                    }
                  />
                </Field>
                <span className="os-shrink">
                  <button
                    className="os-btn os-btn--ghost os-btn--sm"
                    disabled={locked}
                    aria-label="Remove part"
                    onClick={() =>
                      set((p) => void (p.components = p.components.filter((x) => x.id !== c.id)))
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
              <p className="os-small os-muted" style={{ margin: 0 }}>
                {c.qty} × {ZAR(each, 2)} = <strong>{ZAR((c.qty || 0) * (each || 0), 2)}</strong>
                {stocked && " · follows what you paid for it"}
              </p>
            </Card>
          );
        })}
      </div>

      {!locked && (
        <button
          className="os-btn os-btn--ghost os-btn--sm"
          style={{ marginTop: 10 }}
          onClick={() =>
            set((p) =>
              p.components.push({
                id: uid("pc_"),
                name: "New part",
                qty: 1,
                unitCost: 0,
              })
            )
          }
        >
          <Plus size={14} /> Add a part
        </button>
      )}

      <div className="os-flex" style={{ marginTop: 14 }}>
        <span className="os-chip os-chip--caramel">
          {ZAR(cost, 2)} per unit
        </span>
        <button
          className="os-btn os-btn--ghost os-btn--sm"
          onClick={() => set((p) => void (p.locked = !p.locked))}
        >
          {locked ? <Unlock size={13} /> : <Lock size={13} />}
          {locked ? "Unlock to edit" : "Lock it in"}
        </button>
        <button
          className="os-btn os-btn--ghost os-btn--sm"
          onClick={() =>
            update((d) =>
              d.packaging.push({
                ...structuredClone(pkg),
                id: uid("pkg_"),
                name: `${pkg.name} copy`,
                locked: false,
                components: pkg.components.map((c) => ({ ...c, id: uid("pc_") })),
              })
            )
          }
        >
          <Copy size={13} /> Duplicate
        </button>
        {!confirmDelete ? (
          <button
            className="os-btn os-btn--ghost os-btn--sm os-right"
            aria-label="Delete packaging"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={13} />
          </button>
        ) : (
          <span className="os-flex os-right">
            <span className="os-small">Remove it?</span>
            <button
              className="os-btn os-btn--ghost os-btn--sm"
              onClick={() => setConfirmDelete(false)}
            >
              Keep
            </button>
            <button
              className="os-btn os-btn--danger os-btn--sm"
              onClick={() => set((p) => void (p.archived = true))}
            >
              Remove
            </button>
          </span>
        )}
      </div>
    </Card>
  );
}
