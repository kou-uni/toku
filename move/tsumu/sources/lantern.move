/// Lantern — the anonymous wisdom pool.
///
/// Users submit their reflections anonymously (the author address is
/// stored but never displayed). Other users, when they need a moment of
/// support, draw a card via the agent (which pays via x402 mockup) and
/// receive a stranger's words. The original author then receives a TOKU
/// reward when their card is drawn — closing the loop of "your words
/// became someone's lantern".
module tsumu::lantern;

use std::string::String;

const EEmptyPool: u64 = 1;

public struct LanternCard has store, copy, drop {
    author: address,
    text: String,
    submitted_at_ms: u64,
    times_drawn: u64,
}

/// Shared object: the global pool of all anonymous reflections.
public struct LanternPool has key {
    id: UID,
    cards: vector<LanternCard>,
    total_submitted: u64,
    total_drawn: u64,
}

public struct LanternSubmitted has copy, drop {
    pool_id: ID,
    author: address,
    submitted_at_ms: u64,
    pool_size: u64,
}

public struct LanternDrawn has copy, drop {
    pool_id: ID,
    drawn_for: address,
    original_author: address,
    drawn_at_ms: u64,
}

/// Initialize the global pool. Called once at publish time.
fun init(ctx: &mut TxContext) {
    transfer::share_object(LanternPool {
        id: object::new(ctx),
        cards: vector[],
        total_submitted: 0,
        total_drawn: 0,
    });
}

/// Submit a reflection. The author's address is recorded for reward
/// distribution but never returned by `draw`.
public fun submit(
    pool: &mut LanternPool,
    text: String,
    clock: &sui::clock::Clock,
    ctx: &mut TxContext,
) {
    let now = sui::clock::timestamp_ms(clock);
    let card = LanternCard {
        author: ctx.sender(),
        text,
        submitted_at_ms: now,
        times_drawn: 0,
    };
    vector::push_back(&mut pool.cards, card);
    pool.total_submitted = pool.total_submitted + 1;

    sui::event::emit(LanternSubmitted {
        pool_id: object::id(pool),
        author: ctx.sender(),
        submitted_at_ms: now,
        pool_size: vector::length(&pool.cards),
    });
}

/// Draw a card for `drawn_for`. The seed is provided externally (the agent
/// derives it from a tx hash or randomness); the index is `seed % len`.
/// Returns the text and the original author, so the agent can: (1) display
/// the text to the requester, (2) reward the original author with TOKU.
public fun draw(
    pool: &mut LanternPool,
    drawn_for: address,
    seed: u64,
    clock: &sui::clock::Clock,
): (String, address) {
    let len = vector::length(&pool.cards);
    assert!(len > 0, EEmptyPool);

    let idx = seed % len;
    let card_ref = vector::borrow_mut(&mut pool.cards, idx);
    card_ref.times_drawn = card_ref.times_drawn + 1;
    let text = card_ref.text;
    let author = card_ref.author;

    pool.total_drawn = pool.total_drawn + 1;

    sui::event::emit(LanternDrawn {
        pool_id: object::id(pool),
        drawn_for,
        original_author: author,
        drawn_at_ms: sui::clock::timestamp_ms(clock),
    });

    (text, author)
}

public fun pool_size(pool: &LanternPool): u64 { vector::length(&pool.cards) }
public fun total_submitted(pool: &LanternPool): u64 { pool.total_submitted }
public fun total_drawn(pool: &LanternPool): u64 { pool.total_drawn }
