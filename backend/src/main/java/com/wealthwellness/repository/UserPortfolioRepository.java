package com.wealthwellness.repository;

import com.wealthwellness.model.User;
import com.wealthwellness.model.UserPortfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserPortfolioRepository extends JpaRepository<UserPortfolio, Long> {
    List<UserPortfolio> findByUserOrderBySavedAtDesc(User user);
    Optional<UserPortfolio> findByUserAndName(User user, String name);
    void deleteByUserAndName(User user, String name);
}
