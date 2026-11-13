# 保险箱 · Vault

[![npm version](https://img.shields.io/npm/v/@byteheng/dsh-vault)](https://www.npmjs.com/package/@byteheng/dsh-vault)
[![license](https://img.shields.io/npm/l/@byteheng/dsh-vault)](LICENSE)

把 GitHub / npm 等敏感凭证加密保存，不再以明文文件散落在手机上。侧边栏有独立面板，可以自己查看和手动维护；换手机时用**加密导出/导入**迁移。

## 安装

### 方式一：Web 插件页

在 DSH Web 界面左侧打开 **插件（Plugins）**，安装 bundle：

```
@byteheng/dsh-vault
```

安装后启用 bundle，侧边栏会出现保险箱图标。

### 方式二：命令行

```sh
dsh plugin add @byteheng/dsh-vault
```

然后在 profile 的 bundle 列表里启用它（或通过 Web 插件页开启）。


## 安全模型

- 每条凭证用 **AES-256-GCM** 加密，密钥由**主密码**经 **scrypt** 派生。
- 主密码**永不进入对话**：AI 工具只接受「密码文件路径」或「环境变量」，不把密码本身当参数传，因此不会写入会话日志。
- 面板里的主密码只提交给本机已登录的接口，不落盘、不写日志；解锁状态只留在宿主内存。
- 只有你主动点「记住到本机」，才会写一个 0600 的密钥文件；否则重启就回到锁定状态。
- 保险箱文件与导出文件都是密文；没有主密码打不开。

## 界面

左侧边栏多一个「保险箱」图标（在 2048 下面），点开就是面板：

- **解锁**：填一次主密码，点「解锁」。解锁状态留在宿主内存，点「锁定」或重启应用就失效。
- **记住到本机**（可选）：解锁后点它，主密码写进应用私有目录的 `vault.key`（0600），之后 AI 工具不必每次等你解锁；再点「忘记」即删除。
- **列表**只显示名称、类型、备注、更新时间——不含内容。
- **查看**：填主密码后原地显示内容，可复制，可收起。
- **新增 / 编辑**：编辑时内容留空即保留原值，只改名称或备注。
- **删除**：需要主密码，二次确认，不可恢复。
- 底部显示保险箱文件路径。

面板和 AI 工具读写同一份文件，改完两边立刻一致。

## 配置（cordis.patch.yml 的 `config`）

```yaml
config:
  path: /absolute/path/to/vault.json            # 可选，默认 $DSH_HOME/profiles/<profile>/vault/vault.json
  passphraseFile: /absolute/path/to/vault.key   # 可选，主密码文件（整份文件内容即密码）
  passphraseEnv: VAULT_PASSPHRASE               # 可选，优先用环境变量
  keyFile: /absolute/path/to/vault.key          # 可选，面板「记住到本机」写这里；默认与 path 同目录
  unlockTimeoutMs: 60000                        # 可选，工具等面板解锁的时长
  scryptN: 16384                                # 可选，scrypt 开销参数（2 的幂）
```

主密码来源优先级：面板输入框 > 面板解锁的内存 > `passphrase_file` 参数 > `passphraseEnv` 环境变量 > `passphraseFile` 文件 > `keyFile`。

配了 `passphraseFile` 之后，面板的主密码可以留空，AI 工具也能直接用同一个文件。

## 工具

| 工具 | 作用 |
| --- | --- |
| `vault_status` | 查看文件路径、是否存在、已存条目名（不含值） |
| `vault_list` | 列出条目名 / kind / label（不含值） |
| `vault_set` | 存入一条凭证（值被加密落盘，不回显） |
| `vault_get` | 按名取出凭证（返回值仅供当次使用，勿写入文件/日志） |
| `vault_delete` | 删除一条凭证 |
| `vault_export` | 导出密文到指定文件（备份 / 换机） |
| `vault_import` | 从导出文件导入并合并（新机可直接接管） |

保险箱锁着时，`vault_set` / `vault_get` / `vault_delete` / `vault_import` 不会立刻失败：它们会等你，你在面板点「解锁」后自动继续，最多等一分钟。

## 换机流程

1. 旧机：`vault_export(file="/storage/emulated/0/Download/vault.vault")`。
2. 把 `vault.vault` 传到新机（密文，随便传都安全）。
3. 新机：`vault_import(file="...", passphrase_file="/path/to/vault.key")`，主密码与导出时一致即可。

## 安全建议

- 主密码文件尽量放在应用私有目录，与保险箱文件分开存放。
- 主密码别和导出文件一起放在云同步目录。
- `vault_get` 返回值只在当次命令里使用，不要 `echo`、不要写进提交记录。
- 面板里看到内容时别截图分享。
