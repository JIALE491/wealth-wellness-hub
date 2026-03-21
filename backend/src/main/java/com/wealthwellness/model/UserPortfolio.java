package com.wealthwellness.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "portfolios")
public class UserPortfolio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String assetsJson;

    private LocalDateTime savedAt = LocalDateTime.now();

    public Long getId()                          { return id; }
    public User getUser()                        { return user; }
    public void setUser(User user)               { this.user = user; }
    public String getName()                      { return name; }
    public void setName(String name)             { this.name = name; }
    public String getAssetsJson()                { return assetsJson; }
    public void setAssetsJson(String assetsJson) { this.assetsJson = assetsJson; }
    public LocalDateTime getSavedAt()            { return savedAt; }
    public void setSavedAt(LocalDateTime t)      { this.savedAt = t; }
}
