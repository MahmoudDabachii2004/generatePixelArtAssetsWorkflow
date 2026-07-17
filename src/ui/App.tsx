import { useEffect, useState } from 'react'
import './theme.css'
import { Hub } from './Hub'
import { AlignTool } from './tools/AlignTool'
import { CharacterTool } from './tools/CharacterTool'
import { EffectsUiTool } from './tools/EffectsUiTool'
import { MapTool } from './tools/MapTool'
import { ObjectTool } from './tools/ObjectTool'
import { SheetTool } from './tools/SheetTool'
import { SnapTool } from './tools/SnapTool'
import { TilesetTool } from './tools/TilesetTool'

function useHashRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export default function App() {
  const route = useHashRoute()
  const inTool = route.startsWith('#/tool/')
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="glyph" aria-hidden="true" />
          Pixel Forge
        </a>
        <span className="spacer" />
        {inTool && (
          <span className="crumb">
            <a href="#/">← Accueil</a>
          </span>
        )}
      </header>
      {route === '#/tool/sheet' ? (
        <SheetTool />
      ) : route === '#/tool/character' ? (
        <CharacterTool />
      ) : route === '#/tool/object' ? (
        <ObjectTool />
      ) : route === '#/tool/tileset' ? (
        <TilesetTool />
      ) : route === '#/tool/map' ? (
        <MapTool />
      ) : route === '#/tool/snap' ? (
        <SnapTool />
      ) : route === '#/tool/align' ? (
        <AlignTool />
      ) : route === '#/tool/effects' ? (
        <EffectsUiTool />
      ) : (
        <Hub />
      )}
      <footer className="foot">Pixel Forge · pipeline sprite 100% local &amp; gratuit · génération 20% / pipeline 80%</footer>
    </div>
  )
}
