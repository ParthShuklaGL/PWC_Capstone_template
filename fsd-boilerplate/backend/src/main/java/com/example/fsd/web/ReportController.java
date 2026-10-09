package com.example.fsd.web;

import com.example.fsd.domain.Product;
import com.example.fsd.repo.ProductRepository;
import com.example.fsd.repo.UserRepository;
import com.example.fsd.web.dto.Dtos.CategoryReport;
import com.example.fsd.web.dto.Dtos.ProductResponse;
import com.example.fsd.web.dto.Dtos.ProductSummary;
import com.example.fsd.web.dto.Dtos.UserReport;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private static final int LOW_STOCK_BELOW = 5;

    private final ProductRepository products;
    private final UserRepository users;

    public ReportController(ProductRepository products, UserRepository users) {
        this.products = products;
        this.users = users;
    }

    /** Totals computed in the database, so they are right however many rows there are. */
    @GetMapping("/products")
    public ProductSummary productSummary() {
        List<CategoryReport> byCategory = products.reportByCategory();
        long totalProducts = byCategory.stream().mapToLong(CategoryReport::products).sum();
        long totalUnits = byCategory.stream().mapToLong(CategoryReport::units).sum();
        BigDecimal totalValue = byCategory.stream().map(CategoryReport::stockValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<ProductResponse> low = products.findByQuantityLessThanOrderByQuantityAsc(LOW_STOCK_BELOW)
                .stream().map(ProductResponse::of).toList();
        return new ProductSummary(totalProducts, totalUnits, totalValue, byCategory, low);
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public UserReport userSummary() {
        Map<String, Long> byRole = new TreeMap<>();
        long total = 0;
        for (Object[] row : users.countByRole()) {
            long count = (Long) row[1];
            byRole.put(row[0].toString(), count);
            total += count;
        }
        return new UserReport(total, byRole);
    }

    @GetMapping("/products.csv")
    public ResponseEntity<byte[]> productsCsv() {
        StringBuilder csv = new StringBuilder("id,name,category,price,quantity,stock_value,created_by\r\n");
        for (Product p : products.findAll(Sort.by("id"))) {
            csv.append(p.getId()).append(',')
                    .append(cell(p.getName())).append(',')
                    .append(cell(p.getCategory())).append(',')
                    .append(p.getPrice()).append(',')
                    .append(p.getQuantity()).append(',')
                    .append(p.getPrice().multiply(BigDecimal.valueOf(p.getQuantity()))).append(',')
                    .append(cell(p.getCreatedBy())).append("\r\n");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"products.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=utf-8"))
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    /** Quotes a CSV cell, and defuses a leading = + - @ so a spreadsheet will not run it as a formula. */
    private static String cell(String value) {
        String v = value == null ? "" : value;
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0) {
            v = "'" + v;
        }
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }
}
