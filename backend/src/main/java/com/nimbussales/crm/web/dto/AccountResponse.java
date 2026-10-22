package com.nimbussales.crm.web.dto;

import com.nimbussales.crm.domain.Account;

public record AccountResponse(String accountRef, String name, String industry, String country, String website) {

    public static AccountResponse from(Account account) {
        return new AccountResponse(account.getAccountRef(), account.getName(), account.getIndustry(),
                account.getCountry(), account.getWebsite());
    }
}
