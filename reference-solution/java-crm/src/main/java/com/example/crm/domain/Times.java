package com.example.crm.domain;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** Now, at the precision MySQL stores (microseconds), so a response equals what a later read returns. */
public final class Times {
    private Times() {}

    public static Instant now() {
        return Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    public static Instant now(Clock clock) {
        return Instant.now(clock).truncatedTo(ChronoUnit.MICROS);
    }
}
