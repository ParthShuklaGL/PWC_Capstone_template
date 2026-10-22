package com.nimbussales.crm.service;

import com.nimbussales.crm.domain.Account;
import com.nimbussales.crm.domain.Contact;
import com.nimbussales.crm.domain.ContactStatus;
import com.nimbussales.crm.repository.AccountRepository;
import com.nimbussales.crm.repository.ContactRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bulk import of leads from the CSV files the marketing agency sends over every month.
 *
 * <p>Written in a hurry before a trade show and not touched since.
 */
@Service
public class ContactImportService {

    private final ContactRepository contacts;
    private final AccountRepository accounts;
    private final AuditLogger audit;

    public ContactImportService(ContactRepository contacts, AccountRepository accounts, AuditLogger audit) {
        this.contacts = contacts;
        this.accounts = accounts;
        this.audit = audit;
    }

    @Transactional
    public String importCsv(String csv) {
        int created = 0;
        int skipped = 0;
        int rejected = 0;
        List<String> problems = new ArrayList<>();
        Set<String> seenInThisFile = new HashSet<>();

        if (csv == null || csv.isBlank()) {
            throw new ImportFormatException("The uploaded file was empty");
        }
        String[] lines = csv.replace("\r\n", "\n").replace("\r", "\n").split("\n", -1);
        if (lines.length < 2) {
            throw new ImportFormatException("The file has a header row but no data rows");
        }

        String[] header = lines[0].split(",", -1);
        int accountCol = -1;
        int firstCol = -1;
        int lastCol = -1;
        int emailCol = -1;
        int phoneCol = -1;
        int titleCol = -1;
        for (int h = 0; h < header.length; h++) {
            String columnName = header[h].trim().toLowerCase(Locale.ROOT);
            if (columnName.equals("account_ref")) {
                accountCol = h;
            } else if (columnName.equals("first_name")) {
                firstCol = h;
            } else if (columnName.equals("last_name")) {
                lastCol = h;
            } else if (columnName.equals("email")) {
                emailCol = h;
            } else if (columnName.equals("phone")) {
                phoneCol = h;
            } else if (columnName.equals("job_title")) {
                titleCol = h;
            }
        }
        if (accountCol < 0 || firstCol < 0 || lastCol < 0 || emailCol < 0) {
            throw new ImportFormatException(
                    "The file must have account_ref, first_name, last_name and email columns");
        }

        for (int i = 1; i < lines.length; i++) {
            String line = lines[i];
            if (!line.isBlank()) {
                String[] cells = line.split(",", -1);
                if (cells.length > accountCol && cells.length > firstCol
                        && cells.length > lastCol && cells.length > emailCol) {
                    String rawEmail = cells[emailCol];
                    if (!rawEmail.isBlank()) {
                        if (rawEmail.contains("@")) {
                            String dedupeKey = rawEmail.trim().toLowerCase(Locale.ROOT);
                            if (!seenInThisFile.contains(dedupeKey)) {
                                List<Contact> alreadyHere =
                                        contacts.findByEmailIgnoreCase(rawEmail.toLowerCase(Locale.ROOT));
                                if (alreadyHere.isEmpty()) {
                                    String accountRef = cells[accountCol].trim();
                                    Optional<Account> account = accounts.findByAccountRef(accountRef);
                                    if (account.isPresent()) {
                                        try {
                                            String first = cells[firstCol].trim();
                                            String last = cells[lastCol].trim();
                                            if (!first.isEmpty() && !last.isEmpty()) {
                                                Contact contact = new Contact(
                                                        nextContactRef(),
                                                        account.get(),
                                                        first,
                                                        last,
                                                        rawEmail.trim().toLowerCase(Locale.ROOT));
                                                if (phoneCol >= 0 && cells.length > phoneCol) {
                                                    contact.setPhone(cells[phoneCol].trim());
                                                }
                                                if (titleCol >= 0 && cells.length > titleCol) {
                                                    contact.setJobTitle(cells[titleCol].trim());
                                                }
                                                contact.setStatus(ContactStatus.PROSPECT);
                                                contacts.saveAndFlush(contact);
                                                seenInThisFile.add(dedupeKey);
                                                created = created + 1;
                                            } else {
                                                rejected = rejected + 1;
                                                problems.add("Row " + (i + 1)
                                                        + ": first_name and last_name are both required");
                                            }
                                        } catch (Exception e) {
                                            // The agency sends us some very strange files.
                                            // Keep going rather than losing the whole batch.
                                        }
                                    } else {
                                        rejected = rejected + 1;
                                        problems.add("Row " + (i + 1) + ": no account called " + accountRef);
                                    }
                                } else {
                                    skipped = skipped + 1;
                                }
                            } else {
                                skipped = skipped + 1;
                            }
                        } else {
                            rejected = rejected + 1;
                            problems.add("Row " + (i + 1) + ": " + rawEmail.trim() + " is not an email address");
                        }
                    } else {
                        rejected = rejected + 1;
                        problems.add("Row " + (i + 1) + ": email is required");
                    }
                } else {
                    rejected = rejected + 1;
                    problems.add("Row " + (i + 1) + ": not enough columns");
                }
            }
        }

        StringBuilder report = new StringBuilder();
        report.append("Import complete.\n");
        report.append("Created: ").append(created).append('\n');
        report.append("Skipped as already present: ").append(skipped).append('\n');
        report.append("Rejected: ").append(rejected).append('\n');
        if (!problems.isEmpty()) {
            report.append("\nProblems:\n");
            for (int p = 0; p < problems.size(); p++) {
                report.append("  - ").append(problems.get(p)).append('\n');
            }
        }
        audit.imported(created, skipped, rejected);
        return report.toString();
    }

    private String nextContactRef() {
        long candidate = contacts.count() + 1;
        while (contacts.existsByContactRef(String.format("C-%05d", candidate))) {
            candidate = candidate + 1;
        }
        return String.format("C-%05d", candidate);
    }
}
