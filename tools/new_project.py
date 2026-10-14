#!/usr/bin/env python3
"""Offline project manifest generator; does not invoke Chat, Work, GitHub or APIs."""
import argparse, json, pathlib
from validate import check_workflow,check_recipe
ROOT=pathlib.Path(__file__).resolve().parents[1]
def readwf(workflow_id):
 w=json.loads((ROOT/'workflows'/f'{workflow_id}.json').read_text(encoding='utf-8'))
 errs=check_workflow(w)
 if errs:raise ValueError(errs)
 return w
def save(project,mode,destination,wfids,recipe=None):
 jobs=[];last=None
 for wid in wfids:
  w=readwf(wid)
  if mode not in w['modes']:raise ValueError('mode not allowed')
  for t in w['tasks']:
   deps=[wid+'-'+d for d in t['depends_on']]
   if not deps and last: deps=[last]
   jobs.append({'id':wid+'-'+t['id'],'role':t['role'],'gate':t['gate'],'status':'QUEUED','depends_on':deps,'artifact':None,'approved_by':None})
  last=wid+'-'+w['tasks'][-1]['id']
 output={'schema_version':'0.2','project_name':project,'workflow_id':wfids[0] if len(wfids)==1 else None,
         'recipe_id':recipe,'workflows':wfids,'execution_mode':mode,'canonical_inputs':[],
         'jobs':jobs,'decisions':[],'blockers':[],'approval_log':[],'public_release_approved':False,
         'next_action':jobs[0]['id']}
 p=pathlib.Path(destination)
 if p.exists():raise FileExistsError(f'Will not overwrite: {p}')
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(output,ensure_ascii=False,indent=2)+chr(10),encoding='utf-8')
 return p
def create(project, workflow_id, mode, destination):
 return save(project,mode,destination,[workflow_id])
def create_recipe(project, recipe_id, mode, destination):
 r=json.loads((ROOT/'recipes'/f'{recipe_id}.json').read_text(encoding='utf-8'))
 errs=check_recipe(r)
 if errs:raise ValueError(errs)
 return save(project,mode,destination,r['workflows'],recipe_id)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--project',required=True)
 g=a.add_mutually_exclusive_group(required=True)
 g.add_argument('--workflow',choices=[f'W{i:02}' for i in range(1,13)])
 g.add_argument('--recipe',choices=['conceptual','systematic-review','quantitative-study','qualitative-study','computational-design'])
 a.add_argument('--mode',choices=['solo','supervised','agentic-conditional'],default='solo');a.add_argument('--output',required=True)
 x=a.parse_args();print(create_recipe(x.project,x.recipe,x.mode,x.output) if x.recipe else create(x.project,x.workflow,x.mode,x.output))
