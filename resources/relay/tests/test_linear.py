import json
import unittest
from unittest import mock
import test_backend

relay = test_backend.relay
ISSUE = {"id": "issue-uuid", "identifier": "ENG-123", "title": "Fix checkout", "url": "https://linear.app/acme/issue/ENG-123/fix-checkout", "state": {"name": "In Progress", "color": "#f2c94c"}, "description": "Not persisted"}

class LinearTests(unittest.TestCase):
    setUp = test_backend.WorkspaceTests.setUp
    git = test_backend.WorkspaceTests.git

    def test_cli_normalizes_and_limits_persisted_details(self):
        with mock.patch.object(relay.shutil, 'which', return_value='/bin/linear'), mock.patch.object(relay, 'run', return_value=json.dumps(ISSUE)) as run:
            result = self.backend.linear_issue(' eng-123 ')
        self.assertEqual(result['identifier'], 'ENG-123')
        self.assertNotIn('description', result)
        self.assertEqual(result['state']['color'], '#f2c94c')
        self.assertEqual(run.call_args.args[0], ['linear', 'issue', 'view', 'ENG-123', '--json', '--no-comments'])
        self.assertEqual(run.call_args.kwargs['cwd'], self.backend.root)
        self.assertEqual(run.call_args.kwargs['timeout'], 15)

    def test_create_validates_before_creating_workspace(self):
        before = list((self.backend.root / 'workspaces').iterdir())
        with mock.patch.object(self.backend, 'linear_issue', side_effect=ValueError('Not found')):
            with self.assertRaisesRegex(ValueError, 'Not found'):
                self.backend.workspace_create('Linked', ticket='ENG-404')
        self.assertEqual(list((self.backend.root / 'workspaces').iterdir()), before)
        with mock.patch.object(self.backend, 'linear_issue', return_value=ISSUE):
            ws = self.backend.workspace_create('Linked', ticket='ENG-123')['workspace']
        self.assertEqual(ws['ticket'], 'ENG-123')
        self.assertEqual(relay.Backend(self.backend.root).ws(ws['id'])['ticket'], 'ENG-123')

    def test_attach_failure_preserves_link_and_detach_needs_no_cli(self):
        with mock.patch.object(self.backend, 'linear_issue', return_value=ISSUE):
            self.backend.ticket_attach('genral', 'ENG-123')
        with mock.patch.object(self.backend, 'linear_issue', side_effect=ValueError('Unavailable')):
            with self.assertRaises(ValueError): self.backend.ticket_attach('genral', 'ENG-404')
            self.assertEqual(self.backend.ws('genral')['ticket'], 'ENG-123')
            self.assertIsNone(self.backend.ticket_attach('genral', '')['ticket'])

    def test_live_status_cache_force_and_failure(self):
        with mock.patch.object(self.backend, 'linear_issue', return_value=ISSUE) as lookup:
            self.backend.ticket_attach('genral', 'ENG-123')
            first = self.backend.integrations('genral')
            self.backend.integrations('genral')
            self.assertEqual(lookup.call_count, 2)
            self.assertEqual(first['ticket']['issue']['state']['name'], 'In Progress')
            lookup.side_effect = ValueError('CLI unavailable')
            failed = self.backend.integrations('genral', force=True)
        self.assertIsNone(failed['ticket']['issue'])
        self.assertIn('unavailable', failed['ticket']['error'])

    def test_invalid_missing_cli_and_untrusted_output(self):
        with self.assertRaises(ValueError): self.backend.linear_issue('--help')
        with mock.patch.object(relay.shutil, 'which', return_value=None):
            with self.assertRaisesRegex(ValueError, 'CLI missing'): self.backend.linear_issue('ENG-123')
        for data in [None, {}, {**ISSUE, 'identifier': 'ENG-999'}, {**ISSUE, 'url': 'file:///tmp/x'}, {**ISSUE, 'state': None}]:
            with mock.patch.object(relay.shutil, 'which', return_value='/bin/linear'), mock.patch.object(relay, 'run', return_value=json.dumps(data)):
                with self.assertRaises(ValueError): self.backend.linear_issue('ENG-123')

    def test_linear_urls_normalize_and_reject_other_links(self):
        with mock.patch.object(relay.shutil, 'which', return_value='/bin/linear'), mock.patch.object(relay, 'run', return_value=json.dumps(ISSUE)) as run:
            for value in ['https://linear.app/acme/issue/ENG-123/checkout?source=copy#details', 'https://linear.app/acme/issue/eng-123', ' https://linear.app/acme/issue/ENG-123/ ']:
                self.assertEqual(self.backend.linear_issue(value)['identifier'], 'ENG-123')
                self.assertEqual(run.call_args.args[0][3], 'ENG-123')
            for value in ['https://evil.test/acme/issue/ENG-123', 'https://linear.app.evil.test/acme/issue/ENG-123', 'https://linear.app/acme/project/ENG-123', 'http://linear.app/acme/issue/ENG-123', 'https://user@linear.app/acme/issue/ENG-123']:
                with self.assertRaises(ValueError): self.backend.linear_issue(value)
