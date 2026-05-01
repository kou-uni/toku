/// TimeLock — "未来の自分への種" (a seed sealed for one's future self).
///
/// During a reflection session, the user writes a short message to their
/// future self. The Seed locks for `unlock_at_ms`, after which the agent
/// can open it and surface the message back to the user along with bonus
/// TOKU. This is the "Mirai-no-Tane" mechanic; the bonus rewards the
/// user's commitment to themselves over time.
module tsumu::timelock;

use std::string::String;

const ETooEarly: u64 = 1;

public struct Seed has key {
    id: UID,
    author: address,
    message: String,
    sealed_at_ms: u64,
    unlock_at_ms: u64,
    bonus_amount: u64,  // TOKU to mint when opened
}

public struct SeedSealed has copy, drop {
    seed_id: ID,
    author: address,
    sealed_at_ms: u64,
    unlock_at_ms: u64,
}

public struct SeedOpened has copy, drop {
    seed_id: ID,
    author: address,
    opened_at_ms: u64,
    days_elapsed: u64,
}

/// Seal a message for a future moment. Returns nothing — the seed is
/// transferred to the author's address, where it sits until ripe.
public fun seal(
    message: String,
    unlock_at_ms: u64,
    bonus_amount: u64,
    clock: &sui::clock::Clock,
    ctx: &mut TxContext,
) {
    let now = sui::clock::timestamp_ms(clock);
    let seed = Seed {
        id: object::new(ctx),
        author: ctx.sender(),
        message,
        sealed_at_ms: now,
        unlock_at_ms,
        bonus_amount,
    };

    sui::event::emit(SeedSealed {
        seed_id: object::id(&seed),
        author: ctx.sender(),
        sealed_at_ms: now,
        unlock_at_ms,
    });

    transfer::transfer(seed, ctx.sender());
}

/// Open a ripe seed. Aborts if the unlock time has not yet passed.
/// Returns the original message; the caller (agent) then mints the bonus.
public fun open(seed: Seed, clock: &sui::clock::Clock): (String, u64, address) {
    let now = sui::clock::timestamp_ms(clock);
    assert!(now >= seed.unlock_at_ms, ETooEarly);

    let Seed { id, author, message, sealed_at_ms, unlock_at_ms: _, bonus_amount } = seed;
    let days_elapsed = (now - sealed_at_ms) / (1000 * 60 * 60 * 24);

    sui::event::emit(SeedOpened {
        seed_id: id.to_inner(),
        author,
        opened_at_ms: now,
        days_elapsed,
    });

    object::delete(id);
    (message, bonus_amount, author)
}

public fun is_ripe(seed: &Seed, clock: &sui::clock::Clock): bool {
    sui::clock::timestamp_ms(clock) >= seed.unlock_at_ms
}

public fun message(seed: &Seed): &String { &seed.message }
public fun unlock_at_ms(seed: &Seed): u64 { seed.unlock_at_ms }
