import unittest
from pathlib import Path
import test_backend

class ViewerTests(unittest.TestCase):
    setUp = test_backend.WorkspaceTests.setUp
    git = test_backend.WorkspaceTests.git

    def test_working_and_staged_diff_contents_are_distinct(self):
        workspace = self.backend.workspace_create('Viewer', [{'repo': 'web'}, {'repo': 'api'}])['workspace']
        root = Path(workspace['repos'][0]['path'])
        (root / 'hello.txt').write_text('staged\n')
        self.backend.git_action(workspace['id'], 'web', 'stage', path='hello.txt')
        (root / 'hello.txt').write_text('working\n')
        staged = self.backend.diff_content(workspace['id'], 'web', 'hello.txt', 'staged')
        working = self.backend.diff_content(workspace['id'], 'web', 'hello.txt')
        self.assertEqual((staged['original'], staged['modified']), ('initial\n', 'staged\n'))
        self.assertEqual((working['original'], working['modified']), ('staged\n', 'working\n'))
        self.assertEqual(self.backend.status_one(workspace['repos'][1])['files'], [])

    def test_rename_and_untracked_preview(self):
        workspace = self.backend.workspace_create('Rename', [{'repo': 'web'}])['workspace']
        root = Path(workspace['repos'][0]['path'])
        self.git(root, 'mv', 'hello.txt', 'renamed.txt')
        (root / 'renamed.txt').write_text('modified after rename\n')
        staged = self.backend.diff_content(workspace['id'], 'web', 'renamed.txt', 'staged')
        working = self.backend.diff_content(workspace['id'], 'web', 'renamed.txt')
        self.assertEqual(staged['original'], 'initial\n')
        self.assertEqual(working['original'], 'initial\n')
        (root / 'new.txt').write_text('new file\n')
        untracked = self.backend.diff_content(workspace['id'], 'web', 'new.txt')
        self.assertEqual((untracked['original'], untracked['modified']), ('', 'new file\n'))

    def test_preview_limits_binary_and_path_boundary(self):
        workspace = self.backend.workspace_create('Limits', [{'repo': 'web'}])['workspace']
        root = Path(workspace['repos'][0]['path'])
        (root / 'big.txt').write_bytes(b'x' * (test_backend.relay.MAX_TEXT + 1))
        self.assertTrue(self.backend.diff_content(workspace['id'], 'web', 'big.txt')['truncated'])
        (root / 'binary').write_bytes(b'\0foo')
        self.assertTrue(self.backend.diff_content(workspace['id'], 'web', 'binary')['binary'])
        with self.assertRaises(ValueError):
            self.backend.diff_content(workspace['id'], 'web', '../workspace.json')
