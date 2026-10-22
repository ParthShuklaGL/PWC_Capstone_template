package com.nimbussales.crm.service;

import com.nimbussales.crm.domain.Activity;
import com.nimbussales.crm.domain.ActivityType;
import com.nimbussales.crm.domain.Contact;
import com.nimbussales.crm.repository.ActivityRepository;
import com.nimbussales.crm.repository.ContactRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityService {

    private final ActivityRepository activities;
    private final ContactRepository contacts;
    private final AuditLogger audit;

    public ActivityService(ActivityRepository activities, ContactRepository contacts, AuditLogger audit) {
        this.activities = activities;
        this.contacts = contacts;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<Activity> listForContact(String contactRef) {
        Contact contact = contacts.findByContactRef(contactRef)
                .orElseThrow(() -> NotFoundException.contact(contactRef));
        List<Activity> found = activities.findByContactIdOrderByOccurredAtDesc(contact.getId());
        audit.listed("activity", found.size());
        return found;
    }

    @Transactional
    public Activity log(String contactRef, ActivityType type, String subject, String notes, Instant occurredAt) {
        Contact contact = contacts.findByContactRef(contactRef)
                .orElseThrow(() -> NotFoundException.contact(contactRef));
        Instant when = occurredAt != null ? occurredAt : Instant.now();
        Activity activity = activities.save(new Activity(contact.getId(), type, subject, notes, when));
        contact.setLastContactedAt(when);
        audit.created("activity", contactRef);
        return activity;
    }
}
