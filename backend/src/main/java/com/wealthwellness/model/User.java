package com.wealthwellness.model;

import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String name;

    private LocalDateTime createdAt = LocalDateTime.now();

    // ---- Getters / Setters ----
    public Long getId()                        { return id; }
    public String getEmail()                   { return email; }
    public void setEmail(String email)         { this.email = email; }
    public void setPassword(String password)   { this.password = password; }
    public String getName()                    { return name; }
    public void setName(String name)           { this.name = name; }
    public LocalDateTime getCreatedAt()        { return createdAt; }

    // ---- UserDetails ----
    @Override public String getUsername()                                          { return email; }
    @Override public String getPassword()                                          { return password; }
    @Override public Collection<? extends GrantedAuthority> getAuthorities()      { return List.of(); }
    @Override public boolean isAccountNonExpired()                                 { return true; }
    @Override public boolean isAccountNonLocked()                                  { return true; }
    @Override public boolean isCredentialsNonExpired()                             { return true; }
    @Override public boolean isEnabled()                                           { return true; }
}
