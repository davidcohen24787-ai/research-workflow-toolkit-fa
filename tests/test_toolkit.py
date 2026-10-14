import pathlib, json, sys, tempfile, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from validate import check_workflow,gate_next
from new_project import create
from demo_analysis import evaluate
class ToolkitTests(unittest.TestCase):
 def test_all_twelve(self):
  paths=list((ROOT/'workflows').glob('W*.json'));self.assertEqual(len(paths),12)
  for p in paths:
   with self.subTest(p=p):self.assertEqual(check_workflow(json.loads(p.read_text(encoding='utf-8'))),[])
 def test_gate_requires_approval(self):
  t={'id':'approve','depends_on':['prepare'],'gate':'HUMAN_APPROVAL'}
  self.assertEqual(gate_next(t,{'prepare':'ACCEPTED'},set()),'AWAITING_HUMAN_APPROVAL')
  self.assertEqual(gate_next(t,{'prepare':'QUEUED'},{'approve'}),'BLOCKED_DEPENDENCY')
  self.assertEqual(gate_next(t,{'prepare':'ACCEPTED'},{'approve'}),'READY')
 def test_fail_closed_on_cycle(self):
  p=ROOT/'workflows/W01.json';w=json.loads(p.read_text(encoding='utf-8'))
  w['tasks'][0]['depends_on']=[w['tasks'][-1]['id']]
  self.assertIn('cycle',check_workflow(w))
 def test_human_gate_not_silently_disabled(self):
  w=json.loads((ROOT/'workflows/W12.json').read_text(encoding='utf-8'))
  w['tasks'][-1]['gate']='DELIVERY_CHECK'
  self.assertIn('human step without gate',check_workflow(w))
 def test_manifest_generator_doesnt_overwrite(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'project.json';create('نمونه','W05','solo',p)
   x=json.loads(p.read_text(encoding='utf-8'))
   self.assertTrue(all(job['status']=='QUEUED' for job in x['jobs']))
   self.assertFalse(x['public_release_approved'])
   with self.assertRaises(FileExistsError):create('نمونه','W05','solo',p)
 def test_five_recipes(self):
  from validate import check_recipe
  paths=list((ROOT/'recipes').glob('*.json'))
  self.assertEqual(len(paths),5)
  for p in paths:self.assertEqual(check_recipe(json.loads(p.read_text(encoding='utf-8'))),[])
 def test_recipe_manifest_namespaces(self):
  from new_project import create_recipe
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'recipe.json';create_recipe('نمونه','systematic-review','supervised',p)
   x=json.loads(p.read_text(encoding='utf-8'))
   ids={j['id'] for j in x['jobs']}
   self.assertTrue(all(dep in ids for job in x['jobs'] for dep in job['depends_on']))
   self.assertTrue(any(j['gate']=='HUMAN_APPROVAL' for j in x['jobs']))
   self.assertFalse(x['public_release_approved'])
 def test_synthetic_demo(self):
  got=evaluate();self.assertEqual(got['n'],5);self.assertEqual(got['mean_change'],0.6)
  self.assertEqual(got['differences'],[1,0,1,1,0]);self.assertEqual(got['data_kind'],'SYNTHETIC_NOT_RESEARCH')
if __name__=='__main__':unittest.main()
