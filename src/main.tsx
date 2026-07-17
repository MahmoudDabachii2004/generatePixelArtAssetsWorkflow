import { createRoot } from 'react-dom/client'
import StudioWorkflow from './workflow/StudioWorkflow'
import './styles/reset.css'
import './styles/tokens.css'
import './styles/app.css'
import './styles/workflow.css'
import './styles/studio.css'

const root = document.getElementById('root')
if (!root) throw new Error('Application root element was not found.')

createRoot(root).render(<StudioWorkflow />)
