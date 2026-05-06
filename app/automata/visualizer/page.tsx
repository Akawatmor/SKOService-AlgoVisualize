"use client";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import packageJson from "../../../package.json";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  MarkerType,
  ConnectionMode,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ─── Local modules ───
import type {
  ModeType,
  PdaAcceptMode,
  PdaSettings,
  TmAcceptMode,
  TmInputMode,
  TmSettings,
  TextNoteNodeData,
  FrameBoxNodeData,
  ImportData,
  ImportNode,
  ImportEdge,
  PdaConfig,
  PdaPathNode,
  TmConfig,
  TmRule,
  TmPathNode,
  SimSnapshot,
  PromptState,
} from "./types";

import {
  PDA_STACK_START,
  PDA_MAX_EPSILON_EXPANSIONS,
  TM_BLANK,
  TM_MAX_STEPS,
  TM_DEFAULT_TAPE_COUNT,
  TM_DEFAULT_HEAD_COUNT,
  TM_MAX_TAPES,
  TM_MAX_HEADS,
  VISUALIZER_DRAFT_KEY,
} from "./constants";

import {
  buildAutomataShareUrl,
  VISUALIZER_SHARED_IMPORT_KEY,
} from "./shareUrl";

import { nodeTypes } from "./customNodes";

import {
  normalizeEpsilonSymbol,
  isEpsilon,
  isTransitionMatch,
  baseHandle,
  normalizeConnector,
  buildDisplaySubHandleMap,
  buildPdaConfig,
  formatPdaExtensionSummary,
  formatPdaStoreContents,
  getDefaultPdaRuleLabel,
  getPdaConfigKey,
  getPdaConfigStores,
  getPdaRulePromptTitle,
  getPdaStoreCount,
  isPdaStoreEmpty,
  normalizePdaSettings,
  parsePdaRules,
  isValidPdaLabel,
  tryConvertNfaShorthandToPda,
  applyPdaRule,
  parseTmRules,
  isValidTmLabel,
  parseMealyRules,
  toFaLabelFromPda,
  toPdaLabelFromFa,
  toTmLabelFromFa,
  toTmLabelFromPda,
  toFaLabelFromTm,
  toPdaLabelFromTm,
  splitLabelToSymbols,
  getAlphabetFromEdges,
  validateAutomaton,
  getEpsilonClosure,
  getNextStates,
  formatIssuesHtml,
  isRamJumpMove,
} from "./utils";

import { PromptModal } from "./PromptModal";
import { Sidebar } from "./Sidebar";
import ImportModal from "./ImportModal";
import PdaSettingsModal from "./PdaSettingsModal";
import TmSettingsModal from "./TmSettingsModal";

const BASE_PLAYBACK_DELAY_MS = 500;
const MIN_PLAYBACK_SPEED = 0.1;
const MAX_PLAYBACK_SPEED = 10;
const TM_DEFAULT_SHEET_COLUMNS = 8;
const TM_MIN_SHEET_COLUMNS = 2;
const TM_MAX_SHEET_COLUMNS = 16;
const HELP_GUIDE_PATH = "/automata/visualizer/help";

const getPlaybackDelayMs = (speed: number) =>
  Math.round(BASE_PLAYBACK_DELAY_MS / speed);

const formatPlaybackSpeed = (speed: number) =>
  `${Number.isInteger(speed) ? speed.toFixed(0) : speed.toFixed(1)}x`;

const buildDefaultHeadToTape = (headCount: number, tapeCount: number) =>
  Array.from({ length: headCount }, (_, index) =>
    Math.min(index, Math.max(0, tapeCount - 1))
  );

const normalizeSheetColumns = (value?: number | null) =>
  Math.max(
    TM_MIN_SHEET_COLUMNS,
    Math.min(TM_MAX_SHEET_COLUMNS, Number(value) || TM_DEFAULT_SHEET_COLUMNS)
  );

const isSheetMove = (move: string) => move === "U" || move === "D";

const normalizeTrackList = (
  rawTracks: unknown,
  tapeCount: number,
  fallbackTrack: number
) => {
  const source = Array.isArray(rawTracks) ? rawTracks : [];
  const normalized: number[] = [];
  const seen = new Set<number>();

  source.forEach((entry) => {
    if (typeof entry !== "number" || Number.isNaN(entry)) return;
    const track = Math.max(0, Math.min(tapeCount - 1, Math.trunc(entry)));
    if (seen.has(track)) return;
    seen.add(track);
    normalized.push(track);
  });

  if (normalized.length > 0) return normalized;
  return [Math.max(0, Math.min(tapeCount - 1, fallbackTrack))];
};

type LegacyTmSettingsInput = Partial<TmSettings> & { trackMode?: boolean };

const normalizeHeadTrackMap = (
  settings: LegacyTmSettingsInput | null | undefined,
  headCount: number,
  tapeCount: number,
  fallbackHeadToTape: number[]
) => {
  const rawHeadTrackMap = Array.isArray(settings?.headTrackMap) ? settings.headTrackMap : [];
  const legacySharedTrackPreset = settings?.trackMode === true && headCount === 1;

  return Array.from({ length: headCount }, (_, headIndex) => {
    const fallbackTrack = fallbackHeadToTape[headIndex] ?? 0;
    if (legacySharedTrackPreset && headIndex === 0 && rawHeadTrackMap.length === 0) {
      return Array.from({ length: tapeCount }, (_, tapeIndex) => tapeIndex);
    }
    return normalizeTrackList(rawHeadTrackMap[headIndex], tapeCount, fallbackTrack);
  });
};

const hasAnyMultiTrackHead = (settings: TmSettings) =>
  settings.headTrackMap.some((tracks) => tracks.length > 1);

const getTmRuleSlots = (settings: TmSettings) =>
  settings.headTrackMap.flatMap((tracks, headIndex) =>
    tracks.map((tapeIndex, trackIndex) => ({ headIndex, tapeIndex, trackIndex }))
  );

const getTmHeadTrackGroups = (settings: TmSettings) => {
  let startIndex = 0;
  return settings.headTrackMap.map((tracks, headIndex) => {
    const group = {
      headIndex,
      tracks,
      startIndex,
      length: tracks.length,
      slotIndexes: Array.from({ length: tracks.length }, (_, offset) => startIndex + offset),
    };
    startIndex += tracks.length;
    return group;
  });
};

const getTmHeadGroup = (settings: TmSettings, headIndex: number) =>
  getTmHeadTrackGroups(settings)[headIndex];

const getTmHeadMove = (rule: TmRule, settings: TmSettings, headIndex: number) => {
  const group = getTmHeadGroup(settings, headIndex);
  if (!group) return "S";
  return rule.moves[group.startIndex] ?? "S";
};

const getTmRuleArity = (settings: TmSettings) =>
  getTmRuleSlots(settings).length;

const isTmMoveEnabled = (move: string, settings: TmSettings) => {
  if (isSheetMove(move)) return settings.sheetMode === "sheet-2d";
  if (isRamJumpMove(move)) return settings.ramEnabled;
  return true;
};

const isTmRuleEnabled = (rule: TmRule, settings: TmSettings) =>
  rule.moves.every((move) => isTmMoveEnabled(move, settings));

const getHeadMoveMismatchHeads = (rule: TmRule, settings: TmSettings) =>
  getTmHeadTrackGroups(settings)
    .filter((group) => {
      if (group.length <= 1) return false;
      const moves = group.slotIndexes.map((slotIndex) => rule.moves[slotIndex]);
      return new Set(moves).size > 1;
    })
    .map((group) => group.headIndex);

const hasTrackMoveMismatch = (rule: TmRule, settings: TmSettings) =>
  getHeadMoveMismatchHeads(rule, settings).length > 0;

const extractStateStorage = (label?: string | null) => {
  const trimmed = (label || "").trim();
  const match = trimmed.match(/(?:\{([^{}]+)\}|\[([^\[\]]+)\])\s*$/);
  return (match?.[1] ?? match?.[2] ?? "").trim() || null;
};

const getStateStorageLabel = (stateId: string, stateNodes: Node[]) => {
  const node = stateNodes.find((entry) => entry.id === stateId);
  const rawLabel = typeof node?.data?.label === "string" ? node.data.label : stateId;
  return extractStateStorage(rawLabel);
};

const formatTmCursorPosition = (position: number, settings: TmSettings) => {
  if (settings.sheetMode !== "sheet-2d") return `@${position}`;
  const columns = normalizeSheetColumns(settings.sheetColumns);
  const row = Math.floor(position / columns);
  const column = position % columns;
  return `@r${row}c${column}`;
};

const formatTmExtensionSummary = (settings: TmSettings) => {
  const parts: string[] = [];
  if (settings.sheetMode === "sheet-2d") {
    parts.push(`2D ${normalizeSheetColumns(settings.sheetColumns)} cols`);
  }
  if (settings.ramEnabled) parts.push("RAM jump");
  if (settings.stateStorageEnabled) parts.push("State storage");
  return parts.length > 0 ? parts.join(" · ") : "Classic tape";
};

const getTmUnsupportedMoves = (label: string, settings: TmSettings) => {
  const rules = parseTmRules(label, getTmRuleArity(settings));
  const unsupported = new Set<string>();
  rules.forEach((rule) => {
    rule.moves.forEach((move) => {
      if (!isTmMoveEnabled(move, settings)) unsupported.add(move);
    });
  });
  return Array.from(unsupported.values());
};

const getTmTrackRuleIssues = (label: string, settings: TmSettings) => {
  if (!hasAnyMultiTrackHead(settings)) return [] as string[];
  const rules = parseTmRules(label, getTmRuleArity(settings));
  return rules
    .flatMap((rule, ruleIndex) =>
      getHeadMoveMismatchHeads(rule, settings).map(
        (headIndex) =>
          `Rule ${ruleIndex + 1} uses different moves inside head ${headIndex + 1}. A single head must move all of its assigned tracks together.`
      )
    );
};

const ensureTapeIndex = (tape: string[], targetIndex: number) => {
  while (tape.length <= targetIndex) tape.push(TM_BLANK);
};

const normalizeTmSettings = (settings?: LegacyTmSettingsInput | null): TmSettings => {
  const legacySharedTrackPreset = settings?.trackMode === true;
  const tapeCount = Math.max(
    1,
    Math.min(TM_MAX_TAPES, Number(settings?.tapeCount) || TM_DEFAULT_TAPE_COUNT)
  );
  const headCount = Math.max(
    1,
    Math.min(
      TM_MAX_HEADS,
      legacySharedTrackPreset ? 1 : Number(settings?.headCount) || TM_DEFAULT_HEAD_COUNT
    )
  );
  const fallbackHeadToTape = buildDefaultHeadToTape(headCount, tapeCount);
  const rawHeadToTape = Array.isArray(settings?.headToTape) ? settings.headToTape : [];
  const headToTape = Array.from({ length: headCount }, (_, index) => {
    const raw = rawHeadToTape[index];
    if (typeof raw !== "number" || Number.isNaN(raw)) return fallbackHeadToTape[index];
    return Math.max(0, Math.min(tapeCount - 1, Math.trunc(raw)));
  });
  const headTrackMap = normalizeHeadTrackMap(settings, headCount, tapeCount, headToTape);

  return {
    tapeCount,
    headCount,
    headToTape: headTrackMap.map((tracks) => tracks[0] ?? 0),
    headTrackMap,
    inputMode: settings?.inputMode === "textbook" ? "textbook" : "machine",
    sheetMode: settings?.sheetMode === "sheet-2d" ? "sheet-2d" : "linear",
    sheetColumns: normalizeSheetColumns(settings?.sheetColumns),
    ramEnabled: settings?.ramEnabled === true,
    stateStorageEnabled: settings?.stateStorageEnabled === true,
  };
};

const seedTmTapesFromInput = (
  inputString: string,
  tapeCount: number,
  inputMode: TmInputMode
) => {
  const seededInput = inputString.length > 0 ? inputString.split("") : [TM_BLANK];
  return Array.from({ length: tapeCount }, (_, tapeIndex) => {
    if (inputMode === "textbook") return [...seededInput];
    return tapeIndex === 0 ? [...seededInput] : [TM_BLANK];
  });
};

const getTmReadSymbols = (cfg: TmConfig, settings: TmSettings) =>
  getTmRuleSlots(settings).map(({ headIndex, tapeIndex }) => {
    const headPos = cfg.heads[headIndex] ?? 0;
    const tape = cfg.tapes[tapeIndex] ?? [TM_BLANK];
    return tape[headPos] ?? TM_BLANK;
  });

const formatTmInputModeLabel = (inputMode: TmInputMode) =>
  inputMode === "textbook" ? "Textbook" : "Machine";

const formatTmHeadMapping = (settings: TmSettings) =>
  settings.headTrackMap
        .map((tracks, headIndex) => `H${headIndex + 1}->${tracks.map((tapeIndex) => `T${tapeIndex + 1}`).join("+")}`)
        .join(", ");

const getDefaultTmRuleLabel = (settings: TmSettings) => {
  const moveToken = settings.ramEnabled ? "@4" : settings.sheetMode === "sheet-2d" ? "D" : "R";
  const arity = getTmRuleArity(settings);
  if (arity <= 1) return `0->1,${moveToken}`;

  const reads = Array.from({ length: arity }, () => "0").join(",");
  const writes = Array.from({ length: arity }, () => "1").join(",");
  const moves = Array.from({ length: arity }, () => moveToken).join(",");
  return `(${reads})->(${writes}),(${moves})`;
};

const getTmRulePromptTitle = (action: "Input" | "Edit", settings: TmSettings) => {
  const extensionNotes = [
    hasAnyMultiTrackHead(settings)
      ? "multi-track heads: slot order is grouped by head, and each head uses one shared move across its tracks"
      : null,
    settings.sheetMode === "sheet-2d" ? "U/D for matrix moves" : null,
    settings.ramEnabled ? "@12 for RAM jump" : null,
    settings.stateStorageEnabled ? "state labels may end with {payload}" : null,
  ]
    .filter(Boolean)
    .join("; ");

  if (getTmRuleArity(settings) <= 1) {
    return `${action} TM rule(s) (e.g. "0->1,R; B->B,L" or "0/1,R" — B = blank${
      extensionNotes ? `; ${extensionNotes}` : ""
    })`;
  }
  return `${action} TM rule(s) (one slot per head-track lane, e.g. "${getDefaultTmRuleLabel(
    settings
  )}"${extensionNotes ? `; ${extensionNotes}` : ""})`;
};

// ─────────────────────────────────────────────────────────
// Main Editor Component
// ─────────────────────────────────────────────────────────

