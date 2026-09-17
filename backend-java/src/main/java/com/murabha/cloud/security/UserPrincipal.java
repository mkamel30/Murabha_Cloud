package com.murabha.cloud.security;

import com.murabha.cloud.entity.User;
import com.murabha.cloud.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

@AllArgsConstructor
@Getter
public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String username;
    private final String name;
    private final String email;
    private final String password;
    private final UserRole role;
    private final UUID branchId;
    private final boolean active;

    public static UserPrincipal create(User user) {
        return new UserPrincipal(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getEmail(),
                user.getPassword(),
                user.getRole(),
                user.getBranchId(),
                Boolean.TRUE.equals(user.getIsActive())
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}