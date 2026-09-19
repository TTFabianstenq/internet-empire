import {
  ACHIEVEMENTS,
  REGIONS,
  UPGRADES,
  costOf,
  type RegionId,
  type UpgradeId
} from "./catalog";
import { add, cmp, formatNum, gte, mul, muln, n, sub } from "./numbers";

export interface GameState {
  money: string;
  traffic: string;
  lifetimeTraffic: string;
  lifetimeMoney: string;
  clicks: number;
  upgrades: Record<UpgradeId, number>;
  regions: RegionId[];
  achievements: string[];
  networkCores: number;
  prestigeCount: number;
  lastTickAt: number;
  lastClickAt: number;
  lastBuyAt: number;
  version: number;
}

export const MAX_OFFLINE_MS = () => {
  const h = Number(process.env.MAX_OFFLINE_HOURS ?? 12);
  const hours = Number.isFinite(h) && h > 0 ? Math.min(h, 48) : 12;
  return hours * 3600 * 1000;
};

export function defaultState(now: number): GameState {
  const upgrades = Object.fromEntries(UPGRADES.map((u) => [u.id, 0])) as Record<UpgradeId, number>;
  upgrades.servers = 1;
  return {
    money: "0",
    traffic: "1",
    lifetimeTraffic: "1",
    lifetimeMoney: "0",
    clicks: 0,
    upgrades,
    regions: [],
    achievements: [],
    networkCores: 0,
    prestigeCount: 0,
    lastTickAt: now,
    lastClickAt: 0,
    lastBuyAt: 0,
    version: 0
  };
}

export function sanitizeState(raw: unknown, now: number): GameState {
  const d = defaultState(now);
  if (!raw || typeof raw !== "object") return d;
  const s = raw as Partial<GameState>;
  const upgrades = { ...d.upgrades };
  if (s.upgrades && typeof s.upgrades === "object") {
    for (const def of UPGRADES) {
      const v = Number((s.upgrades as Record<string, unknown>)[def.id]);
      upgrades[def.id] = Number.isInteger(v) && v >= 0 ? Math.min(v, def.maxLevel) : 0;
    }
  }
  const regions = Array.isArray(s.regions)
    ? s.regions.filter((id): id is RegionId => REGIONS.some((r) => r.id === id))
    : [];
  const achievements = Array.isArray(s.achievements)
    ? s.achievements.filter((id) => ACHIEVEMENTS.some((a) => a.id === id))
    : [];
  return {
    money: n(s.money ?? "0"),
    traffic: n(s.traffic ?? "1"),
    lifetimeTraffic: n(s.lifetimeTraffic ?? "1"),
    lifetimeMoney: n(s.lifetimeMoney ?? "0"),
    clicks: Math.max(0, Math.min(1e12, Math.floor(Number(s.clicks) || 0))),
    upgrades,
    regions: [...new Set(regions)],
    achievements: [...new Set(achievements)],
    networkCores: Math.max(0, Math.min(1e9, Math.floor(Number(s.networkCores) || 0))),
    prestigeCount: Math.max(0, Math.min(1e6, Math.floor(Number(s.prestigeCount) || 0))),
    lastTickAt: Math.max(0, Math.floor(Number(s.lastTickAt) || now)),
    lastClickAt: Math.max(0, Math.floor(Number(s.lastClickAt) || 0)),
    lastBuyAt: Math.max(0, Math.floor(Number(s.lastBuyAt) || 0)),
    version: Math.max(0, Math.floor(Number(s.version) || 0))
  };
}

export function prestigeMultiplier(cores: number): number {
  return 1 + Math.min(cores, 10000) * 0.08;
}

export function incomePerSecond(state: GameState): string {
  const u = state.upgrades;
  let base = 0.02;
  base += u.servers * 0.15;
  base += u.bandwidth * 0.35;
  base += u.cpu * 0.7;
  base += u.ram * 0.9;
  base += u.storage * 1.2;
  base += u.domains * 2.4;
  base += u.developers * 6;
  base += u.admins * 10;
  base += u.automation * 28;
  base += u.cdn * 70;
  base += u.datacenter * 400;
  let regionMul = 1;
  for (const id of state.regions) {
    const r = REGIONS.find((x) => x.id === id);
    if (r) regionMul *= r.multiplier;
  }
  const total = base * regionMul * prestigeMultiplier(state.networkCores);
  if (!Number.isFinite(total) || total < 0) return "0";
  return String(total);
}

