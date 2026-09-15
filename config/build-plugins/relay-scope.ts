import type { Plugin } from 'vite'
export function relayScope(): Plugin {
  return {
    name: 'relay-feature-scope',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/renderer/src/assets/main.css')) {
        return
      }
      return code
        .replace(
          "@import 'tailwindcss';",
          "@import 'tailwindcss' source(none);\n@source '../relay';\n@source '../components/ui';"
        )
        .replace(
          /^@import '(?:katex\/[^']+|\.\/(?:rich-markdown-editor|markdown-preview|mobile-page)\.css)';\n/gm,
          ''
        )
    },
    generateBundle() {
      const forbidden =
        /\/src\/(?:renderer\/src\/(?:store\/|app-shell\/|components\/(?:mobile|automations|task-page|settings|skills|artifacts)\/)|main\/(?:startup|telemetry|mobile|automations)\/)/
      const unwanted = [...this.getModuleIds()].filter((id) => forbidden.test(id))
      if (unwanted.length) {
        this.error(`Removed Orca features entered the Relay bundle:\n${unwanted.join('\n')}`)
      }
    }
  }
}
