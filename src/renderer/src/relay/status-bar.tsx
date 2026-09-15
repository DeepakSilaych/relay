import { PullRequestIcon } from './git-status-icon'
import { useContext } from 'react'
import {
  Server,
  GitBranch,
  Link2,
  Ellipsis,
  CircleHelp,
  CircleCheck,
  CircleDot,
  CircleDashed,
  CircleX
} from 'lucide-react'
import type { Snapshot, RepoStatus, Integrations, Workspace } from '../../../shared/relay/types'
import { ActionMenu, copyPath, Feedback } from './action-menu'
export function StatusBar({
  host,
  loading,
  snapshot,
  statuses,
  integrations,
  workspace,
  attachTicket,
  showGit
}: {
  host: string
  loading: boolean
  snapshot?: Snapshot
  statuses: RepoStatus[]
  integrations?: Integrations
  workspace?: Workspace
  attachTicket: () => void
  showGit: () => void
}) {
  const report = useContext(Feedback),
    prs = integrations?.prs.flatMap((r) => r.prs.map((pr) => ({ ...pr, repo: r.repo }))) || []
  const issue = integrations?.ticket.issue,
    url = issue?.url
  const TicketIcon = integrations?.ticket.error
    ? CircleHelp
    : issue?.state.type === 'completed'
      ? CircleCheck
      : issue?.state.type === 'canceled'
        ? CircleX
        : issue?.state.type === 'started'
          ? CircleDot
          : issue
            ? CircleDot
            : CircleDashed
  const errors = integrations?.prs.filter((r) => r.error) || []
  return (
    <footer className="flex h-7 shrink-0 items-center gap-3 border-t px-3 text-xs text-muted-foreground">
      <span className="flex shrink-0 items-center gap-1">
        <Server className="size-3" />
        {loading ? 'Connecting' : snapshot ? host : 'Unverifiable'}
      </span>
      <button
        className="flex shrink-0 items-center gap-1 hover:text-foreground"
        title="Open source control"
        onClick={showGit}
      >
        <GitBranch className="size-3" />
        {statuses.length} repos · {statuses.reduce((n, r) => n + r.files.length, 0)} changes
      </button>
      {(prs.length > 0 || errors.length > 0) && (
        <ActionMenu
          dropdown
          actions={[
            ...prs.map((pr) => ({
              label: `${pr.repo} #${pr.number} — ${pr.title}`,
              icon: <PullRequestIcon state={pr.state} draft={pr.isDraft} />,
              run: () => window.relay.openExternal(pr.url)
            })),
            ...errors.map((r) => ({
              label: `${r.repo}: ${r.error}`,
              disabled: true,
              run: () => {}
            }))
          ]}
        >
          <button
            className="flex shrink-0 items-center gap-1 hover:text-foreground"
            aria-label="Pull requests"
          >
            {prs.length ? (
              <PullRequestIcon state={prs[0].state} draft={prs[0].isDraft} />
            ) : (
              <CircleHelp className="size-3 text-destructive" />
            )}
            {prs.length} PRs{errors.length ? ' · unavailable' : ''}
          </button>
        </ActionMenu>
      )}
      <span className="flex-1" />
      {workspace && (
        <div className="flex min-w-0 items-center gap-1">
          <button
            title={
              integrations?.ticket.error ||
              (issue ? `${issue.title} · ${issue.state.name}` : 'Attach Linear ticket')
            }
            className="flex min-w-0 items-center gap-1 hover:text-foreground"
            onClick={() =>
              url ? void window.relay.openExternal(url).catch(report) : attachTicket()
            }
          >
            {workspace.ticket ? (
              <TicketIcon
                role="img"
                aria-label={
                  integrations?.ticket.error
                    ? 'Linear status unavailable'
                    : issue?.state.name || 'Loading ticket status'
                }
                className="size-3 shrink-0"
                style={{
                  color: integrations?.ticket.error
                    ? 'var(--destructive)'
                    : issue?.state.color
                      ? issue.state.color
                      : issue?.state.type === 'completed'
                        ? 'var(--status-success)'
                        : issue?.state.type === 'started'
                          ? 'var(--workspace-status-progress)'
                          : 'var(--muted-foreground)'
                }}
              />
            ) : (
              <Link2 className="size-3 shrink-0" />
            )}
            <span className="truncate">
              {issue
                ? `${issue.identifier} · ${issue.state.name}`
                : workspace.ticket || 'Attach ticket'}
            </span>
          </button>
          <ActionMenu
            dropdown
            actions={[
              { label: 'Edit attached ticket', run: attachTicket },
              {
                label: 'Copy ticket link',
                disabled: !url,
                run: () => (url ? copyPath(url) : undefined)
              }
            ]}
          >
            <button aria-label="Ticket actions" className="p-1">
              <Ellipsis className="size-3" />
            </button>
          </ActionMenu>
        </div>
      )}
    </footer>
  )
}
