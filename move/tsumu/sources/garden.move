/// Garden — the user's personal "坐の庭" (garden of sitting).
///
/// One Garden object per user, evolves visually as practice accumulates.
/// Levels: 1=stone, 2=moss, 3=pond, 4=koi, 5=cherry, 6=four_seasons.
/// The level is derived from session count + first/last seated timestamps;
/// the visual rendering happens off-chain (the Tsumu agent or a viewer reads
/// these fields and composites an image).
module tsumu::garden;

public struct Garden has key {
    id: UID,
    owner: address,
    sessions_count: u64,
    first_seated_at_ms: u64,
    last_seated_at_ms: u64,
}

public struct GardenLeveledUp has copy, drop {
    owner: address,
    new_level: u8,
    sessions_count: u64,
}

/// Create the user's garden. Called once on first session.
public fun create(owner: address, clock: &sui::clock::Clock, ctx: &mut TxContext): ID {
    let now = sui::clock::timestamp_ms(clock);
    let garden = Garden {
        id: object::new(ctx),
        owner,
        sessions_count: 0,
        first_seated_at_ms: now,
        last_seated_at_ms: now,
    };
    let id = object::id(&garden);
    transfer::transfer(garden, owner);
    id
}

/// Mark a session as completed in the garden. Increments count, may emit
/// a level-up event.
public fun touch(garden: &mut Garden, clock: &sui::clock::Clock) {
    let prev_level = level(garden);
    garden.sessions_count = garden.sessions_count + 1;
    garden.last_seated_at_ms = sui::clock::timestamp_ms(clock);
    let new_level = level(garden);
    if (new_level > prev_level) {
        sui::event::emit(GardenLeveledUp {
            owner: garden.owner,
            new_level,
            sessions_count: garden.sessions_count,
        });
    };
}

/// Compute the current visual level from session count.
public fun level(garden: &Garden): u8 {
    let n = garden.sessions_count;
    if (n >= 365) 6        // four seasons
    else if (n >= 100) 5   // cherry tree
    else if (n >= 30) 4    // koi
    else if (n >= 14) 3    // pond
    else if (n >= 7) 2     // moss
    else 1                 // stone
}

public fun owner(g: &Garden): address { g.owner }
public fun sessions_count(g: &Garden): u64 { g.sessions_count }