export function clickPower(state: GameState): string {
  const p = 1 + state.upgrades.clickPower * 1.4;
  const mulPrestige = prestigeMultiplier(state.networkCores);
  const v = p * mulPrestige * (1 + state.upgrades.domains * 0.02);
  return String(v);
}

export function applyElapsed(state: GameState, now: number): { state: GameState; gained: string; elapsedMs: number } {
  const elapsedRaw = now - state.lastTickAt;
  const elapsedMs = Math.max(0, Math.min(elapsedRaw, MAX_OFFLINE_MS()));
  const seconds = elapsedMs / 1000;
  const rate = incomePerSecond(state);
  const gained = muln(rate, seconds);
  const money = add(state.money, gained);
  const trafficGain = muln(add("1", muln(String(state.upgrades.bandwidth + 1), 0.25)), seconds);
  return {
    state: {
      ...state,
      money,
      traffic: add(state.traffic, trafficGain),
      lifetimeTraffic: add(state.lifetimeTraffic, trafficGain),
      lifetimeMoney: add(state.lifetimeMoney, gained),
      lastTickAt: now
    },
    gained,
    elapsedMs
  };
}

export function applyClick(state: GameState, now: number): { ok: boolean; state: GameState; reason?: string } {
  if (now - state.lastClickAt < 80) return { ok: false, state, reason: "cooldown" };
  const power = clickPower(state);
  const traffic = add(state.traffic, power);
  const cash = muln(power, 0.05);
  return {
    ok: true,
    state: {
      ...state,
      traffic,
      lifetimeTraffic: add(state.lifetimeTraffic, power),
      money: add(state.money, cash),
      lifetimeMoney: add(state.lifetimeMoney, cash),
      clicks: state.clicks + 1,
      lastClickAt: now,
      lastTickAt: now
    }
  };
}

function unlocked(state: GameState, id: UpgradeId): boolean {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return false;
  if (def.unlockAtMoney && cmp(state.lifetimeMoney, def.unlockAtMoney) < 0) return false;
  if (def.unlockUpgrade && state.upgrades[def.unlockUpgrade.id] < def.unlockUpgrade.level) return false;
  return true;
}

export function buyUpgrade(state: GameState, id: string, now: number): { ok: boolean; state: GameState; reason?: string } {
  if (now - state.lastBuyAt < 120) return { ok: false, state, reason: "cooldown" };
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return { ok: false, state, reason: "unknown_upgrade" };
  if (!unlocked(state, def.id)) return { ok: false, state, reason: "locked" };
  const level = state.upgrades[def.id];
  if (level >= def.maxLevel) return { ok: false, state, reason: "max_level" };
  const cost = costOf(def, level);
  if (!gte(state.money, cost)) return { ok: false, state, reason: "cannot_afford" };
  const upgrades = { ...state.upgrades, [def.id]: level + 1 };
  return {
    ok: true,
    state: {
      ...state,
      money: sub(state.money, cost),
      upgrades,
      lastBuyAt: now,
      lastTickAt: now
    }
  };
}

export function buyRegion(state: GameState, id: string, now: number): { ok: boolean; state: GameState; reason?: string } {
  if (now - state.lastBuyAt < 120) return { ok: false, state, reason: "cooldown" };
  const def = REGIONS.find((r) => r.id === id);
  if (!def) return { ok: false, state, reason: "unknown_region" };
  if (state.regions.includes(def.id)) return { ok: false, state, reason: "owned" };
  if (state.prestigeCount < def.unlockPrestige) return { ok: false, state, reason: "locked" };
  if (!gte(state.money, def.baseCost)) return { ok: false, state, reason: "cannot_afford" };
  return {
    ok: true,
    state: {
      ...state,
      money: sub(state.money, def.baseCost),
      regions: [...state.regions, def.id],
      lastBuyAt: now,
      lastTickAt: now
    }
  };
}

export function coresFromLifetime(lifetimeMoney: string): number {
  if (cmp(lifetimeMoney, "50000") < 0) return 0;
  const p = Number(lifetimeMoney);
  if (Number.isFinite(p) && p > 0) {
    return Math.floor(Math.sqrt(p / 50000));
  }
  const m = lifetimeMoney.match(/e(\d+)/);
  if (m) {
    const e = Number(m[1]);
    return Math.min(5000, Math.floor(e * 8));
  }
  return 1;
}

