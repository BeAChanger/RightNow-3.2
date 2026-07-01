import os, subprocess, time, urllib.request, urllib.error

os.chdir('/root/rightnow')

compose_base = ['docker', 'compose', '--env-file', '/root/rightnow/.env', '-f', '/root/rightnow/docker-compose.prod.yml']

def run(cmd, label):
    print('[{}] '.format(label), end='', flush=True)
    try:
        r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=600)
        out = (r.stdout + r.stderr).decode('utf-8', errors='replace')
        if r.returncode == 0:
            print('OK')
        else:
            print('FAIL ({})'.format(r.returncode))
            lines = [l for l in out.split('\n') if l.strip() and 'warning' not in l.lower()]
            for l in lines[-8:]:
                print('  ' + l[:200])
        return r.returncode
    except Exception as e:
        print('ERROR: {}'.format(e))
        return 1

# 1. DB
print('--- DB Push ---')
run(compose_base + ['run', '--rm', 'backend', 'npx', 'prisma', 'db', 'push', '--skip-generate'], 'DB')

# 2. Backend
print('--- Build Backend ---')
run(compose_base + ['build', 'backend'], 'BuildBE')
print('--- Up Backend ---')
run(compose_base + ['up', '-d', 'backend'], 'UpBE')
time.sleep(6)

# 3. Frontend
print('--- Build Frontend ---')
run(compose_base + ['build', 'frontend'], 'BuildFE')
print('--- Up Frontend ---')
run(compose_base + ['up', '-d', 'frontend'], 'UpFE')
time.sleep(4)

# 4. Verify
print('--- Smoke ---')
for url, label in [('http://127.0.0.1:5000/api/agent/rpc','RPC'),('http://127.0.0.1/','Web')]:
    try:
        r = urllib.request.urlopen(urllib.request.Request(url), timeout=10)
        print('{}: HTTP {}'.format(label, r.status))
    except urllib.error.HTTPError as e:
        print('{}: HTTP {}'.format(label, e.code))
    except Exception as e:
        print('{}: {}'.format(label, e))

run(compose_base + ['ps'], 'PS')
print('DONE')
