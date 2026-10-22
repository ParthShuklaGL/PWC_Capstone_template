package com.nimbussales.crm.web.dto;

import com.nimbussales.crm.domain.Activity;
import java.time.Instant;

public record ActivityResponse(Long id, String type, String subject, String notes, Instant occurredAt) {

    public static ActivityResponse from(Activity activity) {
        return new ActivityResponse(activity.getId(), activity.getType().name(), activity.getSubject(),
                activity.getNotes(), activity.getOccurredAt());
    }
}
