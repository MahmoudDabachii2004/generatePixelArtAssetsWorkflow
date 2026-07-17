// Prompt builder rebuilt on chongdashu's verbatim skeleton (the old catalog was
// ~1000-1400 words, contradictory, and mis-used the calibration grid). Each
// prompt is short, positive, ingest-tuned, and states exactly which reference
// images to attach — because in the free copy-paste flow there is no API wiring
// the images automatically. The load-bearing pieces are kept verbatim:
//   - numbered image-role block (holds identity while enforcing discipline)
//   - the restrictive-lever block (the single biggest quality lever)
//   - foot-plant / consistent baseline language (kills drift)
//   - edge-to-edge flat chroma with a hard silhouette edge (clean ingest)
// The checkerboard grid is an IMAGE reference only, never "the character".

export type ChromaKey = 'green' | 'magenta'
export type ModelKey = 'chatgpt' | 'gemini'
export type Direction = 's' | 'w' | 'n' | 'e'

export interface CharacterBrief {
  name: string
  description: string
  style: string
  palette: string
  chroma: ChromaKey
  canvas: number
  model: ModelKey
}

export interface PromptAttachment {
  slot: string
  what: string
}

export interface PromptOutput {
  title: string
  attachments: PromptAttachment[]
  prompt: string
  modelNote: string
}

export const CHROMA_HEX: Record<ChromaKey, string> = { green: '#00FF00', magenta: '#FF00FF' }
const CHROMA_LABEL: Record<ChromaKey, string> = { green: 'vert', magenta: 'magenta' }

const DIRECTION_LABEL: Record<Direction, string> = {
  s: 'de face (Sud, face à la caméra)',
  w: 'de profil gauche (Ouest)',
  n: 'de dos (Nord)',
  e: 'de profil droit (Est)',
}

function restrictiveBlock(brief: CharacterBrief): string {
  return [
    `Style : ${brief.style}, palette limitée (${brief.palette}) avec des rampes clair/sombre et un contour foncé.`,
    `Rendu : vrai pixel art basse résolution, gros pixels durs — AUCUN anti-aliasing, aucun lissage, aucun dégradé, aucun ombrage 3D.`,
    `Volontairement simple : gros clusters de pixels, aucun détail fin, aucun bijou ni accessoire minuscule (ce bridage rend la grille native récupérable ensuite).`,
  ].join('\n')
}

function canvasBlock(brief: CharacterBrief): string {
  const hex = CHROMA_HEX[brief.chroma]
  return `Toile : exactement ${brief.canvas}x${brief.canvas}. Remplis TOUTE la toile, bord à bord, d'un seul ${CHROMA_LABEL[brief.chroma]} chroma plat ${hex} — pas de dégradé, pas de texture, pas de vignette. Place le sujet entièrement dans la toile avec une marge sur les 4 côtés ; rien ne touche les bords. Le contour rencontre le fond par un bord net, SANS halo.`
}

function modelNote(brief: CharacterBrief): string {
  return brief.model === 'gemini'
    ? `Gemini : ajoute en dernière ligne « Sors une seule image, fond uni plein, sans panneau, cadre, bordure, damier, grille ni motif de transparence. » Garde la toile à ${brief.canvas}px (l'uniformité du fond se dégrade au-delà).`
    : `ChatGPT : demande la meilleure qualité. Si le fond ressort légèrement dégradé/anti-aliasé, monte la tolérance de détourage dans l'app.`
}

const GRID_ATTACH: PromptAttachment = {
  slot: 'Image 1',
  what: 'le damier de calibration (discipline pixel — ne PAS le copier dans le rendu)',
}

export function buildAnchorPrompt(brief: CharacterBrief): PromptOutput {
  const prompt = [
    `Dessine UN personnage de jeu 2D en pixel art, ${DIRECTION_LABEL.s}, plein corps, pose neutre debout, pieds posés en bas-centre.`,
    ``,
    `Personnage : ${brief.description}.`,
    restrictiveBlock(brief),
    ``,
    canvasBlock(brief),
    ``,
    `Un seul personnage, aucune arme tenue, aucun effet. Éviter : autres personnages, décor, ombre au sol, texte/logo, toute couleur de fond autre que le ${CHROMA_LABEL[brief.chroma]} plat.`,
  ].join('\n')
  return {
    title: `Ancre Sud — ${brief.name}`,
    attachments: [GRID_ATTACH],
    prompt,
    modelNote: modelNote(brief),
  }
}

