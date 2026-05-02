# 10. セッション活動ログ(2026-05-02 17:00–17:50)

> [09 活動ログ](09-activity-log-2026-05-02-pm.md)に続く、本セッション固有の細粒度ログ。
> アーキテクチャ俯瞰図の作成 / toku-site への CTA 設置 / デモ動画用 claim URL 発行に焦点。

---

## TL;DR

1. **アーキテクチャ俯瞰図を作成**(課題 → Tsumu → OpenClaw × Sui の二本柱 → 集合徳の三輪)
2. **toku-site のトップに「📐 アーキテクチャ」リンクを設置** → Vercel に push 済 / 反映確認済
3. **Marp 版 pitch deck の「アーキテクチャ」スライドからも同ページへ連結**
4. **PNG 版(2356×3192)を `docs/architecture.png` に出力**(Mermaid CLI 経由)
5. **デモ動画用の claim URL を 1 件発行**(Sui Testnet にギフト escrow オンチェーン作成)

---

## 1. アーキテクチャ俯瞰図の作成

ハッカソン審査員 / akindo 提出者が一目で「Tsumu が何で、なぜ Sui と OpenClaw でなければならないか」を掴める一枚絵を作成。

### 設計方針(縦 4 段の俯瞰)

| 段 | 内容 |
|---|---|
| 🌍 課題(Why Now) | AI が代わりに考える時代 = 自分の輪郭が消える / Agent Fatigue |
| ⭐ Tsumu | 1 日 3 分の対話で『徳』を Sui に積むエージェント |
| ⚡ 二本柱 | **OpenClaw が担う『体験』**(対話・声・時間)× **Sui が担う『所有』**(永続・透明・移転可能) |
| 🪷 集合徳の三輪 | 個(坐の庭)→ 対(灯火プール)→ 集合(Tide DAO 寄付)|

### 成果物

| ファイル | 用途 | 状態 |
|---|---|---|
| `docs/architecture.html` | Mermaid をブラウザ描画する一枚もの HTML(Vercel 配信) | ✓ コミット済 |
| `docs/architecture.mmd` | Mermaid ソース(再生成・編集用) | ✓ 本セッションで保存 |
| `slides/architecture.html` | Marp pitch から呼び出す予備配置(slides/ は Vercel 配信外、ローカルプレビュー用) | gitignore 配下 |
| `docs/architecture.png` | 一度生成したが未コミット | 必要なら下記コマンドで再生成 |

### PNG 再生成手順

```bash
npx -y -p @mermaid-js/mermaid-cli mmdc \
  -i docs/architecture.mmd \
  -o docs/architecture.png \
  -w 2400 -H 1600 -s 2 --backgroundColor white
```

サイズ感の目安: 2356×3192px、約 450KB。プレゼン埋め込み・SNS 共有・印刷向け。

---

## 2. toku-site トップに「アーキテクチャ」リンク

`docs/index.html`(Vercel 配信中の 8 枚スライド)の右上に、全スライド共通で見える固定 CTA を設置。

### 仕様

- 位置: 右上 `top: 22px; right: 28px;`(z-index: 60)
- ライト/ダーク両スライドに対応(`body:has(.slide.dark.active)` で背景反転)
- ホバーで gold 反転 + 矢印が右にスライド
- クリックで `architecture.html` を **新規タブ**で開く(プレゼン中の事故防止)

### 反映済 URL

- https://toku-site.vercel.app/(右上に「📐 アーキテクチャ →」)
- https://toku-site.vercel.app/architecture(直接アクセス)

> Marp 版 pitch deck からも同 HTML へリンク済([slides/tsumu-pitch.md:413](../slides/tsumu-pitch.md#L413))。

### コミット

```
45e8cf0 docs(site): add architecture overview page + top-right link
  - docs/architecture.html
  - docs/index.html(右上リンク + CSS)
  - slides/tsumu-pitch.md(Marp 版アーキテクチャスライドにリンク追加)
```

---

## 3. デモ動画用 claim URL(オンチェーン escrow 発行)

「友達から紹介してもらった」状況をデモで再現するため、Sui Testnet に gift escrow を 1 件作成。

### 発行された URL

```
https://tsumu-claim.vercel.app/claim/0xba865c0ad8b1b0f9298f066ed08bd3b99464c0a0bb5b1d0b911c4c3131a3b9c7?code=DD57B9705ACC4653
```

| 項目 | 値 |
|---|---|
| escrow ID | `0xba865c0ad8b1b0f9298f066ed08bd3b99464c0a0bb5b1d0b911c4c3131a3b9c7` |
| gift tx | `DnsAGJCYmvgjDJnbhTBya5LSf8WpQ281sRyu1fJeDFdn` |
| 金額 | 1 TOKU |
| メッセージ | 「あかり、これ向いてる気がする。1 TOKU あげたから受け取って」 |
| sender | `0x4b18aaafa7b8c8e60bdd9e97ca79a86b93a947c0dbb30e79e66a7105c6f75bac`(agent address) |

### ⚠️ 注意

- **一回しか claim できない**(`gift::claim_to` は escrow を消費)
- 本番デモで使うなら録画用に別 URL を発行すること
- 発行コマンド: `CLAIM_BASE_URL="https://tsumu-claim.vercel.app" bash openclaw/skills/tsumu/tools/tsumu_gift_create.sh 1.0 "<note>"`

---

## 4. ユーザー追加分(linter note 経由で観測)

セッション後半、ユーザーが `docs/index.html` に **デモ動画スライド(slide 0)** を追加した模様。
このセッションの作業範囲には含めなかったが、CSS の `.demo-slide` クラスが追記されている。

> Tsumu のデモ動画を最初に大きく見せる構成にしたと思われる。詳細は [docs/index.html](./index.html) を参照。

---

## 5. 残タスク / 次の一手

| タスク | 状態 |
|---|---|
| akindo 提出文の作成 | 未着手(本セッション開始時の元の依頼)|
| デモ動画の収録 | 進行中(URL 発行完了) |
| アーキテクチャ図の英訳版 | 必要なら依頼 |
| 「将来構想」を分けたシンプル版 PNG | 必要なら依頼 |

> akindo の提出フォーム項目(Tagline / Description / Demo URL …)が分かれば、ペルソナ + 大義 + 三輪を文字数別に最適化したドラフトを書く。
