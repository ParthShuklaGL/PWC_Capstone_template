package com.example.crm.security;

import com.example.crm.config.AuthProperties;
import java.nio.charset.StandardCharsets;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Password hashing with Spring Security BCrypt (salted, adaptive; the work factor is app.auth.bcrypt-strength).
 * BCrypt only reads the first 72 bytes, so a longer password is refused instead of being silently cut short.
 */
@Service
public class PasswordService {
    public static final int MAX_BYTES = 72;

    private final BCryptPasswordEncoder encoder;
    /** A real hash to compare against when the user does not exist, so timing does not reveal which usernames exist. */
    private final String decoyHash;

    public PasswordService(AuthProperties auth) {
        this.encoder = new BCryptPasswordEncoder(auth.bcryptStrength());
        this.decoyHash = encoder.encode("decoy-password-for-timing");
    }

    public static boolean fits(String password) {
        return password.getBytes(StandardCharsets.UTF_8).length <= MAX_BYTES;
    }

    public String hash(String password) {
        return encoder.encode(password);
    }

    /** Always does one hash comparison, whether or not a hash exists. */
    public boolean verify(String storedHash, String password) {
        boolean usable = fits(password);
        boolean ok = encoder.matches(usable ? password : "", storedHash == null ? decoyHash : storedHash);
        return ok && usable && storedHash != null;
    }

    /** True when the stored hash was made with a weaker work factor than the current setting. */
    public boolean needsRehash(String storedHash) {
        return encoder.upgradeEncoding(storedHash);
    }
}
