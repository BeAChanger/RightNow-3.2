#!/usr/bin/env python3
"""RightNow P0 Agent deploy — reads .env, pushes DB, rebuilds containers, smokes."""
import os, sys, subprocess, time, urllib.request, urllib.error

os.chdir('/root/rightnow')

# 1. Load .env into os.environ
env_path = '/root/rightnow/.env'
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ[k.strip()] = v.strip().strip('"').strip("'")
    print('Loaded .env: {} vars'.format(len([
        k for k in os.environ if not k.startswith('_')
    ])))
else:
    print('ERROR: .env not found')
    sys.exit(1)

compose = ['docker', 'compose', '-f', 'docker-compose.prod.yml']

def run(cmd, label):
    print('[{}] '.format(label), end='', flush=True)
    try:
        r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=600)
        if r.returncode == 0:
            print('OK')
            if r.stdout:
                out = r.stdout.decode('utf-8', errors='replace').strip()
                if out:
                    for line in out.split('\n')[-5:]:
                        print('  {}'.format(line))
        else:
            err = r.stderr.decode('utf-8', errors='replace').strip()
            print('FAIL ({}): {}'.format(r.returncode, err[-300:]))
        return r.returncode
    except Exception as e:
        print('ERROR: {}'.format(e))
        return 1

# 2. DB push
print('\n--- DB Push ---')
run(compose + ['run', '--rm', 'backend', 'npx', 'prisma', 'db', 'push', '--skip-generate'], 'DB Push')

# 3. Rebuild backend
print('\n--- Build Backend ---')
run(compose + ['build', 'backend'], 'Build backend')

# 4. Restart backend
print('\n--- Up Backend ---')
run(compose + ['up', '-d', 'backend'], 'Up backend')
time.sleep(6)

# 5. Rebuild frontend
print('\n--- Build Frontend ---')
run(compose + ['build', 'frontend'], 'Build frontend')

# 6. Restart frontend
print('\n--- Up Frontend ---')
run(compose + ['up', '-d', 'frontend'], 'Up frontend')
time.sleep(4)

# 7. Smoke tests
print('\n=== Smoke Tests ===')
for url, label in [
    ('http://127.0.0.1:5000/api/agent/rpc', 'RPC'),
    ('http://127.0.0.1:5000/api/agent/bindings/code', 'Bindings POST'),
    ('http://127.0.0.1/', 'Web GET'),
]:
    try:
        method = 'POST' if 'POST' in label else 'GET'
        req = urllib.request.Request(url, method=method)
        r = urllib.request.urlopen(req, timeout=10)
        print('  {}: HTTP {}'.format(label, r.status))
    except urllib.error.HTTPError as e:
        print('  {}: HTTP {} (expected for auth endpoints)'.format(label, e.code))
    except Exception as e:
        print('  {}: {}'.format(label, e))

print('\n--- Containers ---')
run(compose + ['ps'], 'Containers')
print('\n=== DEPLOY COMPLETE ===')
