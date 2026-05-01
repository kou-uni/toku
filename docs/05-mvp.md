# 05. 12時間 MVP スコープとデモ脚本

> このドキュメントは、ハッカソン提出までの 12 時間で、何を実装し、何をモックにし、何を構想語りに留めるかの境界を引きます。
> ここに書いていないものは、12時間内では実装しません。

---

## スコープの三層

| 層 | 定義 | 内訳 |
|---|---|---|
| **実装(動く)** | デモで実際に動かす | コアフロー全部 |
| **モック(見せかけ)** | UI / 画像 / スクショで再現 | 庭の進化、四半期レポート、夜空 |
| **構想(語る)** | スライドで概念を提示 | DAO 投票、研究提携、LINE展開 |

---

## 実装する(デモで動かす)

### Move package(Sui Testnet)
- ✅ `toku.move` ── TOKU coin、mint、Decay 関数(動作確認のみ)
- ✅ `session.move` ── Session NFT 作成
- ✅ `garden.move` ── Garden object、touch関数(レベル管理のみ)
- ✅ `gift.move` ── Pay-forward escrow、claim 関数
- ✅ `timelock.move` ── 未来の種(7日後 ── デモでは 60秒に短縮)
- ✅ `lantern.move` ── 灯火プール、submit と draw

### OpenClaw + tsumu Skill
- ✅ OpenClaw Gateway がローカルで起動、Telegram 接続
- ✅ `SOUL.md` 完成(あかり対応のトーン)
- ✅ `HEARTBEAT.md` で朝の声がけ実装
- ✅ `tools.json` で Sui mint / x402 fetch / world pulse を呼ぶ
- ✅ 3分セッションの prompt template

### Claim Webpage(Next.js)
- ✅ `/claim/[id]` ページ
- ✅ Google login → zkLogin → ウォレット作成
- ✅ Sponsored Tx で gift escrow を claim

### x402 / AP2 Mockup
- ✅ Express + `@x402/express` mockup ファシリテーター
- ✅ `GET /api/lantern` が 402 → payment → LanternCard を返す
- ✅ AP2 Mandate object を Sui に記録(最低限)

### Sangha レイヤー
- ✅ World Pulse counter(Sui shared object に increment)
- ✅ 縁通知(セッション末、5回に1回程度)

---

## モック(スクショ・画像で見せる)

| 項目 | 表現 |
|---|---|
| Garden の Day 1 → 30 → 100 → 365 進化 | SVG または Midjourney 画像 4枚 |
| 灯火の夜空 | 静止画(後でアニメ化可) |
| Tsumu Tide 四半期レポート | Telegram スクショ、架空数字 |
| LINE 対応 | 「OpenClaw が標準対応」とスライド明記 |
| 集合徳 → DAO 寄付フロー | 概念図 1枚 |

---

## 構想として語るのみ(スライド)

- 寄付候補との実際の提携
- 研究機関との reflection データ提供契約
- 物理デバイス(NFC お守り)
- 多言語展開
- TOKU のクロスチェーン橋渡し
- 灯火の機械翻訳によるグローバル流通

---

## 12時間タイムライン

| Hour | タスク | 完了基準 |
|---|---|---|
| **0:00 - 1:00** | OpenClaw + Telegram 接続、Sui Skill 導入 | Telegram で「Hello」が返る |
| **1:00 - 1:30** | x402 mockup endpoint scaffold | 402 → 200 の dance が curl で通る |
| **1:30 - 4:00** | Move package 実装・testnet publish | Package ID 取得、TOKU mint テスト通過 |
| **4:00 - 6:30** | tsumu Skill (SOUL.md + 3min prompt + tools.json) | Telegram で 3分セッションが完走 |
| **6:30 - 7:30** | Pay-it-forward(escrow + claim Next.js + zkLogin) | リンクから Google login → TOKU 受領が通る |
| **7:30 - 8:30** | Sangha レイヤー(World Pulse + 縁通知) | セッション末に「N人」が表示される |
| **8:30 - 9:30** | A2A demo 設定(Discord 2 instance) | 2エージェントの会話が見える |
| **9:30 - 10:30** | 通しリハ + 録画(失敗時の保険) | 5分通しのテイクが録画済み |
| **10:30 - 12:00** | スライド + 台本 + 提出資料 | Demo Day pitch deck 完成 |

