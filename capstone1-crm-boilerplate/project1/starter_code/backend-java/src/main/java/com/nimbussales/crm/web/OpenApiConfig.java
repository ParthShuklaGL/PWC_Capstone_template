package com.nimbussales.crm.web;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The OpenAPI document (/v3/api-docs) and Swagger UI (/swagger-ui.html). Sign in with
 * POST /api/auth/login, copy the token, press "Authorize" and paste it: every request after
 * that carries it.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI crmOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Nimbus CRM API")
                        .version("1.0.0")
                        .description("Accounts, contacts, activities and the deal pipeline. "
                                + "Demo sign-ins: admin@nimbus.test / Admin#2026 (ADMIN), "
                                + "aisha@nimbus.test and ben@nimbus.test / Rep#2026 (USER)."))
                .components(new Components().addSecuritySchemes("bearer", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