export function buildNeutralPrompt(brief: CharacterBrief): PromptOutput {
  const prompt = [
    `Redessine EXACTEMENT le même personnage que l'image de référence, ${DIRECTION_LABEL.s}, mais NEUTRE : retire toute arme tenue, tout effet, toute lueur, toute pose dynamique.`,
    `Garde identité, silhouette, proportions, palette et style à l'identique. Ne redesigne rien d'autre.`,
    restrictiveBlock(brief),
    ``,
    canvasBlock(brief),
    ``,
    `Les effets et armes n'apparaîtront que dans les boards d'action, jamais dans l'ancre.`,
  ].join('\n')
  return {
    title: `Reset neutre — ${brief.name}`,
    attachments: [
      GRID_ATTACH,
      { slot: 'Image 2', what: `l'ancre Sud existante (identité à préserver)` },
    ],
    prompt,
    modelNote: modelNote(brief),
  }
}

export function buildDirectionalPrompt(brief: CharacterBrief, direction: 'w' | 'n'): PromptOutput {
  const prompt = [
    `À partir de l'image de référence (le personnage snappé, ${DIRECTION_LABEL.s}), redessine LE MÊME personnage vu ${DIRECTION_LABEL[direction]}.`,
    `Identité identique : visage, cheveux, tenue, équipement, couleurs, proportions, épaisseur de contour — mêmes que la référence. Même taille, même échelle, même palette. Ce sont des poses redessinées, pas un modèle 3D tourné.`,
    `Garde l'équipement asymétrique du bon côté physique (ne le miroir pas).`,
    restrictiveBlock(brief),
    ``,
    canvasBlock(brief),
    ``,
    `Un seul personnage debout, pieds en bas-centre. Éviter : décor, ombre au sol, texte, flèches, étiquettes de direction.`,
  ].join('\n')
  return {
    title: `Direction ${direction.toUpperCase()} — ${brief.name}`,
    attachments: [
      { slot: 'Image 1', what: `l'ancre Sud SNAPPÉE (identité — télécharge-la depuis l'étape précédente)` },
      { slot: 'Image 2', what: 'le damier de calibration (ne PAS le copier)' },
    ],
    prompt,
    modelNote: modelNote(brief),
  }
}

export interface ActionPromptInput {
  action: string
  direction: Direction
  frames: number
  columns: number
  rows: number
}

export function buildActionPrompt(brief: CharacterBrief, input: ActionPromptInput): PromptOutput {
  const prompt = [
    `À partir de l'image de référence (le personnage snappé, ${DIRECTION_LABEL[input.direction]}), produis ${input.frames} frames d'une animation « ${input.action} ».`,
    `Une seule image, grille ${input.columns} colonnes × ${input.rows} lignes, lue gauche→droite puis haut→bas. Chaque frame = le MÊME personnage, même identité, même échelle, même orientation ; seule la pose change entre les frames.`,
    `Pieds sur la MÊME ligne de base dans chaque frame, personnage centré horizontalement dans chaque case. Frame 1 et dernière frame = phases différentes (pas de saccade au bouclage).`,
    restrictiveBlock(brief),
    ``,
    canvasBlock(brief),
    `Espace chroma LARGE entre les poses ; chaque pose est une silhouette connexe isolée, séparée des autres par du fond plat.`,
    ``,
    `NE dessine AUCUNE ligne de grille, case, cadre, séparateur, numéro ni étiquette. Les gouttières entre poses = juste le même fond plat. Aucun flou de mouvement.`,
  ].join('\n')
  return {
    title: `${input.action} ${input.direction.toUpperCase()} — ${input.frames} frames (${input.columns}×${input.rows})`,
    attachments: [
      { slot: 'Image 1', what: `l'ancre ${input.direction.toUpperCase()} SNAPPÉE (identité)` },
      { slot: 'Image 2', what: `le damier pose-board ${input.columns}×${input.rows} (ne PAS le copier)` },
    ],
    prompt,
    modelNote: modelNote(brief),
  }
}

