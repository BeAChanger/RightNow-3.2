import React, { useEffect, useMemo, useState } from 'react';
import { auditApi, authApi, getApiErrorMessage, knowledgeApi, promptsApi, usersApi } from './api';
import type {
  AdminUser,
  AuditLog,
  KnowledgeSource,
  ManagedUser,
  PromptBinding,
  PromptTemplate,
  UserStatus,
} from './types';

type TabKey = 'users' | 'knowledge' | 'prompts' | 'audit';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'users', label: 'Users' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'prompts', label: 'Prompts' },
  { key: 'audit', label: 'Audit Logs' },
];

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleString();
}

function toVariableCsv(value: unknown, fallback: string[] = []): string {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').join(',');
  }
  return fallback.join(',');
}

function LoginView(props: { onLogin: (user: AdminUser) => void }) {
  const { onLogin } = props;
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login(email, password);
      onLogin(response.user);
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Login failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page center">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>RightNow Admin</h1>
        <p className="muted">Sign in with an admin account.</p>

        {error && <div className="error-box">{error}</div>}

        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <button disabled={loading} type="submit">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

function UsersPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await usersApi.list({
        keyword: keyword || undefined,
        status: status || undefined,
        page: 1,
        pageSize: 50,
      });
      setItems(response.items);
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Failed to load users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const updateStatus = async (id: string, nextStatus: UserStatus) => {
    try {
      await usersApi.updateStatus(id, nextStatus);
      await loadUsers();
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Failed to update user status.'));
    }
  };

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <input
          placeholder="Search by email or name"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="FROZEN">FROZEN</option>
        </select>
        <button onClick={() => void loadUsers()} disabled={loading}>
          Search
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.email}</td>
              <td>{item.name}</td>
              <td>{item.role}</td>
              <td>
                <span className={item.status === 'ACTIVE' ? 'badge ok' : 'badge danger'}>
                  {item.status}
                </span>
              </td>
              <td>{formatDateTime(item.createdAt)}</td>
              <td>
                {item.status === 'ACTIVE' ? (
                  <button className="danger" onClick={() => void updateStatus(item.id, 'FROZEN')}>
                    Freeze
                  </button>
                ) : (
                  <button onClick={() => void updateStatus(item.id, 'ACTIVE')}>Unfreeze</button>
                )}
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={6} className="muted center-text">
                {loading ? 'Loading users...' : 'No users found'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function KnowledgePanel() {
  const [items, setItems] = useState<KnowledgeSource[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState('general');
  const [file, setFile] = useState<File | null>(null);
  const [forceRescan, setForceRescan] = useState(false);

  const loadSources = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await knowledgeApi.listSources();
      setItems(response.items);
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Failed to load knowledge sources.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSources();
  }, []);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Please choose a file before uploading.');
      return;
    }

    try {
      setError('');
      await knowledgeApi.upload(file, domain);
      setFile(null);
      await loadSources();
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Upload failed.'));
    }
  };

  const handleDelete = async (sourceName: string) => {
    try {
      await knowledgeApi.deleteSource(sourceName);
      await loadSources();
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Delete failed.'));
    }
  };

  const handleRescan = async () => {
    try {
      await knowledgeApi.rescan(forceRescan);
      await loadSources();
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Rescan failed.'));
    }
  };

  return (
    <div className="panel">
      <form className="panel-toolbar" onSubmit={handleUpload}>
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          accept=".pdf,.md"
        />
        <input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="domain"
        />
        <button type="submit">Upload</button>
      </form>

      <div className="panel-toolbar">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={forceRescan}
            onChange={(event) => setForceRescan(event.target.checked)}
          />
          force rescan
        </label>
        <button onClick={() => void handleRescan()}>Rescan sources</button>
        <button onClick={() => void loadSources()} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Source Name</th>
            <th>Domain</th>
            <th>File Type</th>
            <th>Chunks</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.sourceName}</td>
              <td>{item.domain}</td>
              <td>{item.fileType || '-'}</td>
              <td>{item.chunksCount}</td>
              <td>{item.status}</td>
              <td>
                <button className="danger" onClick={() => void handleDelete(item.sourceName)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={6} className="muted center-text">
                {loading ? 'Loading sources...' : 'No sources found'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function parseVariables(value: string): string[] {
  if (!value.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function bindingStatusText(binding: PromptBinding): string {
  if (!binding.current) {
    return 'Fallback only';
  }
  if (binding.current.enabled) {
    return 'DB template enabled';
  }
  return 'DB template disabled (fallback active)';
}

function PromptPanel() {
  const [items, setItems] = useState<PromptTemplate[]>([]);
  const [bindings, setBindings] = useState<PromptBinding[]>([]);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [scene, setScene] = useState('');
  const [filterScene, setFilterScene] = useState('');
  const [formId, setFormId] = useState<string | null>(null);
  const [templateKey, setTemplateKey] = useState('');
  const [content, setContent] = useState('');
  const [variables, setVariables] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [testPrompt, setTestPrompt] = useState('');
  const [testVarsRaw, setTestVarsRaw] = useState('{}');

  const loadPrompts = async () => {
    try {
      setError('');
      const response = await promptsApi.list({
        keyword: keyword || undefined,
        scene: filterScene || undefined,
      });
      setItems(response.items);
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Failed to load prompts.'));
    }
  };

  const loadBindings = async () => {
    try {
      const rows = await promptsApi.listBindings();
      setBindings(rows);
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Failed to load model prompt bindings.'));
    }
  };

  useEffect(() => {
    void loadPrompts();
    void loadBindings();
  }, []);

  const resetForm = () => {
    setFormId(null);
    setTemplateKey('');
    setScene('');
    setContent('');
    setVariables('');
    setEnabled(true);
    setTestPrompt('');
    setTestVarsRaw('{}');
  };

  const applyBinding = (binding: PromptBinding, useFallback = false) => {
    if (binding.current && !useFallback) {
      setFormId(binding.current.id);
      setTemplateKey(binding.key);
      setScene(binding.scene);
      setContent(binding.current.content);
      setVariables(toVariableCsv(binding.current.variables, binding.variables));
      setEnabled(binding.current.enabled);
      setTestPrompt('');
      setError('');
      return;
    }

    setFormId(null);
    setTemplateKey(binding.key);
    setScene(binding.scene);
    setContent(binding.fallbackContent);
    setVariables(binding.variables.join(','));
    setEnabled(true);
    setTestPrompt('');
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      if (!templateKey.trim() || !scene.trim() || !content.trim()) {
        setError('key, scene and content are required.');
        return;
      }

      if (!formId) {
        await promptsApi.create({
          key: templateKey.trim(),
          scene: scene.trim(),
          content: content.trim(),
          variables: parseVariables(variables),
          enabled,
        });
      } else {
        await promptsApi.update(formId, {
          key: templateKey.trim(),
          scene: scene.trim(),
          content: content.trim(),
          variables: parseVariables(variables),
          enabled,
        });
      }

      resetForm();
      await loadPrompts();
      await loadBindings();
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Failed to save prompt.'));
    }
  };

  const onEdit = (item: PromptTemplate) => {
    setFormId(item.id);
    setTemplateKey(item.key);
    setScene(item.scene);
    setContent(item.content);
    setVariables(toVariableCsv(item.variables));
    setEnabled(item.enabled);
    setTestPrompt('');
  };

  const onDelete = async (id: string) => {
    try {
      await promptsApi.remove(id);
      if (formId === id) {
        resetForm();
      }
      await loadPrompts();
      await loadBindings();
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Delete failed.'));
    }
  };

  const onTest = async () => {
    if (!formId) {
      setError('Please select or save a prompt template first.');
      return;
    }

    try {
      const parsed = JSON.parse(testVarsRaw) as Record<string, unknown>;
      const response = await promptsApi.test(formId, parsed);
      const missing = response.missingVariables.length
        ? `\n\nMissing variables: ${response.missingVariables.join(', ')}`
        : '';
      setTestPrompt(`${response.prompt}${missing}`);
    } catch (errorValue: unknown) {
      setError(
        getApiErrorMessage(
          errorValue,
          'Prompt test failed. Please make sure the variables are valid JSON.',
        ),
      );
    }
  };

  return (
    <div className="panel split-grid">
      <div className="card form-card">
        <h3>{formId ? 'Edit Template' : 'New Template'}</h3>
        <form onSubmit={submit} className="form-col">
          <label>
            key
            <input value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} />
          </label>
          <label>
            scene
            <input value={scene} onChange={(event) => setScene(event.target.value)} />
          </label>
          <label>
            content
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} />
          </label>
          <label>
            variables (comma separated)
            <input
              value={variables}
              onChange={(event) => setVariables(event.target.value)}
              placeholder="name,goal,time"
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            enabled
          </label>

          <div className="row-actions">
            <button type="submit">{formId ? 'Update' : 'Create'}</button>
            <button type="button" className="ghost" onClick={resetForm}>
              Reset
            </button>
          </div>
        </form>

        <div className="test-box">
          <h4>Prompt Test</h4>
          <textarea
            value={testVarsRaw}
            onChange={(event) => setTestVarsRaw(event.target.value)}
            rows={4}
          />
          <button type="button" onClick={() => void onTest()}>
            Run Test
          </button>
          {testPrompt && <pre className="result-pre">{testPrompt}</pre>}
        </div>
      </div>

      <div className="card">
        <h4>Model Prompt Bindings</h4>
        <table>
          <thead>
            <tr>
              <th>Binding</th>
              <th>Scene / Key</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bindings.map((binding) => (
              <tr key={binding.code}>
                <td>
                  <strong>{binding.title}</strong>
                  <div className="muted">{binding.description}</div>
                </td>
                <td>
                  <code>{binding.scene}</code>
                  <br />
                  <code>{binding.key}</code>
                </td>
                <td>{bindingStatusText(binding)}</td>
                <td>
                  <button onClick={() => applyBinding(binding)}>
                    {binding.current ? 'Edit current' : 'Create from default'}
                  </button>
                  <button className="ghost" onClick={() => applyBinding(binding, true)}>
                    Load fallback
                  </button>
                </td>
              </tr>
            ))}
            {!bindings.length && (
              <tr>
                <td colSpan={4} className="muted center-text">
                  No bindings found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="panel-toolbar" style={{ marginTop: 12 }}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search by key"
          />
          <input
            value={filterScene}
            onChange={(event) => setFilterScene(event.target.value)}
            placeholder="scene"
          />
          <button onClick={() => void loadPrompts()}>Search</button>
          <button className="ghost" onClick={() => void loadBindings()}>
            Refresh bindings
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <table>
          <thead>
            <tr>
              <th>key</th>
              <th>scene</th>
              <th>enabled</th>
              <th>Updated At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.key}</td>
                <td>{item.scene}</td>
                <td>{item.enabled ? 'Yes' : 'No'}</td>
                <td>{formatDateTime(item.updatedAt)}</td>
                <td>
                  <button onClick={() => onEdit(item)}>Edit</button>
                  <button className="danger" onClick={() => void onDelete(item.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} className="muted center-text">
                  No prompts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditPanel() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  const loadAudit = async () => {
    try {
      setError('');
      const response = await auditApi.list({
        action: action || undefined,
        actorId: actorId || undefined,
        start: start || undefined,
        end: end || undefined,
        page: 1,
        pageSize: 100,
      });
      setItems(response.items);
    } catch (errorValue: unknown) {
      setError(getApiErrorMessage(errorValue, 'Failed to load audit logs.'));
    }
  };

  useEffect(() => {
    void loadAudit();
  }, []);

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="action" />
        <input value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder="actorId" />
        <input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
        <input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
        <button onClick={() => void loadAudit()}>Search</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{formatDateTime(item.createdAt)}</td>
              <td>
                {item.actor.name} ({item.actor.email})
              </td>
              <td>{item.action}</td>
              <td>
                {item.targetType} / {item.targetId || '-'}
              </td>
              <td>{item.ip || '-'}</td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={5} className="muted center-text">
                No logs found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [tab, setTab] = useState<TabKey>('users');

  useEffect(() => {
    authApi
      .me()
      .then((user) => setAdminUser(user))
      .catch(() => {
        authApi.logout();
        setAdminUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const content = useMemo(() => {
    if (tab === 'users') {
      return <UsersPanel />;
    }
    if (tab === 'knowledge') {
      return <KnowledgePanel />;
    }
    if (tab === 'prompts') {
      return <PromptPanel />;
    }
    return <AuditPanel />;
  }, [tab]);

  if (authLoading) {
    return <div className="page center">Loading...</div>;
  }

  if (!adminUser) {
    return <LoginView onLogin={(user) => setAdminUser(user)} />;
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h2>RightNow Admin</h2>
          <p className="muted">
            {adminUser.name} ({adminUser.role})
          </p>
        </div>
        <button
          className="ghost"
          onClick={() => {
            authApi.logout();
            setAdminUser(null);
          }}
        >
          Sign Out
        </button>
      </header>

      <nav className="tabbar">
        {tabs.map((item) => (
          <button
            key={item.key}
            className={item.key === tab ? 'tab active' : 'tab'}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {content}
    </div>
  );
}

export default App;