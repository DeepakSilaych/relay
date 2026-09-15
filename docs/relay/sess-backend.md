# Experimental sess process owner

The fork can run its POSIX daemon terminals inside persistent sess/tmux sessions while retaining Orca's terminal UI and byte stream. This is opt-in and does not convert or stop existing Orca terminals.

## Enable on an execution host

Install tmux and use the fork's bundled sess script. Start a fresh development runtime with absolute paths:

```sh
export ORCA_SESS_EXECUTABLE="$PWD/resources/relay/sess"
export ORCA_SESS_DIR="$PWD/.relay-sess"
pnpm dev
```

Use a separate development profile/daemon from any running production Orca instance. An already-running daemon retains its original environment. Agents running development checks must additionally set `ORCA_BACKGROUND_LAUNCH=1` under the repository's launch policy.

The same daemon adapter can run on macOS or Linux. Native Windows sess execution is rejected explicitly. The existing SSH relay has a separate PTY implementation and is not switched by these variables on the desktop; remote relay wiring is still pending. Execution paths belong to the machine running the daemon.

## Behavior

- Durable identity derives from the execution-host sess root and Orca session ID.
- A host lock serializes creation; saved creation intent prevents ambiguous launches from replaying agent commands.
- New sessions receive the requested cwd/environment and execute the startup command once.
- Reattachment reports `isNew: false` to Orca and bypasses startup-command delivery and shell-ready gating.
- Disposing a view kills only its attachment process. The host shell survives.
- An attachment exit triggers a host probe. Live owners reattach with bounded retry delays; failed probes stay unverifiable. Only host-proven absence produces an exit notification.
- Explicit termination targets the exact tmux session. Descendant sweeps do not mistake the attachment tree for the owner tree.
- Canceled attachment publication detaches without terminating the existing session.
- Ended or ambiguously created identities are not silently recreated. Create a new terminal to launch new work.

## Verification

September 13, 2026:

- Targeted Vitest run: 130 passed, 1 upstream test skipped. Includes real PTY I/O, stable host PID, startup exactly once, concurrent creation, forced attachment loss, explicit end, liveness evidence, cancellation and Orca startup/attach-only regressions.
- Node typecheck and changed-file oxlint passed.
- Orca main/preload/renderer production build passed.
- local-vm: bundled the same owner code, created a session, attached over a real SSH PTY, wrote a marker file, forcibly disconnected SSH, and called ensure from a second Node process. The PID stayed the same and the startup file still had one line. Explicit end reported exited; the disposable remote directory was removed.

The remote test validates the owner and sess transport, not the unreplaced SSH relay. No GUI interaction or packaged-app lifecycle test is claimed.

## Remaining integration

- Reconcile sess inventory through Orca's provider model, including attach-only recovery after the Orca daemon itself is lost.
- Route the standard SSH relay through the same owner.
- Wire host settings using existing Orca components and package the vendored sess resource.
- Carry over multi-repo workspaces, per-repo source control, gh cloning, and permanent Genral workspaces.

## sess provenance

resources/relay/sess is from DeepakSilaych/sess at 7b0e8437e6e7e93f1bba787d728f0f4a7d9c071e, with its MIT license beside it. The Relay status-bar option is retained. This fork adds SESS_ATTACH_ONLY=1, which refuses absent sessions rather than recreating them during attachment.
