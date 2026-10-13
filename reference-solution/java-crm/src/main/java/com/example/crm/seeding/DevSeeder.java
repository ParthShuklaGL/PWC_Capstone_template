package com.example.crm.seeding;

import com.example.crm.domain.Times;
import com.example.crm.domain.User;
import com.example.crm.domain.UserRole;
import com.example.crm.repo.AccountRepository;
import com.example.crm.repo.ActivityRepository;
import com.example.crm.repo.ContactRepository;
import com.example.crm.repo.DealRepository;
import com.example.crm.repo.UserRepository;
import com.example.crm.security.PasswordService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gives a fresh development database something to sign in with and something to report on: one ADMIN and one USER,
 * then the sample accounts, contacts, deals and activities. Each part only runs when its own table is empty, so
 * restarting never duplicates anything. It only exists in the dev profile.
 */
@Component
@Profile("dev")
public class DevSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DevSeeder.class);

    @ConfigurationProperties("app.seed")
    public record SeedProperties(boolean enabled, SeedUser admin, SeedUser user) {}

    public record SeedUser(String username, String email, String password) {}

    private final SeedProperties seed;
    private final UserRepository users;
    private final AccountRepository accounts;
    private final ContactRepository contacts;
    private final DealRepository deals;
    private final ActivityRepository activities;
    private final PasswordService passwords;

    public DevSeeder(SeedProperties seed, UserRepository users, AccountRepository accounts, ContactRepository contacts,
                     DealRepository deals, ActivityRepository activities, PasswordService passwords) {
        this.seed = seed;
        this.users = users;
        this.accounts = accounts;
        this.contacts = contacts;
        this.deals = deals;
        this.activities = activities;
        this.passwords = passwords;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!seed.enabled()) {
            return;
        }
        if (users.count() == 0) {
            users.save(create(seed.admin(), UserRole.ADMIN));
            users.save(create(seed.user(), UserRole.USER));
            log.info("Seeded development users {} (ADMIN) and {} (USER)", seed.admin().username(), seed.user().username());
        }
        if (accounts.count() == 0) {
            // The sample activities are logged by the first two users, in id order.
            List<User> owners = users.findAll(org.springframework.data.domain.Sort.by("id")).stream().limit(2).toList();
            SampleData.add(accounts, contacts, deals, activities, owners, Times.now());
            log.info("Seeded sample data: {} accounts, {} contacts, {} deals, {} activities", SampleData.ACCOUNT_COUNT,
                    SampleData.CONTACT_COUNT, SampleData.DEAL_COUNT, SampleData.ACTIVITY_COUNT);
        }
    }

    private User create(SeedUser seedUser, UserRole role) {
        if (seedUser == null || isBlank(seedUser.username()) || isBlank(seedUser.email())
                || isBlank(seedUser.password())) {
            throw new IllegalStateException("app.seed must give a username, email and password for the " + role + " user.");
        }
        User user = new User();
        user.setUsername(seedUser.username());
        user.setEmail(seedUser.email());
        user.setPasswordHash(passwords.hash(seedUser.password()));
        user.setRole(role);
        return user;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
