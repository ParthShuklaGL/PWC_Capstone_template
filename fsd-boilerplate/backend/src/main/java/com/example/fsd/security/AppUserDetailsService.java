package com.example.fsd.security;

import com.example.fsd.domain.User;
import com.example.fsd.repo.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository users;

    public AppUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        User u = users.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("No such user"));
        return org.springframework.security.core.userdetails.User.withUsername(u.getUsername())
                .password(u.getPasswordHash())
                .roles(u.getRole().name())
                .disabled(!u.isEnabled())
                .build();
    }
}
