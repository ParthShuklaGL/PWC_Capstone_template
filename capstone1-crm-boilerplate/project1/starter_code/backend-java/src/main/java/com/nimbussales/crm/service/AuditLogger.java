package com.nimbussales.crm.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Every read and write of customer data goes through here.
 *
 * <p>Services must not create their own logger for this: compliance asked for one place
 * where the audit trail is defined, and this is it.
 */
@Component
public class AuditLogger {

    private static final Logger LOG = LoggerFactory.getLogger("CRM_AUDIT");

    public void listed(String entity, int count) {
        LOG.info("LIST entity={} returned={}", entity, count);
    }

    public void viewed(String entity, String reference) {
        LOG.info("VIEW entity={} ref={}", entity, reference);
    }

    public void created(String entity, String reference) {
        LOG.info("CREATE entity={} ref={}", entity, reference);
    }

    public void updated(String entity, String reference) {
        LOG.info("UPDATE entity={} ref={}", entity, reference);
    }

    public void deleted(String entity, String reference) {
        LOG.info("DELETE entity={} ref={}", entity, reference);
    }

    public void stageChanged(String reference, String from, String to) {
        LOG.info("STAGE entity=deal ref={} from={} to={}", reference, from, to);
    }

    public void imported(int created, int skipped, int rejected) {
        LOG.info("IMPORT created={} skipped={} rejected={}", created, skipped, rejected);
    }
}
