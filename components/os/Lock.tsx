"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, LogIn, Upload, UserPlus } from "lucide-react";
import { asset } from "@/lib/site";
import { useVault, NEEDS_PASSPHRASE, NO_VAULT_YET } from "./VaultProvider";

/**
 * The way in, on every device: one email and one password.
 *
 * The password does two jobs that are deliberately kept apart. What reaches
 * the cloud is derived from it and can decrypt nothing; the key that opens
 * the vault is derived separately and never leaves this browser. So the same
 * two things typed on a phone bring the same work down, while a breach of
 * the cloud yields no way to read any of it.
 */
export default function Lock() {
  const {
    status,
    signInWithPassword,
    registerWithPassword,
    migrateWithPassphrase,
    restoreFromFile,
  } = useVault();
  const [mode, setMode] = useState<"in" | "up" | "restore">("in");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [stay, setStay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [backup, setBackup] = useState<{ name: string; text: string } | null>(null);
  /* Set when the saved data turns out to predate the single password. */
  const [oldPass, setOldPass] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fresh = status === "setup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNote("");

    if (mode === "restore") {
      if (!backup) return setError("Choose your backup file first.");
      setBusy(true);
      try {
        await restoreFromFile(backup.text, pass);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open that backup.");
        setPass("");
      } finally {
        setBusy(false);
      }
      return;
    }

    const addr = email.trim().toLowerCase();

    if (oldPass !== null) {
      setBusy(true);
      try {
        const msg = await migrateWithPassphrase(addr, pass, oldPass);
        setOldPass(null);
        if (msg) setNote(msg);
      } catch (err) {
        setError(err instanceof Error ? err.message : "That didn't work.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!addr) return setError("Enter the email you use for Fiori.");
    if (mode === "up") {
      if (pass.length < 8) return setError("Use at least 8 characters.");
      if (pass !== confirm) return setError("The two entries don't match.");
    }

    setBusy(true);
    try {
      const msg =
        mode === "up"
          ? await registerWithPassword(addr, pass, stay)
          : await signInWithPassword(addr, pass, stay);
      if (msg) setNote(msg);
    } catch (err) {
      const m = err instanceof Error ? err.message : "That didn't work.";
      if (m === NEEDS_PASSPHRASE) {
        setOldPass("");
        setNote("");
      } else {
        setError(m);
        if (m !== NO_VAULT_YET) setPass("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="os-lock">
      <div className={`os-lock-card${error ? " os-shake" : ""}`} key={error}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset("/brand/logo/fiori-complete-deepblue.svg")} alt="Fiori Gelato" />
        <h1>
          {mode === "restore"
            ? "Open a backup"
            : mode === "up"
              ? "Set up Fiori OS"
              : "Sign in"}
        </h1>
        <p>
          {mode === "restore"
            ? "Choose the backup file, then enter the password that was used when it was exported."
            : mode === "up"
              ? "One email and one password. The same two open your work on any device — this laptop, your phone, anywhere."
              : "Your email and password. Everything comes down on its own."}
        </p>

        <form onSubmit={submit}>
          {mode === "restore" ? (
            <>
              <button
                type="button"
                className="os-btn os-btn--ghost"
                style={{ width: "100%", marginBottom: 12 }}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={15} />
                {backup ? backup.name : "Choose backup file"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBackup({ name: file.name, text: await file.text() });
                  setError("");
                  e.target.value = "";
                }}
              />
            </>
          ) : (
            <label className="os-field">
              <span>Email</span>
              <input
                className="os-input"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}

          <label className="os-field">
            <span>{mode === "restore" ? "Password for that backup" : "Password"}</span>
            <div className="os-reveal">
              <input
                className="os-input"
                type={show ? "text" : "password"}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {oldPass !== null && (
            <div className="os-note" style={{ marginBottom: 12 }}>
              <p className="os-small" style={{ marginBottom: 8 }}>
                <strong>One last time.</strong> Your saved work was sealed with
                the separate passphrase you used before. Enter it once and it
                will be re-sealed with the password above — after this, the
                email and password alone open it anywhere.
              </p>
              <label className="os-field" style={{ marginBottom: 0 }}>
                <span>Your old passphrase</span>
                <input
                  className="os-input"
                  type="password"
                  autoFocus
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                />
              </label>
            </div>
          )}

          {mode === "up" && oldPass === null && (
            <label className="os-field">
              <span>Confirm password</span>
              <input
                className="os-input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          )}

          {mode !== "restore" && (
            <label className="os-check">
              <input
                type="checkbox"
                checked={stay}
                onChange={(e) => setStay(e.target.checked)}
              />
              <span>
                Stay signed in on this device
                <span className="os-small os-muted">
                  {" "}
                  — use it on devices only you can get into.
                </span>
              </span>
            </label>
          )}

          {error && (
            <p className="os-small" style={{ color: "var(--os-danger)", marginTop: 8 }}>
              {error}
            </p>
          )}
          {note && (
            <p className="os-small os-muted" style={{ marginTop: 8 }}>
              {note}
            </p>
          )}

          <button
            className="os-btn"
            style={{ width: "100%", marginTop: 10 }}
            disabled={
              busy ||
              !pass ||
              (oldPass !== null ? !oldPass : mode === "restore" ? !backup : !email)
            }
          >
            {mode === "up" ? <UserPlus size={15} /> : <LogIn size={15} />}
            {busy
              ? "Working…"
              : oldPass !== null
                ? "Unlock and convert"
                : mode === "restore"
                  ? "Open backup"
                  : mode === "up"
                    ? "Create my account"
                    : "Sign in"}
          </button>
        </form>

        <div className="os-flex" style={{ marginTop: 12, justifyContent: "center" }}>
          {mode !== "up" && (
            <button
              className="os-btn os-btn--ghost os-btn--sm"
              onClick={() => {
                setMode("up");
                setError("");
                setNote("");
              }}
            >
              First time here
            </button>
          )}
          {mode !== "in" && (
            <button
              className="os-btn os-btn--ghost os-btn--sm"
              onClick={() => {
                setMode("in");
                setError("");
                setNote("");
              }}
            >
              Sign in instead
            </button>
          )}
          {mode !== "restore" && fresh && (
            <button
              className="os-btn os-btn--ghost os-btn--sm"
              onClick={() => {
                setMode("restore");
                setError("");
                setNote("");
                setPass("");
              }}
            >
              Open a backup file
            </button>
          )}
        </div>

        <p className="os-small os-muted" style={{ marginTop: 18, marginBottom: 0 }}>
          Your work is encrypted with your password before it leaves this
          device. The cloud stores it sealed and never receives the password
          itself, so nobody there can read your books.
        </p>
      </div>
    </div>
  );
}
