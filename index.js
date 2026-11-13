import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const name = "tool-vault";
const inject = ["tools"];

const FORMAT = "dsh-vault";
const VERSION = 1;
const VERIFY_PLAINTEXT = "dsh-vault-ok";
const KDF_R = 8;
const KDF_P = 1;
const DEFAULT_SCRYPT_N = 16384;
const API_PATH = "/api/vault";
const MAX_NAME = 128;
const MAX_LABEL = 200;
const MAX_KIND = 64;
const MAX_VALUE_BYTES = 65536;
const DEFAULT_UNLOCK_TIMEOUT = 60000;
const LOCKED_MESSAGE =
  "the vault is locked: unlock it in the Vault panel (the tool waits up to a minute), or configure passphraseFile / passphraseEnv";

function vaultError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function resolveConfig(config) {
  const scryptN = config?.scryptN ?? DEFAULT_SCRYPT_N;
  if (!Number.isSafeInteger(scryptN) || scryptN < 1024 || (scryptN & (scryptN - 1)) !== 0) {
    throw new TypeError("vault config scryptN must be a power of two >= 1024");
  }
  return {
    path: typeof config?.path === "string" && config.path.length > 0 ? config.path : undefined,
    passphraseFile:
      typeof config?.passphraseFile === "string" && config.passphraseFile.length > 0
        ? config.passphraseFile
        : undefined,
    passphraseEnv:
      typeof config?.passphraseEnv === "string" && config.passphraseEnv.length > 0
        ? config.passphraseEnv
        : undefined,
    keyFile: typeof config?.keyFile === "string" && config.keyFile.length > 0 ? config.keyFile : undefined,
    unlockTimeoutMs:
      Number.isSafeInteger(config?.unlockTimeoutMs) && config.unlockTimeoutMs > 0
        ? Math.min(config.unlockTimeoutMs, 600000)
        : DEFAULT_UNLOCK_TIMEOUT,
    scryptN,
  };
}

function defaultVaultDir() {
  // ctx.baseDir is a Cordis accessor and throws unless injected. The Host
  // always sets DSH_HOME; the profile name is the --profile argument.
  const home = process.env.DSH_HOME;
  if (!home) return process.cwd();
  const flag = process.argv.indexOf("--profile");
  const named = flag >= 0 ? process.argv[flag + 1] : undefined;
  const profile = named && !named.startsWith("-") ? named : "web";
  return path.join(home, "profiles", profile);
}

function vaultPath(resolved) {
  if (resolved.path) return resolved.path;
  return path.join(defaultVaultDir(), "vault", "vault.json");
}

// ---- crypto ----
function deriveKey(passphrase, salt, N) {
  return crypto.scryptSync(passphrase, salt, 32, { N, r: KDF_R, p: KDF_P });
}

function encryptValue(key, plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    ct: ct.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decryptValue(key, enc) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(enc.iv, "base64"));
  decipher.setAuthTag(Buffer.from(enc.tag, "base64"));
  const pt = Buffer.concat([decipher.update(Buffer.from(enc.ct, "base64")), decipher.final()]);
  return pt.toString("utf8");
}

function createVault(passphrase, scryptN) {
  const salt = crypto.randomBytes(16);
  const kdf = { algo: "scrypt", N: scryptN, r: KDF_R, p: KDF_P, salt: salt.toString("base64") };
  const key = deriveKey(passphrase, salt, scryptN);
  const vault = {
    format: FORMAT,
    version: VERSION,
    kdf,
    verify: encryptValue(key, VERIFY_PLAINTEXT),
    entries: {},
  };
  return { vault, key };
}

function keyForVault(vault, passphrase) {
  const N = Number.isSafeInteger(vault.kdf?.N) ? vault.kdf.N : DEFAULT_SCRYPT_N;
  return deriveKey(passphrase, Buffer.from(vault.kdf.salt, "base64"), N);
}

function assertUnlockable(vault, passphrase) {
  const key = keyForVault(vault, passphrase);
  if (!vault.verify) {
    if (Object.keys(vault.entries ?? {}).length === 0) return key;
    throw vaultError("vault file is missing its passphrase verifier", "VAULT_CORRUPT");
  }
  try {
    const plaintext = decryptValue(key, vault.verify);
    if (plaintext !== VERIFY_PLAINTEXT) throw new Error("verifier mismatch");
  } catch {
    throw vaultError("wrong vault passphrase", "VAULT_WRONG_PASSPHRASE");
  }
  return key;
}

