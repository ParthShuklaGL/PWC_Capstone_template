package com.example.fsd.repo;

import com.example.fsd.domain.Product;
import com.example.fsd.web.dto.Dtos.CategoryReport;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("""
            select p from Product p
            where lower(p.name) like lower(concat('%', :q, '%'))
               or lower(p.category) like lower(concat('%', :q, '%'))
            """)
    Page<Product> search(@Param("q") String q, Pageable pageable);

    @Query("""
            select new com.example.fsd.web.dto.Dtos$CategoryReport(
                p.category, count(p), sum(p.quantity), sum(p.price * p.quantity))
            from Product p
            group by p.category
            order by p.category
            """)
    List<CategoryReport> reportByCategory();

    List<Product> findByQuantityLessThanOrderByQuantityAsc(int quantity);
}