function AutomataEditor() {
  // ─── Swal theme ───
  const uiSwal = Swal.mixin({
    background: "#0f172a",
    color: "#e2e8f0",
    confirmButtonColor: "#0ea5e9",
    cancelButtonColor: "#475569",
  });

  // ─── Core state ───
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [nodeCount, setNodeCount] = useState(0);
  const [mode, setMode] = useState<ModeType>("NFA");
  const isPdaMode = mode === "DPDA" || mode === "NPDA";
  const isTmMode = mode === "DTM" || mode === "NTM" || mode === "LBA";
  const isMealyMoore = mode === "Mealy" || mode === "Moore";
  const isBuchi = mode === "Buchi";
  const isTimed = mode === "Timed";

  // ─── Acceptance mode state ───
  const [pdaAcceptMode, setPdaAcceptMode] = useState<PdaAcceptMode>("final-state");
  const [tmAcceptMode, setTmAcceptMode] = useState<TmAcceptMode>("final-state");
  const [pdaSettings, setPdaSettings] = useState<PdaSettings>(() =>
    normalizePdaSettings()
  );

  // ─── TM Multi-tape/Multi-head settings ───
  const [tmSettings, setTmSettings] = useState<TmSettings>(() =>
    normalizeTmSettings()
  );

  const updatePdaSettings = (updates: Partial<PdaSettings>) => {
    setPdaSettings((prev) => normalizePdaSettings({ ...prev, ...updates }));
  };

  const updateTmSettings = (updates: Partial<TmSettings>) => {
    setTmSettings((prev) => normalizeTmSettings({ ...prev, ...updates }));
  };

  // ─── Timeline navigation state ───
  const [timelineIndex, setTimelineIndex] = useState(-1); // Current position in timeline (-1 = live/latest)

  // ─── Simulation state ───
  const [inputString, setInputString] = useState("");
  const [activeStates, setActiveStates] = useState<Set<string>>(new Set());
  const [stepIndex, setStepIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [simMessage, setSimMessage] = useState("Ready");
  const [history, setHistory] = useState<string[]>([]);
  const [pdaConfigs, setPdaConfigs] = useState<PdaConfig[]>([]);
  const [tmConfigs, setTmConfigs] = useState<TmConfig[]>([]);
  const [simTimeline, setSimTimeline] = useState<SimSnapshot[]>([]);
  const [outputString, setOutputString] = useState(""); // For Mealy/Moore
  const [isDraftReady, setIsDraftReady] = useState(false);

  // ─── Refs ───
  const runLoopRef = useRef<number | null>(null);
  const activeStatesRef = useRef(activeStates);
  const stepIndexRef = useRef(stepIndex);
  const edgesRef = useRef(edges);
  const nodesRef = useRef<Node[]>(nodes);
  const pdaConfigsRef = useRef(pdaConfigs);
  const tmConfigsRef = useRef(tmConfigs);
  const pdaPathConfigsRef = useRef<PdaConfig[]>([]);
  const tmPathConfigsRef = useRef<TmConfig[]>([]);
  const pdaPathNodesRef = useRef<PdaPathNode[]>([]);
  const tmPathNodesRef = useRef<TmPathNode[]>([]);
  const nextPathNodeIdRef = useRef(0);
  const historyRef = useRef(history);
  const playbackSpeedRef = useRef(playbackSpeed);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFromJsonStringRef = useRef<((content: string) => Promise<void>) | null>(null);

  const getStateNodes = (list: Node[]) =>
    list.filter((n) => (n.type || "stateNode") === "stateNode");

  const clonePdaConfigs = React.useCallback((configs: PdaConfig[]) =>
    configs.map((cfg) => ({
      state: cfg.state,
      stack: [...cfg.stack],
      stacks: Array.isArray(cfg.stacks)
        ? cfg.stacks.map((store) => [...store])
        : undefined,
      storageModel: cfg.storageModel,
    })), []);

  const cloneTmConfigs = React.useCallback((configs: TmConfig[]) =>
    configs.map((cfg) => ({
      state: cfg.state,
      tapes: cfg.tapes.map((tape) => [...tape]),
      heads: [...cfg.heads],
    })), []);

  const clonePdaPathNodes = React.useCallback((nodes: PdaPathNode[]): PdaPathNode[] =>
    nodes.map((node) => ({
      id: node.id,
      parentId: node.parentId,
      stepIndex: node.stepIndex,
      state: node.state,
      stack: [...node.stack],
      stacks: Array.isArray(node.stacks)
        ? node.stacks.map((store) => [...store])
        : undefined,
      storageModel: node.storageModel,
      transitionLabel: node.transitionLabel,
    })), []);

  const cloneTmPathNodes = React.useCallback((nodes: TmPathNode[]): TmPathNode[] =>
    nodes.map((node) => ({
      id: node.id,
      parentId: node.parentId,
      stepIndex: node.stepIndex,
      state: node.state,
      tapes: node.tapes.map((tape) => [...tape]),
      heads: [...node.heads],
      transitionLabel: node.transitionLabel,
    })), []);

  const cloneSimTimeline = React.useCallback((timeline: SimSnapshot[]): SimSnapshot[] =>
    timeline.map((snap) => ({
      stepIndex: snap.stepIndex,
      activeStates: [...snap.activeStates],
      pdaConfigs: clonePdaConfigs(snap.pdaConfigs),
      tmConfigs: cloneTmConfigs(snap.tmConfigs),
      pdaPathConfigs: snap.pdaPathConfigs ? clonePdaConfigs(snap.pdaPathConfigs) : undefined,
      tmPathConfigs: snap.tmPathConfigs ? cloneTmConfigs(snap.tmPathConfigs) : undefined,
      pdaPathNodes: snap.pdaPathNodes ? clonePdaPathNodes(snap.pdaPathNodes) : undefined,
      tmPathNodes: snap.tmPathNodes ? cloneTmPathNodes(snap.tmPathNodes) : undefined,
      simMessage: snap.simMessage,
      history: [...snap.history],
    })), [clonePdaConfigs, cloneTmConfigs, clonePdaPathNodes, cloneTmPathNodes]);

  const createPathNodeId = (prefix: "pda" | "tm") =>
    `${prefix}-${nextPathNodeIdRef.current++}`;

  const pdaConfigFromPathNode = (node: PdaPathNode): PdaConfig =>
    buildPdaConfig(
      node.state,
      Array.isArray(node.stacks) && node.stacks.length > 0
        ? node.stacks
        : [node.stack],
      pdaSettings
    );

  const tmConfigFromPathNode = (node: TmPathNode): TmConfig => ({
    state: node.state,
    tapes: node.tapes.map((tape) => [...tape]),
    heads: [...node.heads],
  });

  const buildFallbackPdaPathNodes = (configs: PdaConfig[], snapshotStep: number) =>
    configs.map((cfg, index) => ({
      id: `legacy-pda-${snapshotStep}-${index}`,
      parentId: null,
      stepIndex: snapshotStep,
      state: cfg.state,
      stack: [...cfg.stack],
      stacks: getPdaConfigStores(cfg, pdaSettings).map((store) => [...store]),
      storageModel: pdaSettings.storageModel,
      transitionLabel: snapshotStep === 0 ? "Start" : `Step ${snapshotStep}`,
    }));

  const buildFallbackTmPathNodes = (configs: TmConfig[], snapshotStep: number) =>
    configs.map((cfg, index) => ({
      id: `legacy-tm-${snapshotStep}-${index}`,
      parentId: null,
      stepIndex: snapshotStep,
      state: cfg.state,
      tapes: cfg.tapes.map((tape) => [...tape]),
      heads: [...cfg.heads],
      transitionLabel: snapshotStep === 0 ? "Start" : `Step ${snapshotStep}`,
    }));

  const expandPdaPathNodes = (nodes: PdaPathNode[], currentEdges: Edge[]) => {
    const keyOf = (node: PdaPathNode) => getPdaConfigKey(pdaConfigFromPathNode(node), pdaSettings);
    const queue: Array<{ node: PdaPathNode; seen: Set<string> }> = nodes.map((node) => ({
      node: {
        ...node,
        stack: [...node.stack],
        stacks: Array.isArray(node.stacks)
          ? node.stacks.map((store) => [...store])
          : undefined,
      },
      seen: new Set<string>([keyOf(node)]),
    }));
    const out = clonePdaPathNodes(nodes);

    let expansions = 0;
    while (queue.length > 0 && expansions < PDA_MAX_EPSILON_EXPANSIONS) {
      const current = queue.shift();
      if (!current) break;

      const outgoing = currentEdges.filter((edge) => edge.source === current.node.state);
      outgoing.forEach((edge) => {
        const rules = parsePdaRules(edge.label as string, pdaSettings).filter(
          (rule) => normalizeEpsilonSymbol(rule.input) === "ε"
        );

        rules.forEach((rule) => {
          const next = applyPdaRule(
            pdaConfigFromPathNode(current.node),
            edge.target,
            rule,
            pdaSettings
          );
          if (!next) return;

          const nextKey = getPdaConfigKey(next, pdaSettings);
          if (current.seen.has(nextKey)) return;

          const nextNode: PdaPathNode = {
            id: createPathNodeId("pda"),
            parentId: current.node.id,
            stepIndex: current.node.stepIndex,
            state: next.state,
            stack: [...next.stack],
            stacks: getPdaConfigStores(next, pdaSettings).map((store) => [...store]),
            storageModel: pdaSettings.storageModel,
            transitionLabel: "ε-move",
          };

          out.push(nextNode);
          const nextSeen = new Set(current.seen);
          nextSeen.add(nextKey);
          queue.push({ node: nextNode, seen: nextSeen });
        });
      });

      expansions += 1;
    }

    return out;
  };

  const dedupePdaConfigs = (configs: PdaConfig[]) => {
    const unique = new Map<string, PdaConfig>();
    configs.forEach((cfg) => {
      const key = getPdaConfigKey(cfg, pdaSettings);
      if (!unique.has(key)) {
        unique.set(
          key,
          buildPdaConfig(cfg.state, getPdaConfigStores(cfg, pdaSettings), pdaSettings)
        );
      }
    });
    return Array.from(unique.values());
  };

  const formatPdaConfigSummary = React.useCallback(
    (cfg: PdaConfig) => {
      const stores = getPdaConfigStores(cfg, pdaSettings);
      if (stores.length === 1 && pdaSettings.storageModel === "stack") {
        return `${cfg.state}:[${formatPdaStoreContents(stores[0], pdaSettings)}]`;
      }
      if (pdaSettings.storageModel === "queue") {
        return `${cfg.state} Q:[${formatPdaStoreContents(stores[0], pdaSettings)}]`;
      }
      return `${cfg.state} ${stores
        .map(
          (store, index) =>
            `S${index + 1}:[${formatPdaStoreContents(store, pdaSettings)}]`
        )
        .join(" ")}`;
    },
    [pdaSettings]
  );

  const dedupeTmConfigs = (configs: TmConfig[]) => {
    const unique = new Map<string, TmConfig>();
    configs.forEach((cfg) => {
      const tapesStr = cfg.tapes.map((tape) => tape.join("")).join("|");
      const key = `${cfg.state}|${cfg.heads.join(",")}|${tapesStr}`;
      if (!unique.has(key)) {
        unique.set(key, {
          state: cfg.state,
          tapes: cfg.tapes.map((tape) => [...tape]),
          heads: [...cfg.heads],
        });
      }
    });
    return Array.from(unique.values());
  };

  // Keep refs in sync
  useEffect(() => { activeStatesRef.current = activeStates; }, [activeStates]);
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { pdaConfigsRef.current = pdaConfigs; }, [pdaConfigs]);
  useEffect(() => { tmConfigsRef.current = tmConfigs; }, [tmConfigs]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

  const clearRunLoop = () => {
    if (runLoopRef.current !== null) {
      window.clearTimeout(runLoopRef.current);
      runLoopRef.current = null;
    }
    setIsAutoRunning(false);
  };

  // ─── Simulation helpers ───
  const pushSimSnapshot = (next: {
    stepIndex: number;
    activeStates: Set<string>;
    pdaConfigs: PdaConfig[];
    tmConfigs: TmConfig[];
    pdaPathConfigs?: PdaConfig[];
    tmPathConfigs?: TmConfig[];
    pdaPathNodes?: PdaPathNode[];
    tmPathNodes?: TmPathNode[];
    simMessage: string;
    history: string[];
  }) => {
    setSimTimeline((prev) => [
      ...prev,
      {
        stepIndex: next.stepIndex,
        activeStates: Array.from(next.activeStates),
        pdaConfigs: clonePdaConfigs(next.pdaConfigs),
        tmConfigs: cloneTmConfigs(next.tmConfigs),
        pdaPathConfigs: clonePdaConfigs(next.pdaPathConfigs ?? next.pdaConfigs),
        tmPathConfigs: cloneTmConfigs(next.tmPathConfigs ?? next.tmConfigs),
        pdaPathNodes: clonePdaPathNodes(next.pdaPathNodes ?? []),
        tmPathNodes: cloneTmPathNodes(next.tmPathNodes ?? []),
        simMessage: next.simMessage,
        history: [...next.history],
      },
    ]);
  };

  /** Briefly highlight edges that were traversed. */
  const flashEdges = (ids: Set<string>, ms: number) => {
    if (ids.size === 0) return;
    setEdges((prev) =>
      prev.map((edge) =>
        ids.has(edge.id)
          ? {
              ...edge,
              style: { ...(edge.style || {}), stroke: "#facc15", strokeWidth: 4 },
              animated: true,
            }
          : edge
      )
    );
    setTimeout(() => {
      setEdges((prev) =>
        prev.map((edge) =>
          ids.has(edge.id)
            ? {
                ...edge,
                style: { ...(edge.style || {}), stroke: "#94a3b8", strokeWidth: 2 },
                animated: isEpsilon(edge.label as string),
              }
            : edge
        )
      );
    }, ms);
  };

  // ─── Simulation actions ───

  const startSimulation = () => {
    const stateNodes = getStateNodes(nodes);
    const startNode = stateNodes.find((n) => n.data.isStart);
    if (!startNode) {
      uiSwal.fire("Error", "Start state not found.", "error");
      return false;
    }

    const isolatedNodes = stateNodes
      .filter((n) => !edges.some((e) => e.source === n.id || e.target === n.id))
      .map((n) => n.id);
    if (isolatedNodes.length > 0) {
      uiSwal.fire({
        icon: "error",
        title: "Isolated state detected",
        html: formatIssuesHtml(
          isolatedNodes.map((id) => `State ${id} has no connected transition.`)
        ),
      });
      return false;
    }

    const hasAcceptingState = stateNodes.some((n) => !!n.data.isAccept);
    if (!hasAcceptingState) {
      uiSwal.fire(
        "Warning",
        "No accepting state found. Please mark at least one accepting state before simulation.",
        "warning"
      );
      return false;
    }

    if (mode === "DFA") {
      const { issues } = validateAutomaton("DFA", stateNodes, edges, isTmMode, isPdaMode);
      if (issues.length > 0) {
        uiSwal.fire({
          icon: "error",
          title: "DFA validation failed",
          html: formatIssuesHtml(issues),
        });
        return false;
      }
    }

    // TM
    if (isTmMode) {
      const extensionIssues: string[] = [];
      edges.forEach((edge) => {
        const unsupportedMoves = getTmUnsupportedMoves((edge.label as string) || "", tmSettings);
        const trackRuleIssues = getTmTrackRuleIssues((edge.label as string) || "", tmSettings);
        if (unsupportedMoves.length > 0) {
          extensionIssues.push(
            `Transition ${edge.source} -> ${edge.target} uses move(s) ${unsupportedMoves.join(", ")} without enabling the matching TM extension.`
          );
        }
        extensionIssues.push(...trackRuleIssues.map((issue) => `Transition ${edge.source} -> ${edge.target}: ${issue}`));
      });
      if (extensionIssues.length > 0) {
        uiSwal.fire({
          icon: "error",
          title: "TM extension mismatch",
          html: formatIssuesHtml(extensionIssues),
        });
        return false;
      }

      if (mode !== "NTM") {
        const seen = new Set<string>();
        const issues: string[] = [];
        const ruleArity = getTmRuleArity(tmSettings);
        edges.forEach((edge) => {
          const rules = parseTmRules(edge.label as string, ruleArity);
          rules.forEach((rule) => {
            // For multi-tape, key includes all read symbols
            const key = `${edge.source}|${rule.reads.join(',')}`;
            if (seen.has(key))
              issues.push(
                `Nondeterministic TM rule from ${edge.source} on '${rule.reads.join(',')}'`
              );
            seen.add(key);
          });
        });
        if (issues.length > 0) {
          uiSwal.fire({
            icon: "error",
            title: `${mode} validation failed`,
            html: formatIssuesHtml(issues),
          });
          return false;
        }
      }

      nextPathNodeIdRef.current = 0;

      const { tapeCount, headCount } = tmSettings;
      const initialTapes = seedTmTapesFromInput(
        inputString,
        tapeCount,
        tmSettings.inputMode
      );
      
      const initialHeads = Array.from({ length: headCount }, () => 0);

      const initialConfigs: TmConfig[] = [
        { state: startNode.id, tapes: initialTapes, heads: initialHeads },
      ];
      const initialPathNodes: TmPathNode[] = initialConfigs.map((cfg) => ({
        id: createPathNodeId("tm"),
        parentId: null,
        stepIndex: 0,
        state: cfg.state,
        tapes: cfg.tapes.map((tape) => [...tape]),
        heads: [...cfg.heads],
        transitionLabel: "Start",
      }));
      const active = new Set(initialConfigs.map((c) => c.state));
      const headsInfo = headCount > 1
        ? `, heads=[${initialHeads.map((pos) => formatTmCursorPosition(pos, tmSettings)).join(', ')}]`
        : `, head=${formatTmCursorPosition(0, tmSettings)}`;
      const tapesInfo = tapeCount > 1 ? ` (${tapeCount} tapes)` : '';
      const startMsg = `TM start at ${startNode.id}${headsInfo}${tapesInfo} · ${formatTmInputModeLabel(
        tmSettings.inputMode
      )} · ${formatTmExtensionSummary(tmSettings)}`;
      const startHistory = [
        `Start TM at ${startNode.id}${tapesInfo} · ${formatTmHeadMapping(tmSettings)} · ${formatTmInputModeLabel(
          tmSettings.inputMode
        )} · ${formatTmExtensionSummary(tmSettings)}`,
      ];
      tmPathConfigsRef.current = cloneTmConfigs(initialConfigs);
      tmPathNodesRef.current = cloneTmPathNodes(initialPathNodes);
      pdaPathConfigsRef.current = [];
      pdaPathNodesRef.current = [];

      setTmConfigs(initialConfigs);
      setPdaConfigs([]);
      setActiveStates(active);
      setStepIndex(0);
      setIsRunning(true);
      setIsAutoRunning(false);
      setSimMessage(startMsg);
      setHistory(startHistory);
      setSimTimeline([]);
      setTimelineIndex(-1);
      pushSimSnapshot({
        stepIndex: 0,
        activeStates: active,
        pdaConfigs: [],
        tmConfigs: initialConfigs,
        tmPathConfigs: initialConfigs,
        tmPathNodes: initialPathNodes,
        simMessage: startMsg,
        history: startHistory,
      });
      return true;
    }

    // PDA
    if (isPdaMode) {
      const invalidPdaEdges = edges.filter((edge) => {
        const label = ((edge.label as string) || "").trim();
        return label !== "" && parsePdaRules(label, pdaSettings).length === 0;
      });
      if (invalidPdaEdges.length > 0) {
        uiSwal.fire({
          icon: "error",
          title: "PDA setup mismatch",
          html: formatIssuesHtml(
            invalidPdaEdges.map(
              (edge) =>
                `Transition ${edge.source} -> ${edge.target} does not match ${formatPdaExtensionSummary(
                  pdaSettings
                )}. Update the PDA setup or rewrite that label.`
            )
          ),
        });
        return false;
      }

      nextPathNodeIdRef.current = 0;
      const initialStores = Array.from(
        { length: getPdaStoreCount(pdaSettings) },
        () => [PDA_STACK_START]
      );
      const initialConfig = buildPdaConfig(startNode.id, initialStores, pdaSettings);
      const initialPathNodes = expandPdaPathNodes([
        {
          id: createPathNodeId("pda"),
          parentId: null,
          stepIndex: 0,
          state: initialConfig.state,
          stack: [...initialConfig.stack],
          stacks: getPdaConfigStores(initialConfig, pdaSettings).map((store) => [...store]),
          storageModel: pdaSettings.storageModel,
          transitionLabel: "Start",
        },
      ], edges);
      const initialPathConfigs = initialPathNodes.map((node) => pdaConfigFromPathNode(node));
      const initialConfigs = dedupePdaConfigs(initialPathConfigs);
      pdaPathConfigsRef.current = clonePdaConfigs(initialPathConfigs);
      pdaPathNodesRef.current = clonePdaPathNodes(initialPathNodes);
      tmPathConfigsRef.current = [];
      tmPathNodesRef.current = [];
      const active = new Set(initialConfigs.map((c) => c.state));
      setPdaConfigs(initialConfigs);
      setActiveStates(active);
      setStepIndex(0);
      setIsRunning(true);
      setIsAutoRunning(false);
      const sample = initialConfigs
        .slice(0, 3)
        .map((c) => formatPdaConfigSummary(c))
        .join(" | ");
      const startMsg = `PDA start (${initialConfigs.length} cfg): ${sample}${
        initialConfigs.length > 3 ? " ..." : ""
      }`;
      const startHistory = [
        `Start PDA: ${sample}${initialConfigs.length > 3 ? " ..." : ""}`,
      ];
      setSimMessage(startMsg);
      setHistory(startHistory);
      setSimTimeline([]);
      setTimelineIndex(-1);
      pushSimSnapshot({
        stepIndex: 0,
        activeStates: active,
        pdaConfigs: initialConfigs,
        tmConfigs: [],
        pdaPathConfigs: initialPathConfigs,
        pdaPathNodes: initialPathNodes,
        simMessage: startMsg,
        history: startHistory,
      });
      return true;
    }

    // FA (including Mealy/Moore/Büchi/Timed)
    const initialSet = getEpsilonClosure([startNode.id], edges, mode);
    setActiveStates(initialSet);
    setPdaConfigs([]);
    setTmConfigs([]);
    pdaPathConfigsRef.current = [];
    tmPathConfigsRef.current = [];
    pdaPathNodesRef.current = [];
    tmPathNodesRef.current = [];
    nextPathNodeIdRef.current = 0;
    setOutputString(""); // Reset output for transducers
    
    // For Moore machine, initial output is from start state
    if (mode === "Moore") {
      const startOutput = (startNode.data as { mooreOutput?: string })?.mooreOutput || "";
      if (startOutput) setOutputString(startOutput);
    }
    
    setStepIndex(0);
    setIsRunning(true);
    setIsAutoRunning(false);
    const modeLabel = isMealyMoore ? `${mode} transducer` : (isBuchi ? "Büchi" : (isTimed ? "Timed" : "FA"));
    const startMsg = `Start ${modeLabel} at: {${Array.from(initialSet).join(", ")}}`;
    const startHistory = [`Start: {${Array.from(initialSet).join(", ")}}`];
    setSimMessage(startMsg);
    setHistory(startHistory);
    setSimTimeline([]);
    setTimelineIndex(-1);
    pushSimSnapshot({
      stepIndex: 0,
      activeStates: initialSet,
      pdaConfigs: [],
      tmConfigs: [],
      simMessage: startMsg,
      history: startHistory,
    });
    return true;
  };

  const executeStep = () => {
    const idx = stepIndexRef.current;
    const str = inputString;
    const currentEdges = edgesRef.current;

    // ── TM step (multi-tape support) ──
    if (isTmMode) {
      const nextStepIndex = idx + 1;
      const currentPathNodes = tmPathNodesRef.current.length > 0
        ? tmPathNodesRef.current
        : buildFallbackTmPathNodes(tmConfigsRef.current, idx);
      if (currentPathNodes.length === 0) {
        setIsRunning(false);
        return false;
      }

        const { headCount, headTrackMap } = tmSettings;
        const ruleArity = getTmRuleArity(tmSettings);
      const currentStateNodes = getStateNodes(nodesRef.current);
      const usedEdgeIds = new Set<string>();
      const movedNodes: TmPathNode[] = [];

      currentPathNodes.forEach((pathNode) => {
        const cfg = tmConfigFromPathNode(pathNode);
        const outgoing = currentEdges.filter((e) => e.source === cfg.state);
        const currentSyms = getTmReadSymbols(cfg, tmSettings);

        outgoing.forEach((edge) => {
          const rules = parseTmRules(edge.label as string, ruleArity).filter((r) => {
            if (!isTmRuleEnabled(r, tmSettings)) return false;
            if (hasTrackMoveMismatch(r, tmSettings)) return false;
            // Match rule if all read symbols match
            if (r.reads.length !== currentSyms.length) return false;
            return r.reads.every((read, i) => read === currentSyms[i]);
          });

          rules.forEach((rule) => {
            // Clone tapes
            const nextTapes = cfg.tapes.map(tape => [...tape]);
            const nextHeads = [...cfg.heads];
            let blocked = false;

            for (let h = 0; h < headCount; h++) {
              const tracks = headTrackMap[h] ?? [];
              if (tracks.length === 0) continue;

              const group = getTmHeadGroup(tmSettings, h);
              if (!group) continue;

              const headPos = nextHeads[h] ?? 0;
              group.slotIndexes.forEach((slotIndex, trackOffset) => {
                const tapeIdx = tracks[trackOffset];
                const tape = nextTapes[tapeIdx];
                if (!tape) return;
                tape[headPos] = rule.writes[slotIndex] ?? TM_BLANK;
              });

              const moveDir = getTmHeadMove(rule, tmSettings, h);
              const affectedTracks = new Set(tracks);
              const shiftOtherHeads = (delta: number) => {
                for (let hh = 0; hh < headCount; hh++) {
                  if (hh === h) continue;
                  const sharedTrack = (headTrackMap[hh] ?? []).some((track) => affectedTracks.has(track));
                  if (sharedTrack) nextHeads[hh] += delta;
                }
              };

              if (isRamJumpMove(moveDir)) {
                const targetIndex = Number(moveDir.slice(1));
                if (mode === "LBA" && tracks.some((track) => targetIndex >= (nextTapes[track]?.length ?? 0))) {
                  blocked = true;
                  break;
                }
                tracks.forEach((track) => ensureTapeIndex(nextTapes[track], targetIndex));
                nextHeads[h] = targetIndex;
                continue;
              }

              if (moveDir === "U") {
                const columns = normalizeSheetColumns(tmSettings.sheetColumns);
                if (mode === "LBA") {
                  if (headPos < columns) {
                    blocked = true;
                    break;
                  }
                  nextHeads[h] = headPos - columns;
                } else if (headPos < columns) {
                  tracks.forEach((track) => {
                    const tape = nextTapes[track];
                    for (let column = 0; column < columns; column++) {
                      tape.unshift(TM_BLANK);
                    }
                  });
                  shiftOtherHeads(columns);
                  nextHeads[h] = headPos;
                } else {
                  nextHeads[h] = headPos - columns;
                }
                continue;
              }

              if (moveDir === "D") {
                const columns = normalizeSheetColumns(tmSettings.sheetColumns);
                const targetIndex = headPos + columns;
                if (mode === "LBA" && tracks.some((track) => targetIndex >= (nextTapes[track]?.length ?? 0))) {
                  blocked = true;
                  break;
                }
                tracks.forEach((track) => ensureTapeIndex(nextTapes[track], targetIndex));
                nextHeads[h] = targetIndex;
                continue;
              }

              if (moveDir === "L") {
                if (mode === "LBA") {
                  if (headPos === 0) {
                    blocked = true;
                    break;
                  }
                  nextHeads[h] = headPos - 1;
                } else if (headPos === 0) {
                  tracks.forEach((track) => {
                    nextTapes[track].unshift(TM_BLANK);
                  });
                  shiftOtherHeads(1);
                  nextHeads[h] = 0;
                } else {
                  nextHeads[h] = headPos - 1;
                }
              } else if (moveDir === "R") {
                if (mode === "LBA") {
                  if (tracks.some((track) => headPos >= (nextTapes[track]?.length ?? 0) - 1)) {
                    blocked = true;
                    break;
                  }
                  nextHeads[h] = headPos + 1;
                } else {
                  const targetIndex = headPos + 1;
                  tracks.forEach((track) => ensureTapeIndex(nextTapes[track], targetIndex));
                  nextHeads[h] = targetIndex;
                }
              }
              // "S" = Stay, no movement
            }

            if (blocked) return;

            const readsStr = rule.reads.length > 1 ? `(${rule.reads.join(",")})` : rule.reads[0];
            const writesStr = rule.writes.length > 1 ? `(${rule.writes.join(",")})` : rule.writes[0];
            const movesStr = rule.moves.length > 1 ? `(${rule.moves.join(",")})` : rule.moves[0];

            movedNodes.push({
              id: createPathNodeId("tm"),
              parentId: pathNode.id,
              stepIndex: nextStepIndex,
              state: edge.target,
              tapes: nextTapes.map((tape) => [...tape]),
              heads: [...nextHeads],
              transitionLabel: `${readsStr} → ${writesStr} • ${movesStr}`,
            });
            if (edge.id) usedEdgeIds.add(edge.id);
          });
        });
      });

      flashEdges(usedEdgeIds, 300);

      const moved = movedNodes.map((node) => tmConfigFromPathNode(node));
      tmPathConfigsRef.current = cloneTmConfigs(moved);
      tmPathNodesRef.current = cloneTmPathNodes(movedNodes);
      const nextConfigs = dedupeTmConfigs(moved);
      const active = new Set(nextConfigs.map((c) => c.state));
      
      // Build summary message
      const sample = nextConfigs
        .slice(0, 2)
        .map((c) => {
          const headsStr = c.heads
            .map((position, headIndex) => `H${headIndex + 1}${formatTmCursorPosition(position, tmSettings)}`)
            .join(', ');
          const tapesStr = c.tapes.length > 1 
            ? c.tapes.map((t, i) => `T${i+1}:[${t.join("")}]`).join(' ')
            : `[${c.tapes[0].join("")}]`;
          const stateStorage = tmSettings.stateStorageEnabled
            ? getStateStorageLabel(c.state, currentStateNodes)
            : null;
          return `${c.state}${stateStorage ? `{${stateStorage}}` : ''} ${headsStr} ${tapesStr}`;
        })
        .join(" | ");
      const nextMsg =
        nextConfigs.length > 0
          ? `TM step ${nextStepIndex}: ${sample}${
              nextConfigs.length > 2 ? " ..." : ""
            }`
          : "TM halted: no transition";
      const nextHistory = [...historyRef.current, nextMsg];

      setTmConfigs(nextConfigs);
      setActiveStates(active);
      setStepIndex(nextStepIndex);
      setSimMessage(nextMsg);
      setHistory(nextHistory);
      setTimelineIndex(-1); // Keep at live position
      pushSimSnapshot({
        stepIndex: nextStepIndex,
        activeStates: active,
        pdaConfigs: [],
        tmConfigs: nextConfigs,
        tmPathConfigs: moved,
        tmPathNodes: movedNodes,
        simMessage: nextMsg,
        history: nextHistory,
      });

      const acceptNodeIds = nodesRef.current
        .filter((n) => n.data.isAccept)
        .map((n) => n.id);
      if (nextConfigs.some((cfg) => acceptNodeIds.includes(cfg.state))) {
        setIsRunning(false);
        return false;
      }
      if (nextConfigs.length === 0) {
        setIsRunning(false);
        return false;
      }
      return true;
    }

    // ── PDA step ──
    if (isPdaMode) {
      const nextStepIndex = idx + 1;
      const currentPathNodes = pdaPathNodesRef.current.length > 0
        ? pdaPathNodesRef.current
        : buildFallbackPdaPathNodes(pdaConfigsRef.current, idx);
      if (idx >= str.length) {
        setIsRunning(false);
        return false;
      }
      const char = str[idx];
      const usedEdgeIds = new Set<string>();
      const movedNodes: PdaPathNode[] = [];

      currentPathNodes.forEach((pathNode) => {
        const cfg = pdaConfigFromPathNode(pathNode);
        const outgoing = currentEdges.filter((e) => e.source === cfg.state);
        outgoing.forEach((edge) => {
          const rules = parsePdaRules(edge.label as string, pdaSettings).filter(
            (r) => normalizeEpsilonSymbol(r.input) === char
          );
          rules.forEach((rule) => {
            const next = applyPdaRule(cfg, edge.target, rule, pdaSettings);
            if (!next) return;
            movedNodes.push({
              id: createPathNodeId("pda"),
              parentId: pathNode.id,
              stepIndex: nextStepIndex,
              state: next.state,
              stack: [...next.stack],
              stacks: getPdaConfigStores(next, pdaSettings).map((store) => [...store]),
              storageModel: pdaSettings.storageModel,
              transitionLabel: `Read '${char}'`,
            });
            if (edge.id) usedEdgeIds.add(edge.id);
          });
        });
      });

      flashEdges(usedEdgeIds, 400);

      const closedNodes = expandPdaPathNodes(movedNodes, currentEdges);
      const closedPaths = closedNodes.map((node) => pdaConfigFromPathNode(node));
      pdaPathNodesRef.current = clonePdaPathNodes(closedNodes);
      pdaPathConfigsRef.current = clonePdaConfigs(closedPaths);
      const closed = dedupePdaConfigs(closedPaths);
      const active = new Set(closed.map((c) => c.state));
      const sample = closed
        .slice(0, 3)
        .map((c) => formatPdaConfigSummary(c))
        .join(" | ");
      const nextMsg = `Read '${char}' -> ${closed.length} cfg${
        closed.length !== 1 ? "s" : ""
      }: ${sample}${closed.length > 3 ? " ..." : ""}`;
      const nextHistory = [
        ...historyRef.current,
        `Read '${char}' -> ${sample}${closed.length > 3 ? " ..." : ""}`,
      ];
      setPdaConfigs(closed);
      setActiveStates(active);
      setStepIndex(nextStepIndex);
      setSimMessage(nextMsg);
      setHistory(nextHistory);
      pushSimSnapshot({
        stepIndex: nextStepIndex,
        activeStates: active,
        pdaConfigs: closed,
        tmConfigs: [],
        pdaPathConfigs: closedPaths,
        pdaPathNodes: closedNodes,
        simMessage: nextMsg,
        history: nextHistory,
      });
      return true;
    }

    // ── FA step (including Mealy/Moore/Büchi/Timed) ──
    const currentSet = activeStatesRef.current;
    if (idx >= str.length) {
      setIsRunning(false);
      return false;
    }
    const char = str[idx];
    
    // For Mealy machine, collect outputs from transitions
    let stepOutput = "";
    if (mode === "Mealy") {
      currentEdges
        .filter((e) => currentSet.has(e.source))
        .forEach((edge) => {
          const rules = parseMealyRules(edge.label as string);
          rules.forEach((rule) => {
            if (rule.input === char && rule.output) {
              stepOutput += rule.output;
            }
          });
        });
    }
    
    const usedEdgeIds = new Set(
      currentEdges
        .filter(
          (e) =>
            currentSet.has(e.source) &&
            isTransitionMatch(e.label as string, char, isPdaMode)
        )
        .map((e) => e.id)
        .filter((id): id is string => !!id)
    );
    flashEdges(usedEdgeIds, 400);

    const movedSet = getNextStates(currentSet, char, currentEdges, isPdaMode);
    const finalSet = getEpsilonClosure(Array.from(movedSet), currentEdges, mode);
    
    // For Moore machine, output is based on the states reached
    if (mode === "Moore") {
      finalSet.forEach((stateId) => {
        const stateNode = nodesRef.current.find((n) => n.id === stateId);
        const mooreOutput = (stateNode?.data as { mooreOutput?: string })?.mooreOutput;
        if (mooreOutput) stepOutput += mooreOutput;
      });
    }
    
    // Update output string for transducers
    if (isMealyMoore && stepOutput) {
      setOutputString((prev) => prev + stepOutput);
    }
    
    const nextStepIndex = idx + 1;
    const outputInfo = isMealyMoore && stepOutput ? ` -> Out: '${stepOutput}'` : "";
    const nextMsg = `Read '${char}'${outputInfo} -> Active: {${Array.from(finalSet).join(
      ", "
    )}}`;
    const nextHistory = [
      ...historyRef.current,
      `Read '${char}'${outputInfo} -> {${Array.from(finalSet).join(", ")}}`,
    ];
    setActiveStates(finalSet);
    setStepIndex(nextStepIndex);
    setSimMessage(nextMsg);
    setHistory(nextHistory);
    pushSimSnapshot({
      stepIndex: nextStepIndex,
      activeStates: finalSet,
      pdaConfigs: [],
      tmConfigs: [],
      simMessage: nextMsg,
      history: nextHistory,
    });
    return true;
  };

  // ─── Timeline Navigation (non-destructive) ───
  
  /** Jump to a specific step in the timeline */
  const jumpToStep = (targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= simTimeline.length) return;
    
    // Pause any running loop
    clearRunLoop();
    
    const snap = simTimeline[targetIdx];
    setTimelineIndex(targetIdx);
    setStepIndex(snap.stepIndex);
    setActiveStates(new Set(snap.activeStates));
    setPdaConfigs(clonePdaConfigs(snap.pdaConfigs));
    setTmConfigs(cloneTmConfigs(snap.tmConfigs));
    pdaPathConfigsRef.current = clonePdaConfigs(snap.pdaPathConfigs ?? snap.pdaConfigs);
    tmPathConfigsRef.current = cloneTmConfigs(snap.tmPathConfigs ?? snap.tmConfigs);
    pdaPathNodesRef.current = clonePdaPathNodes(
      snap.pdaPathNodes ?? buildFallbackPdaPathNodes(snap.pdaPathConfigs ?? snap.pdaConfigs, snap.stepIndex)
    );
    tmPathNodesRef.current = cloneTmPathNodes(
      snap.tmPathNodes ?? buildFallbackTmPathNodes(snap.tmPathConfigs ?? snap.tmConfigs, snap.stepIndex)
    );
    setSimMessage(snap.simMessage);
    setHistory(snap.history);
    setIsRunning(targetIdx < simTimeline.length - 1); // Still "running" if not at end
  };

  const prevStep = () => {
    if (simTimeline.length <= 1) return;
    clearRunLoop();
    
    // Non-destructive: navigate backward without removing snapshots
    const currentPos = timelineIndex === -1 ? simTimeline.length - 1 : timelineIndex;
    const targetPos = Math.max(0, currentPos - 1);
    jumpToStep(targetPos);
  };

  const nextStep = () => {
    // If we're at the end of timeline (live), execute a new step
    const currentPos = timelineIndex === -1 ? simTimeline.length - 1 : timelineIndex;
    
    if (currentPos >= simTimeline.length - 1) {
      // At the end, execute new step
      setTimelineIndex(-1);
      executeStep();
    } else {
      // Navigate forward in history
      jumpToStep(currentPos + 1);
    }
  };

  const stopSimulation = () => {
    clearRunLoop();
    setIsRunning(false);
    setStepIndex(-1);
    setActiveStates(new Set());
    setPdaConfigs([]);
    setTmConfigs([]);
    pdaPathConfigsRef.current = [];
    tmPathConfigsRef.current = [];
    pdaPathNodesRef.current = [];
    tmPathNodesRef.current = [];
    nextPathNodeIdRef.current = 0;
    setSimTimeline([]);
    setTimelineIndex(-1);
    setSimMessage("Ready");
    setHistory([]);
  };

  /** Pause the auto-run */
  const pauseSimulation = () => {
    clearRunLoop();
    // Keep isRunning true so user can resume
  };

  const scheduleAutoRun = (initialDelayMs: number = 100) => {
    clearRunLoop();
    setIsAutoRunning(true);

    const tick = () => {
      const currentIdx = stepIndexRef.current;
      if (!isTmMode && currentIdx >= inputString.length) {
        clearRunLoop();
        setIsRunning(false);
        return;
      }
      if (isTmMode && currentIdx >= TM_MAX_STEPS) {
        clearRunLoop();
        setIsRunning(false);
        setSimMessage(`TM stopped at max steps (${TM_MAX_STEPS})`);
        return;
      }

      const ok = executeStep();
      if (!ok) {
        clearRunLoop();
        setIsRunning(false);
        return;
      }

      runLoopRef.current = window.setTimeout(
        tick,
        getPlaybackDelayMs(playbackSpeedRef.current)
      );
    };

    runLoopRef.current = window.setTimeout(tick, initialDelayMs);
  };

  /** Run to end from current position */
  const runAll = () => {
    // If at a historical position, jump to live first
    if (timelineIndex !== -1 && timelineIndex < simTimeline.length - 1) {
      // Jump to end of current timeline first
      jumpToStep(simTimeline.length - 1);
      setTimelineIndex(-1);
    }
    
    // If not running, start fresh
    if (!isRunning || simTimeline.length === 0) {
      if (!startSimulation()) return;
    }
    
    scheduleAutoRun();
  };

  // ─── Sidebar resizer ───
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [pdaSettingsModalOpen, setPdaSettingsModalOpen] = useState(false);
  const [tmSettingsModalOpen, setTmSettingsModalOpen] = useState(false);
  const isResizingRef = useRef(false);

  const startResizing = React.useCallback(() => {
    isResizingRef.current = true;
  }, []);
  const stopResizing = React.useCallback(() => {
    isResizingRef.current = false;
  }, []);
  const resize = React.useCallback((e: MouseEvent) => {
    if (isResizingRef.current) {
      const w = window.innerWidth - e.clientX;
      if (w > 200 && w < 800) setSidebarWidth(w);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // ─── Edge selection ───
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const selectedEdgeIdRef = useRef<string | null>(null);
  const promptOpenRef = useRef(false);

  type VisualizerDraft = {
    mode?: ModeType;
    pdaAcceptMode?: PdaAcceptMode;
    pdaSettings?: PdaSettings;
    tmAcceptMode?: TmAcceptMode;
    tmSettings?: TmSettings;
    inputString?: string;
    sidebarWidth?: number;
    nodeCount?: number;
    nodes?: Node[];
    edges?: Edge[];
    stepIndex?: number;
    activeStates?: string[];
    pdaConfigs?: PdaConfig[];
    tmConfigs?: TmConfig[];
    pdaPathConfigs?: PdaConfig[];
    tmPathConfigs?: TmConfig[];
    pdaPathNodes?: PdaPathNode[];
    tmPathNodes?: TmPathNode[];
    nextPathNodeId?: number;
    simTimeline?: SimSnapshot[];
    timelineIndex?: number;
    simMessage?: string;
    history?: string[];
    outputString?: string;
    isRunning?: boolean;
  };

  const buildDraftPayload = React.useCallback((): VisualizerDraft => ({
    mode,
    pdaAcceptMode,
    pdaSettings,
    tmAcceptMode,
    tmSettings,
    inputString,
    sidebarWidth,
    nodeCount,
    nodes: nodesRef.current,
    edges: edgesRef.current,
    stepIndex,
    activeStates: Array.from(activeStatesRef.current),
    pdaConfigs: clonePdaConfigs(pdaConfigsRef.current),
    tmConfigs: cloneTmConfigs(tmConfigsRef.current),
    pdaPathConfigs: clonePdaConfigs(pdaPathConfigsRef.current),
    tmPathConfigs: cloneTmConfigs(tmPathConfigsRef.current),
    pdaPathNodes: clonePdaPathNodes(pdaPathNodesRef.current),
    tmPathNodes: cloneTmPathNodes(tmPathNodesRef.current),
    nextPathNodeId: nextPathNodeIdRef.current,
    simTimeline: cloneSimTimeline(simTimeline),
    timelineIndex,
    simMessage,
    history: [...historyRef.current],
    outputString,
    isRunning,
  }), [
    clonePdaConfigs,
    cloneTmConfigs,
    clonePdaPathNodes,
    cloneTmPathNodes,
    cloneSimTimeline,
    inputString,
    isRunning,
    mode,
    nodeCount,
    outputString,
    pdaAcceptMode,
    pdaSettings,
    sidebarWidth,
    simMessage,
    simTimeline,
    stepIndex,
    timelineIndex,
    tmAcceptMode,
    tmSettings,
  ]);

  const persistDraftNow = () => {
    try {
      localStorage.setItem(VISUALIZER_DRAFT_KEY, JSON.stringify(buildDraftPayload()));
    } catch (err) {
      console.warn("Failed to save visualizer draft", err);
    }
  };

  useEffect(() => {
    selectedEdgeIdRef.current = selectedEdgeId;
  }, [selectedEdgeId]);

  // ─── Undo / Redo ───
  const undoStack = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const redoStack = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveSnapshot = () => {
    undoStack.current = [
      ...undoStack.current.slice(-49),
      { nodes: nodesRef.current, edges: edgesRef.current },
    ];
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  const undo = () => {
    if (undoStack.current.length === 0) return;
    const snap = undoStack.current[undoStack.current.length - 1];
    redoStack.current = [
      ...redoStack.current,
      { nodes: nodesRef.current, edges: edgesRef.current },
    ];
    undoStack.current = undoStack.current.slice(0, -1);
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  };

  const redo = () => {
    if (redoStack.current.length === 0) return;
    const snap = redoStack.current[redoStack.current.length - 1];
    undoStack.current = [
      ...undoStack.current,
      { nodes: nodesRef.current, edges: edgesRef.current },
    ];
    redoStack.current = redoStack.current.slice(0, -1);
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  };

  // Stable refs for keyboard handler
  const undoActionRef = useRef<() => void>(() => {});
  const redoActionRef = useRef<() => void>(() => {});
  const saveSnapshotRef = useRef<() => void>(() => {});
  const addNodeActionRef = useRef<() => void>(() => {});
  const clearBoardActionRef = useRef<() => void>(() => {});
  const helpActionRef = useRef<() => void>(() => {});
  const prevStepActionRef = useRef<() => void>(() => {});
  const dragSnapshotTakenRef = useRef(false);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (promptOpenRef.current) return;
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || tag === "select";

      if (e.ctrlKey || e.metaKey) {
        if (!e.shiftKey && (e.key === "z" || e.key === "Z")) {
          e.preventDefault();
          undoActionRef.current();
          return;
        }
        if (
          e.key === "y" ||
          e.key === "Y" ||
          (e.shiftKey && (e.key === "z" || e.key === "Z"))
        ) {
          e.preventDefault();
          redoActionRef.current();
          return;
        }
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          addNodeActionRef.current();
          return;
        }
        if (e.key === "b" || e.key === "B") {
          e.preventDefault();
          prevStepActionRef.current();
          return;
        }
        if (e.key === "/" || e.key === "?") {
          e.preventDefault();
          helpActionRef.current();
          return;
        }
        if (e.shiftKey && e.key === "Backspace") {
          e.preventDefault();
          clearBoardActionRef.current();
          return;
        }
      }
      if (e.key === "F1") {
        e.preventDefault();
        helpActionRef.current();
        return;
      }
      if (e.key === "Insert") {
        e.preventDefault();
        addNodeActionRef.current();
        return;
      }
      if (isRunning) {
        if (e.key === "Delete" || e.key === "Backspace") e.preventDefault();
        return;
      }
      if (isTyping) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const selEdgeId = selectedEdgeIdRef.current;
        if (selEdgeId) {
          saveSnapshotRef.current();
          setEdges((eds) => eds.filter((ed) => ed.id !== selEdgeId));
          setSelectedEdgeId(null);
          e.preventDefault();
        } else {
          const toDelete = new Set(
            nodesRef.current.filter((n) => n.selected).map((n) => n.id)
          );
          if (toDelete.size > 0) {
            saveSnapshotRef.current();
            setEdges((eds) =>
              eds.filter(
                (ed) => !toDelete.has(ed.source) && !toDelete.has(ed.target)
              )
            );
            setNodes((nds) => nds.filter((n) => !toDelete.has(n.id)));
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, setEdges, setNodes]);

  // ─── Restore & persist draft ───
  useLayoutEffect(() => {
    try {
      const pendingSharedImport = localStorage.getItem(VISUALIZER_SHARED_IMPORT_KEY);
      if (pendingSharedImport) {
        setIsDraftReady(true);
        return;
      }

      const raw = localStorage.getItem(VISUALIZER_DRAFT_KEY);
      if (!raw) {
        setIsDraftReady(true);
        return;
      }
      const draft = JSON.parse(raw) as VisualizerDraft;
      if (draft.mode) setMode(draft.mode);
      if (draft.pdaAcceptMode) setPdaAcceptMode(draft.pdaAcceptMode);
      if (draft.pdaSettings) setPdaSettings(normalizePdaSettings(draft.pdaSettings));
      if (draft.tmAcceptMode) setTmAcceptMode(draft.tmAcceptMode);
      if (draft.tmSettings) setTmSettings(normalizeTmSettings(draft.tmSettings));
      if (typeof draft.inputString === "string") setInputString(draft.inputString);
      if (
        typeof draft.sidebarWidth === "number" &&
        draft.sidebarWidth >= 200 &&
        draft.sidebarWidth <= 800
      )
        setSidebarWidth(draft.sidebarWidth);
      if (typeof draft.nodeCount === "number") setNodeCount(draft.nodeCount);

      if (Array.isArray(draft.nodes)) {
        setNodes(
          draft.nodes.map((n) => {
            if (n.type === "textNoteNode") {
              return {
                ...n,
                type: "textNoteNode",
                data: {
                  text: String(
                    (n.data as { text?: string })?.text || "Note"
                  ),
                  bgColor: String(
                    (n.data as { bgColor?: string })?.bgColor || "#1f2937"
                  ),
                  textColor: String(
                    (n.data as { textColor?: string })?.textColor || "#e5e7eb"
                  ),
                  borderColor: String(
                    (n.data as { borderColor?: string })?.borderColor ||
                      "#64748b"
                  ),
                  borderWidth: Number(
                    (n.data as { borderWidth?: number })?.borderWidth || 1
                  ),
                  width: Number(
                    (n.data as { width?: number })?.width || 240
                  ),
                  height: Number(
                    (n.data as { height?: number })?.height || 120
                  ),
                  layer: Number(
                    (n.data as { layer?: number })?.layer || 0
                  ),
                },
              } as Node;
            }
            if (n.type === "frameBoxNode") {
              return {
                ...n,
                type: "frameBoxNode",
                data: {
                  title: String(
                    (n.data as { title?: string })?.title || "Thompson Rule"
                  ),
                  width: Number(
                    (n.data as { width?: number })?.width || 320
                  ),
                  height: Number(
                    (n.data as { height?: number })?.height || 180
                  ),
                  bgColor: String(
                    (n.data as { bgColor?: string })?.bgColor ||
                      "rgba(30,41,59,0.20)"
                  ),
                  borderColor: String(
                    (n.data as { borderColor?: string })?.borderColor ||
                      "#f59e0b"
                  ),
                  borderStyle:
                    (
                      n.data as {
                        borderStyle?: "solid" | "dashed" | "dotted" | "double";
                      }
                    )?.borderStyle || "dashed",
                  borderWidth: Number(
                    (n.data as { borderWidth?: number })?.borderWidth || 2
                  ),
                  layer: Number(
                    (n.data as { layer?: number })?.layer || 0
                  ),
                },
              } as Node;
            }
            return {
              ...n,
              type: "stateNode",
              data: {
                ...(n.data || {}),
                label:
                  typeof (n.data as { label?: string })?.label === "string"
                    ? (n.data as { label?: string }).label
                    : n.id,
                isStart: !!(n.data as { isStart?: boolean })?.isStart,
                isAccept: !!(n.data as { isAccept?: boolean })?.isAccept,
                isActive: false,
                layer: Number(
                  (n.data as { layer?: number })?.layer || 0
                ),
              },
            } as Node;
          })
        );
      }

      if (Array.isArray(draft.edges)) {
        setEdges(
          draft.edges.map((e) => {
            const label = (e.label as string) || "";
            return {
              ...e,
              sourceHandle: normalizeConnector(e.sourceHandle ?? undefined),
              targetHandle: normalizeConnector(e.targetHandle ?? undefined),
              type: "smoothstep",
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#94a3b8",
              },
              style: {
                ...(e.style || {}),
                stroke: "#94a3b8",
                strokeWidth: 2,
              },
              animated: isEpsilon(label),
            } as Edge;
          })
        );
      }

      if (typeof draft.stepIndex === "number") setStepIndex(draft.stepIndex);
      if (Array.isArray(draft.activeStates)) setActiveStates(new Set(draft.activeStates));
      if (Array.isArray(draft.pdaConfigs)) setPdaConfigs(clonePdaConfigs(draft.pdaConfigs));
      if (Array.isArray(draft.tmConfigs)) setTmConfigs(cloneTmConfigs(draft.tmConfigs));
      pdaPathConfigsRef.current = Array.isArray(draft.pdaPathConfigs) ? clonePdaConfigs(draft.pdaPathConfigs) : [];
      tmPathConfigsRef.current = Array.isArray(draft.tmPathConfigs) ? cloneTmConfigs(draft.tmPathConfigs) : [];
      pdaPathNodesRef.current = Array.isArray(draft.pdaPathNodes) ? clonePdaPathNodes(draft.pdaPathNodes) : [];
      tmPathNodesRef.current = Array.isArray(draft.tmPathNodes) ? cloneTmPathNodes(draft.tmPathNodes) : [];
      nextPathNodeIdRef.current = typeof draft.nextPathNodeId === "number" ? draft.nextPathNodeId : 0;
      if (Array.isArray(draft.simTimeline)) setSimTimeline(cloneSimTimeline(draft.simTimeline));
      if (typeof draft.timelineIndex === "number") setTimelineIndex(draft.timelineIndex);
      if (typeof draft.simMessage === "string") setSimMessage(draft.simMessage);
      if (Array.isArray(draft.history)) setHistory([...draft.history]);
      if (typeof draft.outputString === "string") setOutputString(draft.outputString);
      if (typeof draft.isRunning === "boolean") setIsRunning(draft.isRunning);
      setIsAutoRunning(false);
    } catch (err) {
      console.warn("Failed to restore visualizer draft", err);
    } finally {
      setIsDraftReady(true);
    }
  }, [clonePdaConfigs, clonePdaPathNodes, cloneSimTimeline, cloneTmConfigs, cloneTmPathNodes, setEdges, setNodes]);

  useEffect(() => {
    if (!isDraftReady) return;

    const sharedImport = localStorage.getItem(VISUALIZER_SHARED_IMPORT_KEY);
    if (!sharedImport) return;

    localStorage.removeItem(VISUALIZER_SHARED_IMPORT_KEY);
    void importFromJsonStringRef.current?.(sharedImport);
  }, [isDraftReady]);

  useEffect(() => {
    if (!isDraftReady) return;
    try {
      localStorage.setItem(VISUALIZER_DRAFT_KEY, JSON.stringify(buildDraftPayload()));
    } catch (err) {
      console.warn("Failed to save visualizer draft", err);
    }
  }, [activeStates, buildDraftPayload, edges, history, isDraftReady, nodes, pdaConfigs, simTimeline, simMessage, stepIndex, timelineIndex, tmConfigs, outputString, isRunning]);

  // ─── Import / Export ───
  // NOTE: Converter-compatible fields stay unchanged. PDA/TM setup is stored as optional metadata.

  const buildExportData = React.useCallback(() => {
    const stateNodes = getStateNodes(nodes);
    const annotationNodes = nodes.filter(
      (n) => n.type === "textNoteNode" || n.type === "frameBoxNode"
    );

    return {
      metadata: {
        name: `My_${mode}`,
        type: mode,
        pdaAcceptMode: isPdaMode ? pdaAcceptMode : undefined,
        pdaSettings: isPdaMode ? pdaSettings : undefined,
        tmAcceptMode: isTmMode ? tmAcceptMode : undefined,
        tmSettings: isTmMode ? tmSettings : undefined,
        exportedAt: new Date().toISOString(),
      },
      nodes: stateNodes.map((n) => ({
        id: n.id,
        position: n.position,
        isStart: n.data.isStart,
        isAccept: n.data.isAccept,
        data: {
          label:
            typeof (n.data as { label?: string } | undefined)?.label === "string"
              ? (n.data as { label?: string }).label
              : n.id,
          layer: Number((n.data as { layer?: number })?.layer || 0),
        },
      })),
      edges: edges.map((e) => ({
        from: e.source,
        from_con: normalizeConnector(e.sourceHandle ?? undefined).toUpperCase(),
        to: e.target,
        to_con: normalizeConnector(e.targetHandle ?? undefined).toUpperCase(),
        label: e.label,
      })),
      annotations: annotationNodes.map((n) => {
        if (n.type === "textNoteNode") {
          const data = n.data as TextNoteNodeData;
          return {
            id: n.id,
            kind: "text-note",
            position: n.position,
            text: data.text,
            bgColor: data.bgColor,
            textColor: data.textColor,
            borderColor: data.borderColor,
            borderWidth: data.borderWidth,
            width: data.width,
            height: data.height,
            layer: Number(data.layer || 0),
          };
        }

        const data = n.data as FrameBoxNodeData;
        return {
          id: n.id,
          kind: "frame-box",
          position: n.position,
          title: data.title,
          width: data.width,
          height: data.height,
          bgColor: data.bgColor,
          borderColor: data.borderColor,
          borderStyle: data.borderStyle,
          borderWidth: data.borderWidth,
          layer: Number(data.layer || 0),
        };
      }),
    };
  }, [edges, isPdaMode, isTmMode, mode, nodes, pdaAcceptMode, pdaSettings, tmAcceptMode, tmSettings]);

  const exportConfig = async () => {
    const exportData = buildExportData();

    const jsonString = JSON.stringify(exportData, null, 2);
    const defaultName = `automata_${mode.toLowerCase()}`;

    try {
      // @ts-expect-error - showSaveFilePicker is not yet in standard lib dom types
      if (window.showSaveFilePicker) {
        // @ts-expect-error - showSaveFilePicker is not yet in standard lib dom types
        const handle = await window.showSaveFilePicker({
          suggestedName: `${defaultName}.json`,
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return;
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError")
        console.error("Save File Picker failed", err);
      else return;
    }

    const { value: fileName } = await uiSwal.fire({
      title: "Enter file name to save",
      input: "text",
      inputValue: defaultName,
      showCancelButton: true,
      inputValidator: (v) => {
        if (!v) return "You need to write something!";
      },
    });
    if (!fileName) return;
    const finalName = fileName.endsWith(".json")
      ? fileName
      : `${fileName}.json`;
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", finalName);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copyShareUrl = async () => {
    try {
      const shareUrl = buildAutomataShareUrl(
        buildExportData(),
        window.location.origin
      );
      const sizeWarning =
        shareUrl.length > 6000
          ? "This link is long. Some chat apps may truncate it, so use JSON export if sending fails."
          : "Open this link on SKOVisual to import the automaton immediately.";

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          await uiSwal.fire("Share URL copied", sizeWarning, "success");
          return;
        } catch (err) {
          console.warn("Copy share URL failed", err);
        }
      }

      await uiSwal.fire({
        icon: "info",
        title: "Copy this share URL",
        text: sizeWarning,
        input: "textarea",
        inputValue: shareUrl,
        inputAttributes: {
          "aria-label": "Share URL",
          readonly: "readonly",
          spellcheck: "false",
        },
        width: 720,
        confirmButtonText: "Close",
      });
    } catch (err) {
      console.error("Failed to build share URL", err);
      await uiSwal.fire(
        "Error",
        "Unable to create a share URL for this automaton.",
        "error"
      );
    }
  };

  const importFromJsonString = async (content: string) => {
      try {
        const parsedData = JSON.parse(content) as ImportData;
        const importedMetadata = parsedData.metadata || {};

        let currentMode = mode;
        const importedMode = importedMetadata.type ?? parsedData.type;
        if (importedMode) {
          currentMode = importedMode as ModeType;
          setMode(currentMode);
        }

        const importedPdaAcceptMode =
          importedMetadata.pdaAcceptMode ?? parsedData.pdaAcceptMode ?? "final-state";
        const importedTmAcceptMode =
          importedMetadata.tmAcceptMode ?? parsedData.tmAcceptMode ?? "final-state";
        const importedPdaSettings = normalizePdaSettings(
          importedMetadata.pdaSettings ?? parsedData.pdaSettings
        );
        const importedTmSettings = normalizeTmSettings(
          importedMetadata.tmSettings ?? parsedData.tmSettings
        );
        
        // Restore or reset mode-specific setup so imports never inherit stale settings
        if (currentMode === "DPDA" || currentMode === "NPDA") {
          setPdaAcceptMode(importedPdaAcceptMode);
          setPdaSettings(importedPdaSettings);
        }
        if (currentMode === "DTM" || currentMode === "NTM" || currentMode === "LBA") {
          setTmAcceptMode(importedTmAcceptMode);
          setTmSettings(importedTmSettings);
        }

        let maxId = 0;
        const newNodes: Node[] = (parsedData.nodes || []).map(
          (n: ImportNode) => {
            const idNum = parseInt(n.id.replace("q", ""));
            if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
            const importedLabel =
              (typeof n.data?.label === "string" && n.data.label.trim()) ||
              (typeof n.label === "string" && n.label.trim()) ||
              n.id;
            return {
              id: n.id,
              position: n.position || { x: 50, y: 50 },
              type: "stateNode",
              data: {
                label: importedLabel,
                isStart: n.isStart ?? n.data?.isStart ?? false,
                isAccept: n.isAccept ?? n.data?.isAccept ?? false,
                isActive: false,
                layer: Number(
                  (n.data as { layer?: number } | undefined)?.layer || 0
                ),
              },
              selected: false,
            } as Node;
          }
        );

        const edgeCandidates: Edge[] = (parsedData.edges || []).map(
          (e: ImportEdge, i: number) => {
            const source = e.from ?? e.source ?? "";
            const target = e.to ?? e.target ?? "";
            const label = e.label || "";
            const fromCon = e.from_con ?? e.sourceHandle;
            const toCon = e.to_con ?? e.targetHandle;
            return {
              id: `e-${i}-${Date.now()}`,
              source,
              target,
              label,
              sourceHandle: normalizeConnector(fromCon),
              targetHandle: normalizeConnector(toCon),
              type: "smoothstep",
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#94a3b8",
              },
              style: { stroke: "#94a3b8", strokeWidth: 2 },
              animated: isEpsilon(label),
            } as Edge;
          }
        );
        const newEdges: Edge[] = edgeCandidates.filter(
          (e) => !!e.source && !!e.target
        );

        let cleanedEdges = newEdges;
        if (currentMode === "DFA" || currentMode === "NFA") {
          const hadEps = cleanedEdges.some((e) =>
            isEpsilon(e.label as string)
          );
          if (hadEps) {
            cleanedEdges = cleanedEdges.filter(
              (e) => !isEpsilon(e.label as string)
            );
            await uiSwal.fire(
              "Warning",
              "Import: Epsilon transitions were removed because current mode does not allow them.",
              "warning"
            );
          }
        }

        const isModeIsTm =
          currentMode === "DTM" ||
          currentMode === "NTM" ||
          currentMode === "LBA";
        const isModeIsPda =
          currentMode === "DPDA" || currentMode === "NPDA";

        const annotationNodes: Node[] = (parsedData.annotations || []).map(
          (a, idx) => {
            if (a.kind === "frame-box") {
              return {
                id: a.id || `frame-${idx}-${Date.now()}`,
                position: a.position || { x: 120, y: 120 },
                type: "frameBoxNode",
                draggable: true,
                selectable: true,
                data: {
                  title: a.title || "Thompson Rule",
                  width: Number(a.width || 320),
                  height: Number(a.height || 180),
                  bgColor: a.bgColor || "rgba(30,41,59,0.20)",
                  borderColor: a.borderColor || "#f59e0b",
                  borderStyle: a.borderStyle || "dashed",
                  borderWidth: Number(a.borderWidth || 2),
                  layer: Number(a.layer || 0),
                } as FrameBoxNodeData,
              } as Node;
            }
            return {
              id: a.id || `note-${idx}-${Date.now()}`,
              position: a.position || { x: 90, y: 90 },
              type: "textNoteNode",
              draggable: true,
              selectable: true,
              data: {
                text: a.text || "Note",
                bgColor: a.bgColor || "#1f2937",
                textColor: a.textColor || "#e5e7eb",
                borderColor: a.borderColor || "#64748b",
                borderWidth: Number(a.borderWidth || 1),
                width: Number(a.width || 240),
                height: Number(a.height || 120),
                layer: Number(a.layer || 0),
              } as TextNoteNodeData,
            } as Node;
          }
        );

        setNodes(newNodes.concat(annotationNodes));
        setEdges(cleanedEdges);
        setNodeCount(maxId + 1);

        const { issues, alphabet } = validateAutomaton(
          currentMode,
          newNodes,
          cleanedEdges,
          isModeIsTm,
          isModeIsPda
        );
        const missing: { state: string; symbol: string }[] = [];
        if (currentMode === "DFA" && alphabet.length > 0) {
          newNodes.forEach((n) => {
            alphabet.forEach((sym) => {
              const exists = cleanedEdges.some(
                (e) =>
                  e.source === n.id &&
                  splitLabelToSymbols(
                    e.label as string,
                    isModeIsTm,
                    isModeIsPda
                  ).includes(sym)
              );
              if (!exists) missing.push({ state: n.id, symbol: sym });
            });
          });
        }

        if (currentMode === "DFA" && missing.length > 0) {
          const deadId = `qd${maxId + 1}`;
          const deadNode: Node = {
            id: deadId,
            position: { x: 20, y: 20 },
            type: "stateNode",
            data: {
              label: deadId,
              isStart: false,
              isAccept: false,
              isActive: false,
            },
          } as Node;
          const deadEdges: Edge[] = [];
          missing.forEach((m, i) => {
            deadEdges.push({
              id: `e-miss-${i}-${Date.now()}`,
              source: m.state,
              target: deadId,
              label: m.symbol,
              type: "smoothstep",
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#94a3b8",
              },
              style: { stroke: "#94a3b8", strokeWidth: 2 },
              animated: false,
            } as Edge);
          });
          alphabet.forEach((sym, i) => {
            deadEdges.push({
              id: `e-dead-${i}-${Date.now()}`,
              source: deadId,
              target: deadId,
              label: sym,
              type: "smoothstep",
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#94a3b8",
              },
              style: { stroke: "#94a3b8", strokeWidth: 2 },
              animated: false,
            } as Edge);
          });
          setNodes((prev) => prev.concat(deadNode));
          setEdges((prev) => prev.concat(deadEdges));
          setNodeCount(maxId + 2);
          await uiSwal.fire(
            "Warning",
            `DFA import: Missing transitions detected. A dead state '${deadId}' was added to make the transition function total.`,
            "warning"
          );
        } else if (issues.length > 0) {
          await uiSwal.fire({
            icon: "warning",
            title: "Import Warnings",
            html: formatIssuesHtml(issues),
          });
        } else {
          stopSimulation();
          await uiSwal.fire("Success", "Import Successful!", "success");
        }
      } catch (err) {
        await uiSwal.fire("Error", "Invalid JSON File", "error");
        console.error(err);
      }
  };

  importFromJsonStringRef.current = importFromJsonString;

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (!event.target.files || !event.target.files[0]) return;
    fileReader.readAsText(event.target.files[0], "UTF-8");
    fileReader.onload = async (e) => {
      await importFromJsonString(e.target?.result as string);
    };
    event.target.value = "";
  };

  // ─── Editor actions ───

  const addNode = () => {
    if (isRunning) return;
    saveSnapshot();
    const id = `q${nodeCount}`;
    const shouldBeStart = getStateNodes(nodesRef.current).length === 0;
    const newNode: Node = {
      id,
      position: {
        x: 50 + (nodeCount % 6) * 130,
        y: 50 + Math.floor(nodeCount / 6) * 130,
      },
      data: {
        label: id,
        isStart: shouldBeStart,
        isAccept: false,
        isActive: false,
        layer: 0,
      },
      type: "stateNode",
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeCount((c) => c + 1);
  };

  const addTextNote = async () => {
    if (isRunning) return;
    const result = await uiSwal.fire({
      title: "Add Text Note",
      html: `
        <div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
          <textarea id="note-text" rows="4" style="width:100%;padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;">Thompson: [[#f59e0b|Union]] step here...</textarea>
          <div style="font-size:12px;color:#94a3b8;">Partial color syntax: <code>[[#f59e0b|text]]</code></div>
          <label style="font-size:12px;color:#94a3b8;">Background</label>
          <input id="note-bg" type="color" value="#1f2937" style="width:72px;height:34px;border:none;background:transparent;" />
          <label style="font-size:12px;color:#94a3b8;">Text Color</label>
          <input id="note-fg" type="color" value="#e5e7eb" style="width:72px;height:34px;border:none;background:transparent;" />
          <label style="font-size:12px;color:#94a3b8;">Border Color</label>
          <input id="note-border" type="color" value="#64748b" style="width:72px;height:34px;border:none;background:transparent;" />
          <label style="font-size:12px;color:#94a3b8;">Border Width</label>
          <input id="note-border-width" type="number" min="1" max="12" value="1" style="width:100px;padding:6px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Add",
      preConfirm: () => {
        const text =
          (document.getElementById("note-text") as HTMLTextAreaElement | null)
            ?.value ?? "";
        const bgColor =
          (document.getElementById("note-bg") as HTMLInputElement | null)
            ?.value ?? "#1f2937";
        const textColor =
          (document.getElementById("note-fg") as HTMLInputElement | null)
            ?.value ?? "#e5e7eb";
        const borderColor =
          (document.getElementById("note-border") as HTMLInputElement | null)
            ?.value ?? "#64748b";
        const borderWidth = Number(
          (
            document.getElementById(
              "note-border-width"
            ) as HTMLInputElement | null
          )?.value || 1
        );
        if (!text.trim()) {
          Swal.showValidationMessage("Text note cannot be empty");
          return null;
        }
        return {
          text,
          bgColor,
          textColor,
          borderColor,
          borderWidth: Math.max(1, borderWidth),
          width: 240,
          height: 120,
          layer: 0,
        } as TextNoteNodeData;
      },
    });
    if (!result.isConfirmed || !result.value) return;
    saveSnapshot();
    const noteId = `note-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    setNodes((nds) =>
      nds.concat({
        id: noteId,
        type: "textNoteNode",
        position: {
          x: 120 + (nds.length % 4) * 40,
          y: 120 + (nds.length % 4) * 30,
        },
        data: result.value as TextNoteNodeData,
        draggable: true,
        selectable: true,
      } as Node)
    );
  };

  const addFrameBox = async () => {
    if (isRunning) return;
    const result = await uiSwal.fire({
      title: "Add Frame Box",
      html: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;">
          <label style="grid-column:1 / -1;font-size:12px;color:#94a3b8;">Title</label>
          <input id="frame-title" value="Thompson Rule" style="grid-column:1 / -1;padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;" />
          <label style="font-size:12px;color:#94a3b8;">Width</label>
          <label style="font-size:12px;color:#94a3b8;">Height</label>
          <input id="frame-width" type="number" min="120" value="320" style="padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;" />
          <input id="frame-height" type="number" min="90" value="180" style="padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;" />
          <label style="font-size:12px;color:#94a3b8;">Background</label>
          <label style="font-size:12px;color:#94a3b8;">Border Color</label>
          <input id="frame-bg" type="color" value="#1e293b" style="width:72px;height:34px;border:none;background:transparent;" />
          <input id="frame-border" type="color" value="#f59e0b" style="width:72px;height:34px;border:none;background:transparent;" />
          <label style="grid-column:1 / -1;font-size:12px;color:#94a3b8;">Border Style</label>
          <select id="frame-style" style="grid-column:1 / -1;padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;">
            <option value="solid">solid</option>
            <option value="dashed" selected>dashed</option>
            <option value="dotted">dotted</option>
            <option value="double">double</option>
          </select>
          <label style="grid-column:1 / -1;font-size:12px;color:#94a3b8;">Border Width</label>
          <input id="frame-border-width" type="number" min="1" max="12" value="2" style="grid-column:1 / -1;padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Add",
      preConfirm: () => {
        const title =
          (document.getElementById("frame-title") as HTMLInputElement | null)
            ?.value ?? "Thompson Rule";
        const width = Number(
          (document.getElementById("frame-width") as HTMLInputElement | null)
            ?.value || 320
        );
        const height = Number(
          (document.getElementById("frame-height") as HTMLInputElement | null)
            ?.value || 180
        );
        const bgColor =
          (document.getElementById("frame-bg") as HTMLInputElement | null)
            ?.value ?? "#1e293b";
        const borderColor =
          (document.getElementById("frame-border") as HTMLInputElement | null)
            ?.value ?? "#f59e0b";
        const borderStyle = (
          (document.getElementById("frame-style") as HTMLSelectElement | null)
            ?.value || "dashed"
        ) as FrameBoxNodeData["borderStyle"];
        const borderWidth = Number(
          (
            document.getElementById(
              "frame-border-width"
            ) as HTMLInputElement | null
          )?.value || 2
        );
        return {
          title,
          width: Math.max(120, width),
          height: Math.max(90, height),
          bgColor,
          borderColor,
          borderStyle,
          borderWidth: Math.max(1, borderWidth),
          layer: 0,
        } as FrameBoxNodeData;
      },
    });
    if (!result.isConfirmed || !result.value) return;
    saveSnapshot();
    const frameId = `frame-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    setNodes((nds) =>
      nds.concat({
        id: frameId,
        type: "frameBoxNode",
        position: {
          x: 160 + (nds.length % 4) * 50,
          y: 160 + (nds.length % 4) * 40,
        },
        data: result.value as FrameBoxNodeData,
        draggable: true,
        selectable: true,
      } as Node)
    );
  };

  const editTextNote = async (node: Node) => {
    const note = node.data as TextNoteNodeData;
    const result = await uiSwal.fire({
      title: `Edit Text Note \u2014 ${node.id}`,
      html: `
        <div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
          <textarea id="note-text" rows="4" style="width:100%;padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;">${(
            note.text || ""
          )
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</textarea>
          <div style="font-size:12px;color:#94a3b8;">Partial color syntax: <code>[[#f59e0b|text]]</code></div>
          <label style="font-size:12px;color:#94a3b8;">Background</label>
          <input id="note-bg" type="color" value="${
            note.bgColor || "#1f2937"
          }" style="width:72px;height:34px;border:none;background:transparent;" />
          <label style="font-size:12px;color:#94a3b8;">Text Color</label>
          <input id="note-fg" type="color" value="${
            note.textColor || "#e5e7eb"
          }" style="width:72px;height:34px;border:none;background:transparent;" />
          <label style="font-size:12px;color:#94a3b8;">Border Color</label>
          <input id="note-border" type="color" value="${
            note.borderColor || "#64748b"
          }" style="width:72px;height:34px;border:none;background:transparent;" />
          <label style="font-size:12px;color:#94a3b8;">Border Width</label>
          <input id="note-border-width" type="number" min="1" max="12" value="${Math.max(
            1,
            Number(note.borderWidth || 1)
          )}" style="width:100px;padding:6px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Save",
      preConfirm: () => {
        const text =
          (document.getElementById("note-text") as HTMLTextAreaElement | null)
            ?.value ?? "";
        const bgColor =
          (document.getElementById("note-bg") as HTMLInputElement | null)
            ?.value ?? "#1f2937";
        const textColor =
          (document.getElementById("note-fg") as HTMLInputElement | null)
            ?.value ?? "#e5e7eb";
        const borderColor =
          (document.getElementById("note-border") as HTMLInputElement | null)
            ?.value ?? "#64748b";
        const borderWidth = Number(
          (
            document.getElementById(
              "note-border-width"
            ) as HTMLInputElement | null
          )?.value || 1
        );
        if (!text.trim()) {
          Swal.showValidationMessage("Text note cannot be empty");
          return null;
        }
        return {
          ...(note || {}),
          text,
          bgColor,
          textColor,
          borderColor,
          borderWidth: Math.max(1, borderWidth),
          width: Math.max(180, Number(note.width || 240)),
          height: Math.max(90, Number(note.height || 120)),
          layer: Number(note.layer || 0),
        } as TextNoteNodeData;
      },
    });
    if (!result.isConfirmed || !result.value) return;
    saveSnapshot();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id
          ? { ...n, data: result.value as TextNoteNodeData }
          : n
      )
    );
  };

  const editFrameBox = async (node: Node) => {
    const frame = node.data as FrameBoxNodeData;
    const result = await uiSwal.fire({
      title: `Edit Frame Box \u2014 ${node.id}`,
      html: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;">
          <label style="grid-column:1 / -1;font-size:12px;color:#94a3b8;">Title</label>
          <input id="frame-title" value="${(frame.title || "Thompson Rule")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")}" style="grid-column:1 / -1;padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;" />
          <label style="font-size:12px;color:#94a3b8;">Width</label>
          <label style="font-size:12px;color:#94a3b8;">Height</label>
          <input id="frame-width" type="number" min="120" value="${Math.max(
            120,
            Number(frame.width || 320)
          )}" style="padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;" />
          <input id="frame-height" type="number" min="90" value="${Math.max(
            90,
            Number(frame.height || 180)
          )}" style="padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;" />
          <label style="font-size:12px;color:#94a3b8;">Background</label>
          <label style="font-size:12px;color:#94a3b8;">Border Color</label>
          <input id="frame-bg" type="color" value="${
            frame.bgColor || "#1e293b"
          }" style="width:72px;height:34px;border:none;background:transparent;" />
          <input id="frame-border" type="color" value="${
            frame.borderColor || "#f59e0b"
          }" style="width:72px;height:34px;border:none;background:transparent;" />
          <label style="grid-column:1 / -1;font-size:12px;color:#94a3b8;">Border Style</label>
          <select id="frame-style" style="grid-column:1 / -1;padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;">
            <option value="solid" ${
              (frame.borderStyle || "dashed") === "solid" ? "selected" : ""
            }>solid</option>
            <option value="dashed" ${
              (frame.borderStyle || "dashed") === "dashed" ? "selected" : ""
            }>dashed</option>
            <option value="dotted" ${
              (frame.borderStyle || "dashed") === "dotted" ? "selected" : ""
            }>dotted</option>
            <option value="double" ${
              (frame.borderStyle || "dashed") === "double" ? "selected" : ""
            }>double</option>
          </select>
          <label style="grid-column:1 / -1;font-size:12px;color:#94a3b8;">Border Width</label>
          <input id="frame-border-width" type="number" min="1" max="12" value="${Math.max(
            1,
            Number(frame.borderWidth || 2)
          )}" style="grid-column:1 / -1;padding:8px;border-radius:6px;border:1px solid #475569;background:#071428;color:#fff;" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Save",
      preConfirm: () => {
        const title =
          (document.getElementById("frame-title") as HTMLInputElement | null)
            ?.value ?? "Thompson Rule";
        const width = Number(
          (document.getElementById("frame-width") as HTMLInputElement | null)
            ?.value || 320
        );
        const height = Number(
          (document.getElementById("frame-height") as HTMLInputElement | null)
            ?.value || 180
        );
        const bgColor =
          (document.getElementById("frame-bg") as HTMLInputElement | null)
            ?.value ?? "#1e293b";
        const borderColor =
          (document.getElementById("frame-border") as HTMLInputElement | null)
            ?.value ?? "#f59e0b";
        const borderStyle = (
          (document.getElementById("frame-style") as HTMLSelectElement | null)
            ?.value || "dashed"
        ) as FrameBoxNodeData["borderStyle"];
        const borderWidth = Number(
          (
            document.getElementById(
              "frame-border-width"
            ) as HTMLInputElement | null
          )?.value || 2
        );
        return {
          ...frame,
          title,
          width: Math.max(120, width),
          height: Math.max(90, height),
          bgColor,
          borderColor,
          borderStyle,
          borderWidth: Math.max(1, borderWidth),
          layer: Number(frame.layer || 0),
        } as FrameBoxNodeData;
      },
    });
    if (!result.isConfirmed || !result.value) return;
    saveSnapshot();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id
          ? { ...n, data: result.value as FrameBoxNodeData }
          : n
      )
    );
  };

  const changeSelectedLayer = (delta: number) => {
    if (isRunning) return;
    const selectedCount = nodesRef.current.filter((n) => n.selected).length;
    if (selectedCount === 0) {
      uiSwal.fire(
        "Info",
        "Select at least one node to change layer.",
        "info"
      );
      return;
    }
    saveSnapshot();
    setNodes((nds) =>
      nds.map((n) => {
        if (!n.selected) return n;
        const currentLayer = Number(
          (n.data as { layer?: number })?.layer || 0
        );
        return {
          ...n,
          data: {
            ...(n.data || {}),
            layer: Math.max(-50, Math.min(50, currentLayer + delta)),
          },
        };
      })
    );
  };

  // Keep action refs up-to-date
  React.useLayoutEffect(() => {
    undoActionRef.current = undo;
    redoActionRef.current = redo;
    saveSnapshotRef.current = saveSnapshot;
    addNodeActionRef.current = addNode;
    prevStepActionRef.current = prevStep;
  });

  const deleteSelected = () => {
    if (isRunning) return;
    saveSnapshot();
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  };

  const clearBoard = async () => {
    if (isRunning) {
      await uiSwal.fire(
        "Info",
        "Stop simulation before editing the graph.",
        "info"
      );
      return;
    }
    const result = await uiSwal.fire({
      title: "Clear board? ",
      text: "This will remove all states and transitions.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Clear",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
    });
    if (!result.isConfirmed) return;
    saveSnapshot();
    setNodes([]);
    setEdges([]);
    setNodeCount(0);
    stopSimulation();
    setInputString("");
    localStorage.removeItem("automata-data-transfer");
  };

  const handleModeChange = async (nextMode: ModeType) => {
    if (nextMode === mode) return;

    const fromPda = mode === "DPDA" || mode === "NPDA";
    const toFa = nextMode === "DFA" || nextMode === "NFA" || nextMode === "eNFA" || nextMode === "Mealy" || nextMode === "Moore" || nextMode === "Buchi";
    const fromFa = mode === "DFA" || mode === "NFA" || mode === "eNFA" || mode === "Mealy" || mode === "Moore" || mode === "Buchi";
    const toPda = nextMode === "DPDA" || nextMode === "NPDA";
    const fromTm = mode === "DTM" || mode === "NTM" || mode === "LBA";
    const toTm = nextMode === "DTM" || nextMode === "NTM" || nextMode === "LBA";

    // Reset output string when changing modes
    setOutputString("");

    if (fromTm && toFa) {
      const tmLikeEdges = edges.filter(
        (e) => parseTmRules((e.label as string) || "").length > 0
      );
      if (tmLikeEdges.length > 0) {
        const confirm = await uiSwal.fire({
          icon: "warning",
          title: "Convert TM transitions to FA?",
          html: "FA transitions do not include write/move operations. Only read symbols will be kept from TM rules.<br/><br/>Do you want to continue?",
          showCancelButton: true,
          confirmButtonText: "Continue",
          cancelButtonText: "Cancel",
        });
        if (!confirm.isConfirmed) return;

        saveSnapshot();
        let convertedCount = 0;
        let removedCount = 0;
        const convertedEdges = edges
          .map((edge) => {
            const before = String(edge.label || "");
            const convertedLabel = toFaLabelFromTm(before, nextMode);
            if (before !== convertedLabel) convertedCount += 1;
            if (String(convertedLabel).trim() === "") removedCount += 1;
            return {
              ...edge,
              label: convertedLabel,
              animated: isEpsilon(convertedLabel),
            } as Edge;
          })
          .filter((edge) => String(edge.label || "").trim() !== "");

        setEdges(convertedEdges);
        await uiSwal.fire(
          "Success",
          `Converted ${convertedCount} transition(s) to FA format and removed ${removedCount} unsupported transition(s).`,
          "success"
        );
      }
    }

    if (fromTm && toPda) {
      const tmLikeEdges = edges.filter(
        (e) => parseTmRules((e.label as string) || "").length > 0
      );
      if (tmLikeEdges.length > 0) {
        const confirm = await uiSwal.fire({
          icon: "warning",
          title: "Convert TM transitions to PDA?",
          html: "PDA transitions do not include write/move operations. TM rules will be reduced to input symbols and converted implicitly (for example, <code>a-&gt;a,R</code> becomes <code>a,Z-&gt;Z</code>).<br/><br/>Do you want to continue?",
          showCancelButton: true,
          confirmButtonText: "Continue",
          cancelButtonText: "Cancel",
        });
        if (!confirm.isConfirmed) return;

        saveSnapshot();
        let convertedCount = 0;
        let removedCount = 0;
        const convertedEdges = edges
          .map((edge) => {
            const before = String(edge.label || "");
            const convertedLabel = toPdaLabelFromTm(before);
            if (before !== convertedLabel) convertedCount += 1;
            if (String(convertedLabel).trim() === "") removedCount += 1;
            return {
              ...edge,
              label: convertedLabel,
              animated: isEpsilon(convertedLabel),
            } as Edge;
          })
          .filter((edge) => String(edge.label || "").trim() !== "");

        setEdges(convertedEdges);
        await uiSwal.fire(
          "Success",
          `Converted ${convertedCount} transition(s) to PDA format and removed ${removedCount} unsupported transition(s).`,
          "success"
        );
      }
    }

    if (toTm && (fromPda || fromFa)) {
      const confirm = await uiSwal.fire({
        icon: "warning",
        title: "Convert transitions to TM format?",
        html: 'TM transitions use the format <code>read-&gt;write,move</code>. Existing labels will be converted implicitly (for example, <code>a</code> becomes <code>a-&gt;a,R</code>).<br/><br/>If a transition only uses epsilon input, it cannot be represented directly and will be removed.<br/><br/>Do you want to continue?',
        showCancelButton: true,
        confirmButtonText: "Continue",
        cancelButtonText: "Cancel",
      });
      if (!confirm.isConfirmed) return;

      saveSnapshot();
      let convertedCount = 0;
      let removedCount = 0;
      const convertedEdges = edges
        .map((edge) => {
          const before = String(edge.label || "");
          const convertedLabel = fromPda
            ? toTmLabelFromPda(before)
            : toTmLabelFromFa(before);
          if (before !== convertedLabel) convertedCount += 1;
          if (String(convertedLabel).trim() === "") removedCount += 1;
          return {
            ...edge,
            label: convertedLabel,
            animated: false,
          } as Edge;
        })
        .filter((edge) => String(edge.label || "").trim() !== "");

      setEdges(convertedEdges);
      await uiSwal.fire(
        "Success",
        `Converted ${convertedCount} transition(s) to TM format and removed ${removedCount} unsupported transition(s).`,
        "success"
      );
    }

    if (fromPda && (nextMode === "NFA" || nextMode === "DFA")) {
      const epsilonPdaEdges = edges.filter((edge) => {
        const rules = parsePdaRules((edge.label as string) || "", pdaSettings);
        if (rules.length === 0) return false;
        return rules.some(
          (rule) => normalizeEpsilonSymbol(rule.input) === "\u03b5"
        );
      });

      if (epsilonPdaEdges.length > 0) {
        await uiSwal.fire({
          icon: "error",
          title: "Cannot switch mode",
          html: "This PDA still contains epsilon transitions.<br/><br/>Please remove all <code>\u03b5</code> transitions before switching to NFA or DFA.",
        });
        return;
      }
    }

    if (fromPda && toFa) {
      const pdaLikeEdges = edges.filter(
        (e) => parsePdaRules((e.label as string) || "", pdaSettings).length > 0
      );
      if (pdaLikeEdges.length > 0) {
        const confirm = await uiSwal.fire({
          icon: "warning",
          title: "Convert PDA transitions to FA?",
          html: "FA does not use a stack. Pop/push parts will be removed from transition labels, and only input symbols will be kept.<br/><br/>Do you want to continue?",
          showCancelButton: true,
          confirmButtonText: "Continue",
          cancelButtonText: "Cancel",
        });
        if (!confirm.isConfirmed) return;

        saveSnapshot();
        let removedCount = 0;
        let convertedCount = 0;
        const convertedEdges = edges
          .map((edge) => {
            const before = String(edge.label || "");
            const convertedLabel = toFaLabelFromPda(
              (edge.label as string) || "",
              nextMode,
              pdaSettings
            );
            if (before !== convertedLabel) convertedCount += 1;
            if (String(convertedLabel).trim() === "") removedCount += 1;
            return {
              ...edge,
              label: convertedLabel,
              animated: isEpsilon(convertedLabel),
            } as Edge;
          })
          .filter((edge) => String(edge.label || "").trim() !== "");

        setEdges(convertedEdges);
        await uiSwal.fire(
          "Success",
          `Converted ${convertedCount} transition(s) and removed ${removedCount} empty transition(s).`,
          "success"
        );
      }
    }

    if (fromFa && toPda) {
      const faLikeEdges = edges.filter((e) => {
        const txt = String(e.label || "").trim();
        return txt !== "" && parsePdaRules(txt, pdaSettings).length === 0;
      });
      if (faLikeEdges.length > 0) {
        const confirm = await uiSwal.fire({
          icon: "warning",
          title: "Convert FA transitions to PDA?",
          html: 'PDA transitions require stack operations. Your FA labels will be interpreted implicitly (for example, <code>a</code> becomes <code>a,Z-&gt;Z</code>).<br/><br/>In formal PDA constructions, rules are usually explicit with a stack variable (for example, <code>a,X-&gt;XZ</code>).<br/><br/>Do you want to continue?',
          showCancelButton: true,
          confirmButtonText: "Continue",
          cancelButtonText: "Cancel",
        });
        if (!confirm.isConfirmed) return;

        saveSnapshot();
        let convertedCount = 0;
        const convertedEdges = edges.map((edge) => {
          const before = String(edge.label || "");
          const convertedLabel = toPdaLabelFromFa(before, pdaSettings);
          if (before !== convertedLabel) convertedCount += 1;
          return {
            ...edge,
            label: convertedLabel,
            animated: isEpsilon(convertedLabel),
          } as Edge;
        });

        setEdges(convertedEdges);
        await uiSwal.fire(
          "Success",
          `Converted ${convertedCount} transition(s) to implicit PDA form.`,
          "success"
        );
      }
    }

    setMode(nextMode);
    stopSimulation();
  };

  const openHelpDocs = () => {
    persistDraftNow();
    const helpWindow = window.open(
      HELP_GUIDE_PATH,
      "_blank",
      "noopener,noreferrer"
    );
    if (!helpWindow) {
      window.location.assign(HELP_GUIDE_PATH);
    }
  };

  const showAbout = () => {
    uiSwal.fire({
      title: "About Automata Visualizer",
      html: `
        <div style="text-align:left;line-height:1.6">
          <div style="margin-bottom:10px;color:#94a3b8;"><strong>Version:</strong> v${packageJson.version}</div>
          <div style="margin-bottom:12px;color:#cbd5e1;">
            Quick reference for the editor. For the full manual, open
            <a href="${HELP_GUIDE_PATH}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;font-weight:700;"> Help </a>
            to view the detailed HTML guide.
          </div>
          <div><strong>Basics</strong></div>
          <ul style="margin:6px 0 10px 18px;padding:0;">
            <li>Double-click state to toggle Start/Accept</li>
            <li>Drag between handles to create transition</li>
            <li>Double-click edge to edit label</li>
            <li>TM label format: read-&gt;write,move or read/write,move (e.g. 0-&gt;1,R or 0/1,R)</li>
            <li>TM tuple length follows total head-track lanes, grouped by head (e.g. H1-&gt;T1+T2 and H2-&gt;T3 gives 3 slots)</li>
            <li>2D Sheet extension adds U/D moves with a flattened matrix backing store</li>
            <li>RAM extension adds absolute jumps like @12</li>
            <li>State Storage reads label suffixes like qCarry{a} for lightweight memory in the state name</li>
            <li>PDA classic format: input,pop-&gt;push or input,pop/push (Z, Z0, Z₀ all work as stack start)</li>
            <li>Multi-stack PDA format: input,(pop1,pop2,...)-&gt;(push1,push2,...)</li>
            <li>Queue automata uses input,pop-&gt;push, where pop dequeues the front and push appends to the rear</li>
            <li>Nested stack mode accepts bracketed frame tokens such as [AZ]</li>
          </ul>
          <div><strong>Shortcuts</strong></div>
          <ul style="margin:6px 0 0 18px;padding:0;">
            <li>Ctrl+N or Insert: New Node</li>
            <li>Ctrl+B: Previous Step</li>
            <li>Ctrl+Z / Ctrl+Y: Undo / Redo</li>
            <li>Ctrl+Shift+Backspace: Clear Board</li>
            <li>Ctrl+/ or F1: Open Help Guide</li>
            <li>Delete / Backspace: Delete selected</li>
          </ul>
        </div>
      `,
      confirmButtonColor: "#0ea5e9",
    });
  };

  React.useLayoutEffect(() => {
    clearBoardActionRef.current = () => {
      void clearBoard();
    };
    helpActionRef.current = openHelpDocs;
  });

  // ─── Floating prompt state ───
  const [promptState, setPromptState] = useState<PromptState>({
    open: false,
    kind: undefined,
    params: null,
    nodeId: null,
    defaultValue: "",
  });
  const [promptValue, setPromptValue] = useState<string>("");
  useEffect(() => {
    promptOpenRef.current = promptState.open;
  }, [promptState.open]);

  const openEdgeLabelPrompt = (params: Connection) => {
    const defaultValue = isTmMode
      ? getDefaultTmRuleLabel(tmSettings)
      : isPdaMode
      ? getDefaultPdaRuleLabel(pdaSettings)
      : isMealyMoore
      ? "a/0"
      : isTimed
      ? "a, x<5, x"
      : "0";
    const title = isTmMode
      ? getTmRulePromptTitle("Input", tmSettings)
      : isPdaMode
      ? getPdaRulePromptTitle("Input", pdaSettings)
      : isMealyMoore
      ? 'Input Mealy rule(s) (e.g. "a/0; b/1" — input/output)'
      : isTimed
      ? 'Input Timed rule (e.g. "a, x<5, x" — input, guard, reset)'
      : 'Input Transition(s) (e.g. "0" or "0,1")';
    setPromptValue(defaultValue);
    setPromptState({
      open: true,
      kind: "edgeLabel",
      params,
      defaultValue,
      title,
    });
  };

  const openEditLabelPrompt = (edge: Edge) => {
    const def = (edge.label as string) || "";
    setPromptValue(def);
    setPromptState({
      open: true,
      kind: "editLabel",
      params: edge,
      defaultValue: def,
      title: isTmMode
        ? getTmRulePromptTitle("Edit", tmSettings)
        : isPdaMode
        ? getPdaRulePromptTitle("Edit", pdaSettings)
        : isMealyMoore
        ? 'Edit Mealy rule(s) (e.g. "a/0; b/1" — input/output)'
        : isTimed
        ? 'Edit Timed rule (e.g. "a, x<5, x" — input, guard, reset)'
        : "Edit Transition(s)",
    });
  };

  const openNodeSettingsPrompt = (nodeId: string) => {
    setPromptState({
      open: true,
      kind: "nodeSettings",
      nodeId,
      defaultValue: "1",
      title: `Set State Properties \u2014 ${nodeId}`,
    });
  };

  const closePrompt = () =>
    setPromptState({
      open: false,
      kind: undefined,
      params: null,
      nodeId: null,
      defaultValue: "",
    });

  const handleSubmitPrompt = async (value: string | null) => {
    const { kind, params, nodeId } = promptState;
    if (kind === "edgeLabel") {
      if (value !== null) {
        const conn = params as Connection;
        let nextValue = value;
        if (isTmMode && !isValidTmLabel(nextValue, getTmRuleArity(tmSettings))) {
          uiSwal.fire(
            "Error",
            `Invalid TM label. Use ${getTmRuleArity(tmSettings)} read/write/move slot(s) for the active TM setup.`,
            "error"
          );
          closePrompt();
          return;
        }
        if (isTmMode) {
          const unsupportedMoves = getTmUnsupportedMoves(nextValue, tmSettings);
          const trackRuleIssues = getTmTrackRuleIssues(nextValue, tmSettings);
          if (unsupportedMoves.length > 0) {
            uiSwal.fire(
              "Error",
              `Move(s) ${unsupportedMoves.join(", ")} require enabling the matching TM extension in TM Setup.`,
              "error"
            );
            closePrompt();
            return;
          }
          if (trackRuleIssues.length > 0) {
            uiSwal.fire("Error", trackRuleIssues[0], "error");
            closePrompt();
            return;
          }
        }
        if (isPdaMode && !isValidPdaLabel(nextValue, pdaSettings)) {
          const converted = tryConvertNfaShorthandToPda(nextValue, pdaSettings);
          if (converted) {
            const confirm = await uiSwal.fire({
              icon: "warning",
              title: "Implicit PDA shorthand detected",
              html: 'You entered shorthand transition labels. They will be interpreted automatically as PDA rules (for example, <code>a</code> becomes <code>a,Z-&gt;Z</code>).<br/><br/>In formal PDA constructions, rules are usually explicit with a stack variable (for example, <code>a,X-&gt;XZ</code>).<br/><br/>Do you want to continue with the implicit conversion?',
              showCancelButton: true,
              confirmButtonText: "Continue",
              cancelButtonText: "Cancel",
            });
            if (!confirm.isConfirmed) {
              closePrompt();
              return;
            }
            nextValue = converted;
          } else {
            uiSwal.fire(
              "Error",
              `Invalid ${formatPdaExtensionSummary(pdaSettings)} label. ${getPdaRulePromptTitle("Input", pdaSettings)}`,
              "error"
            );
            closePrompt();
            return;
          }
        }
        const symbols = splitLabelToSymbols(nextValue, isTmMode, isPdaMode);
        if (
          (mode === "DFA" || mode === "NFA") &&
          nextValue &&
          nextValue
            .split(",")
            .map((s) => s.trim())
            .some((s) => s === "e" || s === "\u03b5")
        ) {
          uiSwal.fire(
            "Error",
            "Epsilon transitions are not allowed in DFA/NFA. Edge not created.",
            "error"
          );
          closePrompt();
          return;
        }

        // For DFA ensure no existing outgoing transition for same symbol
        if (mode === "DFA" && conn.source) {
          const existing = edges.filter((e) => e.source === conn.source);
          for (const sym of symbols) {
            const conflict = existing.some((e) =>
              splitLabelToSymbols(e.label as string, isTmMode, isPdaMode).includes(sym)
            );
            if (conflict) {
              uiSwal.fire(
                "Error",
                `DFA violation: state ${conn.source} already has a transition on '${sym}'.`,
                "error"
              );
              closePrompt();
              return;
            }
          }
        }

        saveSnapshot();
        const sourceHandle = normalizeConnector(conn.sourceHandle ?? undefined);
        const targetHandle = normalizeConnector(conn.targetHandle ?? undefined);
        const newEdgeId = `e-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        setEdges((eds) => {
          const filtered = eds.filter((e) => {
            const sourceConflict =
              !!conn.source &&
              e.source === conn.source &&
              baseHandle(e.sourceHandle) === sourceHandle;
            const targetConflict =
              !!conn.target &&
              e.target === conn.target &&
              baseHandle(e.targetHandle) === targetHandle;
            return !(sourceConflict && targetConflict);
          });
          return addEdge(
            {
              id: newEdgeId,
              ...conn,
              sourceHandle,
              targetHandle,
              label: nextValue,
              type: "smoothstep",
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#94a3b8",
              },
              style: { stroke: "#94a3b8", strokeWidth: 2 },
              animated: isEpsilon(nextValue),
            } as Edge,
            filtered
          );
        });
      }
    } else if (kind === "editLabel") {
      const edge = params as Edge;
      if (value !== null) {
        let nextValue = value;
        if (isTmMode && !isValidTmLabel(nextValue, getTmRuleArity(tmSettings))) {
          uiSwal.fire(
            "Error",
            `Invalid TM label. Use ${getTmRuleArity(tmSettings)} read/write/move slot(s) for the active TM setup.`,
            "error"
          );
          closePrompt();
          return;
        }
        if (isTmMode) {
          const unsupportedMoves = getTmUnsupportedMoves(nextValue, tmSettings);
          const trackRuleIssues = getTmTrackRuleIssues(nextValue, tmSettings);
          if (unsupportedMoves.length > 0) {
            uiSwal.fire(
              "Error",
              `Move(s) ${unsupportedMoves.join(", ")} require enabling the matching TM extension in TM Setup.`,
              "error"
            );
            closePrompt();
            return;
          }
          if (trackRuleIssues.length > 0) {
            uiSwal.fire("Error", trackRuleIssues[0], "error");
            closePrompt();
            return;
          }
        }
        if (isPdaMode && !isValidPdaLabel(nextValue, pdaSettings)) {
          const converted = tryConvertNfaShorthandToPda(nextValue, pdaSettings);
          if (converted) {
            const confirm = await uiSwal.fire({
              icon: "warning",
              title: "Implicit PDA shorthand detected",
              html: 'You entered shorthand transition labels. They will be interpreted automatically as PDA rules (for example, <code>a</code> becomes <code>a,Z-&gt;Z</code>).<br/><br/>In formal PDA constructions, rules are usually explicit with a stack variable (for example, <code>a,X-&gt;XZ</code>).<br/><br/>Do you want to continue with the implicit conversion?',
              showCancelButton: true,
              confirmButtonText: "Continue",
              cancelButtonText: "Cancel",
            });
            if (!confirm.isConfirmed) {
              closePrompt();
              return;
            }
            nextValue = converted;
          } else {
            uiSwal.fire(
              "Error",
              `Invalid ${formatPdaExtensionSummary(pdaSettings)} label. ${getPdaRulePromptTitle("Edit", pdaSettings)}`,
              "error"
            );
            closePrompt();
            return;
          }
        }
        if (
          (mode === "DFA" || mode === "NFA") &&
          nextValue
            .split(",")
            .map((s) => s.trim())
            .some((s) => s === "e" || s === "\u03b5")
        ) {
          uiSwal.fire(
            "Error",
            "Epsilon transitions are not allowed in DFA/NFA. Edit rejected.",
            "error"
          );
          closePrompt();
          return;
        }
        if (mode === "DFA") {
          const symbols = splitLabelToSymbols(nextValue, isTmMode, isPdaMode);
          const others = edges.filter(
            (e) => e.source === edge.source && e.id !== edge.id
          );
          for (const sym of symbols) {
            if (
              others.some((o) =>
                splitLabelToSymbols(o.label as string, isTmMode, isPdaMode).includes(sym)
              )
            ) {
              uiSwal.fire(
                "Error",
                `DFA violation: another edge from ${edge.source} already covers '${sym}'. Edit rejected.`,
                "error"
              );
              closePrompt();
              return;
            }
          }
        }
        saveSnapshot();
        setEdges((eds) =>
          eds.map((e) =>
            e.id === edge.id
              ? { ...e, label: nextValue, animated: isEpsilon(nextValue) }
              : e
          )
        );
      }
    } else if (kind === "nodeSettings") {
      if (!nodeId) return closePrompt();
      const option = value;
      if (!option) return closePrompt();
      saveSnapshot();
      const makingStart = option === "2" || option === "4";
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  isStart: makingStart,
                  isAccept: option === "3" || option === "4",
                },
              }
            : {
                ...n,
                data: {
                  ...n.data,
                  isStart: makingStart ? false : n.data.isStart,
                },
              }
        )
      );
    }
    closePrompt();
  };

  const onConnect = (params: Connection) => {
    if (isRunning) return;
    openEdgeLabelPrompt(params);
  };

  const handleNodeSettings = (nodeId: string) => {
    openNodeSettingsPrompt(nodeId);
  };

  const onNodeDoubleClick = (e: React.MouseEvent, node: Node) => {
    if (isRunning) return;
    e.preventDefault();
    if ((node.type || "stateNode") === "stateNode") {
      handleNodeSettings(node.id);
      return;
    }
    if (node.type === "textNoteNode") {
      void editTextNote(node);
      return;
    }
    if (node.type === "frameBoxNode") {
      void editFrameBox(node);
    }
  };

  const onNodeContextMenu = (e: React.MouseEvent, node: Node) => {
    if (isRunning) return;
    e.preventDefault();
    if ((node.type || "stateNode") === "stateNode") {
      handleNodeSettings(node.id);
      return;
    }
    if (node.type === "textNoteNode") {
      void editTextNote(node);
      return;
    }
    if (node.type === "frameBoxNode") {
      void editFrameBox(node);
    }
  };

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId((prev) => (prev === edge.id ? null : edge.id));
  };

  const onEdgeDoubleClick = (_: React.MouseEvent, edge: Edge) => {
    if (isRunning) return;
    openEditLabelPrompt(edge);
  };

  const onPaneClick = () => {
    setSelectedEdgeId(null);
  };

  // ─── Computed display data ───

  const displayNodes = nodes.map((node) => {
    const layer = Number((node.data as { layer?: number })?.layer || 0);
    if ((node.type || "stateNode") === "stateNode") {
      return {
        ...node,
        zIndex: layer,
        data: { ...node.data, isActive: activeStates.has(node.id), layer },
      };
    }
    return { ...node, zIndex: layer, data: { ...node.data, layer } };
  });

  const selectedLayerText = React.useMemo(() => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 0) return "Layer: \u2014";
    const layers = selected.map(
      (n) => Number((n.data as { layer?: number })?.layer || 0)
    );
    const unique = Array.from(new Set(layers));
    if (unique.length === 1) return `Layer: ${unique[0]}`;
    return `Layer: mixed (${Math.min(...layers)}..${Math.max(...layers)})`;
  }, [nodes]);

  const handleNodesChange = React.useCallback(
    (changes: NodeChange<Node>[]) => {
      if (isRunning) return;
      onNodesChange(changes);
    },
    [isRunning, onNodesChange]
  );

  const handleNodeDragStart = React.useCallback(() => {
    if (isRunning) return;
    if (dragSnapshotTakenRef.current) return;
    saveSnapshot();
    dragSnapshotTakenRef.current = true;
  }, [isRunning]);

  const handleNodeDragStop = React.useCallback(() => {
    dragSnapshotTakenRef.current = false;
  }, []);

  const handleEdgesChange = React.useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (isRunning) return;
      onEdgesChange(changes);
    },
    [isRunning, onEdgesChange]
  );

  const edgeLaneMeta = React.useMemo(() => {
    const groups = new Map<string, Edge[]>();
    edges.forEach((edge) => {
      const a = edge.source;
      const b = edge.target;
      const key = a < b ? `${a}::${b}` : `${b}::${a}`;
      const arr = groups.get(key) || [];
      arr.push(edge);
      groups.set(key, arr);
    });

    const out = new Map<string, { lane: number; size: number }>();
    groups.forEach((arr) => {
      const size = arr.length;
      const center = (size - 1) / 2;
      arr.forEach((edge, idx) => {
        out.set(edge.id as string, { lane: idx - center, size });
      });
    });
    return out;
  }, [edges]);

  const displaySubHandleMap = React.useMemo(
    () => buildDisplaySubHandleMap(edges),
    [edges]
  );

  const displayEdges = edges.map((edge) => {
    const meta = edgeLaneMeta.get(edge.id as string);
    const visualHandles = displaySubHandleMap.get(edge.id as string);
    let nextEdge: Edge = {
      ...edge,
      type: "smoothstep",
      sourceHandle: visualHandles?.sourceHandle ?? edge.sourceHandle,
      targetHandle: visualHandles?.targetHandle ?? edge.targetHandle,
    };

    if (meta && meta.size > 1) {
      nextEdge = {
        ...nextEdge,
        zIndex: 1 + Math.abs(meta.lane),
      } as Edge;
    }

    if (edge.id === selectedEdgeId) {
      nextEdge = {
        ...nextEdge,
        style: {
          ...(nextEdge.style || {}),
          stroke: "#facc15",
          strokeWidth: 3,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#facc15" },
      } as Edge;
    }

    return nextEdge;
  });

  // ─── Machine summary / Transition table data ───
  const stateNodes = getStateNodes(nodes);
  const q0 = stateNodes.find((n) => n.data.isStart)?.id || "\u2014";
  const F = stateNodes.filter((n) => n.data.isAccept).map((n) => n.id);
  const alphabet = getAlphabetFromEdges(edges, isTmMode, isPdaMode).filter(
    (s) => s !== "e" && s !== "\u03b5"
  );

  const buildTransitionMap = () => {
    const allowsEpsilonColumn =
      mode === "eNFA" || mode === "DPDA" || mode === "NPDA";
    const map: Record<string, Record<string, string[]>> = {};
    stateNodes.forEach((n) => {
      map[n.id] = {};
      const syms = [...alphabet];
      if (allowsEpsilonColumn) syms.push("\u03b5");
      syms.forEach((sym) => {
        map[n.id][sym] = [];
      });
    });
    edges.forEach((e) => {
      if (isTmMode) {
        const rules = parseTmRules(e.label as string, getTmRuleArity(tmSettings));
        rules.forEach((rule) => {
          if (!map[e.source]) return;
          const key = rule.reads[0];
          map[e.source][key] = map[e.source][key] || [];
          map[e.source][key].push(e.target);
        });
      } else if (isPdaMode) {
        const rules = parsePdaRules(e.label as string, pdaSettings);
        rules.forEach((rule) => {
          if (!map[e.source]) return;
          const key = rule.input === "e" ? "\u03b5" : rule.input;
          if (key === "\u03b5") {
            if (allowsEpsilonColumn) {
              map[e.source][key] = map[e.source][key] || [];
              map[e.source][key].push(e.target);
            }
          } else {
            map[e.source][key] = map[e.source][key] || [];
            map[e.source][key].push(e.target);
          }
        });
      } else {
        const syms = e.label
          ? e
              .label!.toString()
              .split(",")
              .map((s) => s.trim())
          : [];
        syms.forEach((sym) => {
          if (sym === "e" || sym === "\u03b5") {
            if (!map[e.source]) return;
            const key = "\u03b5";
            if (allowsEpsilonColumn) {
              map[e.source][key] = map[e.source][key] || [];
              map[e.source][key].push(e.target);
            }
          } else {
            if (!map[e.source]) return;
            map[e.source][sym] = map[e.source][sym] || [];
            map[e.source][sym].push(e.target);
          }
        });
      }
    });
    return map;
  };

  const transitionMap = buildTransitionMap();

  // Check if TM has halted (no valid transitions)
  const isTmHalted = (): boolean => {
    if (!isTmMode || tmConfigs.length === 0) return false;
    return tmConfigs.every((cfg) => {
      const currentSyms = getTmReadSymbols(cfg, tmSettings);
      const outEdges = edges.filter((e) => e.source === cfg.state);
      const matchingRules = outEdges.flatMap((e) => {
        const rules = parseTmRules(e.label as string, getTmRuleArity(tmSettings));
        return rules.filter(
          (r) =>
            isTmRuleEnabled(r, tmSettings) &&
            !hasTrackMoveMismatch(r, tmSettings) &&
            r.reads.length === currentSyms.length &&
            r.reads.every((read, index) => read === currentSyms[index])
        );
      });
      return matchingRules.length === 0;
    });
  };

  const isAccepted = () => {
    const acceptNodeIds = stateNodes
      .filter((n) => n.data.isAccept)
      .map((n) => n.id);
    
    // TM acceptance
    if (isTmMode) {
      if (tmAcceptMode === "halt") {
        // Accept if halted (no valid transitions) AND in accepting state (optional for pure halt)
        // For pure "halt" mode, we accept if halted in accepting state
        const halted = isTmHalted();
        const inAcceptState = tmConfigs.some((cfg) => acceptNodeIds.includes(cfg.state));
        return halted && inAcceptState;
      }
      // final-state mode: accept when in accepting state
      return tmConfigs.some((cfg) => acceptNodeIds.includes(cfg.state));
    }
    
    if (stepIndex !== inputString.length) return null;
    
    // PDA acceptance
    if (isPdaMode) {
      const inFinalState = pdaConfigs.some((cfg) => acceptNodeIds.includes(cfg.state));
      const hasEmptyStack = pdaConfigs.some((cfg) => isPdaStoreEmpty(cfg, pdaSettings));
      
      if (pdaAcceptMode === "empty-stack") {
        return hasEmptyStack;
      }
      if (pdaAcceptMode === "both") {
        return inFinalState && hasEmptyStack;
      }
      // final-state mode (default)
      return inFinalState;
    }
    
    // Büchi: accepts if any active state is accepting (for finite prefix check)
    if (isBuchi) {
      return Array.from(activeStates).some((id) => acceptNodeIds.includes(id));
    }
    
    // FA modes (DFA, NFA, eNFA, Mealy, Moore, Timed)
    return Array.from(activeStates).some((id) => acceptNodeIds.includes(id));
  };

  if (!isDraftReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b1220 0%, #111827 100%)",
          color: "#e2e8f0",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>Restoring saved visualizer...</div>
          <div style={{ fontSize: 14, color: "#94a3b8" }}>
            Loading your last automata board from this browser session.
          </div>
        </div>
      </div>
    );
  }

  return (
    <main
      className="visualizer-root"
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      {/* Hidden File Input for Import (kept for keyboard shortcut) */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".json"
        onChange={importConfig}
      />

      {/* Import Modal */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={importFromJsonString}
        isRunning={isRunning}
      />

      {pdaSettingsModalOpen && (
        <PdaSettingsModal
          open={pdaSettingsModalOpen}
          onClose={() => setPdaSettingsModalOpen(false)}
          onSave={(settings: PdaSettings) => {
            updatePdaSettings(settings);
            setPdaSettingsModalOpen(false);
            if (isRunning || stepIndex >= 0) stopSimulation();
          }}
          initialSettings={pdaSettings}
          isRunning={isRunning}
        />
      )}

      {tmSettingsModalOpen && (
        <TmSettingsModal
          open={tmSettingsModalOpen}
          onClose={() => setTmSettingsModalOpen(false)}
          onSave={(settings) => {
            updateTmSettings(settings);
            setTmSettingsModalOpen(false);
            if (isRunning || stepIndex >= 0) stopSimulation();
          }}
          initialSettings={tmSettings}
          inputString={inputString}
          isRunning={isRunning}
        />
      )}

      {/* Floating Prompt Modal */}
      <PromptModal
        promptState={promptState}
        promptValue={promptValue}
        setPromptValue={setPromptValue}
        onSubmit={(v) => {
          void handleSubmitPrompt(v);
        }}
        onClose={closePrompt}
        mode={mode}
        nodes={nodes}
      />

      {/* Top Navbar: Control Panel */}
      <div
        style={{
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          zIndex: 10,
        }}
      >
        {/* ── Primary Row ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            flexWrap: "wrap",
            rowGap: 6,
          }}
        >
          {/* Home + Title */}
          <Link href="/automata" title="Back to Automata" style={{ textDecoration: "none" }}>
            <button style={{ cursor: "pointer", background: "#0f172a", border: "1px solid #475569", padding: "5px 8px", borderRadius: 4, color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>
              ←
            </button>
          </Link>
          <h1 style={{ fontWeight: 700, fontSize: 15, color: "#0ea5e9", marginRight: 2, lineHeight: 1.2 }}>
            AutomataViz
          </h1>

          {/* Mode selector */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1 }}>MODE</label>
            <select
              value={mode}
              onChange={(e) => { void handleModeChange(e.target.value as ModeType); }}
              style={{ background: "#334155", color: "#e2e8f0", border: "none", padding: 0, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              <optgroup label="Finite Automata">
                <option value="DFA">DFA</option>
                <option value="NFA">NFA</option>
                <option value="eNFA">ε-NFA</option>
              </optgroup>
              <optgroup label="Pushdown Automata">
                <option value="DPDA">DPDA</option>
                <option value="NPDA">NPDA</option>
              </optgroup>
              <optgroup label="Turing Machines">
                <option value="DTM">DTM</option>
                <option value="NTM">NTM</option>
                <option value="LBA">LBA</option>
              </optgroup>
              <optgroup label="Transducers">
                <option value="Mealy">Mealy</option>
                <option value="Moore">Moore</option>
              </optgroup>
              <optgroup label="ω-Automata">
                <option value="Buchi">Büchi</option>
              </optgroup>
              <optgroup label="Timed">
                <option value="Timed">Timed</option>
              </optgroup>
            </select>
          </div>

          {/* PDA Accept Mode selector */}
          {isPdaMode && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1 }}>ACCEPT</label>
              <select
                value={pdaAcceptMode}
                onChange={(e) => setPdaAcceptMode(e.target.value as PdaAcceptMode)}
                style={{ background: "#334155", color: "#e2e8f0", border: "none", padding: 0, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
              >
                <option value="final-state">Final State</option>
                <option value="empty-stack">Empty Stack</option>
                <option value="both">Both</option>
              </select>
            </div>
          )}

          {isPdaMode && (
            <>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1 }}>PDA SETUP</label>
                <button
                  onClick={() => setPdaSettingsModalOpen(true)}
                  disabled={isRunning}
                  style={{
                    background: isRunning ? "#1e293b" : "#334155",
                    color: isRunning ? "#64748b" : "#e2e8f0",
                    border: "1px solid #475569",
                    borderRadius: 4,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: isRunning ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pdaSettings.storageModel === "queue"
                    ? "Queue"
                    : pdaSettings.storageModel === "nested-stack"
                    ? "Nested"
                    : `${getPdaStoreCount(pdaSettings)} Stack`}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 170 }}>
                <label style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1 }}>EXTENSION</label>
                <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.25 }}>
                  {formatPdaExtensionSummary(pdaSettings)}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.25 }}>
                  {pdaSettings.storageModel === "queue"
                    ? "front dequeue • rear enqueue"
                    : pdaSettings.storageModel === "nested-stack"
                    ? "[frame] tokens enabled"
                    : `${getPdaStoreCount(pdaSettings)} active store${
                        getPdaStoreCount(pdaSettings) > 1 ? "s" : ""
                      }`}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.25 }}>
                  {getPdaRulePromptTitle("Input", pdaSettings)}
                </div>
              </div>
            </>
          )}

          {/* TM Accept Mode selector */}
          {isTmMode && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1 }}>ACCEPT</label>
              <select
                value={tmAcceptMode}
                onChange={(e) => setTmAcceptMode(e.target.value as TmAcceptMode)}
                style={{ background: "#334155", color: "#e2e8f0", border: "none", padding: 0, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
              >
                <option value="final-state">Final State</option>
                <option value="halt">Halt in F</option>
              </select>
            </div>
          )}

          {/* TM Multi-tape/Multi-head Settings */}
          {isTmMode && (
            <>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1 }}>TM SETUP</label>
                <button
                  onClick={() => setTmSettingsModalOpen(true)}
                  disabled={isRunning}
                  style={{
                    background: isRunning ? "#1e293b" : "#334155",
                    color: isRunning ? "#64748b" : "#e2e8f0",
                    border: "1px solid #475569",
                    borderRadius: 4,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: isRunning ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {`${tmSettings.headCount}H / ${tmSettings.tapeCount}T`}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 170 }}>
                <label style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1 }}>HEAD MAP</label>
                <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.25 }}>
                  {formatTmHeadMapping(tmSettings)}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.25 }}>
                  {formatTmInputModeLabel(tmSettings.inputMode)} input
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.25 }}>
                  {formatTmExtensionSummary(tmSettings)}
                </div>
              </div>
            </>
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: "#475569" }} />

          {/* Input + Sim buttons */}
          <input
            placeholder="Input (e.g. 010)"
            value={inputString}
            onChange={(e) => {
              const next = e.target.value;
              if ((isRunning || stepIndex >= 0) && next !== inputString) stopSimulation();
              setInputString(next);
            }}
            style={{ padding: "5px 8px", borderRadius: 4, border: "1px solid #475569", background: "#0f172a", color: "#fff", width: 130, fontSize: 13 }}
          />
          <div style={{ display: "flex", gap: 3 }}>
            <button onClick={startSimulation} disabled={isRunning} title="Start simulation" style={{ cursor: "pointer", background: "#0ea5e9", border: "none", padding: "5px 10px", borderRadius: 4, color: "white", fontWeight: 700, fontSize: 12 }}>▶ Start</button>
            <button onClick={prevStep} disabled={simTimeline.length <= 1} title="Previous step (non-destructive)" style={{ cursor: simTimeline.length > 1 ? "pointer" : "default", background: simTimeline.length > 1 ? "#2563eb" : "#1e293b", border: "none", padding: "5px 8px", borderRadius: 4, color: simTimeline.length > 1 ? "white" : "#64748b", fontSize: 12 }}>◀</button>
            <button onClick={nextStep} disabled={!isRunning && simTimeline.length === 0} title="Next step" style={{ cursor: "pointer", background: "#3b82f6", border: "none", padding: "5px 8px", borderRadius: 4, color: "white", fontSize: 12 }}>▶|</button>
            <button onClick={runAll} title="Run to end from current position" style={{ cursor: "pointer", background: "#22c55e", border: "none", padding: "5px 10px", borderRadius: 4, color: "white", fontWeight: 700, fontSize: 12 }}>⏩ Run</button>
            <button onClick={pauseSimulation} disabled={!isAutoRunning} title="Pause auto-run" style={{ cursor: isAutoRunning ? "pointer" : "default", background: isAutoRunning ? "#f59e0b" : "#1e293b", border: "none", padding: "5px 8px", borderRadius: 4, color: isAutoRunning ? "white" : "#64748b", fontSize: 12 }}>⏸</button>
            <button onClick={stopSimulation} title="Reset simulation" style={{ cursor: "pointer", background: "#ef4444", border: "none", padding: "5px 8px", borderRadius: 4, color: "white", fontSize: 12 }}>⏹</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 4, border: "1px solid #334155", background: "#0f172a" }}>
            <label htmlFor="playback-speed" style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>Speed</label>
            <input
              id="playback-speed"
              type="range"
              min={MIN_PLAYBACK_SPEED}
              max={MAX_PLAYBACK_SPEED}
              step={0.1}
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              aria-label="Playback speed"
              style={{ width: 96, cursor: "pointer" }}
            />
            <span style={{ minWidth: 88, textAlign: "right", color: "#e2e8f0", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
              {formatPlaybackSpeed(playbackSpeed)} · {getPlaybackDelayMs(playbackSpeed)}ms
            </span>
          </div>

          {/* Convert (conditional) */}
          {(mode === "NFA" || mode === "eNFA") && (
            <Link
              href={mode === "eNFA" ? "/automata/converter/enfa-to-dfa" : "/automata/converter/nfa-to-dfa"}
              onClick={() => {
                persistDraftNow();
                localStorage.setItem(
                  "automata-data-transfer",
                  JSON.stringify({
                    source: "visualizer",
                    nodes: getStateNodes(nodesRef.current),
                    edges: edgesRef.current,
                  })
                );
              }}
              style={{ textDecoration: "none" }}
            >
              <button style={{ background: "linear-gradient(to right, #9333ea, #db2777)", border: "none", color: "white", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                ⚡ {mode === "eNFA" ? "ε-NFA→DFA" : "NFA→DFA"}
              </button>
            </Link>
          )}

          {/* Sim status */}
          <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 12, flexShrink: 0 }}>
            <div style={{ color: "#94a3b8" }}>{simMessage}</div>
            {/* Show output for Mealy/Moore transducers */}
            {isMealyMoore && stepIndex >= 0 && (
              <div style={{ color: "#fbbf24", fontSize: 11 }}>
                Output: &quot;{outputString}&quot;
              </div>
            )}
            {((!isTmMode && !isMealyMoore && stepIndex === inputString.length) || (isTmMode && !isRunning && stepIndex >= 0)) && (
              <div style={{ fontWeight: 700, fontSize: 15, color: isAccepted() ? "#4ade80" : "#f87171" }}>
                {isAccepted() ? "✅ ACCEPTED" : "❌ REJECTED"}
              </div>
            )}
            {/* Mealy/Moore shows output but also acceptance */}
            {isMealyMoore && stepIndex === inputString.length && (
              <div style={{ fontWeight: 700, fontSize: 15, color: isAccepted() ? "#4ade80" : "#f87171" }}>
                {isAccepted() ? "✅ ACCEPTED" : "❌ REJECTED"}
              </div>
            )}
          </div>

          {/* More toggle */}
          <button
            onClick={() => setToolbarOpen((o) => !o)}
            title="More tools"
            style={{ cursor: "pointer", background: toolbarOpen ? "#334155" : "#0f172a", border: "1px solid #475569", padding: "5px 8px", borderRadius: 4, color: "#e2e8f0", fontSize: 14, lineHeight: 1 }}
          >
            {toolbarOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* ── Secondary Toolbar (collapsible) ── */}
        {toolbarOpen && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderTop: "1px solid #334155",
              flexWrap: "wrap",
              rowGap: 6,
            }}
          >
            <button disabled={isRunning} onClick={() => { void addTextNote(); }} title="Add text note" style={{ cursor: isRunning ? "default" : "pointer", background: isRunning ? "#1e293b" : "#0f766e", border: "none", padding: "5px 10px", borderRadius: 4, color: isRunning ? "#64748b" : "white", fontSize: 12 }}>📝 Note</button>
            <button disabled={isRunning} onClick={() => { void addFrameBox(); }} title="Add frame box" style={{ cursor: isRunning ? "default" : "pointer", background: isRunning ? "#1e293b" : "#d97706", border: "none", padding: "5px 10px", borderRadius: 4, color: isRunning ? "#64748b" : "white", fontSize: 12 }}>⬜ Frame</button>

            <div style={{ width: 1, height: 20, background: "#475569" }} />

            <button disabled={isRunning} onClick={() => changeSelectedLayer(-1)} title="Layer backward" style={{ cursor: isRunning ? "default" : "pointer", background: isRunning ? "#1e293b" : "#1d4ed8", border: "none", padding: "5px 8px", borderRadius: 4, color: isRunning ? "#64748b" : "white", fontWeight: 700, fontSize: 12 }}>L-</button>
            <button disabled={isRunning} onClick={() => changeSelectedLayer(1)} title="Layer forward" style={{ cursor: isRunning ? "default" : "pointer", background: isRunning ? "#1e293b" : "#2563eb", border: "none", padding: "5px 8px", borderRadius: 4, color: isRunning ? "#64748b" : "white", fontWeight: 700, fontSize: 12 }}>L+</button>
            <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: 4, border: "1px solid #334155", background: "#0f172a", color: "#cbd5e1", fontSize: 11, fontWeight: 700 }} title="Current layer">{selectedLayerText}</div>

            <div style={{ width: 1, height: 20, background: "#475569" }} />

            <button disabled={isRunning} onClick={clearBoard} style={{ cursor: isRunning ? "default" : "pointer", background: isRunning ? "#1e293b" : "#475569", border: "none", padding: "5px 10px", borderRadius: 4, color: isRunning ? "#64748b" : "white", fontSize: 12 }}>🧹 Clear</button>
            <button onClick={showAbout} title="About automata visualizer" style={{ cursor: "pointer", background: "#0f172a", border: "1px solid #475569", padding: "5px 10px", borderRadius: 4, color: "#e2e8f0", fontSize: 12 }}>ℹ About</button>
            <Link href={HELP_GUIDE_PATH} target="_blank" rel="noopener noreferrer" onClick={() => persistDraftNow()} title="Open detailed Help guide (Ctrl+/ or F1)" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", background: "#0f172a", border: "1px solid #475569", padding: "5px 10px", borderRadius: 4, color: "#e2e8f0", fontSize: 12, textDecoration: "none" }}>❔ Help</Link>
            <button onClick={exportConfig} style={{ cursor: "pointer", background: "#8b5cf6", border: "none", padding: "5px 10px", borderRadius: 4, color: "white", fontSize: 12 }}>💾 Export</button>
            <button onClick={() => { void copyShareUrl(); }} style={{ cursor: "pointer", background: "#0f766e", border: "none", padding: "5px 10px", borderRadius: 4, color: "white", fontSize: 12 }}>🔗 Share URL</button>
            <button disabled={isRunning} onClick={() => setImportModalOpen(true)} style={{ cursor: isRunning ? "default" : "pointer", background: isRunning ? "#1e293b" : "#6366f1", border: "none", padding: "5px 10px", borderRadius: 4, color: isRunning ? "#64748b" : "white", fontSize: 12 }}>📂 Import</button>
          </div>
        )}
      </div>

      {/* Main Content: Canvas + Sidebar */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {/* Canvas */}
        <div
          style={{ flex: 1, position: "relative", height: "100%" }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer.files;
            if (!files || files.length === 0) return;
            const file = files[0];
            if (!file.name.endsWith('.json')) return;
            const text = await file.text();
            await importFromJsonString(text);
          }}
        >
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeClick={onEdgeClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onPaneClick={onPaneClick}
            deleteKeyCode={null}
            connectionMode={ConnectionMode.Loose}
            nodesDraggable={!isRunning}
            nodesConnectable={!isRunning}
            elementsSelectable={!isRunning}
            proOptions={{ hideAttribution: true }}
            minZoom={0.05}
            maxZoom={4}
            fitView
            fitViewOptions={{ padding: 0.2, minZoom: 0.05, maxZoom: 2 }}
            style={{ background: "#0f172a" }}
          >
            <Background color="#334155" gap={20} size={1} />
            <Controls position="bottom-right" style={{ fill: "#0f172a" }} />
          </ReactFlow>

          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              padding: "10px 20px",
              background: "#1e293b",
              borderRadius: "8px",
              border: "1px solid #334155",
              display: "flex",
              gap: "10px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
            }}
          >
            <button
              disabled={isRunning}
              onClick={addNode}
              title="Add Node (Ctrl+N)"
              style={{
                background: isRunning ? "#1e293b" : "#334155",
                color: isRunning ? "#64748b" : "#e2e8f0",
                border: "1px solid #475569",
                padding: "5px 15px",
                borderRadius: "4px",
                cursor: isRunning ? "default" : "pointer",
              }}
            >
              + Add Node
            </button>
            <button
              disabled={isRunning}
              onClick={deleteSelected}
              title="Delete selected (Del)"
              style={{
                background: isRunning ? "#1e293b" : "#450a0a",
                color: isRunning ? "#64748b" : "#fca5a5",
                border: "1px solid #7f1d1d",
                padding: "5px 15px",
                borderRadius: "4px",
                cursor: isRunning ? "default" : "pointer",
              }}
            >
              🗑 Delete
            </button>
            <div
              style={{
                width: "1px",
                background: "#475569",
                margin: "0 2px",
              }}
            />
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{
                background: canUndo ? "#334155" : "#1e293b",
                color: canUndo ? "#e2e8f0" : "#475569",
                border: "1px solid #475569",
                padding: "5px 15px",
                borderRadius: "4px",
                cursor: canUndo ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              ↩ Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              style={{
                background: canRedo ? "#334155" : "#1e293b",
                color: canRedo ? "#e2e8f0" : "#475569",
                border: "1px solid #475569",
                padding: "5px 15px",
                borderRadius: "4px",
                cursor: canRedo ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              ↪ Redo
            </button>
          </div>
        </div>

        {/* Resizer Handle + Collapse Toggle */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 18,
            background: "#0b1324",
            borderLeft: "1px solid #1e293b",
            boxSizing: "border-box",
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: !sidebarCollapsed ? "1px solid #1e293b" : "none",
              color: "#e2e8f0",
              cursor: "pointer",
              padding: "6px 0",
              fontSize: 12,
              lineHeight: 1,
              width: "100%",
            }}
          >
            {sidebarCollapsed ? "◀" : "▶"}
          </button>
          {!sidebarCollapsed && (
            <div
              onMouseDown={startResizing}
              style={{
                flex: 1,
                width: 2,
                margin: "6px 0",
                cursor: "col-resize",
                background: "#334155",
                borderRadius: 999,
                transition: "background 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#0ea5e9")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "#334155")
              }
            />
          )}
        </div>

        {/* Right: Machine Description & Transition Table */}
        {!sidebarCollapsed && (
          <Sidebar
            mode={mode}
            isPdaMode={isPdaMode}
            isTmMode={isTmMode}
            stateNodes={stateNodes}
            edges={edges}
            alphabet={alphabet}
            q0={q0}
            F={F}
            pdaConfigs={pdaConfigs}
            pdaSettings={pdaSettings}
            tmConfigs={tmConfigs}
            tmSettings={tmSettings}
            transitionMap={transitionMap}
            sidebarWidth={sidebarWidth}
            simTimeline={simTimeline}
            timelineIndex={timelineIndex}
            onJumpToStep={jumpToStep}
            onPersistDraft={persistDraftNow}
            inputString={inputString}
            pdaAcceptMode={pdaAcceptMode}
          />
        )}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AutomataEditor />
    </ReactFlowProvider>
  );
}
