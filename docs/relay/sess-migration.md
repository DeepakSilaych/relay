# Relay on Orca

Fork: DeepakSilaych/orca, upstream stablyai/orca at fe4237cd41e4d48793fd135640939ef8aa5418e0.
Implementation branch: relay/sess-workspaces.

## Product boundary

Use Orca's existing renderer, shadcn/Radix components, terminal panes, settings, and source-control views. Retire the separate Relay renderer. Preserve the upstream MIT license and attribution.

Each execution host has a workspace root with workspaces/, repos/, util_repos/, and utils/. A workspace contains one or more repo worktrees plus terminal sessions. Every host has a permanent Genral workspace. Repositories can be attached later; utility repositories remain shared. Use gh repo clone on the selected execution host.

## Session ownership

The execution host's sess/tmux session is the durable process owner. The desktop's PTY is only an attachment client. Persist executionHostId + workspaceId + sessSessionName for each terminal pane; never use a desktop PID or a transient SSH relay PTY ID as the durable identity.

- Creating a terminal creates a named sess session once and attaches to it.
- Reopening a pane attaches to the same session without replaying the agent launch command.
- Closing the desktop or losing SSH detaches the client and preserves the session.
- Ending a session is a separate explicit action, acknowledged by its execution host.
- A disconnected host is unverifiable, never proof that a session exited.
- Inventory is reconciled against the execution host, including sessions created by the agent CLI.
- Git and file operations resolve the selected repository within the workspace, on its owning host.

## Existing code to extend

Orca already has durable terminal ownership; replacing a renderer pointer alone would not change its process lifecycle.

- src/main/daemon/daemon-pty-session-spawn.ts: stable session identity and create-or-attach handling.
- src/main/daemon/pty-subprocess/shell-launch-plan.ts: shell startup and agent command delivery. Reattachment must bypass first-launch delivery.
- src/main/daemon/pty-subprocess/native-pty-spawn.ts: PTY attachment process launch.
- src/main/daemon/daemon-pty-session-control.ts: explicit session actions.
- src/main/daemon/daemon-pty-session-inventory.ts: authoritative session inventory.
- docs/reference/ssh-execution-boundary.md: remote execution and liveness contract.

Do not replace the shell command with `sess` and retain the existing kill/respawn semantics. That would still confuse attachment exits with agent exits and could launch duplicate agents during recovery. Introduce the sess owner behind the existing provider boundary, preserving upstream stream and renderer contracts.

The old Relay backend is a reference for worktree layout, gh cloning, host presets, and Genral protections. It is not a second UI or a second authoritative process registry in this fork.

## Acceptance checks

1. Local and local-vm: start a real sess session, record the host shell PID, detach, reconnect, and verify the same PID and output.
2. Restart the desktop and attachment transport while an agent is running; verify no second startup command and no second session.
3. Lose SSH during an explicit end request; keep state unverifiable until host acknowledgement.
4. Create a terminal through the CLI while the app is disconnected; discover it on reconnect.
5. One task with two repos: isolate worktrees and inspect/stage each repo independently through Orca's existing source-control UI.
6. Genral exists exactly once per host and cannot be archived/deleted through UI or CLI.
7. Preserve existing Orca workspaces; migration must be opt-in and must not terminate legacy sessions.

## Current state

The opt-in POSIX daemon adapter is implemented and tested. See [sess-backend.md](./sess-backend.md) for activation, verification, and remaining integration. The standard SSH relay and multi-repo workspace migration are not yet wired.
