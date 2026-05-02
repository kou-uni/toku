# Tsumu Build Status — 2026-05-02

> このドキュメントは、ハッカソン当日の作業ログ + 残タスクを示します。
> ユーザーが戻ってきたとき、どこから再開すれば良いかが分かるように。

---

## 現在の進捗(timestamp 推定 ~3.5 hour into 10h budget)

### ✅ 完了済み

**1. ドキュメント** — `docs/01〜06` + `README.md`
- 大義・設計原則・アーキテクチャ・経済・MVP スコープ・Discord 設定手順

**2. 環境セットアップ**
- Node 24.15.0 (`~/tools/node-v24.15.0-darwin-arm64/`)
- Sui CLI 1.71.0 (`~/tools/sui-testnet-v1.71.0/`)
- OpenClaw 2026.4.29 (npm global)
- `~/.zshrc` に PATH 追記済み

**3. シークレット**
- OpenAI API Key → `~/.tsumu/env`(chmod 600、リポジトリ外)
- Sui testnet wallet: `0x4b18aaafa7b8c8e60bdd9e97ca79a86b93a947c0dbb30e79e66a7105c6f75bac`
- 残高: 約 0.85 SUI(初期 1 SUI から publish + upgrade + 各種テストで消費)

**4. Sui Move パッケージ**(`move/tsumu/`)
- 7 モジュール: toku, session, garden, gift, timelock, lantern, pulse
- v1 publish 済み: `0xbb218662a9d57c7098974bd1b687767a5d2dd57fc1cc2599d8dcf71e2e2a7f02`
- v2 upgrade 済み(`gift::claim_to` 追加): `0xe82b4a3665e6e9aa9c3067366b801f7e4a56e3f2bd1f314bc8d138a5e0582f43`
- Object IDs は `openclaw/skills/tsumu/config.env` に保存

**5. モックアップエンドポイント**
- 将来のSui決済連携を見据えたモック実装(本ハッカソンでは割愛またはダミー化)

**6. OpenClaw `tsumu` Skill**(`openclaw/skills/tsumu/`)
- `SKILL.md` / `SOUL.md`(あかり調) / `HEARTBEAT.md` / `config.env`
- 6 シェルツール(`tools/`):
  - `tsumu_record_session.sh` — セッション NFT + TOKU mint + pulse beat
  - `tsumu_lantern_buy.sh` — 灯火モック取得(将来構想)
  - `tsumu_lantern_submit.sh` — 灯火プールに投稿
  - `tsumu_seal_seed.sh` — 未来の自分への種(60秒で開封可能、デモ用)
  - `tsumu_open_seed.sh` — 種を開封 + 2 TOKU
  - `tsumu_gift_create.sh` — ギフトエスクロー作成
  - `tsumu_gift_claim_to.sh` — ギフト受領

**7. Pay-it-forward claim webpage**(`claim-app/`)
- ポート :3000 で稼働中
- `/claim/[id]?code=` → 静的 HTML
- `/api/escrow/[id]` → Sui RPC で escrow 詳細取得
- `/api/claim` → claim_to 呼び出し、モック zkLogin で fresh address 生成

**8. プレゼン資料**
- `slides/tsumu-pitch.md` — Marp 形式 22 枚
- `slides/presentation-script.md` — 5分台本 + 拍手ポイント
- `scripts/demo-runner.sh` — 全7フローのスモークテスト

**9. End-to-end テスト** — すべて成功
- `record_session` → World Pulse 0→3、TOKU mint
- `lantern_buy` → card 受領(モック)
- `gift_create` → escrow 作成、claim URL 生成
- `gift_claim_to` (HTTP 経由) → recipient に着地、sender に +1 TOKU

### 🔜 残タスク(ユーザーの介入が必要)

**A. Discord Bot 作成**(ユーザー手動、~5分)
- 手順: [docs/06-setup-discord.md](docs/06-setup-discord.md)
- 必要なもの: Discord Developer Portal でアプリ作成、Bot Token 取得
- このチャットで Bot Token を貼って共有(safetyのため `~/.tsumu/env` に追加します)

