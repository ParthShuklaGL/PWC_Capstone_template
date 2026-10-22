package com.nimbussales.crm.domain;

import static com.nimbussales.crm.domain.DealStage.LOST;
import static com.nimbussales.crm.domain.DealStage.NEGOTIATION;
import static com.nimbussales.crm.domain.DealStage.PROPOSAL;
import static com.nimbussales.crm.domain.DealStage.PROSPECTING;
import static com.nimbussales.crm.domain.DealStage.QUALIFIED;
import static com.nimbussales.crm.domain.DealStage.WON;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class DealStageRulesTest {

    @ParameterizedTest(name = "{0} -> {1} is allowed")
    @CsvSource({
            "PROSPECTING, QUALIFIED", "QUALIFIED, PROPOSAL", "PROPOSAL, NEGOTIATION",
            "QUALIFIED, PROSPECTING", "NEGOTIATION, PROPOSAL",
            "NEGOTIATION, WON",
            "PROSPECTING, LOST", "QUALIFIED, LOST", "PROPOSAL, LOST", "NEGOTIATION, LOST"})
    void allowedMoves(DealStage from, DealStage to) {
        assertThat(DealStageRules.canMove(from, to)).isTrue();
    }

    @ParameterizedTest(name = "{0} -> {1} is refused")
    @CsvSource({
            "PROSPECTING, PROPOSAL", "PROSPECTING, NEGOTIATION", "PROPOSAL, PROSPECTING",
            "PROSPECTING, WON", "PROPOSAL, WON",
            "WON, LOST", "LOST, PROSPECTING", "WON, NEGOTIATION",
            "QUALIFIED, QUALIFIED"})
    void refusedMoves(DealStage from, DealStage to) {
        assertThat(DealStageRules.canMove(from, to)).isFalse();
    }

    @Test
    void refusalsSayWhyInWords() {
        assertThat(DealStageRules.refusal(PROSPECTING, NEGOTIATION)).contains("A deal moves forward one stage at a time.");
        assertThat(DealStageRules.refusal(PROPOSAL, PROSPECTING)).contains("A deal can only move back one stage at a time.");
        assertThat(DealStageRules.refusal(PROPOSAL, WON)).contains("A deal can only be won from NEGOTIATION.");
        assertThat(DealStageRules.refusal(WON, LOST)).contains("A WON deal is closed and cannot be moved.");
        assertThat(DealStageRules.refusal(QUALIFIED, QUALIFIED)).contains("The deal is already in QUALIFIED.");
    }

    @Test
    void onlyWonAndLostAreFinal() {
        assertThat(DealStageRules.isOpen(PROSPECTING)).isTrue();
        assertThat(DealStageRules.isOpen(NEGOTIATION)).isTrue();
        assertThat(DealStageRules.isFinal(WON)).isTrue();
        assertThat(DealStageRules.isFinal(LOST)).isTrue();
    }

    @Test
    void parsesStageNamesIgnoringCase() {
        assertThat(DealStageRules.parse("negotiation")).contains(NEGOTIATION);
        assertThat(DealStageRules.parse(" Won ")).contains(WON);
    }

    @ParameterizedTest
    @ValueSource(strings = {"NEGOTIATIONS", "3", "", " ", "WON1"})
    void refusesAnythingElse(String value) {
        assertThat(DealStageRules.parse(value)).isEmpty();
    }
}