// Free walk path: a still pose-board with an explicit leg-phase sequence. The
// deterministic foot-baseline lock downstream re-grounds it — which is what
// paid image-to-video used to buy — so a still board is enough.
export function buildWalkPrompt(brief: CharacterBrief, direction: Direction, frames = 8): PromptOutput {
  const columns = Math.min(4, frames)
  const rows = Math.ceil(frames / columns)
  const prompt = [
    `À partir de l'image de référence (le personnage snappé, ${DIRECTION_LABEL[direction]}), produis un cycle de MARCHE de ${frames} frames.`,
    `Une seule image, grille ${columns} colonnes × ${rows} lignes, lue gauche→droite puis haut→bas.`,
    `Séquence des jambes : frame 1 = contact pied gauche devant, frame 2 = passage, frame 3 = contact pied droit devant, frame 4 = passage, puis on répète le cycle. Bras en opposition naturelle.`,
    `IMPÉRATIF anti-dérive : le personnage NE se déplace PAS horizontalement, NE tourne PAS, NE change PAS d'échelle. Même identité, pieds sur la même ligne de base, personnage centré dans chaque case.`,
    restrictiveBlock(brief),
    ``,
    canvasBlock(brief),
    `Espace chroma large entre les poses ; chaque pose isolée.`,
    ``,
    `AUCUNE ligne de grille, cadre, séparateur, numéro, étiquette ni flou de mouvement.`,
  ].join('\n')
  return {
    title: `Marche ${direction.toUpperCase()} — ${frames} frames (${columns}×${rows})`,
    attachments: [
      { slot: 'Image 1', what: `l'ancre ${direction.toUpperCase()} SNAPPÉE (identité)` },
      { slot: 'Image 2', what: `le damier pose-board ${columns}×${rows} (ne PAS le copier)` },
    ],
    prompt,
    modelNote: modelNote(brief),
  }
}

export interface ObjectPromptInput {
  set: boolean
  count?: number
  columns?: number
  rows?: number
}

export function buildObjectPrompt(brief: CharacterBrief, input: ObjectPromptInput): PromptOutput {
  const lines = [
    input.set
      ? `Dessine ${input.count ?? 6} objets de jeu 2D en pixel art partageant EXACTEMENT le même style, disposés en grille ${input.columns ?? 3} colonnes × ${input.rows ?? 2} lignes, un objet par case.`
      : `Dessine UN seul objet de jeu 2D en pixel art.`,
    `Objet(s) : ${brief.description}.`,
    restrictiveBlock(brief),
    ``,
    canvasBlock(brief),
    input.set
      ? `Espace chroma LARGE entre les objets ; chaque objet = une silhouette connexe isolée. AUCUNE ligne de grille, cadre, numéro ni étiquette.`
      : `Objet centré, marge égale sur les 4 côtés, une seule silhouette isolée.`,
    `Éviter : mains qui tiennent l'objet, personnages, décor, ombre au sol, texte/logo.`,
  ]
  return {
    title: input.set ? `Set d'objets — ${brief.name}` : `Objet — ${brief.name}`,
    attachments: [GRID_ATTACH],
    prompt: lines.join('\n'),
    modelNote: modelNote(brief),
  }
}

export interface TilesetPromptInput {
  columns: number
  rows: number
  tilePx: number
}

export function buildTilesetPrompt(brief: CharacterBrief, input: TilesetPromptInput): PromptOutput {
  const prompt = [
    `Dessine un tileset de jeu en pixel art : grille ${input.columns} colonnes × ${input.rows} lignes de tuiles carrées de ${input.tilePx}px, une tuile par case.`,
    `Contenu : ${brief.description}.`,
    `Les bords des tuiles qui se répètent doivent être PARFAITEMENT raccordables (seamless) ; garde les surfaces de collision visuellement lisibles.`,
    restrictiveBlock(brief),
    ``,
    canvasBlock(brief),
    `Remplis les cases inutilisées avec le fond chroma plat. AUCUNE ligne de grille visible dessinée, aucun numéro, aucune étiquette.`,
  ].join('\n')
  return {
    title: `Tileset ${input.columns}×${input.rows} @ ${input.tilePx}px — ${brief.name}`,
    attachments: [GRID_ATTACH],
    prompt,
    modelNote: modelNote(brief),
  }
}

export type MapView = 'top' | 'side'

export function buildMapPrompt(brief: CharacterBrief, view: MapView): PromptOutput {
  const prompt = [
    `Dessine UNE map de jeu 2D jouable en pixel art, vue ${view === 'top' ? 'de dessus (top-down)' : 'de côté (side-scroller)'}, avec une projection cohérente sur toute l'image.`,
    `Contenu : ${brief.description}.`,
    `Chemins, murs, entrées, dangers et surfaces jouables clairement distinguables ; grammaire d'environnement réutilisable (pas de bruit décoratif ponctuel).`,
    restrictiveBlock(brief),
    ``,
    `Toile : exactement ${brief.canvas}x${brief.canvas}, entièrement peinte (map OPAQUE, PAS de fond chroma). Garde l'espace de jeu lisible à l'échelle caméra.`,
    `Éviter : changements de perspective, HUD, texte/étiquettes, composition « poster ».`,
  ].join('\n')
  return { title: `Map ${view} — ${brief.name}`, attachments: [GRID_ATTACH], prompt, modelNote: modelNote(brief) }
}

