/// Gift — pay-it-forward TOKU escrow with claim code.
///
/// A sender locks TOKU into a GiftEscrow object with a claim code. The
/// recipient (who may not yet have a wallet) receives a link, signs in
/// with Google via zkLogin, and the claim webpage calls `claim` with the
/// matching code to release the TOKU into the recipient's new wallet.
module tsumu::gift;

use std::string::String;
use sui::coin::Coin;
use sui::balance::{Self, Balance};
use tsumu::toku::TOKU;

const ECodeMismatch: u64 = 1;
const EAlreadyClaimed: u64 = 2;

public struct GiftEscrow has key {
    id: UID,
    sender: address,
    amount: Balance<TOKU>,
    claim_code_hash: vector<u8>,
    note: String,
    created_at_ms: u64,
    claimed: bool,
}

public struct GiftCreated has copy, drop {
    escrow_id: ID,
    sender: address,
    amount: u64,
    timestamp_ms: u64,
}

public struct GiftClaimed has copy, drop {
    escrow_id: ID,
    sender: address,
    recipient: address,
    amount: u64,
    timestamp_ms: u64,
}

/// Sender locks TOKU into a shared escrow with a hashed claim code.
/// The plain code is shared with the recipient via the claim link.
public fun create(
    coin: Coin<TOKU>,
    claim_code_hash: vector<u8>,
    note: String,
    clock: &sui::clock::Clock,
    ctx: &mut TxContext,
) {
    let now = sui::clock::timestamp_ms(clock);
    let amount_u64 = sui::coin::value(&coin);
    let escrow = GiftEscrow {
        id: object::new(ctx),
        sender: ctx.sender(),
        amount: sui::coin::into_balance(coin),
        claim_code_hash,
        note,
        created_at_ms: now,
        claimed: false,
    };

    sui::event::emit(GiftCreated {
        escrow_id: object::id(&escrow),
        sender: ctx.sender(),
        amount: amount_u64,
        timestamp_ms: now,
    });

    transfer::share_object(escrow);
}

/// Recipient claims the gift by presenting the matching code.
public fun claim(
    escrow: &mut GiftEscrow,
    presented_code_hash: vector<u8>,
    clock: &sui::clock::Clock,
    ctx: &mut TxContext,
) {
    assert!(!escrow.claimed, EAlreadyClaimed);
    assert!(escrow.claim_code_hash == presented_code_hash, ECodeMismatch);

    escrow.claimed = true;
    let amount = balance::value(&escrow.amount);
    let coin = sui::coin::from_balance(balance::withdraw_all(&mut escrow.amount), ctx);

    sui::event::emit(GiftClaimed {
        escrow_id: object::id(escrow),
        sender: escrow.sender,
        recipient: ctx.sender(),
        amount,
        timestamp_ms: sui::clock::timestamp_ms(clock),
    });

    transfer::public_transfer(coin, ctx.sender());
}

public fun is_claimed(e: &GiftEscrow): bool { e.claimed }
public fun sender(e: &GiftEscrow): address { e.sender }
