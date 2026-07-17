// Home hub — the several "doors" the user asked for. Each door is either a
// standalone tool or a guided flow. Only the flagship sheet tool is wired for
// now; the rest are declared so the map of the app is visible from day one.

interface Door {
  mark: string
  title: string
  description: string
  href?: string
}

const DOORS: Door[] = [
  {
    mark: 'CUT·SNAP·PACK',
    title: 'J’ai déjà un sheet',
    description:
      'Découpe (sans fusion) → pixel-snap → recentrage sur les pieds → export 1280×512 + manifest. Le flux qui marche, sur ton propre board.',
    href: '#/tool/sheet',
  },
  {
    mark: 'SNAP',
    title: 'Pixel-snap seul',
    description: 'Transforme une image « pixel-ish » de l’IA en vraie grille native propre.',
    href: '#/tool/snap',
  },
  {
    mark: 'ALIGN',
    title: 'Recentrer / aligner',
    description: 'Ancre chaque frame sur la même ligne de pieds (128,255) pour tuer le drift.',
    href: '#/tool/align',
  },
  {
    mark: 'GENERATE',
    title: 'Générer un personnage',
    description: 'South anchor → snap → NSEW (est = flip) → boards d’action, avec les prompts prêts à coller.',
    href: '#/tool/character',
  },
  {
    mark: 'OBJETS',
    title: 'Armes, objets & items',
    description: 'Objet isolé ou set → pixel-snap + trim → atlas packé + JSON (Phaser/générique).',
    href: '#/tool/object',
  },
  {
    mark: 'TILESET',
    title: 'Tileset',
    description: 'Board de tuiles → grille uniforme nettoyée + manifest (Godot/Unity/Tiled).',
    href: '#/tool/tileset',
  },
  {
    mark: 'MONDE',
    title: 'Maps & parallax',
    description: 'Map jouable, ou map en calques (parallax) : z-order + scroll, aperçu défilant, export par calque + manifest.',
    href: '#/tool/map',
  },
  {
    mark: 'FX·UI',
    title: 'Effets & interface',
    description: 'VFX (séquence centrée) ou atlas UI/HUD → prompts tunés + traitement + export.',
    href: '#/tool/effects',
  },
]

export function Hub() {
  return (
    <>
      <section className="hub-hero">
        <div className="eyebrow">Pixel Forge · pipeline sprite gratuit</div>
        <h1>Choisis une porte.</h1>
        <p>
          La génération d’image, c’est 20 % du travail. Les 80 % — découper, snapper la grille
          native, recentrer, packer — se font ici, localement et gratuitement. Chaque étape est
          aussi un outil autonome.
        </p>
      </section>
      <section className="doors">
        {DOORS.map((door) =>
          door.href ? (
            <a key={door.title} className="door" href={door.href}>
              <div className="d-mark">{door.mark}</div>
              <h3>{door.title}</h3>
              <p>{door.description}</p>
            </a>
          ) : (
            <div key={door.title} className="door" aria-disabled="true">
              <div className="d-mark">{door.mark}</div>
              <h3>{door.title}</h3>
              <p>{door.description}</p>
              <span className="soon">bientôt</span>
            </div>
          ),
        )}
      </section>
    </>
  )
}
