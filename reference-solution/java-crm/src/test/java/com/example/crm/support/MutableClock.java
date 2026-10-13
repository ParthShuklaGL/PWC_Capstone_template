package com.example.crm.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** A clock a test moves by hand, so a 15-minute lockout does not take 15 minutes. Follows real time until moved. */
public final class MutableClock extends Clock {
    private volatile Instant fixed;
    private volatile Duration offset = Duration.ZERO;

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return this;
    }

    @Override
    public Instant instant() {
        Instant f = fixed;
        return f != null ? f : Instant.now().plus(offset);
    }

    /** Stops the clock at this instant. */
    public void freezeAt(Instant instant) {
        fixed = instant;
    }

    public void advance(Duration by) {
        if (fixed != null) {
            fixed = fixed.plus(by);
        } else {
            offset = offset.plus(by);
        }
    }

    public void reset() {
        fixed = null;
        offset = Duration.ZERO;
    }
}