// ---- passphrase resolution ----
function normalizePassphrase(text) {
  let value = String(text ?? "");
  if (value.charCodeAt(0) === 0xfeff) value = value.slice(1);
  return value.replace(/\r\n?/g, "\n").trim();
}

async function readPassphraseFile(file) {
  const passphrase = normalizePassphrase(await fs.readFile(file, "utf8"));
  if (passphrase.length === 0) throw vaultError(`passphrase file '${file}' is empty`, "VAULT_NO_PASSPHRASE");
  return passphrase;
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the master passphrase. The direct value exists for the local panel
 * only: agent tools pass a file path so the passphrase never enters the log.
 * The in-memory passphrase comes from a panel unlock and never touches disk.
 */
async function resolvePassphrase(resolved, options = {}) {
  const direct = normalizePassphrase(options.passphrase ?? "");
  if (direct.length > 0) return direct;
  if (options.memory) return options.memory;
  if (options.passphraseFile) return readPassphraseFile(options.passphraseFile);
  if (resolved.passphraseEnv && process.env[resolved.passphraseEnv]) {
    return process.env[resolved.passphraseEnv];
  }
  if (resolved.passphraseFile) return readPassphraseFile(resolved.passphraseFile);
  if (options.keyFile && (await fileExists(options.keyFile))) return readPassphraseFile(options.keyFile);
  if (options.waitForUnlock) return options.waitForUnlock();
  throw vaultError(LOCKED_MESSAGE, "VAULT_LOCKED");
}

// ---- entry validation ----
function assertEntryName(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw.length === 0) throw vaultError("name must be non-empty", "VAULT_BAD_NAME");
  if (raw.length > MAX_NAME) throw vaultError(`name must be at most ${MAX_NAME} characters`, "VAULT_BAD_NAME");
  if (/[\u0000-\u001f\u007f]/.test(raw)) throw vaultError("name must not contain control characters", "VAULT_BAD_NAME");
  return raw;
}

function optionalText(value, max, field) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw vaultError(`${field} must be a string`, "VAULT_BAD_ARGS");
  const raw = value.trim();
  if (raw.length > max) throw vaultError(`${field} must be at most ${max} characters`, "VAULT_BAD_ARGS");
  return raw.length === 0 ? "" : raw;
}

function assertValueSize(value) {
  if (Buffer.byteLength(value, "utf8") > MAX_VALUE_BYTES) {
    throw vaultError(`value must be at most ${MAX_VALUE_BYTES} bytes`, "VAULT_BAD_ARGS");
  }
}

// ---- file io ----
async function loadVault(file) {
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (err) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
  let vault;
  try {
    vault = JSON.parse(raw);
  } catch {
    throw vaultError("vault file is not valid JSON", "VAULT_CORRUPT");
  }
  if (vault?.format !== FORMAT) throw vaultError("not a dsh-vault file", "VAULT_BAD_FORMAT");
  if (!vault.entries || typeof vault.entries !== "object" || Array.isArray(vault.entries)) {
    throw vaultError("vault file is missing its entries map", "VAULT_CORRUPT");
  }
  return vault;
}

async function saveVault(file, vault) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const text = JSON.stringify(vault, null, 2);
  const temp = `${file}.tmp`;
  try {
    await fs.writeFile(temp, text, { mode: 0o600 });
    await fs.rename(temp, file);
  } catch {
    // A filesystem without atomic rename still needs the write to land.
    await fs.writeFile(file, text, { mode: 0o600 });
  }
}

function now() {
  return Date.now();
}

function entryMeta(entryName, entry) {
  return {
    name: entryName,
    kind: entry.kind ?? "generic",
    label: entry.label ?? null,
    createdAt: entry.createdAt ?? null,
    updatedAt: entry.updatedAt ?? null,
  };
}

function hasEntry(vault, entryName) {
  return Object.prototype.hasOwnProperty.call(vault.entries, entryName);
}

