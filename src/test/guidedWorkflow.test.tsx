import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CropBoard } from '../workflow/CropBoard'
import StudioWorkflow from '../workflow/StudioWorkflow'

vi.mock('../hooks/useImageProcessor', () => ({
  useImageProcessor: () => ({
    processImage: vi.fn(),
    upscale: vi.fn(),
    encodePng: vi.fn(),
    progress: { message: 'Ready', value: 1 },
    diagnostics: { spriteFusion: 'wasm', nearestNeighbour: 'wasm' },
  }),
}))

vi.mock('../hooks/useBackgroundRemoval', () => ({
  useBackgroundRemoval: () => ({ process: vi.fn(), cancel: vi.fn(), processing: false }),
}))

describe('progressive studio workflow', () => {
  it('starts with only visual asset families and reveals one decision at a time', async () => {
    const user = userEvent.setup()
    render(<StudioWorkflow />)

    expect(screen.getByRole('heading', { name: 'What do you want to make?' })).toBeVisible()
    expect(screen.getByRole('button', { name: /Character/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /Item & object/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /World/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /UI & icon/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /Effect/i })).toBeVisible()
    expect(screen.queryByRole('button', { name: /New character/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /Character/i }))
    expect(screen.getByRole('button', { name: /New character/i })).toBeVisible()
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Character from image/i }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeVisible()
    expect(screen.getByText('Use a reference?')).toBeVisible()
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
  })

  it('builds a reusable diagonal master from the exact prompt pack', async () => {
    const user = userEvent.setup()
    render(<StudioWorkflow />)

    await user.click(screen.getByRole('button', { name: /Character/i }))
    await user.click(screen.getByRole('button', { name: /Reusable master/i }))
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Brass pirate captain')
    await user.type(
      screen.getByRole('textbox', { name: /What should it look like or do/i }),
      'Blue coat, brass hook, complete silhouette.',
    )
    await user.click(screen.getByRole('button', { name: /Build my prompt/i }))

    expect(screen.getByRole('heading', { name: 'Copy, generate, come back.' })).toBeVisible()
    expect(screen.getByRole('button', { name: /Copy strict prompt/i })).toBeVisible()
    const prompt = screen.getByRole('textbox', {
      name: 'Full strict prompt',
    }) as HTMLTextAreaElement
    expect(prompt.value).toContain('full-body three-quarter diagonal orthographic 2D game view')
    expect(prompt.value).toContain('Blue coat, brass hook, complete silhouette.')
    expect(prompt.value).toContain('Character Base Neutral Pose')
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
  })

  it('accepts multiple reference images but keeps identity mode explicit', async () => {
    const user = userEvent.setup()
    const { container } = render(<StudioWorkflow />)

    await user.click(screen.getByRole('button', { name: /Character/i }))
    await user.click(screen.getByRole('button', { name: /Character from image/i }))
    expect(screen.getByRole('button', { name: /Keep identity/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    await user.upload(input, [
      new File(['front'], 'front.png', { type: 'image/png' }),
      new File(['side'], 'side.png', { type: 'image/png' }),
    ])
    expect(screen.getAllByText(/Result \d/)).toHaveLength(1)
    expect(container.querySelectorAll('.result-gallery article')).toHaveLength(2)
  })
})

describe('manual crop board', () => {
  it('matches a portrait video image aspect ratio so crop coordinates stay exact', () => {
    render(<CropBoard imageUrl="blob:portrait" value={null} onChange={() => undefined} />)
    const image = screen.getByRole('img', { name: /source for manual crop/i })
    Object.defineProperties(image, {
      naturalWidth: { value: 1080, configurable: true },
      naturalHeight: { value: 1920, configurable: true },
    })
    fireEvent.load(image)

    expect(screen.getByRole('application', { name: /manual crop board/i })).toHaveStyle({
      '--crop-aspect': '0.5625',
    })
  })
})
