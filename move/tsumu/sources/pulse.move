/// Pulse — the world heartbeat counter.
///
/// A single shared object that tracks aggregate session completions.
/// After every recorded session, the agent calls `beat` and reads the
/// resulting count to compose the post-session message:
/// "今、世界で X 人が立ちました。あなたは、その一人です。"
///
/// We intentionally only expose totals + recent-window counts; never
/// per-user data. Presence, not performance.
module tsumu::pulse;

const RECENT_WINDOW_MS: u64 = 60_000;  // 1 minute "synchronicity" window

/// Shared singleton. Initialized at publish.
public struct WorldPulse has key {
    id: UID,
    total_beats: u64,
    last_beat_ms: u64,
    recent_beats_in_window: u64,
    recent_window_started_ms: u64,
}

public struct Beat has copy, drop {
    total: u64,
    recent_in_window: u64,
    timestamp_ms: u64,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(WorldPulse {
        id: object::new(ctx),
        total_beats: 0,
        last_beat_ms: 0,
        recent_beats_in_window: 0,
        recent_window_started_ms: 0,
    });
}

/// Increment the global pulse. Anyone (any agent on behalf of any user)
/// can call this. The function rolls the recent-window when stale.
public fun beat(pulse: &mut WorldPulse, clock: &sui::clock::Clock) {
    let now = sui::clock::timestamp_ms(clock);

    if (now - pulse.recent_window_started_ms > RECENT_WINDOW_MS) {
        pulse.recent_window_started_ms = now;
        pulse.recent_beats_in_window = 1;
    } else {
        pulse.recent_beats_in_window = pulse.recent_beats_in_window + 1;
    };

    pulse.total_beats = pulse.total_beats + 1;
    pulse.last_beat_ms = now;

    sui::event::emit(Beat {
        total: pulse.total_beats,
        recent_in_window: pulse.recent_beats_in_window,
        timestamp_ms: now,
    });
}

public fun total_beats(p: &WorldPulse): u64 { p.total_beats }
public fun recent_beats_in_window(p: &WorldPulse): u64 { p.recent_beats_in_window }
public fun last_beat_ms(p: &WorldPulse): u64 { p.last_beat_ms }
