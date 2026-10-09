package com.example.fsd.config;

import com.example.fsd.domain.Product;
import com.example.fsd.domain.Role;
import com.example.fsd.domain.User;
import com.example.fsd.repo.ProductRepository;
import com.example.fsd.repo.UserRepository;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** First-run data: one admin, one ordinary user, and a few products to report on. */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final ProductRepository products;
    private final PasswordEncoder encoder;
    private final String adminPassword;
    private final String userPassword;

    public DataSeeder(UserRepository users, ProductRepository products, PasswordEncoder encoder,
                      @Value("${app.seed.admin-password}") String adminPassword,
                      @Value("${app.seed.user-password}") String userPassword) {
        this.users = users;
        this.products = products;
        this.encoder = encoder;
        this.adminPassword = adminPassword;
        this.userPassword = userPassword;
    }

    @Override
    public void run(String... args) {
        if (users.count() == 0) {
            users.save(new User("admin", "admin@example.com", encoder.encode(adminPassword), Role.ADMIN));
            users.save(new User("demo", "demo@example.com", encoder.encode(userPassword), Role.USER));
            log.info("Seeded users 'admin' (ADMIN) and 'demo' (USER). Change these passwords.");
        }
        if (products.count() == 0) {
            seed("Laptop 14\"", "Electronics", "799.00", 12);
            seed("Wireless Mouse", "Electronics", "24.99", 40);
            seed("USB-C Hub", "Electronics", "39.50", 3);
            seed("Standing Desk", "Furniture", "329.00", 7);
            seed("Office Chair", "Furniture", "189.90", 2);
            seed("Notebook A5", "Stationery", "3.20", 250);
            seed("Gel Pens (10)", "Stationery", "6.75", 90);
            seed("Whiteboard", "Office", "54.00", 9);
            log.info("Seeded sample products.");
        }
    }

    private void seed(String name, String category, String price, int quantity) {
        products.save(new Product(name, category, new BigDecimal(price), quantity, "admin"));
    }
}
