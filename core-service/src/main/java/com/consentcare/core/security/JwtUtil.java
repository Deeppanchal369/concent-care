package com.consentcare.core.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);

    @Value("${consentcare.jwt.secret}")
    private String secret;

    @Value("${consentcare.jwt.expiration-ms}")
    private long expirationMs;

    @Autowired
    private Environment environment;

    @PostConstruct
    public void validateSecret() {
        boolean isDefault = secret == null || secret.length() < 32 ||
                secret.contains("change-this-to-a-long-random-secret") ||
                secret.contains("consentcare-super-secret-jwt-token-key-change-in-production");
        if (isDefault) {
            if (Arrays.asList(environment.getActiveProfiles()).contains("prod")) {
                throw new IllegalStateException("FATAL: Insecure default or weak JWT_SECRET detected in production profile! You must set a strong, random JWT_SECRET (min 32 bytes).");
            } else {
                log.warn("SECURITY WARNING: Using default/weak development JWT_SECRET. Override JWT_SECRET with a strong 32+ byte random string in production.");
            }
        }
    }

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String username, String role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder().subject(username).claim("role", role)
                .issuedAt(now).expiration(expiry).signWith(key()).compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, String username) {
        return username.equals(extractUsername(token)) && !isExpired(token);
    }

    private boolean isExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(extractAllClaims(token));
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload();
    }
}
