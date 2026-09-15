import concurrent.futures
import json
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from test_backend import BACKEND, relay

class TerminalCliTests(unittest.TestCase):
    def test_five_headless_commands_read_send_and_ownership(self):
        with tempfile.TemporaryDirectory() as directory:
            backend = relay.Backend(directory)
            workspace = backend.workspace_create('CLI QA')['workspace']['id']
            def cli(*words):
                result = subprocess.run([sys.executable,str(BACKEND),'--root',directory,'--workspace',workspace,*words,'--json'],capture_output=True,text=True)
                self.assertEqual(result.returncode,0,result.stdout+result.stderr)
                return json.loads(result.stdout)['data']
            created=[]
            try:
                def launch(index):
                    return cli('terminal','run','--name',f'Worker {index}','--command',f'printf "WORKER_{index}_READY\\n"; read answer; printf "ACK_%s\\n" "$answer"')
                with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
                    created=list(pool.map(launch,range(5)))
                self.assertEqual(len({r['terminal']['id'] for r in created}),5)
                for index,result in enumerate(created):
                    terminal=result['terminal']['id']
                    deadline=time.monotonic()+10
                    while time.monotonic()<deadline:
                        output=cli('terminal','read','--terminal',terminal)['output']
                        if f'WORKER_{index}_READY' in output:break
                        time.sleep(.1)
                    self.assertIn(f'WORKER_{index}_READY',output)
                    cli('terminal','send','--terminal',terminal,'--input-text',f'reply-{index}','--enter')
                    deadline=time.monotonic()+5
                    while time.monotonic()<deadline:
                        output=cli('terminal','read','--terminal',terminal)['output']
                        if f'ACK_reply-{index}' in output:break
                        time.sleep(.1)
                    self.assertIn(f'ACK_reply-{index}',output)
                with self.assertRaisesRegex(ValueError,'does not belong'):
                    backend.terminal_read('genral',created[0]['terminal']['id'])
            finally:
                for terminal in backend.ws(workspace)['terminals']:
                    backend.terminal_remove(workspace,terminal['id'])