export type LayerDepth = 'ciel' | 'lointain' | 'moyen' | 'proche'

export interface LayerPromptInput {
  depth: LayerDepth
  seamless: boolean
}

export function buildLayerPrompt(brief: CharacterBrief, input: LayerPromptInput): PromptOutput {
  const reveal = input.depth !== 'ciel'
  const hex = CHROMA_HEX[brief.chroma]
  const prompt = [
    `Dessine UNE couche de décor parallax en pixel art, profondeur « ${input.depth} », pour un défilement horizontal.`,
    `Contenu : ${brief.description}.`,
    input.seamless
      ? `La couche doit être PARFAITEMENT raccordable horizontalement (le bord droit se raccorde au bord gauche) pour boucler au scroll.`
      : ``,
    reveal
      ? `Fond : ${hex} chroma plat PARTOUT où cette couche doit laisser voir les couches derrière. Éléments à bord net contre le chroma.`
      : `Fond : ciel/atmosphère peint et opaque (c'est la couche la plus lointaine).`,
    `Contraste plus faible que la couche jouable pour que les personnages restent dominants. Sol attaché en bas de la couche, formes de ciel en haut.`,
    restrictiveBlock(brief),
    `Toile : ${brief.canvas}px de large. Éviter : plateformes qui semblent marchables (si c'est du décor), collectibles, personnages, texte.`,
  ]
    .filter(Boolean)
    .join('\n')
  return { title: `Couche parallax « ${input.depth} » — ${brief.name}`, attachments: [GRID_ATTACH], prompt, modelNote: modelNote(brief) }
}

export interface EffectPromptInput {
  frames: number
  columns: number
  rows: number
}

export function buildEffectPrompt(brief: CharacterBrief, input: EffectPromptInput): PromptOutput {
  const hex = CHROMA_HEX[brief.chroma]
  const prompt = [
    `Dessine une séquence d'effet visuel (VFX) de jeu en pixel art : ${input.frames} frames sur une grille ${input.columns} colonnes × ${input.rows} lignes, une frame par case.`,
    `Effet : ${brief.description}.`,
    `Même point d'origine CENTRÉ dans chaque case, même échelle, même palette. La séquence commence clairement, atteint un pic une fois, puis se dissipe proprement.`,
    restrictiveBlock(brief),
    ``,
    `Toile : ${brief.canvas}px, fond ${CHROMA_LABEL[brief.chroma]} chroma plat ${hex} bord à bord ; effets à bord net sans halo.`,
    `Espace chroma large entre les frames ; chaque effet isolé. AUCUNE ligne de grille, cadre, numéro, étiquette ni personnage.`,
  ].join('\n')
  return {
    title: `VFX — ${input.frames} frames (${input.columns}×${input.rows})`,
    attachments: [GRID_ATTACH],
    prompt,
    modelNote: modelNote(brief),
  }
}

export interface UiPromptInput {
  columns: number
  rows: number
}

export function buildUiPrompt(brief: CharacterBrief, input: UiPromptInput): PromptOutput {
  const hex = CHROMA_HEX[brief.chroma]
  const prompt = [
    `Dessine un atlas d'UI/HUD de jeu en pixel art : composants séparés en grille ${input.columns} colonnes × ${input.rows} lignes, un composant par case.`,
    `Composants : ${brief.description}.`,
    `Padding généreux entre composants. Laisse les zones de remplissage dynamiques (barres de vie, jauges) PLATES et unies pour que le code les pilote. Bords nets, coins et épaisseurs de contour cohérents.`,
    restrictiveBlock(brief),
    ``,
    `Toile : ${brief.canvas}px, fond ${CHROMA_LABEL[brief.chroma]} chroma plat ${hex} bord à bord.`,
    `AUCUN texte lisible, AUCUN chiffre, aucune jauge remplie, aucun composant qui se chevauche, aucune ligne de grille.`,
  ].join('\n')
  return {
    title: `Atlas UI ${input.columns}×${input.rows} — ${brief.name}`,
    attachments: [GRID_ATTACH],
    prompt,
    modelNote: modelNote(brief),
  }
}
