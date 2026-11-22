"use client";

import { useId, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useVault } from "../VaultProvider";
import { Bars, Card, Chip, Empty, Field, Modal, SectionTitle } from "../ui";
import { postSale, unpostSale } from "@/lib/os/actions";
import {
  bestSellers,
  saleLineLabel,
  packagingCost,
  servingCost,
  customerTotals,
  financials,
  salesByChannel,
} from "@/lib/os/calc";
import { ZAR, dateLabel, download, pct, toCSV, today, uid } from "@/lib/os/format";
import {
  CHANNEL_LABEL,
  type CustomerType,
  type Sale,
  type SaleLine,
  type SalesChannel,
} from "@/lib/os/types";

const CHANNELS = Object.keys(CHANNEL_LABEL) as SalesChannel[];
const CUSTOMER_TYPES: CustomerType[] = [
  "stockist",
  "cafe",
  "hotel",
  "restaurant",
  "wholesale",
  "private",
];
const TYPE_LABEL: Record<CustomerType, string> = {
  stockist: "Retail stockist",
  cafe: "Café",
  hotel: "Hotel",
  restaurant: "Restaurant",
  wholesale: "Wholesale",
  private: "Private / event",
};

export default function Sales() {
  const { vault, update } = useVault();
  const [tab, setTab] = useState<"sales" | "customers">("sales");
  const [selling, setSelling] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  if (!vault) return null;
  /* Narrowing doesn't reach into the callbacks below, so bind it once. */
  const v = vault;

  const f = financials(vault);
  const channels = salesByChannel(vault);
  const sellers = bestSellers(vault, 6);
  const rows = [...vault.sales].sort((a, b) => b.date.localeCompare(a.date));

  function exportSales() {
    download(
      `fiori-sales-${today()}.csv`,
      toCSV([
        ["Date", "Channel", "Customer", "Product", "Qty", "Unit price", "Unit cost", "Revenue", "Gross profit", "Payment"],
        ...rows.flatMap((s) =>
          s.lines.map((l) => [
            s.date,
            CHANNEL_LABEL[s.channel],
            v.customers.find((c) => c.id === s.customerId)?.name ?? "",
            saleLineLabel(v, l),
            l.qty,
            l.unitPrice.toFixed(2),
            l.unitCost.toFixed(2),
            (l.qty * l.unitPrice).toFixed(2),
            (l.qty * (l.unitPrice - l.unitCost)).toFixed(2),
            s.paymentMethod,
          ])
        ),
      ])
    );
  }

  return (
    <div className="os-stack">
      <div className="os-flex">
        <div className="os-stages">
          {(["sales", "customers"] as const).map((t) => (
            <button
              key={t}
              className="os-stage-pip"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
            >
              {t === "sales" ? "Sales" : "Customers"}
            </button>
          ))}
        </div>
        <div className="os-flex os-right">
          <button className="os-btn os-btn--ghost os-btn--sm" onClick={exportSales}>
            <Download size={14} /> CSV
          </button>
          <button className="os-btn" onClick={() => setSelling(true)}>
            <Plus size={15} /> Record sale
          </button>
        </div>
      </div>

      {tab === "sales" && (
        <>
          <div className="os-grid os-grid--4">
            <Card>
              <div className="os-stat-label">Revenue</div>
              <div className="os-stat-value" style={{ fontSize: 23 }}>{ZAR(f.revenue)}</div>
            </Card>
            <Card>
              <div className="os-stat-label">Gross profit</div>
              <div className="os-stat-value" style={{ fontSize: 23 }}>{ZAR(f.grossProfit)}</div>
              <div className="os-stat-sub">{pct(f.grossMargin)} margin</div>
            </Card>
            <Card>
              <div className="os-stat-label">Units sold</div>
              <div className="os-stat-value" style={{ fontSize: 23 }}>
                {vault.sales.reduce((a, s) => a + s.lines.reduce((b, l) => b + l.qty, 0), 0)}
              </div>
            </Card>
            <Card>
              <div className="os-stat-label">Orders</div>
              <div className="os-stat-value" style={{ fontSize: 23 }}>{vault.sales.length}</div>
            </Card>
          </div>

          <div className="os-grid os-grid--2">
            <Card pad>
              <strong>By channel</strong>
              <div style={{ marginTop: 12 }}>
                {channels.length ? (
                  <Bars
                    rows={channels.map(([c, t]) => ({
                      label: CHANNEL_LABEL[c],
                      value: t.revenue,
                    }))}
                  />
                ) : (
                  <p className="os-muted os-small">Nothing sold yet.</p>
                )}
              </div>
            </Card>
            <Card pad>
              <strong>Best sellers</strong>
              <div style={{ marginTop: 12 }}>
                {sellers.length ? (
                  <Bars rows={sellers.map((s) => ({ label: s.name, value: s.revenue }))} />
                ) : (
                  <p className="os-muted os-small">Nothing sold yet.</p>
                )}
              </div>
            </Card>
          </div>

          {rows.length ? (
            <div className="os-table-wrap">
              <table className="os-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Channel</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th className="os-num">Revenue</th>
                    <th className="os-num">Gross</th>
                    <th className="os-num">Net</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const rev = s.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
                    const cost = s.lines.reduce((a, l) => a + l.qty * l.unitCost, 0);
                    return (
                      <tr key={s.id}>
                        <td>{dateLabel(s.date)}</td>
                        <td>
                          <Chip>{CHANNEL_LABEL[s.channel]}</Chip>
                        </td>
                        <td>
                          {vault.customers.find((c) => c.id === s.customerId)?.name ?? "—"}
                        </td>
                        <td className="os-small os-muted">
                          {s.lines
                            .map(
                              (l) =>
                                `${saleLineLabel(vault, l)} ×${l.qty}`
                            )
                            .join(", ")}
                        </td>
                        <td className="os-num">{ZAR(rev)}</td>
                        <td className="os-num">{ZAR(rev - cost)}</td>
                        <td className="os-num">{ZAR(rev - cost - s.channelCost)}</td>
                        <td>
                          <span className="os-flex">
                            <button
                              className="os-btn os-btn--ghost os-btn--sm"
                              onClick={() => setEditingSale(s)}
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            {confirmDelete === s.id ? (
                              <>
                                <button
                                  className="os-btn os-btn--ghost os-btn--sm"
                                  onClick={() => setConfirmDelete(null)}
                                >
                                  Keep
                                </button>
                                <button
                                  className="os-btn os-btn--danger os-btn--sm"
                                  onClick={() => {
                                    update((d) => {
                                      const t = d.sales.find((x) => x.id === s.id);
                                      if (t) unpostSale(d, t);
                                      d.sales = d.sales.filter((x) => x.id !== s.id);
                                    });
                                    setConfirmDelete(null);
                                  }}
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <button
                                className="os-btn os-btn--ghost os-btn--sm"
                                onClick={() => setConfirmDelete(s.id)}
                                aria-label="Delete sale"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No sales yet"
              body="Recording a sale draws finished stock down and posts the revenue and margin to Finance."
              action={
                <button className="os-btn" onClick={() => setSelling(true)}>
                  <Plus size={15} /> Record sale
                </button>
              }
            />
          )}
        </>
      )}

      {tab === "customers" && (
        <>
          {vault.customers.length ? (
            <div className="os-grid os-grid--2">
              {vault.customers.map((c) => {
                const t = customerTotals(vault, c.id);
                const set = (fn: (x: typeof c) => void) =>
                  update((d) => {
                    const x = d.customers.find((y) => y.id === c.id);
                    if (x) fn(x);
                  });
                return (
                  <Card key={c.id}>
                    <div className="os-row">
                      <Field label="Name">
                        <input
                          className="os-input"
                          value={c.name}
                          onChange={(e) => set((x) => void (x.name = e.target.value))}
                        />
                      </Field>
                      <Field label="Type">
                        <select
                          className="os-select"
                          value={c.type}
                          onChange={(e) =>
                            set((x) => void (x.type = e.target.value as CustomerType))
                          }
                        >
                          {CUSTOMER_TYPES.map((k) => (
                            <option key={k} value={k}>
                              {TYPE_LABEL[k]}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="os-row">
                      <Field label="Contact">
                        <input
                          className="os-input"
                          value={c.contact ?? ""}
                          onChange={(e) => set((x) => void (x.contact = e.target.value))}
                        />
                      </Field>
                      <Field label="Phone">
                        <input
                          className="os-input"
                          value={c.phone ?? ""}
                          onChange={(e) => set((x) => void (x.phone = e.target.value))}
                        />
                      </Field>
                      <Field label="Follow up on">
                        <input
                          className="os-input"
                          type="date"
                          value={c.followUpOn ?? ""}
                          onChange={(e) => set((x) => void (x.followUpOn = e.target.value))}
                        />
                      </Field>
                    </div>
                    <Field label="Notes">
                      <textarea
                        className="os-textarea"
                        value={c.notes ?? ""}
                        onChange={(e) => set((x) => void (x.notes = e.target.value))}
                      />
                    </Field>
                    <div className="os-flex os-small os-muted">
                      <span>{t.orders} orders</span>
                      <span>·</span>
                      <span>{ZAR(t.revenue)} total</span>
                      <span>·</span>
                      <span>{ZAR(t.average)} average</span>
                      {t.lastOrder && <span>· last {dateLabel(t.lastOrder)}</span>}
                      <button
                        className="os-btn os-btn--ghost os-btn--sm os-right"
                        onClick={() =>
                          update((d) => void (d.customers = d.customers.filter((x) => x.id !== c.id)))
                        }
                        aria-label="Delete customer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Empty
              title="No customers yet"
              body="Stockists, cafés, hotels and wholesale buyers live here, with their order history attached."
            />
          )}
          <button
            className="os-btn os-btn--ghost os-btn--sm"
            onClick={() =>
              update((d) =>
                d.customers.push({ id: uid("cus_"), name: "New customer", type: "stockist" })
              )
            }
          >
            <Users size={14} /> Add customer
          </button>
        </>
      )}

      {selling && <SaleForm onClose={() => setSelling(false)} />}
      {editingSale && (
        <SaleForm
          key={editingSale.id}
          sale={editingSale}
          onClose={() => setEditingSale(null)}
        />
      )}
    </div>
  );
}

/**
 * A line being typed.
 *
 * `cost` is normally worked out from the flavour and the packaging. Setting
 * it by hand pins it, for the times when a line cost something the recipe
 * doesn't know about.
 */
interface Draft extends SaleLine {
  ownCost?: number;
}

function SaleForm({ sale, onClose }: { sale?: Sale; onClose: () => void }) {
  const { vault, update } = useVault();
  const editing = !!sale;
  const [date, setDate] = useState(sale?.date ?? today());
  const [channel, setChannel] = useState<SalesChannel>(sale?.channel ?? "direct");
  const [customerId, setCustomerId] = useState(sale?.customerId ?? "");
  const [channelCost, setChannelCost] = useState(sale?.channelCost ?? 0);
  const [payment, setPayment] = useState<"cash" | "card" | "eft" | "platform">(
    sale?.paymentMethod ?? "cash"
  );
  /* An edit opens with the rest already showing, since whatever is in there
     is part of what is being changed. */
  const [details, setDetails] = useState(editing);
  const flavourListId = useId();
  /* A new sale opens with one empty line ready, so it is four fields and a
     save rather than a click to begin. An edit opens with its own lines.
     Each kept its cost from the day it was sold: where that still matches
     what the recipe and packaging work out to, it is left to follow them,
     and where it doesn't it is held as it was rather than quietly restated
     at today's prices. */
  const [lines, setLines] = useState<Draft[]>(() => {
    if (!sale) {
      return [
        {
          packagingId: vault?.packaging.find((p) => !p.archived)?.id,
          qty: 1,
          unitPrice: 0,
          unitCost: 0,
        },
      ];
    }
    return sale.lines.map((l) => {
      const worked = vault
        ? l.fromStock && l.itemId
          ? (vault.inventory.find((i) => i.id === l.itemId)?.unitCost ?? 0) +
            (l.packagingId
              ? packagingCost(vault, vault.packaging.find((p) => p.id === l.packagingId)!)
              : 0)
          : servingCost(vault, l.recipeId, l.packagingId).total
        : l.unitCost;
      const same = Math.abs(worked - l.unitCost) < 0.005;
      return same ? { ...l } : { ...l, ownCost: l.unitCost };
    });
  });
  if (!vault) return null;

  const finished = vault.inventory.filter((i) => i.category === "finished" && !i.archived);
  const flavours = vault.recipes.filter((r) => r.stage !== "archived");
  const packs = vault.packaging.filter((p) => !p.archived);

  /** What the line costs each: the worked-out figure, unless one was typed. */
  function costEach(l: Draft): number {
    if (typeof l.ownCost === "number") return l.ownCost;
    if (l.fromStock && l.itemId) {
      const item = vault!.inventory.find((i) => i.id === l.itemId);
      const pack = l.packagingId
        ? packagingCost(vault!, vault!.packaging.find((p) => p.id === l.packagingId)!)
        : 0;
      return (item?.unitCost ?? 0) + pack;
    }
    return servingCost(vault!, l.recipeId, l.packagingId).total;
  }

  /** Typing a flavour that matches a recipe links it; anything else stands. */
  function nameFlavour(idx: number, typed: string) {
    const match = flavours.find(
      (r) => r.name.toLowerCase() === typed.trim().toLowerCase()
    );
    setLines(
      lines.map((x, i) =>
        i === idx
          ? match
            ? { ...x, recipeId: match.id, description: undefined }
            : { ...x, recipeId: undefined, description: typed }
          : x
      )
    );
  }

  const filled = lines.filter(
    (l) => l.qty > 0 && (l.recipeId || l.itemId || l.description?.trim())
  );
  const revenue = filled.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const cost = filled.reduce((a, l) => a + l.qty * costEach(l), 0);

  function save() {
    if (!filled.length) return;
    const next: Sale = {
      id: sale?.id ?? uid("sal_"),
      date,
      channel,
      customerId: customerId || undefined,
      lines: filled.map((l) => {
        const line: SaleLine = { ...l, unitCost: costEach(l) };
        delete (line as Draft).ownCost;
        return line;
      }),
      channelCost,
      paymentMethod: payment,
    };
    update((d) => {
      if (sale) {
        /* Put back whatever the old version took out of the freezer before
           the new one draws its own, so an edited quantity can't leave
           stock short or over. */
        const old = d.sales.find((x) => x.id === sale.id);
        if (old) unpostSale(d, old);
        d.sales = d.sales.map((x) =>
          x.id === sale.id ? { ...next, posted: false } : x
        );
      } else {
        d.sales.push(next);
      }
      postSale(d, d.sales.find((x) => x.id === next.id)!);
    });
    onClose();
  }

  return (
    <Modal
      title={editing ? "Edit this sale" : "Record a sale"}
      onClose={onClose}
      footer={
        <>
          <button className="os-btn os-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="os-btn" onClick={save} disabled={!filled.length}>
            {editing ? "Save changes" : "Save"} · {ZAR(revenue)}
          </button>
        </>
      }
    >
      <datalist id={flavourListId}>
        {flavours.map((r) => (
          <option key={r.id} value={r.name} />
        ))}
      </datalist>

      <Field label="Date">
        <input
          className="os-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      <SectionTitle>What was sold</SectionTitle>
      {lines.map((l, idx) => {
        const edit = (fn: (x: Draft) => Draft) =>
          setLines(lines.map((x, i) => (i === idx ? fn(x) : x)));
        const split = servingCost(vault, l.recipeId, l.packagingId);
        const item = l.itemId ? vault.inventory.find((i) => i.id === l.itemId) : undefined;
        const each = costEach(l);
        const profit = (l.unitPrice - each) * l.qty;
        const own = typeof l.ownCost === "number";
        return (
          <Card key={idx} style={{ marginBottom: 10 }}>
            <div className="os-row">
              <Field label="Flavour">
                <input
                  className="os-input"
                  list={flavourListId}
                  value={
                    l.recipeId
                      ? (flavours.find((r) => r.id === l.recipeId)?.name ?? "")
                      : (l.description ?? "")
                  }
                  placeholder="Pistachio"
                  onChange={(e) => nameFlavour(idx, e.target.value)}
                />
              </Field>
              <Field label="Packaging">
                <select
                  className="os-select"
                  value={l.packagingId ?? ""}
                  onChange={(e) =>
                    edit((x) => ({ ...x, packagingId: e.target.value || undefined }))
                  }
                >
                  <option value="">—</option>
                  {packs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="How many">
                <input
                  className="os-input"
                  type="number"
                  min="0"
                  value={l.qty}
                  onChange={(e) => edit((x) => ({ ...x, qty: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Sold at, each">
                <input
                  className="os-input"
                  type="number"
                  step="any"
                  min="0"
                  value={l.unitPrice}
                  onChange={(e) => edit((x) => ({ ...x, unitPrice: Number(e.target.value) }))}
                />
              </Field>
              {own && (
                <Field label="Costs me, each">
                  <input
                    className="os-input"
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    value={l.ownCost}
                    onChange={(e) => edit((x) => ({ ...x, ownCost: Number(e.target.value) }))}
                  />
                </Field>
              )}
              {lines.length > 1 && (
                <span className="os-shrink">
                  <button
                    className="os-btn os-btn--ghost os-btn--sm"
                    onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                    aria-label="Remove line"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              )}
            </div>

            <div className="os-split">
              <span>
                Costs <strong>{ZAR(each, 2)}</strong> each
                {!own && (
                  <span className="os-muted">
                    {" "}
                    (gelato {ZAR(l.fromStock && item ? item.unitCost : split.gelato, 2)} +
                    packaging {ZAR(split.packaging, 2)})
                  </span>
                )}
              </span>
              <span>
                Gross profit{" "}
                <strong
                  style={{ color: profit >= 0 ? "var(--os-accent)" : "var(--os-danger)" }}
                >
                  {ZAR(profit, 2)}
                </strong>
              </span>
              <button
                className="os-btn os-btn--ghost os-btn--sm os-right"
                onClick={() =>
                  edit((x) => ({ ...x, ownCost: own ? undefined : Number(each.toFixed(2)) }))
                }
              >
                {own ? "Work it out for me" : "Set the cost myself"}
              </button>
            </div>

            <label className="os-check" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={!!l.fromStock}
                onChange={(e) =>
                  edit((x) => ({
                    ...x,
                    fromStock: e.target.checked,
                    itemId: e.target.checked ? (x.itemId ?? finished[0]?.id) : x.itemId,
                  }))
                }
              />
              <span className="os-small">
                Take this out of the freezer
                <span className="os-muted">
                  {" "}
                  — leave it off if you made it fresh for the order.
                </span>
              </span>
            </label>
            {l.fromStock && (
              <Field label="Which stock">
                <select
                  className="os-select"
                  value={l.itemId ?? ""}
                  onChange={(e) => edit((x) => ({ ...x, itemId: e.target.value || undefined }))}
                >
                  <option value="">—</option>
                  {finished.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.stock} in stock)
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </Card>
        );
      })}
      <button
        className="os-btn os-btn--ghost os-btn--sm"
        onClick={() =>
          setLines([...lines, { packagingId: packs[0]?.id, qty: 1, unitPrice: 0, unitCost: 0 }])
        }
      >
        <Plus size={13} /> Add another
      </button>

      {/* Channel, customer and the rest are the same most days, so they stay
          folded away with sensible defaults rather than asked every time. */}
      <div style={{ marginTop: 14 }}>
        <button
          className="os-btn os-btn--ghost os-btn--sm"
          onClick={() => setDetails(!details)}
        >
          {details ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {details ? "Hide the rest" : "Where, who and how it was paid"}
          {!details && (
            <span className="os-muted">
              {" "}
              — {CHANNEL_LABEL[channel]}, {payment}
            </span>
          )}
        </button>
      </div>
      {details && (
        <Card style={{ marginTop: 10 }}>
          <div className="os-row">
            <Field label="Channel">
              <select
                className="os-select"
                value={channel}
                onChange={(e) => setChannel(e.target.value as SalesChannel)}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABEL[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Customer">
              <select
                className="os-select"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">—</option>
                {vault.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment">
              <select
                className="os-select"
                value={payment}
                onChange={(e) => setPayment(e.target.value as typeof payment)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="eft">EFT</option>
                <option value="platform">Platform</option>
              </select>
            </Field>
            <Field label="Commission, stall or delivery">
              <input
                className="os-input"
                type="number"
                step="any"
                min="0"
                value={channelCost}
                onChange={(e) => setChannelCost(Number(e.target.value))}
              />
            </Field>
          </div>
        </Card>
      )}

      <Card style={{ marginTop: 14 }}>
        <div className="os-grid os-grid--3">
          <div>
            <div className="os-stat-label">Revenue</div>
            <div className="os-stat-value" style={{ fontSize: 20 }}>{ZAR(revenue)}</div>
          </div>
          <div>
            <div className="os-stat-label">Gross profit</div>
            <div className="os-stat-value" style={{ fontSize: 20 }}>{ZAR(revenue - cost)}</div>
          </div>
          <div>
            <div className="os-stat-label">After commission</div>
            <div className="os-stat-value" style={{ fontSize: 20 }}>
              {ZAR(revenue - cost - channelCost)}
            </div>
          </div>
        </div>
      </Card>
    </Modal>
  );
}
