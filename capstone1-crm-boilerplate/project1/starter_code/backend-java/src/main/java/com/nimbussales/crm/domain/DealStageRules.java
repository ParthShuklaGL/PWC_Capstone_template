package com.nimbussales.crm.domain;

import java.util.Locale;
import java.util.Optional;

/**
 * The rules for moving a deal between stages. Pure functions, no database, so they can be
 * tested on their own (see DealStageRulesTest).
 *
 * <p>PROSPECTING, QUALIFIED, PROPOSAL and NEGOTIATION are the open stages. A deal moves
 * forward one stage at a time and back one stage at a time. It can be LOST from any open
 * stage, and WON only from NEGOTIATION. WON and LOST are final.
 */
public final class DealStageRules {

    private DealStageRules() {
    }

    public static boolean isOpen(DealStage stage) {
        return stage != DealStage.WON && stage != DealStage.LOST;
    }

    public static boolean isFinal(DealStage stage) {
        return !isOpen(stage);
    }

    /**
     * Parses a wire name, ignoring case. Numbers are refused on purpose: "3" is not a
     * stage, even though NEGOTIATION is the fourth.
     */
    public static Optional<DealStage> parse(String value) {
        if (value == null || value.isBlank() || value.chars().anyMatch(Character::isDigit)) {
            return Optional.empty();
        }
        try {
            return Optional.of(DealStage.valueOf(value.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException notAStage) {
            return Optional.empty();
        }
    }

    /** Why this move is not allowed, or empty when it is. */
    public static Optional<String> refusal(DealStage from, DealStage to) {
        if (from == to) {
            return Optional.of("The deal is already in " + from + ".");
        }
        if (isFinal(from)) {
            return Optional.of("A " + from + " deal is closed and cannot be moved.");
        }
        if (to == DealStage.LOST) {
            return Optional.empty();
        }
        if (to == DealStage.WON) {
            return from == DealStage.NEGOTIATION
                    ? Optional.empty()
                    : Optional.of("A deal can only be won from NEGOTIATION.");
        }
        int step = to.ordinal() - from.ordinal();
        if (step == 1 || step == -1) {
            return Optional.empty();
        }
        return Optional.of(step > 1
                ? "A deal moves forward one stage at a time."
                : "A deal can only move back one stage at a time.");
    }

    public static boolean canMove(DealStage from, DealStage to) {
        return refusal(from, to).isEmpty();
    }
}