// ---- shared operations: agent tools and the local panel both call these ----
function createVaultApi(resolved) {
  const file = vaultPath(resolved);
  const keyFile = resolved.keyFile ?? path.join(path.dirname(file), "vault.key");

  // A panel unlock lives here, in this Host process only. It is never written
  // anywhere unless the user explicitly chooses "remember on this device".
  let memoryPassphrase = null;
  const unlockWaiters = new Set();

  function notifyUnlock() {
    for (const notify of [...unlockWaiters]) notify();
  }

  function waitForUnlock(timeoutMs) {
    if (memoryPassphrase !== null) return Promise.resolve(memoryPassphrase);
    return new Promise((resolve, reject) => {
      const settle = () => {
        clearTimeout(timer);
        unlockWaiters.delete(onUnlock);
      };
      const onUnlock = () => {
        settle();
        resolve(memoryPassphrase);
      };
      const timer = setTimeout(() => {
        settle();
        reject(vaultError(LOCKED_MESSAGE, "VAULT_LOCKED"));
      }, timeoutMs);
      unlockWaiters.add(onUnlock);
    });
  }

  async function currentState() {
    return { unlocked: memoryPassphrase !== null, remembered: await fileExists(keyFile) };
  }

  async function passphraseFor(options, wait) {
    return resolvePassphrase(resolved, {
      passphrase: options.passphrase,
      passphraseFile: options.passphraseFile,
      memory: memoryPassphrase,
      keyFile,
      waitForUnlock: wait ? () => waitForUnlock(resolved.unlockTimeoutMs) : undefined,
    });
  }

  return {
    file,
    keyFile,

    /** Whether a passphrase source exists without the panel asking for one. */
    async passphraseConfigured() {
      if (resolved.passphraseEnv && process.env[resolved.passphraseEnv]) return true;
      if (resolved.passphraseFile !== undefined) return true;
      return fileExists(keyFile);
    },

    state: currentState,

    /** Hold the passphrase in memory for this Host process; never persisted. */
    async unlock(options = {}) {
      const passphrase = normalizePassphrase(options.passphrase ?? "");
      if (passphrase.length === 0) throw vaultError("enter the master passphrase", "VAULT_NO_PASSPHRASE");
      const vault = await loadVault(file);
      if (vault !== null) assertUnlockable(vault, passphrase);
      memoryPassphrase = passphrase;
      notifyUnlock();
      return currentState();
    },

    async lock() {
      memoryPassphrase = null;
      return currentState();
    },

    /** Persist the unlocked passphrase to a 0600 key file for unattended use. */
    async remember(options = {}) {
      const passphrase = await passphraseFor(options, false);
      await fs.mkdir(path.dirname(keyFile), { recursive: true });
      await fs.writeFile(keyFile, `${passphrase}\n`, { mode: 0o600 });
      return currentState();
    },

    async forget() {
      await fs.rm(keyFile, { force: true });
      return currentState();
    },

    async status() {
      const vault = await loadVault(file);
      const state = await currentState();
      if (vault === null) return { path: file, exists: false, count: 0, names: [], ...state };
      const names = Object.keys(vault.entries);
      return { path: file, exists: true, version: vault.version, count: names.length, names, ...state };
    },

    async list() {
      const vault = await loadVault(file);
      if (vault === null) return { path: file, exists: false, count: 0, entries: [] };
      const entries = Object.entries(vault.entries).map(([entryName, entry]) => entryMeta(entryName, entry));
      return { path: file, exists: true, count: entries.length, entries };
    },

    async set(options) {
      const entryName = assertEntryName(options.name);
      const kind = optionalText(options.kind, MAX_KIND, "kind");
      const label = optionalText(options.label, MAX_LABEL, "label");
      const hasValue = typeof options.value === "string" && options.value.length > 0;
      if (hasValue) assertValueSize(options.value);

      const passphrase = await passphraseFor(options, options.wait === true);

      let vault = await loadVault(file);
      let derivedKey;
      let created = false;
      if (vault === null) {
        if (!hasValue) throw vaultError("a new vault entry needs a value", "VAULT_BAD_ARGS");
        const fresh = createVault(passphrase, resolved.scryptN);
        vault = fresh.vault;
        derivedKey = fresh.key;
        created = true;
      } else {
        derivedKey = assertUnlockable(vault, passphrase);
      }

      const prev = vault.entries[entryName];
      if (!hasValue && prev === undefined) throw vaultError(`no vault entry named '${entryName}'`, "VAULT_NO_ENTRY");

      const ts = now();
      const enc = hasValue ? encryptValue(derivedKey, options.value) : null;
      vault.entries[entryName] = {
        kind: kind === undefined || kind.length === 0 ? (prev?.kind ?? "generic") : kind,
        label: label === undefined ? prev?.label : label.length > 0 ? label : undefined,
        iv: enc ? enc.iv : prev.iv,
        ct: enc ? enc.ct : prev.ct,
        tag: enc ? enc.tag : prev.tag,
        createdAt: prev?.createdAt ?? ts,
        updatedAt: ts,
      };
      await saveVault(file, vault);
      const stored = vault.entries[entryName];
      return { name: entryName, stored: true, created, kind: stored.kind, label: stored.label ?? null };
    },

    async reveal(options) {
      const entryName = assertEntryName(options.name);
      const vault = await loadVault(file);
      if (vault === null) throw vaultError("vault does not exist yet; use vault_set to create it", "VAULT_EMPTY");
      const entry = vault.entries[entryName];
      if (!entry) throw vaultError(`no vault entry named '${entryName}'`, "VAULT_NO_ENTRY");
      const passphrase = await passphraseFor(options, options.wait === true);
      const derivedKey = assertUnlockable(vault, passphrase);
      let value;
      try {
        value = decryptValue(derivedKey, { iv: entry.iv, ct: entry.ct, tag: entry.tag });
      } catch {
        throw vaultError(`failed to decrypt entry '${entryName}'`, "VAULT_DECRYPT_FAILED");
      }
      return { name: entryName, value };
    },

    async remove(options) {
      const entryName = assertEntryName(options.name);
      const vault = await loadVault(file);
      if (vault === null) throw vaultError("vault does not exist yet", "VAULT_EMPTY");
      const passphrase = await passphraseFor(options, options.wait === true);
      assertUnlockable(vault, passphrase);
      const had = hasEntry(vault, entryName);
      if (had) delete vault.entries[entryName];
      await saveVault(file, vault);
      return { name: entryName, deleted: had };
    },

    async exportTo(destination) {
      const vault = await loadVault(file);
      if (vault === null) throw vaultError("vault does not exist yet", "VAULT_EMPTY");
      await saveVault(destination, vault);
      return {
        file: destination,
        count: Object.keys(vault.entries).length,
        format: vault.format,
        version: vault.version,
      };
    },

    async importFrom(source, options = {}) {
      const raw = await fs.readFile(source, "utf8");
      let incoming;
      try {
        incoming = JSON.parse(raw);
      } catch {
        throw vaultError("export file is not valid JSON", "VAULT_CORRUPT");
      }
      if (incoming?.format !== FORMAT) throw vaultError("not a dsh-vault export file", "VAULT_BAD_FORMAT");
      if (!incoming.entries || typeof incoming.entries !== "object" || Array.isArray(incoming.entries)) {
        throw vaultError("export file is missing its entries map", "VAULT_CORRUPT");
      }
      const passphrase = await passphraseFor(options, options.wait === true);
      const incomingKey = assertUnlockable(incoming, passphrase);
      const incomingPlain = {};
      for (const [entryName, entry] of Object.entries(incoming.entries)) {
        try {
          incomingPlain[entryName] = {
            kind: entry.kind,
            label: entry.label,
            createdAt: entry.createdAt,
            value: decryptValue(incomingKey, { iv: entry.iv, ct: entry.ct, tag: entry.tag }),
          };
        } catch {
          throw vaultError(`failed to decrypt imported entry '${entryName}'`, "VAULT_DECRYPT_FAILED");
        }
      }
      const current = await loadVault(file);
      if (current === null) {
        await saveVault(file, incoming);
        const count = Object.keys(incomingPlain).length;
        return { imported: count, count, adopted: true };
      }
      const currentKey = assertUnlockable(current, passphrase);
      let added = 0;
      for (const [entryName, plain] of Object.entries(incomingPlain)) {
        const exists = hasEntry(current, entryName);
        if (exists && !options.overwrite) continue;
        const enc = encryptValue(currentKey, plain.value);
        current.entries[entryName] = {
          kind: plain.kind ?? "generic",
          label: plain.label,
          iv: enc.iv,
          ct: enc.ct,
          tag: enc.tag,
          createdAt: exists ? current.entries[entryName].createdAt : (plain.createdAt ?? now()),
          updatedAt: now(),
        };
        added += 1;
      }
      await saveVault(file, current);
      return { imported: added, count: Object.keys(current.entries).length, adopted: false };
    },
  };
}

