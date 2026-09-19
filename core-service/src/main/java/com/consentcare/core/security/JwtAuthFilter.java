package com.consentcare.core.security;

import com.consentcare.core.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain chain) throws ServletException, IOException {
        String token = null;
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            token = header.substring(7);
        } else if (request.getParameter("token") != null) {
            token = request.getParameter("token");
        }

        if (token != null) {
            try {
                String username = jwtUtil.extractUsername(token);
                final String jwtToken = token;
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    userRepository.findByUsername(username).ifPresent(user -> {
                        if (user.isActive() && jwtUtil.isTokenValid(jwtToken, user.getUsername())) {
                            var authToken = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authToken);
                        }
                    });
                }
            } catch (Exception ex) {
                // invalid/expired token -> stay unauthenticated
            }
        }
        chain.doFilter(request, response);
    }
}
