import { createContext, useContext } from 'react'
import { TerminalSquare } from 'lucide-react'
import { ClaudeIcon, OpenAIIcon, GeminiIcon, DroidIcon } from '@/components/status-bar/icons'
import { AiderIcon, OpenCodeIcon, CopilotIcon, PiIcon } from '@/lib/agent-icon-glyphs'
import amp from '../../../shared/agent-icons/amp.png?url'
import cursor from '../../../shared/agent-icons/cursor.png?url'
export const AgentIdentities = createContext<Record<string, string | null>>({})
const icons = {
  claude: ClaudeIcon,
  codex: OpenAIIcon,
  gemini: GeminiIcon,
  opencode: OpenCodeIcon,
  aider: AiderIcon,
  droid: DroidIcon,
  copilot: CopilotIcon,
  pi: PiIcon
}
const labels: Record<string, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  gemini: 'Gemini CLI',
  opencode: 'OpenCode',
  aider: 'Aider',
  amp: 'Amp',
  droid: 'Droid',
  copilot: 'GitHub Copilot',
  cursor: 'Cursor Agent',
  pi: 'Pi'
}
export function TerminalAgentIcon({
  terminal,
  siblings
}: {
  terminal: string
  siblings?: string[]
}) {
  const identities = useContext(AgentIdentities)
  const agent = identities[terminal] || (siblings || []).map((id) => identities[id]).find(Boolean)
  if (!agent || !labels[agent]) {
    return <TerminalSquare className="size-3.5 shrink-0" />
  }
  const Icon =
    agent === 'claude'
      ? icons.claude
      : agent === 'codex'
        ? icons.codex
        : agent === 'gemini'
          ? icons.gemini
          : agent === 'opencode'
            ? icons.opencode
            : agent === 'aider'
              ? icons.aider
              : agent === 'droid'
                ? icons.droid
                : agent === 'copilot'
                  ? icons.copilot
                  : agent === 'pi'
                    ? icons.pi
                    : undefined
  return (
    <span
      data-agent={agent}
      title={labels[agent]}
      aria-label={labels[agent]}
      className="inline-flex shrink-0"
    >
      {Icon ? (
        <Icon size={14} />
      ) : (
        <img src={agent === 'amp' ? amp : cursor} alt="" className="size-3.5" />
      )}
    </span>
  )
}
