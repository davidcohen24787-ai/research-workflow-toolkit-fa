#!/usr/bin/env python3
"""Toy descriptive computation on synthetic rows. Not an empirical study."""
import csv, json, pathlib, statistics
ROOT=pathlib.Path(__file__).resolve().parents[1]
PATH=ROOT/'examples/03-data-analysis/synthetic-data.csv'
def evaluate():
 with PATH.open(encoding='utf-8',newline='') as f:rows=list(csv.DictReader(f))
 diff=[int(r['followup'])-int(r['baseline']) for r in rows]
 return {'data_kind':'SYNTHETIC_NOT_RESEARCH','n':len(rows),'mean_change':statistics.mean(diff),'median_change':statistics.median(diff),'differences':diff}
if __name__=='__main__': print(json.dumps(evaluate(),ensure_ascii=False,indent=2))
