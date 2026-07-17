type PromptKind =
  | "generation"
  | "animation"
  | "repair"
  | "processing"
  | "validation"
  | "export";

interface AssetRequest {
  assetType: string;
  task: string;
  directionCount?: 1 | 2 | 4 | 8;
  loopType?: "none" | "perfect_circular" | "ping_pong" | "held";
  outputLayout?: string;
  customRequest?: string;
  variables: Record<string, string | number | string[] | null | undefined>;
}

interface PromptSelection {
  core: string[];
  specialized: string;
  direction?: string;
  loop?: string;
  layout?: string;
}

const CORE = [
  "01_core/00-request-schema",
  "01_core/01-reference-image-lock",
  "01_core/02-pixel-grid-calibration",
  "01_core/03-pixel-art-rendering-lock",
  "01_core/04-palette-lock",
  "01_core/05-camera-and-canvas-lock",
  "01_core/06-background-and-alpha-rules",
];

const CORE_TAIL = [
  "01_core/08-output-contract",
  "01_core/09-postprocessing-contract",
  "01_core/07-negative-prompt-library",
  "01_core/10-generation-priority-order",
];

export function selectPromptModules(request: AssetRequest): PromptSelection {
  const specialized = resolveSpecializedPrompt(request);
  return {
    core: [...CORE, ...CORE_TAIL],
    specialized,
    direction: resolveDirectionWrapper(request.directionCount),
    loop: resolveLoopModule(request.loopType),
    layout: resolveLayoutModule(request.outputLayout),
  };
}

export function composePrompt(
  selection: PromptSelection,
  loadPrompt: (id: string) => string,
  variables: Record<string, unknown>,
  customRequest = ""
): string {
  const orderedIds = [
    ...selection.core.slice(0, 7),
    selection.specialized,
    selection.direction,
    selection.loop,
    selection.layout,
    ...selection.core.slice(7),
  ].filter((value): value is string => Boolean(value));

  const fragments = orderedIds.map(loadPrompt);
  const composedCore = fragments.join("\n\n");
  const allVariables = {
    ...variables,
    COMPOSED_CORE_PROMPT: composedCore,
    CUSTOM_REQUEST: customRequest,
  };

  return interpolate(composedCore, allVariables);
}

function interpolate(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return "";
    return Array.isArray(value) ? value.join(", ") : String(value);
  });
}

function resolveSpecializedPrompt(request: AssetRequest): string {
  const key = `${request.assetType}:${request.task}`;
  const registry: Record<string, string> = {
    "character_animation:idle": "05_character_animation/anim-idle-subtle-loop",
    "character_animation:walk": "05_character_animation/anim-walk-loop",
    "character_animation:run": "05_character_animation/anim-run-loop",
    "tileset:ground_autotile": "12_tilesets/tileset-ground-autotile",
    "background:parallax": "16_backgrounds/background-parallax-layer-set",
    "repair:loop_seam": "31_repairs/repair-animation-loop-seam",
  };
  const result = registry[key];
  if (!result) throw new Error(`No specialized prompt registered for ${key}`);
  return result;
}

function resolveDirectionWrapper(count?: number): string | undefined {
  if (!count || count === 1) return undefined;
  const registry: Record<number, string> = {
    2: "07_direction_wrappers/direction-two-side",
    4: "07_direction_wrappers/direction-four-way",
    8: "07_direction_wrappers/direction-eight-way",
  };
  return registry[count];
}

function resolveLoopModule(loop?: AssetRequest["loopType"]): string | undefined {
  if (!loop || loop === "none") return undefined;
  const registry = {
    perfect_circular: "29_loops/loop-perfect-circular",
    ping_pong: "29_loops/loop-ping-pong",
    held: "29_loops/loop-held-animation",
  } as const;
  return registry[loop];
}

function resolveLayoutModule(layout?: string): string | undefined {
  if (!layout) return undefined;
  const registry: Record<string, string> = {
    horizontal_strip: "28_layouts/layout-horizontal-strip",
    grid: "28_layouts/layout-grid-sheet",
    direction_rows: "28_layouts/layout-direction-rows-action-columns",
  };
  return registry[layout];
}
