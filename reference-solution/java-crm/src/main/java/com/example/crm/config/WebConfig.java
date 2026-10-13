package com.example.crm.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import java.time.Clock;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import com.example.crm.security.CsrfInterceptor;
import com.example.crm.security.CsrfService;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final CsrfService csrf;

    public WebConfig(CsrfService csrf) {
        this.csrf = csrf;
    }

    /** The clock every service reads, so a test can move time by hand. */
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    /**
     * JSON rules shared with the .NET API: enums travel as upper-case names and are accepted in any letter case on the
     * way in; numbers are refused for enums; property names are matched without regard to case; decimals are written as
     * plain numbers (1234.56, never 1.23456E3); a JSON string is not accepted for a number, nor a number for a string.
     */
    @Bean
    Jackson2ObjectMapperBuilderCustomizer jsonRules() {
        return builder -> builder
                .featuresToEnable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS,
                        MapperFeature.ACCEPT_CASE_INSENSITIVE_PROPERTIES,
                        DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS,
                        JsonGenerator.Feature.WRITE_BIGDECIMAL_AS_PLAIN)
                .featuresToDisable(MapperFeature.ALLOW_COERCION_OF_SCALARS);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new CsrfInterceptor(csrf)).addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/login", "/api/auth/register");
    }
}
