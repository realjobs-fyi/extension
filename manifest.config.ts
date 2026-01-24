import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  icons: {
    16: 'src/assets/img/icon16.png',
    48: 'src/assets/img/icon48.png',
    128: 'src/assets/img/icon128.png',
  },
  action: {
    default_icon: {
      16: 'src/assets/img/icon16.png',
      48: 'src/assets/img/icon48.png',
      128: 'src/assets/img/icon128.png',
    },
    default_popup: 'src/popup/index.html',
  },
  permissions: [
    'alarms',
    'tabs',
    'storage',  
    'activeTab',
  ],
  content_scripts: [{
    js: ['src/content/index.ts', 'src/utils/tracker.ts'],
    matches: ["https://www.linkedin.com/jobs/search/*"],
    run_at: 'document_idle',
  },
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  options_page: 'src/options/index.html',
})
