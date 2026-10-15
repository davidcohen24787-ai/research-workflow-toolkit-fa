#!/usr/bin/env python3
"""Build a self-contained no-API chat-starter page from canonical files; supports --check."""
import argparse, json, pathlib, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
def make():
 read=lambda p:(ROOT/p).read_text(encoding='utf-8')
 data={'kit_version':'0.4.0-rc1',
       'platforms':{'chatgpt':read('chat-first/platforms/CHATGPT_PROJECT.txt'),'gemini':read('chat-first/platforms/GEMINI_CHAT.txt')},
       'reference':read('chat-first/WORKFLOW_REFERENCE.md'),'protocol':read('chat-first/COMMON_PROTOCOL.md'),
       'transfer':read('chat-first/TRANSFER_PACKET.md'),
       'recipes':[json.loads(p.read_text(encoding='utf-8')) for p in sorted((ROOT/'recipes').glob('*.json'))]}
 assert len(data['recipes'])==5
 js=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
 template=read('docs/chat-template.html')
 assert template.count('<!--INSERT_CHAT_KIT-->')==1
 return template.replace('<!--INSERT_CHAT_KIT-->',js)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--check',action='store_true');args=a.parse_args()
 p=ROOT/'docs/chat.html';expected=make()
 if args.check:
  if not p.exists() or p.read_text(encoding='utf-8')!=expected:print('FAIL: chat.html stale');sys.exit(1)
  print('PASS: no-API chat starter synchronized with canonical platform prompts and recipes')
 else:p.write_text(expected,encoding='utf-8');print('Generated docs/chat.html')
