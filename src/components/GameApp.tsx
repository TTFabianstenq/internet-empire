"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Game = {
  money: string;
  moneyLabel: string;
  trafficLabel: string;
  incomeLabel: string;
  clickPower: string;
  clicks: number;
  upgrades: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    level: number;
    cost: string;
    maxed: boolean;
    unlocked: boolean;
    maxLevel: number;
  }>;
  regions: Array<{
    id: string;
    name: string;
    multiplier: number;
    baseCost: string;
    owned: boolean;
    unlocked: boolean;
  }>;
  achievements: Array<{ id: string; name: string; description: string; unlocked: boolean }>;
  networkCores: number;
  prestigeCount: number;
  prestigeReady: boolean;
  prestigeGain: number;
  prestigeMul: number;
  lifetimeTraffic: string;
  lifetimeMoney: string;
};

const TABS = [
  "Dashboard",
  "Infrastructure",
  "Upgrades",
  "Data Centers",
  "Global Network",
  "Achievements",
  "Statistics",
  "Prestige",
  "Settings"
] as const;

type Tab = (typeof TABS)[number];

function rid() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export default function GameApp() {
  const [username, setUsername] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const applyPayload = useCallback((data: { game?: Game; unlocked?: string[]; offline?: { gained: string; elapsedMs: number } }) => {
    if (data.game) setGame(data.game);
    if (data.unlocked?.length) setToast(`Unlocked: ${data.unlocked.join(", ")}`);
    if (data.offline && Number(data.offline.elapsedMs) > 15000 && Number(data.offline.gained) > 0) {
      setToast(`Offline earnings: +$${data.offline.gained}`);
    }
  }, []);

  const refresh = useCallback(async () => {
    const { res, data } = await api("/api/game/state");
    if (res.ok) applyPayload(data);
  }, [applyPayload]);

  useEffect(() => {
    (async () => {
      const me = await api("/api/auth/me");
      if (me.res.ok) {
        setUsername(me.data.username);
        await refresh();
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (!username) return;
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [username, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { res, data } = await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: authUser, password: authPass })
    });
    if (!res.ok) {
      setError(data.error || "auth_failed");
      return;
    }
    setUsername(data.username);
    await refresh();
  }

  async function clickPulse() {
    const { res, data } = await api("/api/game/click", {
      method: "POST",
      body: JSON.stringify({ requestId: rid() })
    });
    if (res.ok) applyPayload(data);
  }

  async function buy(kind: "upgrade" | "region", id: string) {
    if (busy) return;
    setBusy(true);
    const { res, data } = await api("/api/game/buy", {
      method: "POST",
      body: JSON.stringify({ kind, id, requestId: rid() })
    });
    setBusy(false);
    if (res.ok) applyPayload(data);
    else if (data.error) setToast(String(data.error));
  }

  async function prestige() {
    if (!confirm("Global Reset will wipe this empire for Network Cores. Continue?")) return;
    const { res, data } = await api("/api/game/prestige", {
      method: "POST",
      body: JSON.stringify({ requestId: rid() })
    });
    if (res.ok) {
      applyPayload(data);
      setToast(`Global Reset complete. +${data.prestigeGained} Network Cores`);
    } else setToast(data.error || "prestige_failed");
  }

  const filteredUpgrades = useMemo(() => {
    if (!game) return [];
    if (tab === "Infrastructure") return game.upgrades.filter((u) => u.category === "infra" && u.id !== "datacenter");
    if (tab === "Upgrades") return game.upgrades.filter((u) => u.category !== "infra" || u.id === "automation");
    if (tab === "Data Centers") return game.upgrades.filter((u) => u.id === "datacenter" || u.id === "cdn");
    return game.upgrades;
  }, [game, tab]);

  if (!username) {
    return (
      <div className="app auth">
        <div className="card">
          <h1>Internet Empire</h1>
          <p className="muted">Server-authoritative idle tycoon. Progress lives on the server, not in localStorage.</p>
          <div className="nav">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
          </div>
          <form onSubmit={submitAuth}>
            <input placeholder="username (a-z 0-9 _)" value={authUser} onChange={(e) => setAuthUser(e.target.value)} />
            <input placeholder="password (8+)" type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} />
            <button className="primary" type="submit">{mode === "login" ? "Enter the network" : "Found your empire"}</button>
          </form>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  if (!game) {
    return <div className="app"><p className="muted">Syncing empire from server…</p></div>;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <b>INTERNET EMPIRE</b>
          <span>operator @{username}</span>
        </div>
        <div className="stats-row">
          <div className="stat"><strong>${game.moneyLabel}</strong><span>revenue</span></div>
          <div className="stat"><strong>{game.trafficLabel}</strong><span>visitors</span></div>
          <div className="stat"><strong>${game.incomeLabel}/s</strong><span>income</span></div>
          <div className="stat"><strong>{game.networkCores}</strong><span>network cores</span></div>
        </div>
        <button className="ghost" onClick={async () => { await api("/api/auth/logout", { method: "POST" }); setUsername(null); setGame(null); }}>Sign out</button>
      </header>
      <nav className="nav">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>
      {tab === "Dashboard" && (
        <div className="grid">
          <div className="card">
            <h3>Traffic Pulse</h3>
            <p>Manual acquisition. Server validates cooldown and reward.</p>
            <button className="pulse" onClick={clickPulse}>+{Number(game.clickPower).toFixed(1)} visitors</button>
          </div>
          <div className="card">
            <h3>Network health</h3>
            <p>Passive income uses the server clock for offline time.</p>
            <div className="bar"><i style={{ width: `${Math.min(100, game.prestigeMul * 12)}%` }} /></div>
            <p className="muted">Prestige multiplier ×{game.prestigeMul.toFixed(2)}</p>
          </div>
        </div>
      )}
      {tab !== "Dashboard" && ["Infrastructure", "Upgrades", "Data Centers"].includes(tab) && (
        <div className="cards">
          {filteredUpgrades.map((u) => (
            <div className="card" key={u.id}>
              <div className="row"><h3>{u.name}</h3><span className="muted">{u.level}/{u.maxLevel}</span></div>
              <p>{u.description}</p>
              <div className="bar"><i style={{ width: `${(u.level / u.maxLevel) * 100}%` }} /></div>
              <button className="buy ready" disabled={!u.unlocked || u.maxed} onClick={() => buy("upgrade", u.id)}>
                {!u.unlocked ? "Locked" : u.maxed ? "Maxed" : `Buy · $${u.cost}`}
              </button>
            </div>
          ))}
        </div>
      )}
      {tab === "Dashboard" && (
        <div className="cards" style={{ marginTop: 16 }}>
          {game.upgrades.filter((u) => u.unlocked).slice(0, 6).map((u) => (
            <div className="card" key={u.id}>
              <div className="row"><h3>{u.name}</h3><span className="muted">Lv {u.level}</span></div>
              <p>{u.description}</p>
              <button className="buy ready" disabled={u.maxed} onClick={() => buy("upgrade", u.id)}>
                {u.maxed ? "Maxed" : `Buy · $${u.cost}`}
              </button>
            </div>
          ))}
        </div>
      )}
      {tab === "Global Network" && (
        <div className="cards">
          {game.regions.map((r) => (
            <div className="card" key={r.id}>
              <h3>{r.name}</h3>
              <p>Income ×{r.multiplier.toFixed(2)}</p>
              <button className="buy ready" disabled={!r.unlocked || r.owned} onClick={() => buy("region", r.id)}>
                {r.owned ? "Online" : !r.unlocked ? "Needs more resets" : `Expand · $${r.baseCost}`}
              </button>
            </div>
          ))}
        </div>
      )}
      {tab === "Achievements" && (
        <div className="cards">
          {game.achievements.map((a) => (
            <div className="card" key={a.id}>
              <h3>{a.unlocked ? "●" : "○"} {a.name}</h3>
              <p>{a.description}</p>
            </div>
          ))}
        </div>
      )}
      {tab === "Statistics" && (
        <div className="card">
          <p>Lifetime visitors: {game.lifetimeTraffic}</p>
          <p>Lifetime revenue: {game.lifetimeMoney}</p>
          <p>Manual pulses: {game.clicks}</p>
          <p>Global resets: {game.prestigeCount}</p>
          <p>Network cores: {game.networkCores}</p>
        </div>
      )}
      {tab === "Prestige" && (
        <div className="card">
          <h3>Global Reset</h3>
          <p>Sacrifice this empire for permanent Network Cores.</p>
          <p>Projected cores this reset: <strong>{game.prestigeGain}</strong></p>
          <button className="primary" disabled={!game.prestigeReady} onClick={prestige}>
            {game.prestigeReady ? "Initiate Global Reset" : "Need more lifetime revenue"}
          </button>
        </div>
      )}
      {tab === "Settings" && (
        <div className="card">
          <p>Authoritative values are stored in Postgres. localStorage is not used for money or upgrades.</p>
          <p>Editing DevTools state will not persist. Purchases are action requests validated by the server.</p>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