export function canPrestige(state: GameState): boolean {
  return coresFromLifetime(state.lifetimeMoney) >= 1;
}

export function applyPrestige(state: GameState, now: number): { ok: boolean; state: GameState; reason?: string; gained: number } {
  const gained = coresFromLifetime(state.lifetimeMoney);
  if (gained < 1) return { ok: false, state, reason: "not_ready", gained: 0 };
  const next = defaultState(now);
  next.networkCores = state.networkCores + gained;
  next.prestigeCount = state.prestigeCount + 1;
  next.achievements = state.achievements;
  next.version = state.version;
  return { ok: true, state: next, gained };
}

export function grantAchievements(state: GameState): { state: GameState; unlocked: string[] } {
  const have = new Set(state.achievements);
  const unlocked: string[] = [];
  const checks: [string, boolean][] = [
    ["first_visitor", cmp(state.lifetimeTraffic, "1") >= 0],
    ["first_dollar", cmp(state.lifetimeMoney, "1") >= 0],
    ["visitors_1k", cmp(state.lifetimeTraffic, "1000") >= 0],
    ["visitors_1m", cmp(state.lifetimeTraffic, "1000000") >= 0],
    ["visitors_1b", cmp(state.lifetimeTraffic, "1000000000") >= 0],
    ["money_1k", cmp(state.money, "1000") >= 0 || cmp(state.lifetimeMoney, "1000") >= 0],
    ["money_1m", cmp(state.lifetimeMoney, "1000000") >= 0],
    ["money_1b", cmp(state.lifetimeMoney, "1000000000") >= 0],
    ["money_1t", cmp(state.lifetimeMoney, "1e12") >= 0],
    ["servers_10", state.upgrades.servers >= 10],
    ["servers_100", state.upgrades.servers >= 100],
    ["first_dc", state.upgrades.datacenter >= 1],
    ["dc_10", state.upgrades.datacenter >= 10],
    ["global_net", state.regions.includes("global")],
    ["first_reset", state.prestigeCount >= 1],
    ["reset_5", state.prestigeCount >= 5],
    ["cores_10", state.networkCores >= 10],
    ["cores_100", state.networkCores >= 100],
    ["all_regions", state.regions.length >= REGIONS.length],
    ["automation_1", state.upgrades.automation >= 1],
    ["click_100", state.clicks >= 100],
    ["click_10000", state.clicks >= 10000],
    ["income_100", cmp(incomePerSecond(state), "100") >= 0],
    ["income_1m", cmp(incomePerSecond(state), "1000000") >= 0]
  ];
  for (const [id, ok] of checks) {
    if (ok && !have.has(id)) {
      have.add(id);
      unlocked.push(id);
    }
  }
  if (!unlocked.length) return { state, unlocked };
  return { state: { ...state, achievements: [...have] }, unlocked };
}

export function publicView(state: GameState) {
  const income = incomePerSecond(state);
  const upgrades = UPGRADES.map((def) => {
    const level = state.upgrades[def.id];
    return {
      ...def,
      level,
      cost: costOf(def, level),
      maxed: level >= def.maxLevel,
      unlocked: unlocked(state, def.id)
    };
  });
  const regions = REGIONS.map((def) => ({
    ...def,
    owned: state.regions.includes(def.id),
    unlocked: state.prestigeCount >= def.unlockPrestige
  }));
  return {
    money: state.money,
    moneyLabel: formatNum(state.money),
    traffic: state.traffic,
    trafficLabel: formatNum(state.traffic),
    lifetimeTraffic: state.lifetimeTraffic,
    lifetimeMoney: state.lifetimeMoney,
    income,
    incomeLabel: formatNum(income),
    clickPower: clickPower(state),
    clicks: state.clicks,
    upgrades,
    regions,
    achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlocked: state.achievements.includes(a.id) })),
    networkCores: state.networkCores,
    prestigeCount: state.prestigeCount,
    prestigeReady: canPrestige(state),
    prestigeGain: coresFromLifetime(state.lifetimeMoney),
    prestigeMul: prestigeMultiplier(state.networkCores),
    lastTickAt: state.lastTickAt,
    version: state.version
  };
}
