package com.example.fsd;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.fsd.security.JwtService;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = "a-test-secret-that-is-at-least-32-bytes-long!!";

    @Test
    void roundTripReturnsTheUsername() {
        JwtService jwt = new JwtService(SECRET, 5);
        assertThat(jwt.validate(jwt.issue("alice", "USER"))).contains("alice");
    }

    @Test
    void tamperedTokenIsRejected() {
        JwtService jwt = new JwtService(SECRET, 5);
        String token = jwt.issue("alice", "USER");
        assertThat(jwt.validate(token.substring(0, token.length() - 2) + "xx")).isEmpty();
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() {
        String foreign = new JwtService("another-secret-that-is-also-32-bytes-long!!!", 5)
                .issue("alice", "USER");
        assertThat(new JwtService(SECRET, 5).validate(foreign)).isEmpty();
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService jwt = new JwtService(SECRET, -1);
        assertThat(jwt.validate(jwt.issue("alice", "USER"))).isEmpty();
    }

    @Test
    void garbageIsRejected() {
        assertThat(new JwtService(SECRET, 5).validate("not.a.jwt")).isEmpty();
    }
}
