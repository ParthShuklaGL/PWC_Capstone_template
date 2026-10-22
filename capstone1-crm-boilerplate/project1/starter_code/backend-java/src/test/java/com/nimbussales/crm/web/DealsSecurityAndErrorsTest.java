package com.nimbussales.crm.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nimbussales.crm.domain.AppUser;
import com.nimbussales.crm.domain.Role;
import com.nimbussales.crm.security.CurrentUser;
import com.nimbussales.crm.security.JwtProperties;
import com.nimbussales.crm.security.JwtService;
import com.nimbussales.crm.security.SecurityConfig;
import com.nimbussales.crm.service.DealService;
import com.nimbussales.crm.service.NotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The web layer on its own: real security rules, real validation and real error handling,
 * with the service replaced by a mock. No database is needed.
 */
@WebMvcTest(DealsController.class)
@Import({SecurityConfig.class, JwtService.class, CurrentUser.class})
@EnableConfigurationProperties(JwtProperties.class)
@TestPropertySource(properties = {
        "crm.jwt.issuer=nimbus-crm",
        "crm.jwt.audience=nimbus-crm-clients",
        "crm.jwt.secret=test-signing-key-0123456789-0123456789",
        "crm.jwt.expiry-minutes=60",
        "crm.cors.allowed-origins=http://localhost:5173"})
class DealsSecurityAndErrorsTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JwtService jwtService;

    @MockBean
    DealService dealService;

    private String tokenFor(Role role) {
        AppUser user = mock(AppUser.class);
        when(user.getId()).thenReturn(role == Role.ADMIN ? 1L : 2L);
        when(user.getUserRef()).thenReturn(role == Role.ADMIN ? "U-0001" : "U-0002");
        when(user.getEmail()).thenReturn("someone@nimbus.test");
        when(user.getDisplayName()).thenReturn("Someone");
        when(user.getRole()).thenReturn(role);
        return "Bearer " + jwtService.issue(user).token();
    }

    @Test
    void withoutATokenEveryDealEndpointIs401() throws Exception {
        mvc.perform(get("/api/deals"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHENTICATED"));
    }

    @Test
    void aForgedTokenIs401() throws Exception {
        mvc.perform(get("/api/deals").header("Authorization", "Bearer not.a.token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aRepCanListDeals() throws Exception {
        when(dealService.list(anyInt(), anyInt(), any())).thenReturn(Page.empty());

        mvc.perform(get("/api/deals").header("Authorization", tokenFor(Role.USER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void aRepCannotCreateADealAndIsToldSoBeforeTheBodyIsChecked() throws Exception {
        mvc.perform(post("/api/deals").header("Authorization", tokenFor(Role.USER))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
        verifyNoInteractions(dealService);
    }

    @Test
    void anEmptyDealIs400NamingEveryMissingField() throws Exception {
        mvc.perform(post("/api/deals").header("Authorization", tokenFor(Role.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fields.title").value("title is required"))
                .andExpect(jsonPath("$.fields.accountRef").exists())
                .andExpect(jsonPath("$.fields.contactRef").exists())
                .andExpect(jsonPath("$.fields.value").value("value is required"))
                .andExpect(jsonPath("$.fields.expectedCloseDate").exists());
    }

    @Test
    void anUnreadableDateIs400OnThatField() throws Exception {
        String body = """
                {"title":"x","accountRef":"A-0008","contactRef":"C-00001","value":10,"expectedCloseDate":"next tuesday"}
                """;
        mvc.perform(post("/api/deals").header("Authorization", tokenFor(Role.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.expectedCloseDate")
                        .value("expectedCloseDate must be a date in the form yyyy-MM-dd"));
    }

    @Test
    void anUnknownStageFilterIs400NotA500() throws Exception {
        mvc.perform(get("/api/deals").param("stage", "NEGOTIATIONS").header("Authorization", tokenFor(Role.USER)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.stage").exists());
    }

    @Test
    void anUnknownDealIs404InTheHouseShape() throws Exception {
        when(dealService.getByRef(eq("D-99999"))).thenThrow(NotFoundException.deal("D-99999"));

        mvc.perform(get("/api/deals/D-99999").header("Authorization", tokenFor(Role.USER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("DEAL_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("No deal with reference D-99999"));
    }
}