### リスク順に潰す原則
**Hour 0 と 1:30 が最大リスク区間**:
- OpenClaw が macOS 25.4 で動かなければ、その時点で plan B(自前 Telegram bot + LangGraph 等)に切替判断
- x402 dance が3.5h以内に通らなければ、完全モックに切替

---

## デモ脚本(5分、ライブ)

### 画面分割
```
左:Telegram(ユーザー視点)
中:Sui Explorer(オンチェーン同期表示)
右:スライド(語りの補助)
```

### 進行

```
[00:00] 黒画面に文字
        「AIが考える時代に、あなたを考える時間が消えています」
        (3秒沈黙)

[00:15] あかりの自己紹介(20秒)
        スライド: 写真+1人称
        「Insta やめたばっかり。瞑想も自信ないし。
         クリプトとか、わからん」

[00:35] Day 0: 健司から TOKU をギフト
        Discord でメッセージ受信 → リンク → Google login → ウォレット完成
        ナレーション「彼女は今、Sui を持った。気づかないまま」

[01:00] Day 1: 朝の3分(圧縮版)
        Telegram で「重い」→ 3分セッション(30秒に圧縮)
        Sui Explorer に TOKU mint 反映(拍手ポイント①)
        「+1 TOKU。今、世界で 12人と立ちました」← Sangha 演出

[01:45] Day 3: 灯火を1枚受け取る(x402 mockup の見せ場)
        HTTP 402 dance を文字スーパーで可視化
        「ある人からの言葉です」+ カード演出

[02:30] Day 14: 自分の言葉が誰かを支えた(感情ピーク)
        通知:「あなたが流した言葉が、京都で誰かを灯しました」
        +1.5 TOKU の還流
        観客に問いかけ:
        「あなたの言葉が、知らない誰かの朝になる。
         どんな気持ちですか?」

[03:00] Day 30: あかりが友達に渡す(観客参加)
        会場の1人を指名、QR読み取り → ステージで実演
        Google login → 受領 → 拍手ポイント②

[03:45] スケール: 集合徳の三輪
        スライド: 「個 → 二人 → 社会」の同心円アニメ
        Tide 四半期レポートのモック表示
        「12,438人」「$9,340」「子ども食堂へ」
        「あかりさんの 47回が、ここに、確かに、ありました」(感情ピーク②)

[04:15] 技術整合性(30秒)
        スライド: zkLogin / Sponsored Tx / TimeLock / x402 / AP2
        「Sui は AP2 の launch partner、Tsumu はその哲学に乗ります」

[04:45] 締め
        黒画面に文字
        「加速器を作った者は、ブレーキも作る。
         Tsumu は、AI時代のブレーキです」
```

---

## バックアップ計画

| 失敗ケース | プラン B |
|---|---|
| OpenClaw が起動しない | 自前 Telegram bot + Anthropic SDK 直叩き |
| x402 dance が通らない | サーバ側を完全モック化、HTTP の表示だけ残す |
| zkLogin の onboarding が失敗 | claim ページを「すでに claim 済み」に偽装した状態を見せる |
| Sui Testnet がダウン | 録画したデモを流す |
| Telegram API が遅い | デモ前に warming session を済ませておく |

**録画**: 9:30 から 1 時間で、5分の通しデモを最低 3 テイク録画しておく。
最低保証は録画があること。**ライブで通れば加点、通らなくても提出は完成**。

---

## 提出物

- [ ] GitHub リポジトリ(public、 README + docs/ + 実装コード)
- [ ] デモ動画(5分、録画版を保険として)
- [ ] スライド(PDF / Keynote)
- [ ] ピッチデック(技術評価向けの追加資料)
- [ ] Sui Testnet の Package ID と Garden Object ID(主要オブジェクトのリンク)

---

## 完了基準(Definition of Done)

ハッカソン提出時点で、最低以下が動く必要がある:

1. ✅ Telegram で Tsumu に話しかけると、3分セッションが完走する
2. ✅ セッション後、Sui Explorer で TOKU mint が確認できる
3. ✅ ペイフォワード送付 → claim ページ → Google login → 新ウォレット作成、が一通り通る
4. ✅ x402 endpoint が 402 を返し、payment後に LanternCard を返す
5. ✅ World Pulse 「今、N人と立ちました」がセッション末に出る
6. ✅ 録画版の5分デモが、ライブ失敗時の保険として用意されている

これらが揃わない場合、提出を遅らせるか、機能を削減する。
**最後まで実装を膨らませない、を優先する**。
