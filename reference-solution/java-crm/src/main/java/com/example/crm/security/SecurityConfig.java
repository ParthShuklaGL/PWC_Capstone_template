package com.example.crm.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.NullSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

/**
 * One API, three ways to prove who you are (Bearer JWT, auth cookie, server-side session). CredentialAuthenticationFilter
 * does the authentication, so Spring Security keeps no session of its own: its session management is off (left on, its
 * session-fixation guard would rotate the session id on every request, because nothing is stored in a security context)
 * and so are its CSRF, form-login and basic-auth machinery (CSRF is CsrfInterceptor). A 401 and a 403 have no body, like the .NET API.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtTokenService tokens, CredentialValidator validator)
            throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .requestCache(c -> c.disable())
                .sessionManagement(AbstractHttpConfigurer::disable)
                .securityContext(c -> c.securityContextRepository(new NullSecurityContextRepository()))
                .headers(h -> h
                        .cacheControl(c -> c.disable())
                        .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/health", "/openapi/**").permitAll()
                        .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/accounts/*", "/api/contacts/*", "/api/deals/*")
                        .hasRole("ADMIN")
                        .requestMatchers("/api/users", "/api/users/**").hasRole("ADMIN")
                        .requestMatchers("/api/reports/users-by-role", "/api/reports/users-by-role.csv")
                        .hasRole("ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> res.setStatus(HttpStatus.UNAUTHORIZED.value()))
                        .accessDeniedHandler((req, res, ex) -> res.setStatus(HttpStatus.FORBIDDEN.value())))
                .addFilterAfter(new CredentialAuthenticationFilter(tokens, validator), SecurityContextHolderFilter.class);
        return http.build();
    }
}
