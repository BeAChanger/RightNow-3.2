import shutil
shutil.copy('/root/rightnow/docker-compose.prod.yml', '/root/rightnow/docker-compose.prod.yml.bak2')
t = open('/root/rightnow/docker-compose.prod.yml').read()
t = t.replace(
    '      RAG_PDF_BASE_PATH: /app/knowledge_base',
    '      RAG_CLEANED_DATA_PATH: /data/cleaned-data\n      RAG_EMBEDDING_MODEL: BAAI/bge-small-zh-v1.5'
)
t = t.replace(
    '      - ./rag-service/knowledge_base:/app/knowledge_base',
    '      - ./cleaned-data:/data/cleaned-data:ro'
)
open('/root/rightnow/docker-compose.prod.yml', 'w').write(t)
print('docker-compose.prod.yml updated')
