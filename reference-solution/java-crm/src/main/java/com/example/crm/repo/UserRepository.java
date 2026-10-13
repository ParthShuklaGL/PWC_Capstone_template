package com.example.crm.repo;

import com.example.crm.domain.User;
import com.example.crm.domain.UserRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    /** Activities logged by each user, most active first. Users with none show 0. Counted by MySQL. */
    @Query("""
            select u.id as userId, u.username as username, count(act) as activities
            from User u left join Activity act on act.user = u
            group by u.id, u.username
            order by count(act) desc, u.username asc
            """)
    List<ActivitiesPerUser> activitiesPerUser();

    @Query("select u.role as role, count(u) as users from User u group by u.role")
    List<RoleCount> countByRole();

    interface ActivitiesPerUser {
        long getUserId();
        String getUsername();
        long getActivities();
    }

    interface RoleCount {
        UserRole getRole();
        long getUsers();
    }
}
