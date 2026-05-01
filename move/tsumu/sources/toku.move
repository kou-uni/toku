/// TOKU — the virtue token of Tsumu.
///
/// Issued only by the Tsumu agent (TreasuryCap holder) when a user completes
/// a reflection (a session, a lantern submission, a future-seed opening, a
/// pay-forward gift). Designed to decay slowly when held without practice,
/// rewarding circulation over hoarding.
module tsumu::toku;

use sui::coin::{Self, Coin, TreasuryCap};
use sui::url;

/// One-time witness for the TOKU coin.
public struct TOKU has drop {}

/// Holder of the mint authority. Created at publish, transferred to the
/// publisher (the Tsumu agent's Sui address). The agent uses this cap to
/// mint TOKU when an attestation event occurs (session completion, lantern
/// submission, seed opening, gift sent).
public struct MintAuthority has key, store {
    id: UID,
    cap: TreasuryCap<TOKU>,
}

/// Emitted whenever TOKU is minted, with the reason and recipient.
public struct TokuMinted has copy, drop {
    recipient: address,
    amount: u64,
    reason: vector<u8>,
    timestamp_ms: u64,
}

fun init(witness: TOKU, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness,
        9,
        b"TOKU",
        b"Tsumu Toku",
        b"Virtue accumulated through reflection on the Tsumu meditation network.",
        option::some(url::new_unsafe_from_bytes(b"https://github.com/kou-uni/toku")),
        ctx,
    );
    transfer::public_freeze_object(metadata);

    let authority = MintAuthority {
        id: object::new(ctx),
        cap: treasury,
    };
    transfer::transfer(authority, ctx.sender());
}

/// Mint TOKU to a recipient with a reason string. Only the holder of the
/// MintAuthority object (the agent) can call this.
public fun mint_to(
    authority: &mut MintAuthority,
    amount: u64,
    recipient: address,
    reason: vector<u8>,
    clock: &sui::clock::Clock,
    ctx: &mut TxContext,
) {
    let coin = coin::mint(&mut authority.cap, amount, ctx);
    transfer::public_transfer(coin, recipient);

    sui::event::emit(TokuMinted {
        recipient,
        amount,
        reason,
        timestamp_ms: sui::clock::timestamp_ms(clock),
    });
}

/// Burn TOKU. Used by decay logic and by the Tide donation flow.
public fun burn(authority: &mut MintAuthority, coin: Coin<TOKU>) {
    coin::burn(&mut authority.cap, coin);
}
