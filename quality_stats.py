# -*- coding: utf-8 -*-
"""统计向量库里的数据质量问题占比（不加载 embedding 模型，纯 get 统计，快）。"""
import chromadb
import re
from collections import Counter, defaultdict

client = chromadb.PersistentClient(path='/app/chroma_db')
col = client.get_or_create_collection('fitness_knowledge')
data = col.get(include=['documents', 'metadatas'])
docs = data['documents']
metas = data['metadatas']
n = len(docs)

img = sum('![](' in d for d in docs)
latex = sum(('\\mathrm' in d or '\\approx' in d or '\\frac' in d or '\\le' in d or d.count('$') >= 2) for d in docs)
spaced = sum(bool(re.search(r'(?:[A-Za-z0-9]\s){5,}', d)) for d in docs)
veryshort = sum(len(d.strip()) < 50 for d in docs)

print('total_chunks', n)
print('image_placeholder %d (%.1f%%)' % (img, img / n * 100))
print('latex_formula   %d (%.1f%%)' % (latex, latex / n * 100))
print('char_spaced     %d (%.1f%%)' % (spaced, spaced / n * 100))
print('very_short(<50) %d (%.1f%%)' % (veryshort, veryshort / n * 100))

# 按 domain 看脏数据分布
bad_by_dom = defaultdict(int)
tot_by_dom = Counter()
for d, m in zip(docs, metas):
    dom = m.get('domain', 'unknown')
    tot_by_dom[dom] += 1
    if '![](' in d or '\\mathrm' in d or '\\approx' in d or re.search(r'(?:[A-Za-z0-9]\s){5,}', d):
        bad_by_dom[dom] += 1
print('\n--- bad ratio by domain ---')
for dom in tot_by_dom:
    print('%-16s %d/%d (%.1f%%)' % (dom, bad_by_dom[dom], tot_by_dom[dom], bad_by_dom[dom] / tot_by_dom[dom] * 100))

# 按 source 看最脏的前 10 个文件
bad_by_src = defaultdict(int)
tot_by_src = Counter()
for d, m in zip(docs, metas):
    src = m.get('source', 'unknown')
    tot_by_src[src] += 1
    if '![](' in d or '\\mathrm' in d or '\\approx' in d or re.search(r'(?:[A-Za-z0-9]\s){5,}', d):
        bad_by_src[src] += 1
print('\n--- top 10 dirtiest sources ---')
ranked = sorted(bad_by_src.items(), key=lambda x: x[1], reverse=True)[:10]
for src, bad in ranked:
    print('%-50s %d/%d bad' % (src[:48], bad, tot_by_src[src]))
