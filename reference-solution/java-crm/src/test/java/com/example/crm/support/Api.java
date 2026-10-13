package com.example.crm.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A tiny real-HTTP client for the integration tests. It does not manage cookies by itself: a test passes the headers it
 * wants (a Bearer token, a Cookie header, an X-CSRF-TOKEN) so every credential is explicit. See {@link Browser} for a
 * client that keeps cookies like a browser does.
 */
public final class Api {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final HttpClient client = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();
    private final String base;

    public Api(int port) {
        this.base = "http://localhost:" + port;
    }

    /** Request headers to send. */
    public record Auth(Map<String, String> headers) {
        public static Auth none() {
            return new Auth(new LinkedHashMap<>());
        }

        public static Auth bearer(String token) {
            return none().with("Authorization", "Bearer " + token);
        }

        public static Auth cookie(String cookieHeader) {
            return none().with("Cookie", cookieHeader);
        }

        public Auth with(String name, String value) {
            Map<String, String> copy = new LinkedHashMap<>(headers);
            copy.put(name, value);
            return new Auth(copy);
        }
    }

    public record Res(int status, String body, HttpHeaders headers) {
        public JsonNode json() {
            try {
                return JSON.readTree(body);
            } catch (Exception e) {
                throw new IllegalStateException("Not JSON: " + body, e);
            }
        }

        public String header(String name) {
            return headers.firstValue(name).orElse(null);
        }

        public List<String> setCookies() {
            return headers.allValues("set-cookie");
        }

        /** The value of a cookie set by this response, or null. */
        public String cookieValue(String name) {
            for (String c : setCookies()) {
                if (c.startsWith(name + "=")) {
                    int end = c.indexOf(';');
                    return c.substring(name.length() + 1, end < 0 ? c.length() : end);
                }
            }
            return null;
        }
    }

    public Res get(String path, Auth auth) {
        return send("GET", path, null, auth);
    }

    public Res post(String path, String body, Auth auth) {
        return send("POST", path, body, auth);
    }

    public Res put(String path, String body, Auth auth) {
        return send("PUT", path, body, auth);
    }

    public Res delete(String path, Auth auth) {
        return send("DELETE", path, null, auth);
    }

    public Res send(String method, String path, String body, Auth auth) {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(base + path));
        if (body != null) {
            b.header("Content-Type", "application/json");
            b.method(method, HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        } else {
            b.method(method, HttpRequest.BodyPublishers.noBody());
        }
        auth.headers().forEach(b::header);
        try {
            HttpResponse<String> r = client.send(b.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return new Res(r.statusCode(), r.body(), r.headers());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** Signs in with the given mode and returns the raw response. */
    public Res login(String username, String password, String mode) {
        String body = mode == null
                ? "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password)
                : "{\"username\":\"%s\",\"password\":\"%s\",\"mode\":\"%s\"}".formatted(username, password, mode);
        return post("/api/auth/login", body, Auth.none());
    }

    public String jwt(String username, String password) {
        Res r = login(username, password, "Jwt");
        if (r.status() != 200) {
            throw new IllegalStateException("login failed with " + r.status() + ": " + r.body());
        }
        return r.json().get("accessToken").asText();
    }

    /** A client that keeps cookies, like a browser: sign in with Cookie or Session mode, then just call. */
    public Browser browser() {
        return new Browser(this);
    }

    public static final class Browser {
        private final Api api;
        private final Map<String, String> cookies = new LinkedHashMap<>();

        private Browser(Api api) {
            this.api = api;
        }

        public Res login(String username, String password, String mode) {
            return remember(api.login(username, password, mode));
        }

        public Res get(String path) {
            return remember(api.get(path, headers(null)));
        }

        /** A state-changing call. Pass the CSRF token, or null to send none. */
        public Res send(String method, String path, String body, String csrfToken) {
            return remember(api.send(method, path, body, headers(csrfToken)));
        }

        public String fetchCsrfToken() {
            return get("/api/auth/csrf").json().get("token").asText();
        }

        public String cookie(String name) {
            return cookies.get(name);
        }

        /** The Cookie header this browser would send now. */
        public String cookieHeader() {
            StringBuilder sb = new StringBuilder();
            cookies.forEach((k, v) -> sb.append(sb.length() == 0 ? "" : "; ").append(k).append('=').append(v));
            return sb.toString();
        }

        private Auth headers(String csrf) {
            Auth a = Auth.none();
            if (!cookies.isEmpty()) {
                a = a.with("Cookie", cookieHeader());
            }
            return csrf == null ? a : a.with("X-CSRF-TOKEN", csrf);
        }

        private Res remember(Res r) {
            for (String c : r.setCookies()) {
                String name = c.substring(0, c.indexOf('='));
                String value = c.substring(name.length() + 1, c.indexOf(';') < 0 ? c.length() : c.indexOf(';'));
                if (c.toLowerCase().contains("max-age=0") || value.isEmpty()) {
                    cookies.remove(name);
                } else {
                    cookies.put(name, value);
                }
            }
            return r;
        }
    }
}
