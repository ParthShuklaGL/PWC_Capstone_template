package com.example.crm.service;

import com.example.crm.config.AuthProperties;
import com.example.crm.domain.User;
import com.example.crm.domain.UserRole;
import com.example.crm.repo.UserRepository;
import com.example.crm.security.PasswordService;
import com.example.crm.web.ApiException;
import com.example.crm.web.dto.AuthDtos.UserDto;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Register, check credentials (with lockout) and list users. How a login is remembered is the web layer's business. */
@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordService passwords;
    private final AuthProperties auth;
    private final Clock clock;

    public AuthService(UserRepository users, PasswordService passwords, AuthProperties auth, Clock clock) {
        this.users = users;
        this.passwords = passwords;
        this.auth = auth;
        this.clock = clock;
    }

    @Transactional
    public UserDto register(String username, String email, String password) {
        Validation.start()
                .notEmpty("Username", username).length("Username", username, 3, 50)
                .matches("Username", username, "^[A-Za-z0-9_.-]+$",
                        "Username may contain letters, digits, '.', '_' and '-' only.")
                .notEmpty("Email", email).maxLength("Email", email, 160).email("Email", email)
                .notEmpty("Password", password).minLength("Password", password, 10)
                .maxLength("Password", password, 100)
                .throwIfAny();
        if (!PasswordService.fits(password)) {
            Validation.start().error("Password", "Password must be at most " + PasswordService.MAX_BYTES + " bytes.")
                    .throwIfAny();
        }

        String name = username.strip();
        String mail = email.strip();
        if (users.existsByUsername(name)) {
            throw ApiException.conflict("USERNAME_TAKEN", "That username is already taken.");
        }
        if (users.existsByEmail(mail)) {
            throw ApiException.conflict("EMAIL_TAKEN", "That email is already registered.");
        }

        // Self-registration always creates a plain USER. An admin is made by an admin.
        User user = new User();
        user.setUsername(name);
        user.setEmail(mail);
        user.setPasswordHash(passwords.hash(password));
        user.setRole(UserRole.USER);
        users.save(user);
        return UserDto.from(user);
    }

    /**
     * Checks a username and password. Every failure (unknown user, wrong password, locked, deactivated) is the same
     * 401 INVALID_CREDENTIALS. The failed-attempt count is saved even though the call ends in an exception.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public User login(String username, String password) {
        Validation.start()
                .notEmpty("Username", username).maxLength("Username", username, 50)
                .notEmpty("Password", password).maxLength("Password", password, 100)
                .throwIfAny();

        Instant now = clock.instant();
        User user = users.findByUsername(username.strip()).orElse(null);

        // Verify even when there is no such user, or the account is locked, so timing does not reveal which
        // usernames exist or which are locked.
        boolean passwordOk = passwords.verify(user == null ? null : user.getPasswordHash(), password);

        if (user == null || (user.getLockoutEndsAt() != null && user.getLockoutEndsAt().isAfter(now))) {
            throw ApiException.invalidCredentials();
        }

        if (!passwordOk) {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            if (user.getFailedLoginAttempts() >= auth.maxFailedLogins()) {
                user.setLockoutEndsAt(now.plus(Duration.ofMinutes(auth.lockoutMinutes())));
                user.setFailedLoginAttempts(0);
            }
            throw ApiException.invalidCredentials();
        }

        if (!user.isActive()) {
            throw ApiException.invalidCredentials();
        }

        if (passwords.needsRehash(user.getPasswordHash())) {
            user.setPasswordHash(passwords.hash(password));
        }
        user.setFailedLoginAttempts(0);
        user.setLockoutEndsAt(null);
        return user;
    }

    @Transactional(readOnly = true)
    public List<UserDto> listUsers(int page, int size) {
        Validation.start().paging(page, size).throwIfAny();
        return users.findAll(PageRequest.of(page, size, Sort.by("username"))).map(UserDto::from).toList();
    }
}
