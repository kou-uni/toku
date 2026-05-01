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

**5. x402 / AP2 mockup サーバ**(`x402-server/`)
- ポート :4402 で稼働中
- `GET /api/lantern` が 402 → 200 dance、AP2 Mandate 三段含む
- AP2 IntentMandate / CartMandate / PaymentMandate 構造化済み

**6. OpenClaw `tsumu` Skill**(`openclaw/skills/tsumu/`)
- `SKILL.md` / `SOUL.md`(あかり調) / `HEARTBEAT.md` / `config.env`
- 6 シェルツール(`tools/`):
  - `tsumu_record_session.sh` — セッション NFT + TOKU mint + pulse beat
  - `tsumu_lantern_buy.sh` — x402 dance
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
- `lantern_buy` → 402→200 dance、card 受領
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

## 実行中のサーバ(ローカル)

| サーバ | ポート | 状態 |
|---|---|---|
| x402 mockup | 4402 | ✅ 稼働中 (background) |
| claim webpage | 3000 | ✅ 稼働中 (background) |
| OpenClaw Gateway | 18789 | ⏳ 未起動(onboard 後) |

---

## 残予算

- **時間**: 約 6 時間
- **Sui Testnet**: 約 0.85 SUI(残10〜20 tx 分)
- **OpenAI API**: ユーザー管理(節約モード — テスト最小限)

---

## デモ前最終チェックリスト

```
[ ] x402 server 動作確認 (curl http://localhost:4402/)
[ ] claim app 動作確認 (curl http://localhost:3000/healthz)
[ ] sui client gas で残高確認
[ ] OpenClaw gateway 起動確認 (openclaw gateway status)
[ ] Discord で @Tsumu hello → 反応する
[ ] scripts/demo-runner.sh で全フロー再現
[ ] Sui Explorer で TOKU mint が見える
[ ] スライド PDF が出力されている
[ ] バックアップ動画が録画済み
```
