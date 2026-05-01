# 03. 技術アーキテクチャ

> このドキュメントは、Tsumu を技術的にどう実装するかの全体像を示します。
> ハッカソン審査員の技術評価、および将来の貢献者の参照のためのものです。

---

## 全体構成図

```
┌──────────────────────────────────────────────────────┐
│  ユーザー (Telegram でメッセージするだけ)               │
└───────────────────────┬──────────────────────────────┘
                        │ Channel Adapter (grammY)
            ┌───────────▼────────────┐
            │   OpenClaw Gateway     │  ← localhost で常駐
            │  (ReAct loop + Memory) │
            │  Backend LLM: Claude   │
            └───────────┬────────────┘
                        │
        ┌───────────────┼─────────────────┐
        ▼               ▼                 ▼
   [tsumu Skill]  [sui-agent-wallet]  [x402-pay tool]
   SOUL.md         (Suimate公式)      (Mockup, AP2 aligned)
   HEARTBEAT.md    agent ウォレット    402 dance
   tools.json
        │               │                 │
        │               ▼                 │
        │         ┌──────────────────┐    │
        └────────▶│  Sui Testnet     │◀───┘ (mint trigger)
                  │                  │
                  │  Move Modules:   │
                  │  ─ toku.move     │  TOKU coin (Decay付)
                  │  ─ session.move  │  Session NFT
                  │  ─ garden.move   │  個人の坐の庭
                  │  ─ gift.move     │  Pay-it-forward escrow
                  │  ─ timelock.move │  未来の自分への種
                  │  ─ lantern.move  │  灯火プール
                  │  ─ tide.move     │  寄付プール
                  └─────────┬────────┘
                            │
                            │ zkLogin claim
            ┌───────────────▼────────────┐
            │  claim webpage (Next.js)    │
            │  /claim/[id] → Google login │
            │  → ウォレット自動作成       │
            └────────────────────────────┘
```

---

## レイヤー別の説明

### Layer 1: ユーザー接点(Telegram)

- ユーザーは Telegram bot に話しかけるだけ
- アプリのインストール不要
- 将来 LINE 対応(OpenClaw が標準でサポート)

**実装**: Telegram Bot API + grammY adapter

### Layer 2: OpenClaw Gateway(オーケストレーション)

- macOS / Linux 上で localhost 常駐(systemd / LaunchAgent)
- Telegram からのメッセージを受け、ReAct loop で LLM に渡す
- Skills と Tools を Markdown / JSON で管理
- Heartbeat により30分毎に proactive な会話を提供

