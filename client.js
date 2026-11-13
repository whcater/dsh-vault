window.__ModuleLoader__.load({
  id: '@byteheng/dsh-vault',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PANEL_ID = 'vault';
    const NS = 'vault';
    /** Browser-relative route: the app may be mounted below a path prefix. */
    const API = 'api/vault';

    const ERROR_KEYS = {
      VAULT_WRONG_PASSPHRASE: 'errWrongPassphrase',
      VAULT_NO_PASSPHRASE: 'errNoPassphrase',
      VAULT_NO_ENTRY: 'errNoEntry',
      VAULT_EMPTY: 'errEmpty',
      VAULT_BAD_NAME: 'errBadName',
      VAULT_BAD_ARGS: 'errBadArgs',
      VAULT_BAD_FORMAT: 'errBadArgs',
      VAULT_CORRUPT: 'errGeneric',
      VAULT_DECRYPT_FAILED: 'errGeneric',
    };

    const EN = {
      panel: 'Vault',
      title: 'Vault',
      subtitle:
        'Entries are encrypted with your master passphrase. Names and notes are visible here; values never enter the conversation.',
      masterPassphrase: 'Master passphrase',
      passphraseHint: 'Required to reveal, save, or delete',
      passphraseConfigured: 'A passphrase file is configured; this field may stay empty',
      show: 'Show',
      hide: 'Hide',
      lock: 'Lock',
      unlocked: 'Unlocked',
      lockedHint: 'Enter the master passphrase to reveal, edit, or delete an entry.',
      add: 'New entry',
      refresh: 'Refresh',
      loading: 'Loading…',
      empty: 'The vault is empty. Add the first entry.',
      countOne: '1 entry',
      countMany: '{n} entries',
      name: 'Name',
      nameHint: 'e.g. github, npm',
      kind: 'Kind',
      kindHint: 'e.g. github, npm, openai',
      label: 'Note',
      labelHint: 'Optional note shown in this list',
      value: 'Value',
      valueCreate: 'The secret to encrypt',
      valueKeep: 'Leave empty to keep the current value',
      save: 'Save',
      cancel: 'Cancel',
      reveal: 'Reveal',
      hideReveal: 'Hide',
      copy: 'Copy',
      copied: 'Copied to clipboard',
      copyManual: 'Select the text and copy it manually',
      saved: 'Saved',
      edit: 'Edit',
      remove: 'Delete',
      confirmDelete: 'Delete "{name}" permanently? This cannot be undone.',
      confirmYes: 'Delete',
      newEntry: 'New entry',
      editEntry: 'Edit entry',
      updated: 'Updated',
      created: 'Created',
      fileLabel: 'File',
      hostMissing: 'The Vault host is not active yet. Force-stop the app and reopen it.',
      emptyName: 'Enter a name.',
      emptyValue: 'Enter a value for a new entry.',
      needPassphrase: 'Enter the master passphrase first.',
      errWrongPassphrase: 'Wrong master passphrase.',
      errNoPassphrase: 'Enter the master passphrase.',
      errNoEntry: 'No such entry.',
      errEmpty: 'The vault is empty.',
      errBadName: 'Use a name of 1–128 characters without control characters.',
      errBadArgs: 'Check the fields and try again.',
      errGeneric: 'Something went wrong.',
    };

    const ZH = {
      panel: '保险箱',
      title: '保险箱',
      subtitle: '条目用主密码加密保存。这里只显示名称和备注，内容不会进入对话。',
      masterPassphrase: '主密码',
      passphraseHint: '查看、保存、删除都需要它',
      passphraseConfigured: '已配置文件主密码，可留空',
      show: '显示',
      hide: '隐藏',
      lock: '锁定',
      unlocked: '已解锁',
      lockedHint: '填入主密码后，才能查看内容、编辑或删除。',
      add: '新增条目',
      refresh: '刷新',
      loading: '加载中…',
      empty: '保险箱还是空的，点「新增条目」存第一条。',
      countOne: '1 条',
      countMany: '{n} 条',
      name: '名称',
      nameHint: '例如 github、npm',
      kind: '类型',
      kindHint: '例如 github、npm、openai',
      label: '备注',
      labelHint: '可选，方便自己辨认',
      value: '内容',
      valueCreate: '要加密保存的内容',
      valueKeep: '留空则保留原内容',
      save: '保存',
      cancel: '取消',
      reveal: '查看',
      hideReveal: '收起',
      copy: '复制',
      copied: '已复制到剪贴板',
      copyManual: '请长按选中复制',
      saved: '已保存',
      edit: '编辑',
      remove: '删除',
      confirmDelete: '永久删除「{name}」？删除后无法恢复。',
      confirmYes: '确认删除',
      newEntry: '新增条目',
      editEntry: '编辑条目',
      updated: '更新于',
      created: '创建于',
      fileLabel: '文件',
      hostMissing: '保险箱宿主还没启用，请强制停止应用后重新打开。',
      emptyName: '请填写名称。',
      emptyValue: '新条目需要填写内容。',
      needPassphrase: '请先填写主密码。',
      errWrongPassphrase: '主密码不正确。',
      errNoPassphrase: '请填写主密码。',
      errNoEntry: '没有这个条目。',
      errEmpty: '保险箱还是空的。',
      errBadName: '名称需要 1–128 个字符，且不能含控制字符。',
      errBadArgs: '请检查填写内容后重试。',
      errGeneric: '操作失败，请重试。',
    };

    const CSS = `
      .vault-panel {
        box-sizing: border-box;
        height: 100%;
        width: 100%;
        overflow-y: auto;
        padding: 24px 20px 48px;
        color: var(--dsw-alias-label-primary);
        background: var(--dsw-alias-bg-base);
      }
      .vault-inner { max-width: 760px; margin: 0 auto; }
      .vault-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .vault-title { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.01em; }
      .vault-subtitle { margin: 6px 0 0; font-size: 13px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
      .vault-lockbar {
        display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
        margin: 16px 0 12px; padding: 12px; border-radius: 12px;
        background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1);
      }
      .vault-lockbar-input { flex: 1 1 200px; min-width: 160px; }
      .vault-badge {
        font-size: 12px; padding: 2px 8px; border-radius: 999px;
        border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary);
      }
      .vault-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
      .vault-toolbar-actions { display: flex; gap: 8px; }
      .vault-count { font-size: 13px; color: var(--dsw-alias-label-secondary); }
      .vault-card {
        display: grid; gap: 8px; margin-bottom: 10px; padding: 14px 16px;
        border-radius: 12px; background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsw-alias-border-l1);
      }
      .vault-card-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
      .vault-name { font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
      .vault-chip {
        font-size: 12px; padding: 1px 8px; border-radius: 999px;
        border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary);
      }
      .vault-note { font-size: 13px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
      .vault-meta { font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .vault-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .vault-field { display: grid; gap: 6px; margin-bottom: 12px; }
      .vault-field-label { font-size: 13px; color: var(--dsw-alias-label-secondary); }
      .vault-input, .vault-textarea {
        box-sizing: border-box; width: 100%; min-height: 44px; padding: 10px 12px;
        border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
        font: inherit; font-size: 14px;
      }
      .vault-textarea { min-height: 72px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vault-input:focus-visible, .vault-textarea:focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px;
      }
      .vault-btn {
        min-height: 40px; padding: 0 14px; border-radius: 10px;
        border: 1px solid var(--dsw-alias-border-l2); background: transparent;
        color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; cursor: pointer;
      }
      .vault-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
      .vault-btn:disabled { opacity: 0.5; cursor: default; }
      .vault-btn-primary { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
      .vault-btn-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
      .vault-btn-quiet { min-height: 32px; padding: 0 10px; font-size: 13px; border-color: transparent; color: var(--dsw-alias-label-secondary); }
      .vault-form {
        display: grid; gap: 0; margin-bottom: 14px; padding: 16px;
        border-radius: 12px; background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsw-alias-border-l2);
      }
      .vault-form-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
      .vault-form-title { margin: 0; font-size: 15px; font-weight: 600; }
      .vault-hint { font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .vault-message { margin: 0 0 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px; line-height: 1.5; }
      .vault-message-error { border: 1px solid var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
      .vault-message-ok { border: 1px solid var(--dsw-alias-state-success-primary); color: var(--dsw-alias-state-success-primary); }
      .vault-empty {
        padding: 28px 16px; border-radius: 12px; text-align: center; font-size: 14px;
        color: var(--dsw-alias-label-secondary); border: 1px dashed var(--dsw-alias-border-l2);
      }
      .vault-reveal { display: grid; gap: 8px; padding: 10px; border-radius: 10px; background: var(--dsw-alias-bg-layer-2); }
      .vault-reveal-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .vault-confirm { display: grid; gap: 8px; padding: 10px; border-radius: 10px; border: 1px solid var(--dsw-alias-state-error-primary); }
      .vault-confirm-text { font-size: 13px; color: var(--dsw-alias-state-error-primary); }
      .vault-foot { margin-top: 20px; font-size: 11px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
      .vault-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
      @media (max-width: 680px) {
        .vault-panel { padding: 16px 14px 40px; }
        .vault-title { font-size: 18px; }
      }
    `;

    function formatTime(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '';
      try {
        return new Date(value).toLocaleString();
      } catch {
        return '';
      }
    }

    function fill(template, values) {
      return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
      );
    }

    async function readJson(response) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    function useAlwaysActive() {
      return true;
    }

    function VaultPanel(props) {
      const t = props.t;
      const usePanelInfo = props.usePanelInfo ?? useAlwaysActive;
      const active = usePanelInfo((info) => info.activePanelId === PANEL_ID);

      const [snapshot, setSnapshot] = React.useState({
        loaded: false,
        entries: [],
        path: null,
        exists: false,
        passphraseConfigured: false,
      });
      const [hostMissing, setHostMissing] = React.useState(false);
      const [passphrase, setPassphrase] = React.useState('');
      const [showPassphrase, setShowPassphrase] = React.useState(false);
      const [form, setForm] = React.useState(null);
      const [revealed, setRevealed] = React.useState(null);
      const [confirming, setConfirming] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);
      const [notice, setNotice] = React.useState(null);

      // Held in a ref so the refresh callback keeps a stable identity even if
      // the slot hands the component a fresh translator on every render.
      const tRef = React.useRef(t);
      tRef.current = t;

      const refresh = React.useCallback(async () => {
        try {
          const response = await fetch(API, { credentials: 'same-origin' });
          const payload = await readJson(response);
          if (response.status === 404 && payload === null) {
            setHostMissing(true);
            return;
          }
          if (!response.ok || payload?.ok !== true) {
            setHostMissing(false);
            setError(payload?.error?.message ?? tRef.current('errGeneric'));
            return;
          }
          setHostMissing(false);
          setError(null);
          setSnapshot({
            loaded: true,
            entries: Array.isArray(payload.entries) ? payload.entries : [],
            path: typeof payload.path === 'string' ? payload.path : null,
            exists: payload.exists === true,
            passphraseConfigured: payload.passphraseConfigured === true,
          });
        } catch {
          setHostMissing(true);
        }
      }, []);

      React.useEffect(() => {
        if (active) refresh();
      }, [active, refresh]);

      React.useEffect(() => {
        if (active) return;
        setPassphrase('');
        setShowPassphrase(false);
        setRevealed(null);
        setForm(null);
        setConfirming(null);
        setError(null);
      }, [active]);

      React.useEffect(() => {
        if (notice === null) return undefined;
        const timer = setTimeout(() => setNotice(null), 2600);
        return () => clearTimeout(timer);
      }, [notice]);

      function describeCode(code) {
        const key = ERROR_KEYS[code];
        return key === undefined ? null : t(key);
      }

      async function post(body) {
        const response = await fetch(API, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...body, passphrase }),
        });
        const payload = await readJson(response);
        if (response.status === 404 && payload === null) {
          setHostMissing(true);
          throw new Error(t('hostMissing'));
        }
        if (!response.ok || payload?.ok !== true) {
          const message = describeCode(payload?.error?.code) ?? payload?.error?.message ?? t('errGeneric');
          throw new Error(message);
        }
        return payload;
      }

      function openCreate() {
        setConfirming(null);
        setRevealed(null);
        setError(null);
        setForm({ mode: 'create', name: '', kind: '', label: '', value: '' });
      }

      function openEdit(entry) {
        setConfirming(null);
        setRevealed(null);
        setError(null);
        setForm({ mode: 'edit', name: entry.name, kind: entry.kind === 'generic' ? '' : entry.kind, label: entry.label ?? '', value: '' });
      }

      async function save() {
        const current = form;
        if (current === null) return;
        const name = current.name.trim();
        if (name.length === 0) {
          setError(t('emptyName'));
          return;
        }
        if (current.mode === 'create' && current.value.length === 0) {
          setError(t('emptyValue'));
          return;
        }
        setBusy(true);
        setError(null);
        try {
          await post({
            action: 'set',
            name,
            value: current.value.length > 0 ? current.value : undefined,
            kind: current.kind,
            label: current.label,
          });
          setForm(null);
          setRevealed(null);
          setNotice(t('saved'));
          await refresh();
        } catch (failure) {
          setError(failure.message);
        } finally {
          setBusy(false);
        }
      }

      async function reveal(entry) {
        setBusy(true);
        setError(null);
        setConfirming(null);
        try {
          const payload = await post({ action: 'reveal', name: entry.name });
          setRevealed({ name: entry.name, value: String(payload.entry?.value ?? '') });
        } catch (failure) {
          setError(failure.message);
        } finally {
          setBusy(false);
        }
      }

      async function remove(entry) {
        setBusy(true);
        setError(null);
        try {
          await post({ action: 'delete', name: entry.name });
          setConfirming(null);
          setRevealed(null);
          await refresh();
        } catch (failure) {
          setError(failure.message);
        } finally {
          setBusy(false);
        }
      }

      async function copy(value) {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            setNotice(t('copied'));
            return;
          }
        } catch {
          // Fall through to the manual hint.
        }
        setNotice(t('copyManual'));
      }

      const entries = snapshot.entries;
      const countText = entries.length === 1 ? t('countOne') : fill(t('countMany'), { n: entries.length });
      const unlocked = passphrase.trim().length > 0;
      const canSubmit = unlocked || snapshot.passphraseConfigured === true;

      const children = [];
      children.push(h('style', { key: 'style' }, CSS));

      children.push(
        h(
          'header',
          { key: 'head', className: 'vault-head' },
          h(
            'div',
            null,
            h('h1', { className: 'vault-title' }, t('title')),
            h('p', { className: 'vault-subtitle' }, t('subtitle')),
          ),
        ),
      );

      children.push(
        h(
          'div',
          { key: 'lockbar', className: 'vault-lockbar' },
          h(
            'label',
            { className: 'vault-lockbar-input' },
            h('span', { className: 'vault-sr' }, t('masterPassphrase')),
            h('input', {
              className: 'vault-input',
              type: showPassphrase ? 'text' : 'password',
              value: passphrase,
              placeholder: t('masterPassphrase'),
              autoComplete: 'current-password',
              spellCheck: false,
              onChange: (event) => setPassphrase(event.target.value),
            }),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'vault-btn vault-btn-quiet',
              onClick: () => setShowPassphrase((value) => !value),
            },
            showPassphrase ? t('hide') : t('show'),
          ),
          unlocked
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'vault-btn',
                  onClick: () => {
                    setPassphrase('');
                    setShowPassphrase(false);
                    setRevealed(null);
                    setConfirming(null);
                  },
                },
                t('lock'),
              )
            : h(
                'span',
                { className: 'vault-hint' },
                snapshot.passphraseConfigured ? t('passphraseConfigured') : t('passphraseHint'),
              ),
          unlocked ? h('span', { className: 'vault-badge' }, t('unlocked')) : null,
        ),
      );

      if (hostMissing) {
        children.push(h('p', { key: 'host', className: 'vault-message vault-message-error' }, t('hostMissing')));
      }
      if (error !== null) {
        children.push(
          h('p', { key: 'error', className: 'vault-message vault-message-error', role: 'alert' }, error),
        );
      }
      if (notice !== null) {
        children.push(
          h('p', { key: 'notice', className: 'vault-message vault-message-ok', role: 'status' }, notice),
        );
      }

      children.push(
        h(
          'div',
          { key: 'toolbar', className: 'vault-toolbar' },
          h('span', { className: 'vault-count' }, snapshot.loaded ? countText : t('loading')),
          h(
            'div',
            { className: 'vault-toolbar-actions' },
            h('button', { type: 'button', className: 'vault-btn', onClick: () => refresh() }, t('refresh')),
            h(
              'button',
              { type: 'button', className: 'vault-btn vault-btn-primary', onClick: openCreate, disabled: busy },
              t('add'),
            ),
          ),
        ),
      );

      if (form !== null) {
        const fields = [];
        fields.push(
          h(
            'div',
            { key: 'formhead', className: 'vault-form-head' },
            h('h2', { className: 'vault-form-title' }, form.mode === 'create' ? t('newEntry') : t('editEntry')),
            h('span', { className: 'vault-hint' }, form.mode === 'edit' ? t('valueKeep') : t('valueCreate')),
          ),
        );
        fields.push(
          h(
            'label',
            { key: 'name', className: 'vault-field' },
            h('span', { className: 'vault-field-label' }, t('name')),
            h('input', {
              className: 'vault-input',
              type: 'text',
              value: form.name,
              placeholder: t('nameHint'),
              readOnly: form.mode === 'edit',
              autoComplete: 'off',
              spellCheck: false,
              onChange: (event) => setForm({ ...form, name: event.target.value }),
            }),
          ),
        );
        fields.push(
          h(
            'label',
            { key: 'kind', className: 'vault-field' },
            h('span', { className: 'vault-field-label' }, t('kind')),
            h('input', {
              className: 'vault-input',
              type: 'text',
              value: form.kind,
              placeholder: t('kindHint'),
              autoComplete: 'off',
              spellCheck: false,
              onChange: (event) => setForm({ ...form, kind: event.target.value }),
            }),
          ),
        );
        fields.push(
          h(
            'label',
            { key: 'label', className: 'vault-field' },
            h('span', { className: 'vault-field-label' }, t('label')),
            h('input', {
              className: 'vault-input',
              type: 'text',
              value: form.label,
              placeholder: t('labelHint'),
              autoComplete: 'off',
              onChange: (event) => setForm({ ...form, label: event.target.value }),
            }),
          ),
        );
        fields.push(
          h(
            'label',
            { key: 'value', className: 'vault-field' },
            h('span', { className: 'vault-field-label' }, t('value')),
            h('textarea', {
              className: 'vault-textarea',
              value: form.value,
              placeholder: form.mode === 'edit' ? t('valueKeep') : t('valueCreate'),
              spellCheck: false,
              autoCapitalize: 'off',
              autoCorrect: 'off',
              onChange: (event) => setForm({ ...form, value: event.target.value }),
            }),
          ),
        );
        fields.push(
          h(
            'div',
            { key: 'formactions', className: 'vault-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'vault-btn vault-btn-primary',
                onClick: save,
                disabled: busy || !canSubmit,
              },
              t('save'),
            ),
            h(
              'button',
              { type: 'button', className: 'vault-btn', onClick: () => setForm(null), disabled: busy },
              t('cancel'),
            ),
            canSubmit ? null : h('span', { className: 'vault-hint' }, t('needPassphrase')),
          ),
        );
        children.push(h('section', { key: 'form', className: 'vault-form', 'aria-label': t('editEntry') }, fields));
      }

      if (snapshot.loaded && entries.length === 0) {
        children.push(h('p', { key: 'empty', className: 'vault-empty' }, t('empty')));
      }

      const cards = entries.map((entry) => {
        const card = [];
        card.push(
          h(
            'div',
            { key: 'head', className: 'vault-card-head' },
            h('span', { className: 'vault-name' }, entry.name),
            h('span', { className: 'vault-chip' }, entry.kind ?? 'generic'),
          ),
        );
        if (entry.label) card.push(h('p', { key: 'note', className: 'vault-note' }, entry.label));
        const stamp = formatTime(entry.updatedAt ?? entry.createdAt);
        if (stamp) card.push(h('span', { key: 'meta', className: 'vault-meta' }, `${t('updated')} ${stamp}`));

        const isRevealed = revealed !== null && revealed.name === entry.name;
        card.push(
          h(
            'div',
            { key: 'actions', className: 'vault-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'vault-btn vault-btn-quiet',
                onClick: () => {
                  if (isRevealed) setRevealed(null);
                  else if (!canSubmit) setError(t('needPassphrase'));
                  else reveal(entry);
                },
                disabled: busy,
              },
              isRevealed ? t('hideReveal') : t('reveal'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'vault-btn vault-btn-quiet',
                onClick: () => (canSubmit ? openEdit(entry) : setError(t('needPassphrase'))),
                disabled: busy,
              },
              t('edit'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'vault-btn vault-btn-quiet',
                onClick: () => (canSubmit ? setConfirming(entry.name) : setError(t('needPassphrase'))),
                disabled: busy,
              },
              t('remove'),
            ),
          ),
        );

        if (isRevealed) {
          card.push(
            h(
              'div',
              { key: 'reveal', className: 'vault-reveal' },
              h('textarea', {
                className: 'vault-textarea',
                value: revealed.value,
                readOnly: true,
                spellCheck: false,
                'aria-label': t('value'),
              }),
              h(
                'div',
                { className: 'vault-reveal-actions' },
                h(
                  'button',
                  { type: 'button', className: 'vault-btn', onClick: () => copy(revealed.value) },
                  t('copy'),
                ),
                h('button', { type: 'button', className: 'vault-btn', onClick: () => setRevealed(null) }, t('hideReveal')),
              ),
            ),
          );
        }

        if (confirming === entry.name) {
          card.push(
            h(
              'div',
              { key: 'confirm', className: 'vault-confirm' },
              h('span', { className: 'vault-confirm-text' }, fill(t('confirmDelete'), { name: entry.name })),
              h(
                'div',
                { className: 'vault-actions' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'vault-btn vault-btn-danger',
                    onClick: () => remove(entry),
                    disabled: busy || !canSubmit,
                  },
                  t('confirmYes'),
                ),
                h(
                  'button',
                  { type: 'button', className: 'vault-btn', onClick: () => setConfirming(null), disabled: busy },
                  t('cancel'),
                ),
              ),
            ),
          );
        }

        return h('article', { key: entry.name, className: 'vault-card' }, card);
      });

      if (cards.length > 0) children.push(h('div', { key: 'cards' }, cards));

      if (snapshot.path) {
        children.push(h('p', { key: 'path', className: 'vault-foot' }, `${t('fileLabel')}: ${snapshot.path}`));
      }

      return h('section', { className: 'vault-panel' }, h('div', { className: 'vault-inner' }, children));
    }

    function VaultIcon({ size, active }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          'aria-hidden': true,
          focusable: false,
          style: { display: 'block', opacity: active ? 1 : 0.82 },
        },
        h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 4, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }),
        h('circle', { cx: 12, cy: 10.5, r: 3.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }),
        h('circle', { cx: 12, cy: 10.5, r: 1, fill: 'currentColor' }),
        h('rect', { x: 11.1, y: 13.2, width: 1.8, height: 4, rx: 0.9, fill: 'currentColor' }),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS);
        ctx.effect(() => ctx.locale.register(NS, 'en', EN), 'vault: English dictionary');
        ctx.effect(() => ctx.locale.register(NS, 'zh', ZH), 'vault: Chinese dictionary');

        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, VaultPanel),
        );

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: PANEL_ID, order: 30, locale: NS, label: () => t('panel') },
            VaultIcon,
          ),
        );
      },
    };
  },
});
