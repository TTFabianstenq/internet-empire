export type UpgradeId =
  | "clickPower"
  | "servers"
  | "bandwidth"
  | "cpu"
  | "ram"
  | "storage"
  | "domains"
  | "developers"
  | "admins"
  | "automation"
  | "cdn"
  | "datacenter";

export type RegionId = "na" | "eu" | "asia" | "sa" | "af" | "oc" | "global";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  category: "infra" | "people" | "network";
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
  unlockAtMoney?: string;
  unlockUpgrade?: { id: UpgradeId; level: number };
}

export interface RegionDef {
  id: RegionId;
  name: string;
  multiplier: number;
  baseCost: string;
  unlockPrestige: number;
}

export const UPGRADES: UpgradeDef[] = [
  { id: "clickPower", name: "Traffic Pulse", description: "Manual visitor burst per click.", category: "network", baseCost: 10, costGrowth: 1.18, maxLevel: 250 },
  { id: "servers", name: "Servers", description: "Core hosting capacity.", category: "infra", baseCost: 25, costGrowth: 1.15, maxLevel: 500 },
  { id: "bandwidth", name: "Bandwidth", description: "More concurrent visitors.", category: "infra", baseCost: 80, costGrowth: 1.16, maxLevel: 400, unlockUpgrade: { id: "servers", level: 3 } },
  { id: "cpu", name: "CPU Clusters", description: "Faster request handling.", category: "infra", baseCost: 200, costGrowth: 1.17, maxLevel: 350, unlockUpgrade: { id: "servers", level: 8 } },
  { id: "ram", name: "RAM Banks", description: "Cache more sessions.", category: "infra", baseCost: 350, costGrowth: 1.17, maxLevel: 350, unlockUpgrade: { id: "cpu", level: 4 } },
  { id: "storage", name: "Object Storage", description: "Assets and user data.", category: "infra", baseCost: 600, costGrowth: 1.18, maxLevel: 300, unlockUpgrade: { id: "ram", level: 3 } },
  { id: "domains", name: "Domains", description: "Brand and inbound traffic.", category: "network", baseCost: 1200, costGrowth: 1.2, maxLevel: 200, unlockAtMoney: "5000" },
  { id: "developers", name: "Developers", description: "Ship features that convert.", category: "people", baseCost: 4000, costGrowth: 1.19, maxLevel: 200, unlockUpgrade: { id: "domains", level: 2 } },
  { id: "admins", name: "Sysadmins", description: "Keep infrastructure healthy.", category: "people", baseCost: 9000, costGrowth: 1.2, maxLevel: 180, unlockUpgrade: { id: "developers", level: 3 } },
  { id: "automation", name: "Automation Mesh", description: "Passive orchestration.", category: "network", baseCost: 25000, costGrowth: 1.22, maxLevel: 150, unlockUpgrade: { id: "admins", level: 4 } },
  { id: "cdn", name: "CDN Nodes", description: "Edge delivery worldwide.", category: "network", baseCost: 80000, costGrowth: 1.23, maxLevel: 120, unlockUpgrade: { id: "automation", level: 3 } },
  { id: "datacenter", name: "Data Centers", description: "Physical empire footprint.", category: "infra", baseCost: 500000, costGrowth: 1.28, maxLevel: 80, unlockUpgrade: { id: "cdn", level: 2 } }
];

export const REGIONS: RegionDef[] = [
  { id: "na", name: "North America", multiplier: 1.15, baseCost: "15000", unlockPrestige: 0 },
  { id: "eu", name: "Europe", multiplier: 1.18, baseCost: "45000", unlockPrestige: 0 },
  { id: "asia", name: "Asia-Pacific", multiplier: 1.25, baseCost: "120000", unlockPrestige: 0 },
  { id: "sa", name: "South America", multiplier: 1.12, baseCost: "250000", unlockPrestige: 1 },
  { id: "af", name: "Africa", multiplier: 1.14, baseCost: "400000", unlockPrestige: 1 },
  { id: "oc", name: "Oceania", multiplier: 1.16, baseCost: "650000", unlockPrestige: 2 },
  { id: "global", name: "Global Backbone", multiplier: 2.0, baseCost: "5000000", unlockPrestige: 3 }
];

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_visitor", name: "First Visitor", description: "Someone found your site." },
  { id: "first_dollar", name: "First Dollar", description: "Earn $1." },
  { id: "visitors_1k", name: "1,000 Visitors", description: "Reach 1,000 lifetime visitors." },
  { id: "visitors_1m", name: "1 Million Visitors", description: "Reach 1,000,000 lifetime visitors." },
  { id: "visitors_1b", name: "Internet Giant", description: "Reach 1 billion lifetime visitors." },
  { id: "money_1k", name: "Seed Round", description: "Hold $1,000." },
  { id: "money_1m", name: "One Million Revenue", description: "Hold $1,000,000." },
  { id: "money_1b", name: "One Billion Revenue", description: "Hold $1,000,000,000." },
  { id: "money_1t", name: "Trillionaire", description: "Hold $1,000,000,000,000." },
  { id: "servers_10", name: "Rack Ready", description: "Own 10 servers." },
  { id: "servers_100", name: "100 Servers", description: "Own 100 servers." },
  { id: "first_dc", name: "First Data Center", description: "Build a data center." },
  { id: "dc_10", name: "Campus", description: "Build 10 data centers." },
  { id: "global_net", name: "Global Network", description: "Unlock the global backbone." },
  { id: "first_reset", name: "First Global Reset", description: "Perform a Global Reset." },
  { id: "reset_5", name: "Serial Founder", description: "Prestige 5 times." },
  { id: "cores_10", name: "Core Cluster", description: "Hold 10 Network Cores." },
  { id: "cores_100", name: "Core Grid", description: "Hold 100 Network Cores." },
  { id: "all_regions", name: "Everywhere", description: "Operate in every region." },
  { id: "automation_1", name: "Lights Out", description: "Buy automation." },
  { id: "click_100", name: "Hustle", description: "Click 100 times." },
  { id: "click_10000", name: "Relentless", description: "Click 10,000 times." },
  { id: "income_100", name: "Cashflow", description: "Reach $100/s income." },
  { id: "income_1m", name: "Money Printer", description: "Reach $1,000,000/s income." }
];

export function costOf(def: UpgradeDef, level: number): string {
  if (level < 0 || level >= def.maxLevel) return "0";
  const raw = def.baseCost * def.costGrowth ** level;
  if (!Number.isFinite(raw) || raw <= 0) return "0";
  if (raw > 1e15) {
    const e = Math.floor(Math.log10(raw));
    const c = raw / 10 ** e;
    return `${c.toPrecision(8)}e${e}`;
  }
  return String(Math.ceil(raw));
}