**実装**: OpenClaw 公式リポジトリ(https://github.com/openclaw/openclaw)

**設定ファイル**:
- `openclaw.json` ── プロバイダ・チャネル・workspace 指定
- `~/.openclaw/workspace/SOUL.md` ── 人格
- `~/.openclaw/workspace/MEMORY.md` ── 長期記憶
- `~/.openclaw/workspace/HEARTBEAT.md` ── proactive task

### Layer 3: tsumu Skill(独自人格)

`openclaw/skills/tsumu/` 配下に配置:

```
openclaw/skills/tsumu/
├── SKILL.md       # スキル概要(オンデマンド読込のためのサマリ)
├── SOUL.md        # 人格設計(02-design.md 参照)
├── HEARTBEAT.md   # 朝・夜の声がけパターン
├── tools.json     # 独自ツール定義
└── prompts/       # 瞑想シナリオのテンプレート
    ├── 3min.md
    ├── 5min.md
    └── lantern.md
```

#### tools.json で定義する独自ツール

| ツール | 役割 |
|---|---|
| `start_session` | Sui上に Session NFT object を作成 |
| `record_session` | session 完了、TOKU をmint、Garden を更新 |
| `seal_seed` | 未来の自分への種(TimeLock object) |
| `open_seed` | 7日経過した seed を開封、倍 TOKU |
| `gift_toku` | 他ウォレットへ送金 + claim link 生成 |
| `submit_lantern` | reflection を灯火プールに匿名投稿 |
| `buy_lantern` | x402 で灯火を1枚購入 |
| `world_pulse` | 直近1分間の他ユーザー数を取得 |

### Layer 4: Sui Move Modules

`move/tsumu/sources/` 配下:

#### `toku.move` ── TOKU Coin
```move
module tsumu::toku {
    public struct TOKU has drop {}
    fun init(witness: TOKU, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness, 9, b"TOKU", b"Tsumu Toku",
            b"Virtue accumulated through reflection",
            option::none(), ctx
        );
        // Decay 機構: balance に最終 touch timestamp を持たせる
    }
    public fun mint_with_decay_attestation(...) { ... }
    public fun apply_decay(coin: &mut Coin<TOKU>, clock: &Clock) { ... }
}
```

#### `session.move` ── Session NFT
```move
module tsumu::session {
    public struct Session has key, store {
        id: UID,
        owner: address,
        started_at: u64,
        duration_secs: u64,
        color_before: String,
        color_after: String,
        reflection: String,
    }
}
```

#### `garden.move` ── 個人の坐の庭
```move
module tsumu::garden {
    public struct Garden has key {
        id: UID,
        owner: address,
        level: u8,             // 1=石, 2=苔, 3=池, 4=鯉, 5=桜, 6=四季
        sessions_count: u64,
        first_seated_at: u64,
        last_seated_at: u64,
    }
    public fun touch(garden: &mut Garden, clock: &Clock) { ... }
}
```

#### `gift.move` ── Pay-it-forward Escrow
```move
module tsumu::gift {
    public struct GiftEscrow has key {
        id: UID,
        sender: address,
        amount: Balance<TOKU>,
        claim_code: String,    // ランダム文字列、claim webpage が使用
        created_at: u64,
    }
    public fun claim(escrow: GiftEscrow, code: String, recipient: address, ...) { ... }
}
```

#### `timelock.move` ── 未来の自分への種
```move
module tsumu::timelock {
    public struct Seed has key {
        id: UID,
        author: address,
        message: String,
        unlock_at: u64,        // Sui Clock の値
        bonus_amount: u64,
    }
    public fun open(seed: Seed, clock: &Clock, ...): String { ... }
}
```

#### `lantern.move` ── 灯火プール
```move
module tsumu::lantern {
    public struct LanternPool has key {
        id: UID,
        cards: vector<LanternCard>,
    }
    public struct LanternCard has store, copy, drop {
        author: address,         // 暗号化、表示には使わない
        text: String,
        created_at: u64,
        times_drawn: u64,
    }
    public fun submit(pool: &mut LanternPool, text: String, author: address, ...) { ... }
    public fun draw_random(pool: &LanternPool, ...): LanternCard { ... }
}
```

#### `tide.move` ── 寄付プール
```move
module tsumu::tide {
    public struct TidePool has key {
        id: UID,
        balance_usdc: Balance<USDC>,
        period: u64,             // 四半期番号
        proposals: vector<DonationProposal>,
        votes: Table<address, vector<u8>>,
    }
}
```

### Layer 5: Pay-it-forward Claim Webpage

`claim-app/` 配下、Next.js 単一ページ:

- `pages/claim/[id].tsx` ── ギフトリンクの受け皿
- Google login → zkLogin で salt + ZK proof 生成 → Sui アドレス導出
- `gift::claim` を呼んで escrow の TOKU を新ウォレットに移動
- ガス代は Sponsored Transaction で dApp が肩代わり

**実装ライブラリ**:
- `@mysten/zklogin`
- `@mysten/sui` SDK
- `@mysten/enoki`(Sponsored Tx ファシリテーター候補)

### Layer 6: x402 / AP2 互換 Endpoint(Mockup)

`x402-server/` 配下:

```
x402-server/
├── api/
│   ├── lantern.ts      # GET → 402 → payment → return random LanternCard
│   └── deep-question.ts  # 将来の "智慧の市" 拡張
└── lib/
    ├── ap2-mandate.ts  # Intent/Cart/Payment Mandate の構造体
    └── facilitator.ts  # mock verification
```

#### 重要: x402 を Sui で純正実装する代わりに、AP2 互換の薄い実装を行う

理由:
- Sui ネイティブの x402 facilitator はまだ整備されていない(2026-05時点)
- Sui は Google × Mysten の **AP2 (Agent Payments Protocol)** の launch partner
- AP2 の `Intent / Cart / Payment Mandate` 三段署名は Sui の object model と相性が良い
- 将来 Sui Payment Kit と差し替え可能な構造で実装

#### AP2 Mandate のコンセプト実装

```typescript
type IntentMandate = {
  user: SuiAddress,
  intent: "buy_lantern",
  signature: string,
};

type CartMandate = {
  intent_ref: ObjectID,
  items: [{ kind: "lantern_card", count: 1 }],
  price: { amount: "0.05", currency: "USDC" },
  signature: string,
};

type PaymentMandate = {
  cart_ref: ObjectID,
  scheme: "x402-compat",
  network: "sui-testnet",
  payer: SuiAddress,
  payee: SuiAddress,
  signature: string,
};
```

→ 3つの Mandate が Sui object として存在し、それぞれが署名を持つ。
→ プレゼンで "AP2 をオンチェーン実装" と言える。

---

## データフロー: 朝の3分セッション

```
1. [Heartbeat] 7:00 に発火
2. OpenClaw が tsumu Skill の HEARTBEAT.md を評価
3. Telegram 経由でユーザーに「おはよう、心は何色?」
4. ユーザーが「重い」と返信
5. tsumu Skill の prompts/3min.md を読み込み、対話開始
6. 3分後、`record_session` tool を呼ぶ
   ├─ Session NFT object を作成 (Sui)
   ├─ TOKU を 1 枚 mint (Sui)
   ├─ Garden の touch (Sui)
   └─ World Pulse counter を increment (Sui)
7. World Pulse の値を取得して "今、47人と立ちました" を Telegram に送信
8. (確率的に) 縁通知を発火
```

---

## ローカル開発環境

### 必要ツール
- macOS 25.4(動作確認済み)
- Node.js 20+
- Sui CLI(`brew install sui` または `cargo install --git https://github.com/MystenLabs/sui.git --tag testnet sui`)
- OpenClaw(`pnpm i -g openclaw` ── 仮)
- Telegram Bot Token(@BotFather から取得)
- Anthropic API Key(または OpenAI)

### 起動順序
```bash
# 1. Sui Testnet にウォレット準備、faucet で gas 取得
sui client switch --env testnet
sui client faucet

# 2. Move package を publish
cd move/tsumu && sui client publish

# 3. x402 server 起動
cd x402-server && pnpm dev

# 4. claim app 起動
cd claim-app && pnpm dev

# 5. ngrok で claim app を公開(必要な場合)
ngrok http 3000

# 6. OpenClaw Gateway 起動
openclaw start --config openclaw/openclaw.json
```

---

## セキュリティ・プライバシー

- **reflection の匿名性**: 灯火プールに投稿された reflection は author を暗号化
- **secret 管理**: API keys は `.env`(.gitignore 済み)
- **Sponsored Tx の悪用防止**: 1 ユーザー1日あたりのトランザクション上限を設定
- **panic exit**: 「やめる」キーワードで即セッション終了、ログにペナルティを残さない
