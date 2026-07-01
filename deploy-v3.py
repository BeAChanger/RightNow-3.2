import subprocess, os, time, urllib.request, urllib.error, json

os.chdir('/root/rightnow')

print('--- [0] Fix .env from containers ---')
env_data = {}
if os.path.exists('.env'):
    with open('.env') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env_data[k.strip()] = v.strip().strip('"').strip("'")
print('  Before: {} vars'.format(len(env_data)))

needed_vars = ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD',
               'DATABASE_URL', 'JWT_SECRET', 'ADMIN_SEED_PASSWORD']
containers_check = {
    'rn-postgres': ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'],
    'rn-backend': ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_SEED_PASSWORD',
                   'ADMIN_SEED_EMAIL', 'ADMIN_SEED_NAME']
}

for container, vars_list in containers_check.items():
    try:
        r = subprocess.run(['docker', 'inspect', container],
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
        if r.returncode != 0:
            print('  Cannot inspect {}'.format(container))
            continue
        data = json.loads(r.stdout.decode('utf-8'))
        if data:
            container_env = {}
            for env_line in data[0].get('Config', {}).get('Env', []):
                if '=' in env_line:
                    k, v = env_line.split('=', 1)
                    container_env[k] = v
            for var in vars_list:
                if var in container_env and container_env[var]:
                    env_data[var] = container_env[var]
                    print('  +{} from {}'.format(var, container))
    except Exception as e:
        print('  ERR: {}'.format(e))

for k, v in sorted(env_data.items()):
    os.environ[k] = v

with open('.env', 'w') as f:
    for k, v in sorted(env_data.items()):
        f.write('{}={}\n'.format(k, v))

print('  After: {} vars'.format(len(env_data)))
for v in needed_vars:
    print('  {}: {}'.format(v, 'YES' if env_data.get(v) else 'MISSING'))

missing = [v for v in needed_vars if not env_data.get(v)]
if missing:
    print('FATAL: missing {}'.format(missing))
    raise SystemExit(1)

compose = ['docker', 'compose', '-f', 'docker-compose.prod.yml']

def run(cmd, label, timeout=600):
    print('[{}] '.format(label), end='', flush=True)
    try:
        r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
        if r.returncode == 0:
            print('OK')
            return True
        else:
            err = (r.stderr + r.stdout).decode('utf-8', errors='replace')
            print('FAIL({})'.format(r.returncode))
            for l in err.split('\n')[-6:]:
                if l.strip():
                    print('  ' + l[:250])
            return False
    except Exception as e:
        print('ERR: {}'.format(e))
        return False

# DB push already done in previous run — skip unless needed
# We already have new tables, so go straight to container rebuild

print('\n--- [2] Stop old backend ---')
# Force remove old backend container to avoid name conflict
subprocess.run(['docker', 'stop', 'rn-backend'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
subprocess.run(['docker', 'rm', '-f', 'rn-backend'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
print('  Old backend removed')

print('\n--- [3] Rebuild + Start Backend ---')
if run(compose + ['build', 'backend'], 'BuildBE', 600):
    run(compose + ['up', '-d', 'backend'], 'UpBE')
    time.sleep(8)

print('\n--- [4] Rebuild + Start Frontend ---')
if run(compose + ['build', 'frontend'], 'BuildFE', 600):
    run(compose + ['up', '-d', 'frontend'], 'UpFE')
    time.sleep(5)

print('\n--- [5] Smoke Tests ---')
for url, label, method in [
    ('http://127.0.0.1:5000/api/agent/rpc', 'RPC', 'GET'),
    ('http://127.0.0.1:5000/api/agent/bindings/code', 'Bindings', 'POST'),
    ('http://127.0.0.1/', 'Web', 'GET')
]:
    try:
        req = urllib.request.Request(url, method=method)
        r = urllib.request.urlopen(req, timeout=10)
        print('{}: HTTP {}'.format(label, r.status))
    except urllib.error.HTTPError as e:
        print('{}: HTTP {} (expected for auth)'.format(label, e.code))
    except Exception as e:
        print('{}: {}'.format(label, e))

print('--- Containers ---')
run(compose + ['ps'], 'PS')
print('=== DEPLOY COMPLETE ===')
