"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

import type { MapState, ScenarioContext } from "@/lib/game";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Historical and modern country names → ISO alpha-2
const NAME_TO_ISO: Record<string, string> = {
  England: "GBR",
  Britain: "GBR",
  Scotland: "GBR",
  "Great Britain": "GBR",
  France: "FRA",
  Burgundy: "FRA",
  Spain: "ESP",
  Castile: "ESP",
  Aragon: "ESP",
  Navarre: "ESP",
  Portugal: "PRT",
  Germany: "DEU",
  Prussia: "DEU",
  Saxony: "DEU",
  Bavaria: "DEU",
  "Holy Roman Empire": "DEU",
  Austria: "AUT",
  "Habsburg Austria": "AUT",
  Italy: "ITA",
  Venice: "ITA",
  Genoa: "ITA",
  "Papal States": "ITA",
  Poland: "POL",
  "Poland-Lithuania": "POL",
  Hungary: "HUN",
  Romania: "ROU",
  Wallachia: "ROU",
  Serbia: "SRB",
  Greece: "GRC",
  Byzantium: "GRC",
  Turkey: "TUR",
  "Ottoman Empire": "TUR",
  Netherlands: "NLD",
  Belgium: "BEL",
  Flanders: "BEL",
  Sweden: "SWE",
  Russia: "RUS",
  Denmark: "DNK",
  Switzerland: "CHE",
  Norway: "NOR",
};

// ISO alpha-2 → UN M49 numeric id (used by world-atlas countries-110m.json)
const ISO_TO_NUMERIC: Record<string, string> = {
  GBR: "826",
  FRA: "250",
  DEU: "276",
  AUT: "040",
  ESP: "724",
  PRT: "620",
  TUR: "792",
  GRC: "300",
  ITA: "380",
  POL: "616",
  HUN: "348",
  ROU: "642",
  SRB: "688",
  NLD: "528",
  BEL: "056",
  SWE: "752",
  RUS: "643",
  DNK: "208",
  CHE: "756",
  NOR: "578",
};

const REL_COLOR: Record<string, string> = {
  hostile: "#ef4444",
  rival: "#f97316",
  neutral: "#a1a1aa",
  ally: "#22c55e",
};

const REL_HOVER: Record<string, string> = {
  hostile: "#dc2626",
  rival: "#ea580c",
  neutral: "#71717a",
  ally: "#16a34a",
};

type Props = {
  scenario: ScenarioContext;
  mapState: MapState;
  onNeighborClick: (neighborName: string) => void;
};

export default function StrategicMap({ scenario, mapState, onNeighborClick }: Props) {
  const [tooltip, setTooltip] = useState<{ name: string; rel: string } | null>(null);

  const playerNumeric = ISO_TO_NUMERIC[scenario.playerCountryCode];

  // Build lookup: numeric id → { neighborName, currentRelationship }
  const numericToNeighbor: Record<string, { name: string; rel: string }> = {};
  for (const neighbor of scenario.neighbors) {
    const iso = NAME_TO_ISO[neighbor.name];
    if (!iso) continue;
    const numeric = ISO_TO_NUMERIC[iso];
    if (!numeric || numeric === playerNumeric) continue;
    const rel = mapState.relationships[neighbor.name] ?? neighbor.relationship;
    numericToNeighbor[numeric] = { name: neighbor.name, rel };
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
      <div className="relative">
        {tooltip ? (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-zinc-950/85 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            {tooltip.name}
            {" · "}
            <span style={{ color: REL_COLOR[tooltip.rel] ?? "#fff" }}>{tooltip.rel}</span>
          </div>
        ) : (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-zinc-950/85 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            {scenario.countryName} · {scenario.year}
          </div>
        )}

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: scenario.projectionConfig.scale,
            center: scenario.projectionConfig.center,
          }}
          width={800}
          height={380}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const id = String(geo.id);
                const isPlayer = id === playerNumeric;
                const neighbor = numericToNeighbor[id];
                const isNeighbor = !!neighbor;

                const fill = isPlayer
                  ? "#1c1917"
                  : isNeighbor
                    ? (REL_COLOR[neighbor.rel] ?? "#a1a1aa")
                    : "#e4e4e7";

                const hoverFill = isPlayer
                  ? "#292524"
                  : isNeighbor
                    ? (REL_HOVER[neighbor.rel] ?? "#71717a")
                    : "#d4d4d8";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#f4f4f5"
                    strokeWidth={0.5}
                    style={{
                      default: {
                        outline: "none",
                        cursor: isNeighbor ? "pointer" : "default",
                      },
                      hover: {
                        outline: "none",
                        fill: hoverFill,
                        cursor: isNeighbor ? "pointer" : "default",
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={() => {
                      if (isPlayer) {
                        setTooltip({ name: scenario.countryName, rel: "your realm" });
                      } else if (neighbor) {
                        setTooltip({ name: neighbor.name, rel: neighbor.rel });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => {
                      if (isNeighbor) onNeighborClick(neighbor.name);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-200 px-4 py-3">
        {scenario.neighbors.map((n) => {
          const rel = mapState.relationships[n.name] ?? n.relationship;
          return (
            <button
              key={n.name}
              type="button"
              onClick={() => onNeighborClick(n.name)}
              className="flex items-center gap-1.5 text-xs text-zinc-600 transition hover:text-zinc-950"
            >
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: REL_COLOR[rel] ?? "#a1a1aa" }}
              />
              {n.name}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-zinc-400">click to target</span>
      </div>
    </div>
  );
}
