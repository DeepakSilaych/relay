import {
  CircleCheck,
  CircleDot,
  CircleHelp,
  FilePlus2,
  FileMinus2,
  FilePenLine,
  FileSymlink,
  Files,
  TriangleAlert,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  GitMerge
} from 'lucide-react'
import type { Change } from '../../../shared/relay/types'
export function GitStatusIcon({ file, code }: { file: Change; code: string }) {
  const [Icon, label, color] = file.conflict
    ? ([TriangleAlert, 'Conflicted', 'var(--destructive)'] as const)
    : file.untracked || code === '?'
      ? ([FilePlus2, 'Untracked', 'var(--git-decoration-added)'] as const)
      : code === 'A'
        ? ([FilePlus2, 'Added', 'var(--git-decoration-added)'] as const)
        : code === 'D'
          ? ([FileMinus2, 'Deleted', 'var(--git-decoration-deleted)'] as const)
          : code === 'R'
            ? ([FileSymlink, 'Renamed', 'var(--git-decoration-modified)'] as const)
            : code === 'C'
              ? ([Files, 'Copied', 'var(--git-decoration-added)'] as const)
              : ([FilePenLine, 'Modified', 'var(--git-decoration-modified)'] as const)
  return (
    <span className="ml-auto shrink-0" title={label}>
      <Icon role="img" aria-label={label} className="size-3" style={{ color }} />
    </span>
  )
}
export function RepoStatusIcon({ error, changes }: { error: string | null; changes: number }) {
  const Icon = error ? CircleHelp : changes ? CircleDot : CircleCheck
  const label = error
    ? 'Repository status unavailable'
    : changes
      ? `${changes} changed files`
      : 'Working tree clean'
  return (
    <span title={label}>
      <Icon
        role="img"
        aria-label={label}
        className="size-3"
        style={{
          color: error
            ? 'var(--destructive)'
            : changes
              ? 'var(--git-decoration-modified)'
              : 'var(--status-success)'
        }}
      />
    </span>
  )
}
export function PullRequestIcon({ state, draft }: { state: string; draft?: boolean }) {
  const Icon =
    state === 'MERGED'
      ? GitMerge
      : state === 'CLOSED'
        ? GitPullRequestClosed
        : draft
          ? GitPullRequestDraft
          : GitPullRequest
  const color =
    state === 'MERGED'
      ? 'var(--ai-action-accent)'
      : state === 'CLOSED'
        ? 'var(--destructive)'
        : draft
          ? 'var(--muted-foreground)'
          : 'var(--status-success)'
  const label =
    draft && state === 'OPEN' ? 'Draft pull request' : `${state.toLowerCase()} pull request`
  return (
    <span title={label}>
      <Icon role="img" aria-label={label} className="size-3 shrink-0" style={{ color }} />
    </span>
  )
}