// ---- self-contained tool definition builder (no @deepseek-ai imports) ----
const JSON_OUTPUT = {
  schema: {},
  render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
};

function toParametersSchema(params) {
  const properties = {};
  const required = [];
  for (const [key, spec] of Object.entries(params ?? {})) {
    properties[key] = {};
    if (spec?.type) properties[key].type = spec.type;
    if (spec?.description) properties[key].description = spec.description;
    if (spec?.required) required.push(key);
  }
  const schema = { type: "object", properties };
  if (required.length > 0) schema.required = required;
  return schema;
}

function tool(options) {
  const parameters = options.parameters
    ? toParametersSchema(options.parameters)
    : { type: "object", properties: {} };
  const required = Object.entries(options.parameters ?? {})
    .filter(([, spec]) => spec?.required)
    .map(([key]) => key);
  return {
    name: options.name,
    description: options.description,
    parameters,
    output: options.output ?? JSON_OUTPUT,
    async execute(args, exec) {
      for (const key of required) {
        const value = args?.[key];
        if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
          const err = new Error(`${options.name}: missing required argument '${key}'`);
          err.code = "VAULT_BAD_ARGS";
          throw err;
        }
      }
      return options.execute(args, exec);
    },
  };
}

function registerTools(ctx, api) {
  const definitions = [
    tool({
      name: "vault_status",
      description:
        "Report the encrypted Vault's status: its file path, whether it exists, and the names of stored secrets (never their values).",
      parameters: {},
      async execute() {
        return api.status();
      },
    }),

    tool({
      name: "vault_list",
      description: "List stored secret names, kinds, and labels (values are never returned).",
      parameters: {},
      async execute() {
        const result = await api.list();
        return { entries: result.entries };
      },
    }),

    tool({
      name: "vault_set",
      description:
        "Store a secret in the encrypted Vault. The value is AES-256-GCM encrypted at rest and is never written to disk in plaintext; this tool does not echo it back. Retrieve it later with vault_get. If the vault is locked, the user unlocks it in the Vault panel, and this call waits up to a minute for that.",
      parameters: {
        name: { type: "string", required: true, description: "Entry key, e.g. 'github' or 'npm'." },
        value: { type: "string", required: true, description: "The secret value to store." },
        kind: { type: "string", description: "Optional tag, e.g. 'github', 'npm', 'openai', 'generic'." },
        label: { type: "string", description: "Optional human-readable label." },
        passphrase_file: {
          type: "string",
          description:
            "Optional path to a file containing the master passphrase (used only when passphraseFile / passphraseEnv are not configured).",
        },
      },
      async execute(args) {
        return api.set({
          name: args.name,
          value: args.value,
          kind: args.kind,
          label: args.label,
          passphraseFile: args.passphrase_file,
          wait: true,
        });
      },
    }),

    tool({
      name: "vault_get",
      description:
        "Retrieve a stored secret by name. The plaintext value is returned for immediate use only: never write it into files, logs, or commit messages, and never echo it to the user. If the vault is locked, the user unlocks it in the Vault panel, and this call waits up to a minute for that.",
      parameters: {
        name: { type: "string", required: true, description: "Entry key, e.g. 'github'." },
        passphrase_file: {
          type: "string",
          description: "Optional path to a file containing the master passphrase.",
        },
      },
      async execute(args) {
        return api.reveal({ name: args.name, passphraseFile: args.passphrase_file, wait: true });
      },
    }),

    tool({
      name: "vault_delete",
      description:
        "Delete a stored secret by name. If the vault is locked, the user unlocks it in the Vault panel, and this call waits up to a minute for that.",
      parameters: {
        name: { type: "string", required: true, description: "Entry key to delete." },
        passphrase_file: {
          type: "string",
          description: "Optional path to a file containing the master passphrase.",
        },
      },
      async execute(args) {
        return api.remove({ name: args.name, passphraseFile: args.passphrase_file, wait: true });
      },
    }),

    tool({
      name: "vault_export",
      description:
        "Export the encrypted Vault to a file for backup or moving to another device. The output is already AES-256-GCM encrypted, so it is safe to copy around; importing it on another device needs the same master passphrase.",
      parameters: {
        file: {
          type: "string",
          required: true,
          description:
            "Absolute destination path for the export file, e.g. /storage/emulated/0/Download/vault.vault.",
        },
      },
      async execute(args) {
        return api.exportTo(args.file);
      },
    }),

    tool({
      name: "vault_import",
      description:
        "Import an exported Vault file and merge its secrets into the current Vault. Requires the same master passphrase used when exporting. On a fresh device it adopts the exported Vault as-is.",
      parameters: {
        file: { type: "string", required: true, description: "Absolute path to the exported Vault file." },
        overwrite: {
          type: "boolean",
          description:
            "If true, same-name entries from the file replace current ones. Default false keeps current entries.",
        },
        passphrase_file: {
          type: "string",
          description: "Optional path to a file containing the master passphrase.",
        },
      },
      async execute(args) {
        return api.importFrom(args.file, {
          overwrite: args.overwrite === true,
          passphraseFile: args.passphrase_file,
          wait: true,
        });
      },
    }),
  ];

  for (const definition of definitions) {
    ctx.effect(() => ctx.tools.register(definition), `vault: ${definition.name}`);
  }
}

