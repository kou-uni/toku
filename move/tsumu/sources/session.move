/// Session — an immutable record of a single meditation sit.
///
/// Created when a user completes a session via the Tsumu agent. Owned by
/// the user. The metadata (color before/after, reflection) lets the agent
/// surface the user's history meaningfully ("a year ago you wrote ...").
module tsumu::session;

use std::string::String;

public struct Session has key, store {
    id: UID,
    owner: address,
    started_at_ms: u64,
    duration_secs: u64,
    color_before: String,
    color_after: String,
    reflection: String,
}

public struct SessionRecorded has copy, drop {
    session_id: ID,
    owner: address,
    duration_secs: u64,
    timestamp_ms: u64,
}

/// Record a completed session, transfer to the user. The agent calls this
/// after dialog confirms the session genuinely happened.
public fun record(
    owner: address,
    duration_secs: u64,
    color_before: String,
    color_after: String,
    reflection: String,
    clock: &sui::clock::Clock,
    ctx: &mut TxContext,
) {
    let now = sui::clock::timestamp_ms(clock);
    let session = Session {
        id: object::new(ctx),
        owner,
        started_at_ms: now,
        duration_secs,
        color_before,
        color_after,
        reflection,
    };

    sui::event::emit(SessionRecorded {
        session_id: object::id(&session),
        owner,
        duration_secs,
        timestamp_ms: now,
    });

    transfer::transfer(session, owner);
}

public fun owner(s: &Session): address { s.owner }
public fun duration_secs(s: &Session): u64 { s.duration_secs }
public fun started_at_ms(s: &Session): u64 { s.started_at_ms }