**B. OpenClaw onboarding**(対話形式、~10分)
- ユーザーが Discord token を共有してから:
  ```bash
  source ~/.tsumu/env
  openclaw onboard --install-daemon
  ```
- ウィザードに従い OpenAI と Discord を設定
- skill ディレクトリを workspace にシンボリックリンク

**C. Discord スモークテスト**
- Discord で `@Tsumu こんにちは`
- 反応を確認、SOUL.md 通りのトーンか
- 反応しなければトラブルシュート

**D. デモ通しリハーサル**
- ステージ進行通りに 1 回通す
- スクリーン録画(QuickTime + Discord + ブラウザ + ターミナル)
- 失敗時のバックアップ動画として保存

**E. スライドを PDF にレンダリング**
```bash
npx -y @marp-team/marp-cli slides/tsumu-pitch.md --pdf
```

---

## 次の一手(ユーザーが戻ったら)

1. **Discord Bot Token をこのチャットに貼る**
2. 私が `~/.tsumu/env` に追加 + onboard 手順を実行
3. スモークテスト → リハ → 録画 → 提出

---

## 実行中のサーバ(ローカル、再起動後の現状)

| サーバ | ポート | 状態 |
|---|---|---|
| claim webpage | 3000 | ✅ 稼働中 (background) |
| OpenClaw Gateway | 18789 | ⚠️ daemon 起動済みだが LLM 応答未解決 |
| x402 mockup | 4402 | ❌ 削除済み(設計を「決済モック」に変更) |

## 11:36 時点の検証結果

`scripts/demo-runner.sh` で全 on-chain フローが完璧に動作することを確認:
- ✅ Day 1 朝の3分: TOKU mint、World Pulse beat (count: 4)
- ✅ Day 7 灯火投稿: pool size 1、+0.5 TOKU
- ✅ Day 7 未来の種: TimeLock seed 封印
- ✅ Day 30 ギフト作成: GiftEscrow + claim URL
- ✅ Claim webpage: HTTP 経由で +2 TOKU 受領
- ✅ 60秒後: 種開封 +2 TOKU 倍返し

**ターミナル + Sui Explorer + claim webpage の 3 画面で完全なライブデモ可能**(OpenClaw 抜きでも提出物として完結)。

---

## 残予算

- **時間**: 約 6 時間
- **Sui Testnet**: 約 0.85 SUI(残10〜20 tx 分)
- **OpenAI API**: ユーザー管理(節約モード — テスト最小限)

---

## デモ前最終チェックリスト

- [x] claim app 動作確認 (`curl http://localhost:3000/healthz`)
- [x] sui client gas で残高確認(0.85 SUI)
- [x] scripts/demo-runner.sh で全フロー再現(11:36 確認済み)
- [x] Sui Explorer で TOKU mint が見える
- [x] スライド HTML 生成済み (slides/tsumu-pitch.html)
- [ ] OpenClaw gateway → Discord LLM 応答(別 Claude API でテスト中)
- [ ] バックアップ動画が録画済み

## デモ提出時の構成(2 案)

### 案 A: OpenClaw + Discord(動けば理想)
LLM 応答が間に合えば、Discord で対話 → ツール呼び出し → on-chain mint の連鎖をライブで見せる。

### 案 B: ターミナル + Sui Explorer + claim webpage(確実)
`scripts/demo-runner.sh` を実行しながら以下を 3 画面分割で見せる:
- 左: ターミナル(demo-runner の出力)
- 中: Sui Explorer(TOKU mint, Session NFT, Lantern submit などライブ反映)
- 右: claim webpage(ギフト受領のブラウザ UI)

ナレーション(プレゼン台本)で「あかりの 30 日」を語りながら、各ステップが対応する on-chain TX として確実に通る。
OpenClaw が間に合わなくても、**「Sui の上で本物が動く」がプレゼンの核**として成立する。