// ---- local panel transport: authenticated by the page's own cookie ----
const STATUS_BY_CODE = {
  VAULT_NO_PASSPHRASE: 401,
  VAULT_LOCKED: 401,
  VAULT_WRONG_PASSPHRASE: 401,
  VAULT_NO_ENTRY: 404,
  VAULT_EMPTY: 404,
  VAULT_BAD_NAME: 400,
  VAULT_BAD_ARGS: 400,
  VAULT_BAD_FORMAT: 400,
  VAULT_CORRUPT: 500,
  VAULT_DECRYPT_FAILED: 500,
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function failureResponse(error) {
  const code = typeof error?.code === "string" ? error.code : "VAULT_ERROR";
  const status = STATUS_BY_CODE[code] ?? 500;
  const message = error instanceof Error ? error.message : String(error);
  return jsonResponse({ ok: false, error: { code, message } }, status);
}

async function handleVaultRequest(api, request) {
  try {
    if (request.method === "GET") {
      const result = await api.list();
      const state = await api.state();
      return jsonResponse({
        ok: true,
        passphraseConfigured: await api.passphraseConfigured(),
        ...state,
        ...result,
      });
    }
    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405, headers: { allow: "GET, POST" } });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return failureResponse(vaultError("request body must be JSON", "VAULT_BAD_ARGS"));
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return failureResponse(vaultError("request body must be a JSON object", "VAULT_BAD_ARGS"));
    }

    const shared = { passphrase: body.passphrase };
    switch (body.action) {
      case "set": {
        const result = await api.set({
          ...shared,
          name: body.name,
          value: typeof body.value === "string" ? body.value : undefined,
          kind: body.kind,
          label: body.label,
        });
        return jsonResponse({ ok: true, entry: result });
      }
      case "reveal": {
        const result = await api.reveal({ ...shared, name: body.name });
        return jsonResponse({ ok: true, entry: result });
      }
      case "delete": {
        const result = await api.remove({ ...shared, name: body.name });
        return jsonResponse({ ok: true, entry: result });
      }
      case "unlock": {
        const state = await api.unlock({ passphrase: body.passphrase });
        return jsonResponse({ ok: true, ...state });
      }
      case "lock": {
        const state = await api.lock();
        return jsonResponse({ ok: true, ...state });
      }
      case "remember": {
        const state = await api.remember({ passphrase: body.passphrase });
        return jsonResponse({ ok: true, ...state });
      }
      case "forget": {
        const state = await api.forget();
        return jsonResponse({ ok: true, ...state });
      }
      default:
        return failureResponse(
          vaultError(
            "action must be one of: set, reveal, delete, unlock, lock, remember, forget",
            "VAULT_BAD_ARGS",
          ),
        );
    }
  } catch (error) {
    return failureResponse(error);
  }
}

function apply(ctx, config) {
  const resolved = resolveConfig(config);
  const api = createVaultApi(resolved);

  registerTools(ctx, api);

  // The panel is optional: without a browser transport the agent tools remain.
  ctx.inject(["connection"], (transportCtx) => {
    transportCtx.connection.fetch.register({
      path: API_PATH,
      methods: ["GET", "POST"],
      requestBody: "buffered",
      fetch: (request) => handleVaultRequest(api, request),
    });
  });
}

export { apply, inject, name };
