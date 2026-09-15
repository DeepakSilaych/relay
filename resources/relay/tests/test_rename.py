import unittest
from unittest import mock
import test_backend


class RenameTests(unittest.TestCase):
    setUp = test_backend.WorkspaceTests.setUp
    git = test_backend.WorkspaceTests.git

    def test_rename_preserves_paths_and_session_identity(self):
        ws = self.backend.workspace_create('Before')['workspace']
        self.backend.repo_attach(ws['id'], 'web', new_branch='rename-test')
        before = self.backend.ws(ws['id'])
        terminal = before['terminals'][0]
        with mock.patch.object(test_backend.relay, 'run', side_effect=AssertionError('Must not restart sessions')):
            changed = self.backend.terminal_rename(ws['id'], terminal['id'], ' Agent one ')
            renamed = self.backend.workspace_rename(ws['id'], ' After ')
        self.assertEqual(changed['name'], 'Agent one')
        self.assertEqual(renamed['name'], 'After')
        self.assertEqual(renamed['path'], before['path'])
        self.assertEqual(renamed['repos'], before['repos'])
        self.assertEqual(renamed['terminals'][0]['id'], terminal['id'])
        self.assertEqual(renamed['terminals'][0]['cwd'], terminal['cwd'])
        self.assertIn('Relay workspace: After', (self.backend.ws_path(ws['id']) / 'AGENTS.md').read_text())
        self.assertEqual(test_backend.relay.Backend(self.backend.root).ws(ws['id'])['name'], 'After')

    def test_rejects_invalid_names_and_protects_general(self):
        ws = self.backend.workspace_create('Before')['workspace']
        for name in ['', '   ', 'x' * 121, 'line\nbreak']:
            with self.assertRaises(ValueError): self.backend.workspace_rename(ws['id'], name)
            with self.assertRaises(ValueError): self.backend.terminal_rename(ws['id'], ws['terminals'][0]['id'], name)
        with self.assertRaises(ValueError): self.backend.workspace_rename('genral', 'Changed')
        with self.assertRaises(ValueError): self.backend.terminal_rename(ws['id'], 'missing', 'Changed')
        self.assertEqual(self.backend.ws(ws['id'])['name'], 'Before')

    def test_relay_cli_keeps_magi_alias(self):
        import os
        result = self.backend.install_cli()
        relay = self.backend.root / 'utils' / 'bin' / 'relay'
        legacy = relay.with_name('magi')
        self.assertEqual(result['path'], str(relay))
        self.assertEqual(relay.read_bytes(), legacy.read_bytes())
        self.assertTrue(os.access(relay, os.X_OK))
        self.assertTrue(os.access(legacy, os.X_OK))
