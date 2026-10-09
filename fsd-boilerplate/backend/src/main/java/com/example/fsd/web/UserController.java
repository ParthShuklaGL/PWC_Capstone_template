package com.example.fsd.web;

import com.example.fsd.domain.User;
import com.example.fsd.repo.UserRepository;
import com.example.fsd.web.dto.Dtos.CreateUserRequest;
import com.example.fsd.web.dto.Dtos.UpdateUserRequest;
import com.example.fsd.web.dto.Dtos.UserResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** User administration. SecurityConfig restricts every route here to ADMIN. */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserController(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @GetMapping
    public List<UserResponse> list() {
        return users.findAll(Sort.by("username")).stream().map(UserResponse::of).toList();
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) {
        return UserResponse.of(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest req) {
        if (users.existsByUsername(req.username())) {
            throw ApiException.conflict("That username is taken.");
        }
        if (users.existsByEmail(req.email())) {
            throw ApiException.conflict("That email is already registered.");
        }
        return UserResponse.of(users.save(new User(req.username(), req.email(),
                encoder.encode(req.password()), req.role())));
    }

    @PutMapping("/{id}")
    @Transactional
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest req,
                               Authentication me) {
        User user = find(id);
        boolean isSelf = user.getUsername().equals(me.getName());
        if (isSelf && ((req.role() != null && req.role() != user.getRole())
                || Boolean.FALSE.equals(req.enabled()))) {
            throw ApiException.badRequest("You cannot demote or disable your own account.");
        }
        if (req.email() != null && !req.email().equalsIgnoreCase(user.getEmail())) {
            if (users.existsByEmail(req.email())) {
                throw ApiException.conflict("That email is already registered.");
            }
            user.setEmail(req.email());
        }
        if (req.role() != null) user.setRole(req.role());
        if (req.enabled() != null) user.setEnabled(req.enabled());
        if (req.password() != null) user.setPasswordHash(encoder.encode(req.password()));
        return UserResponse.of(user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication me) {
        User user = find(id);
        if (user.getUsername().equals(me.getName())) {
            throw ApiException.badRequest("You cannot delete your own account.");
        }
        users.delete(user);
    }

    private User find(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }
}
