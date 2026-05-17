"use client";

import { useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { Minus, Plus, RotateCcw } from "lucide-react";
import clsx from "clsx";
import type {
  CollectionDetail,
  EntityRelationship,
  KnowledgeEntity,
} from "@/lib/research/types";

type GraphNode = SimulationNodeDatum & {
  id: string;
  entity: KnowledgeEntity;
  radius: number;
};

type GraphLink = SimulationLinkDatum<GraphNode> & {
  id: string;
  relationship: EntityRelationship;
};

type KnowledgeGraphProps = {
  collection: CollectionDetail | null;
  selectedEntityId?: string | null;
  onSelectEntity: (entityId: string) => void;
};

const entityColors: Record<string, string> = {
  person: "#0f766e",
  people: "#0f766e",
  organization: "#0369a1",
  company: "#0369a1",
  technology: "#7c3aed",
  concept: "#b45309",
  topic: "#be123c",
  product: "#475569",
};

function colorForType(type: string) {
  return entityColors[type.toLowerCase()] ?? "#334155";
}

export function KnowledgeGraph({
  collection,
  selectedEntityId,
  onSelectEntity,
}: KnowledgeGraphProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const entityTypes = useMemo(
    () =>
      Array.from(
        new Set((collection?.entities ?? []).map((entity) => entity.type)),
      ).sort((a, b) => a.localeCompare(b)),
    [collection?.entities],
  );

  const graph = useMemo(() => {
    const visibleEntities = (collection?.entities ?? []).filter(
      (entity) => typeFilter === "all" || entity.type === typeFilter,
    );
    const visibleIds = new Set(visibleEntities.map((entity) => entity.id));
    const nodes: GraphNode[] = visibleEntities.map((entity) => ({
      id: entity.id,
      entity,
      radius: Math.min(34, 15 + Math.sqrt(entity.mentions) * 5),
    }));
    const links: GraphLink[] = (collection?.relationships ?? [])
      .filter(
        (relationship) =>
          visibleIds.has(relationship.sourceEntityId) &&
          visibleIds.has(relationship.targetEntityId),
      )
      .map((relationship) => ({
        id: relationship.id,
        source: relationship.sourceEntityId,
        target: relationship.targetEntityId,
        relationship,
      }));

    if (nodes.length) {
      const simulation = forceSimulation<GraphNode>(nodes)
        .force(
          "link",
          forceLink<GraphNode, GraphLink>(links)
            .id((node) => node.id)
            .distance((link) => 160 - link.relationship.strength * 56)
            .strength((link) => 0.2 + link.relationship.strength * 0.45),
        )
        .force("charge", forceManyBody().strength(-260))
        .force("collide", forceCollide<GraphNode>().radius((node) => node.radius + 22))
        .force("center", forceCenter(430, 260))
        .stop();

      for (let i = 0; i < 180; i += 1) {
        simulation.tick();
      }
    }

    return { nodes, links };
  }, [collection?.entities, collection?.relationships, typeFilter]);

  const selectedEntity = graph.nodes.find((node) => node.id === selectedEntityId);

  return (
    <div className="border border-slate-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Knowledge Graph Workspace</h2>
          <p className="mt-1 text-xs text-slate-500">
            {graph.nodes.length} entities / {graph.links.length} relationships
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-700"
            aria-label="Filter entity type"
          >
            <option value="all">All entity types</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setScale((value) => Math.max(0.65, value - 0.12))}
            className="border border-slate-300 p-1.5 text-slate-700"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setScale((value) => Math.min(1.7, value + 0.12))}
            className="border border-slate-300 p-1.5 text-slate-700"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            className="border border-slate-300 p-1.5 text-slate-700"
            aria-label="Reset graph"
            title="Reset graph"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {graph.nodes.length ? (
        <svg
          className="h-[30rem] w-full cursor-grab bg-[#f8faf9]"
          viewBox="0 0 860 520"
          role="img"
          aria-label="Interactive knowledge graph"
          onPointerDown={(event) => {
            dragRef.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) {
              return;
            }

            const dx = event.clientX - dragRef.current.x;
            const dy = event.clientY - dragRef.current.y;
            dragRef.current = { x: event.clientX, y: event.clientY };
            setOffset((value) => ({ x: value.x + dx, y: value.y + dy }));
          }}
          onPointerUp={(event) => {
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
        >
          <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
            {graph.links.map((link) => {
              const source = link.source as GraphNode;
              const target = link.target as GraphNode;
              const strongest = link.relationship.strength >= 0.78;

              return (
                <g key={link.id}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={strongest ? "#0f172a" : "#94a3b8"}
                    strokeOpacity={strongest ? 0.78 : 0.42}
                    strokeWidth={1 + link.relationship.strength * 4}
                  />
                  {strongest ? (
                    <text
                      x={((source.x ?? 0) + (target.x ?? 0)) / 2}
                      y={((source.y ?? 0) + (target.y ?? 0)) / 2}
                      textAnchor="middle"
                      className="fill-slate-600 text-[10px] font-semibold"
                    >
                      {link.relationship.relation}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {graph.nodes.map((node) => {
              const selected = selectedEntityId === node.id;

              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${node.entity.name}`}
                  onClick={() => onSelectEntity(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      onSelectEntity(node.id);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius}
                    fill={colorForType(node.entity.type)}
                    opacity={selected ? 1 : 0.88}
                    stroke={selected ? "#020617" : "#ffffff"}
                    strokeWidth={selected ? 4 : 2}
                  />
                  <text
                    x={node.x}
                    y={(node.y ?? 0) + node.radius + 15}
                    textAnchor="middle"
                    className={clsx(
                      "pointer-events-none fill-slate-800 text-[11px] font-semibold",
                      selected && "fill-slate-950",
                    )}
                  >
                    {node.entity.name.length > 24
                      ? `${node.entity.name.slice(0, 21)}...`
                      : node.entity.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      ) : (
        <div className="border-t border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
          Extract knowledge from a collection to populate the graph.
        </div>
      )}

      {selectedEntity ? (
        <div className="border-t border-slate-200 bg-white p-3 text-sm text-slate-700">
          Inspecting{" "}
          <span className="font-semibold text-slate-950">
            {selectedEntity.entity.name}
          </span>{" "}
          across {selectedEntity.entity.mentions} mentions.
        </div>
      ) : null}
    </div>
  );
}
