#!/usr/bin/env python3
"""Offline structural validator. Never claims to validate scientific truth."""
import json, pathlib, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
ALLOWED={'specialist','reviewer','tool','human'}

def check_workflow(w):
 errors=[]
 must={'schema_version','workflow_id','title','tasks','human_gate','modes','acceptance','on_failure'}
 errors.extend(f'missing {k}' for k in must-set(w))
 if errors:return errors
 if w['schema_version']!='0.2': errors.append('wrong schema_version')
 tasks=w['tasks']
 if not isinstance(tasks,list) or not tasks:return errors+['empty tasks']
 ids=[t.get('id') for t in tasks]
 if len(set(ids))!=len(ids):errors.append('duplicate IDs')
 if any(not isinstance(i,str) or not i for i in ids): errors.append('blank task IDs')
 allids=set(ids)
 for t in tasks:
  if t.get('role') not in ALLOWED:errors.append('unknown role '+str(t.get('role')))
  if not {'id','title','role','depends_on','output','gate'}<=set(t):errors.append('task keys missing')
  if not isinstance(t.get('depends_on'),list): errors.append('depends_on not list');continue
  if any(dep not in allids for dep in t['depends_on']):errors.append('missing dependency')
  if t.get('id') in t['depends_on']:errors.append('self-dependency')
  if t.get('role')=='human' and t.get('gate')!='HUMAN_APPROVAL':errors.append('human step without gate')
  if t.get('gate')=='HUMAN_APPROVAL' and t.get('role')!='human':errors.append('human approval assigned to nonhuman role')
 graph={t['id']:t.get('depends_on',[]) for t in tasks}; seen=set(); pending=set()
 def visit(x):
  if x in pending:errors.append('cycle');return
  if x in seen:return
  pending.add(x)
  for y in graph.get(x,[]):
   if y in graph: visit(y)
  pending.remove(x);seen.add(x)
 for k in graph:visit(k)
 if not any(t.get('gate')=='HUMAN_APPROVAL' for t in tasks):errors.append('missing human gate')
 if set(w.get('modes',[]))!={'solo','supervised','agentic-conditional'}:errors.append('invalid modes')
 return sorted(set(errors))

def check_recipe(r):
 errors=[]
 if r.get('schema_version')!='0.2':errors.append('invalid schema')
 selected=r.get('workflows',[])
 if not selected:errors.append('no selected workflows')
 if len(selected)!=len(set(selected)):errors.append('duplicate workflow in recipe')
 for wid in selected+r.get('optional_workflows',[]):
  if wid not in {f'W{i:02}' for i in range(1,13)}:errors.append('invalid workflow ref '+str(wid))
 if not r.get('human_approvals_required'):errors.append('missing human approvals policy')
 return errors

def gate_next(task,statuses,approvals):
 """Fail closed; tasks with human approval require explicit exact-step approval."""
 if any(statuses.get(d)!='ACCEPTED' for d in task['depends_on']):return 'BLOCKED_DEPENDENCY'
 if task['gate']=='HUMAN_APPROVAL' and task['id'] not in approvals:return 'AWAITING_HUMAN_APPROVAL'
 return 'READY'

def main():
 err=[];paths=sorted((ROOT/'workflows').glob('W*.json'))
 if len(paths)!=12:err.append('expected 12 machine-readable workflows')
 for p in paths:
  w=json.loads(p.read_text(encoding='utf-8'))
  for e in check_workflow(w):err.append(p.name+': '+e)
  if not (p.with_suffix('.md')).exists():err.append('missing companion '+p.name)
 recipes=sorted((ROOT/'recipes').glob('*.json'))
 if len(recipes)!=5:err.append('expected 5 research recipes')
 for p in recipes:
  r=json.loads(p.read_text(encoding='utf-8'))
  for e in check_recipe(r):err.append(p.name+': '+e)
  if not p.with_suffix('.md').exists():err.append('missing companion '+p.name)
 if err:
  print('FAILED: '+str(len(err))+' issue(s)');print(*err,sep=chr(10));return 1
 print(f'PASS: {len(paths)} workflow specifications, {len(recipes)} recipes, dependencies, approval gates and companion Markdown files')
 return 0
if __name__=='__main__':sys.exit(main())
