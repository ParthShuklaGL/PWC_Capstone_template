package com.example.fsd.web;

import com.example.fsd.domain.Product;
import com.example.fsd.repo.ProductRepository;
import com.example.fsd.web.dto.Dtos.PageResponse;
import com.example.fsd.web.dto.Dtos.ProductRequest;
import com.example.fsd.web.dto.Dtos.ProductResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** CRUD for the sample data set. Any signed-in user can read, create and edit; only ADMIN deletes. */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository products;

    public ProductController(ProductRepository products) {
        this.products = products;
    }

    @GetMapping
    public PageResponse<ProductResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String q) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.clamp(size, 1, 100),
                Sort.by("name"));
        Page<Product> found = products.search(q.trim(), pageable);
        return new PageResponse<>(found.map(ProductResponse::of).getContent(), found.getNumber(),
                found.getSize(), found.getTotalElements(), found.getTotalPages());
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable Long id) {
        return ProductResponse.of(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody ProductRequest req, Authentication me) {
        Product saved = products.save(new Product(req.name().trim(), req.category().trim(),
                req.price(), req.quantity(), me.getName()));
        return ProductResponse.of(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest req) {
        Product p = find(id);
        p.setName(req.name().trim());
        p.setCategory(req.category().trim());
        p.setPrice(req.price());
        p.setQuantity(req.quantity());
        return ProductResponse.of(p);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        products.delete(find(id));
    }

    private Product find(Long id) {
        return products.findById(id).orElseThrow(() -> ApiException.notFound("Product"));
    }
}
