import chromadb
import sys

client = chromadb.PersistentClient(path='/app/chroma_db')
col = client.get_or_create_collection('fitness_knowledge')
print('count', col.count())

queries = {
    'no_where': {'q': '减脂期蛋白质摄入', 'where': None},
    'nutrition': {'q': '减脂期蛋白质摄入', 'where': {'domain': 'nutrition'}},
    'kinesiology': {'q': '深蹲发力', 'where': {'domain': 'kinesiology'}},
    'comprehensive': {'q': '训练计划', 'where': {'domain': 'comprehensive'}},
}

for name, cfg in queries.items():
    kwargs = {'query_texts': [cfg['q']], 'n_results': 3}
    if cfg['where']:
        kwargs['where'] = cfg['where']
    try:
        res = col.query(**kwargs)
        ids = res['ids'][0]
        metas = res['metadatas'][0]
        print(f"OK {name}: {len(ids)} hits")
        for i in range(len(ids)):
            print(f"  {ids[i][:50]} {metas[i].get('source')} {metas[i].get('domain')}")
    except Exception as e:
        print(f"ERR {name}: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc(file=sys.stdout)
