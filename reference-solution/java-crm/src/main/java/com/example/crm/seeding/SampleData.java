package com.example.crm.seeding;

import com.example.crm.domain.Account;
import com.example.crm.domain.Activity;
import com.example.crm.domain.ActivityType;
import com.example.crm.domain.Contact;
import com.example.crm.domain.ContactStatus;
import com.example.crm.domain.Deal;
import com.example.crm.domain.DealStage;
import com.example.crm.domain.User;
import com.example.crm.repo.AccountRepository;
import com.example.crm.repo.ActivityRepository;
import com.example.crm.repo.ContactRepository;
import com.example.crm.repo.DealRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Fixed, made-up sample data so the reports have something to show: 8 accounts (one with no contacts), 20 contacts,
 * 18 deals across all six stages and 30 activities logged by the two seeded users. The same records, in the same
 * order, as the .NET SampleData, so ids and report numbers match. Development only.
 */
public final class SampleData {
    public static final int ACCOUNT_COUNT = 8;
    public static final int CONTACT_COUNT = 20;
    public static final int DEAL_COUNT = 18;
    public static final int ACTIVITY_COUNT = 30;

    private record AccountRow(String name, String industry, String country) {}
    private record ContactRow(int account, String first, String last, String job) {}
    private record DealRow(int contact, String title, String value, DealStage stage, String lostReason) {}
    private record ActivityRow(int contact, ActivityType type, String subject, int daysAgo) {}

    private static final List<AccountRow> ACCOUNTS = List.of(
            new AccountRow("Halcyon Freight", "Logistics", "United Kingdom"),
            new AccountRow("Brightwater Foods", "Food and Beverage", "Ireland"),
            new AccountRow("Northgate Logistics", "Logistics", "United Kingdom"),
            new AccountRow("Pinecrest Health", "Healthcare", "Germany"),
            new AccountRow("Lumen Analytics", "Software", "Netherlands"),
            new AccountRow("Cobalt Engineering", "Manufacturing", "France"),
            new AccountRow("Meridian Retail", "Retail", "United Kingdom"),
            new AccountRow("Ashford Legal", "Legal Services", "United Kingdom"));

    // Account index, first name, last name, job title. Index 7 (Ashford Legal) has no contacts.
    private static final List<ContactRow> CONTACTS = List.of(
            new ContactRow(0, "Maya", "Okafor", "Head of Operations"),
            new ContactRow(0, "Tom", "Hargreaves", "Fleet Manager"),
            new ContactRow(0, "Priya", "Nair", "Finance Director"),
            new ContactRow(0, "Luis", "Ortega", "Procurement Lead"),
            new ContactRow(1, "Aoife", "Brennan", "Buying Director"),
            new ContactRow(1, "Declan", "Walsh", "Supply Chain Manager"),
            new ContactRow(1, "Sinead", "Rooney", "Chief Financial Officer"),
            new ContactRow(2, "Greg", "Hollis", "Chief Operating Officer"),
            new ContactRow(2, "Hannah", "Beck", "IT Manager"),
            new ContactRow(2, "Omar", "Siddiqui", "Warehouse Lead"),
            new ContactRow(3, "Lena", "Vogel", "Medical Director"),
            new ContactRow(3, "Jonas", "Keller", "Procurement Manager"),
            new ContactRow(3, "Marta", "Schmidt", "Operations Manager"),
            new ContactRow(4, "Eva", "de Vries", "Chief Technology Officer"),
            new ContactRow(4, "Bram", "Jansen", "Head of Data"),
            new ContactRow(4, "Noor", "Haddad", "Product Lead"),
            new ContactRow(5, "Claire", "Dubois", "Plant Manager"),
            new ContactRow(5, "Mathieu", "Laurent", "Purchasing Manager"),
            new ContactRow(6, "Sophie", "Turner", "Merchandising Director"),
            new ContactRow(6, "Ravi", "Patel", "Ecommerce Lead"));

    // Contact index, title, value in GBP, stage, lost reason.
    private static final List<DealRow> DEALS = List.of(
            new DealRow(0, "Fleet telematics rollout", "48000.00", DealStage.WON, null),
            new DealRow(2, "Invoice automation", "18500.00", DealStage.WON, null),
            new DealRow(4, "Cold-chain monitoring", "36000.00", DealStage.WON, null),
            new DealRow(14, "Dashboard add-on", "8400.00", DealStage.WON, null),
            new DealRow(18, "Loyalty integration", "26500.00", DealStage.WON, null),
            new DealRow(1, "Driver safety pilot", "12750.50", DealStage.PROSPECTING, null),
            new DealRow(9, "Warehouse sensors", "19200.00", DealStage.PROSPECTING, null),
            new DealRow(12, "Compliance reporting", "14900.00", DealStage.PROSPECTING, null),
            new DealRow(3, "Procurement portal", "22400.00", DealStage.QUALIFIED, null),
            new DealRow(11, "Inventory tracking", "31250.00", DealStage.QUALIFIED, null),
            new DealRow(16, "Line monitoring", "41000.00", DealStage.QUALIFIED, null),
            new DealRow(5, "Supplier analytics", "15300.00", DealStage.PROPOSAL, null),
            new DealRow(8, "Dispatch dashboard", "27800.75", DealStage.PROPOSAL, null),
            new DealRow(13, "Data platform licence", "56000.00", DealStage.PROPOSAL, null),
            new DealRow(7, "Route optimisation", "64000.00", DealStage.NEGOTIATION, null),
            new DealRow(10, "Patient scheduling suite", "83500.00", DealStage.NEGOTIATION, null),
            new DealRow(6, "Churn win-back offer", "9800.00", DealStage.LOST, "Budget frozen"),
            new DealRow(19, "Checkout analytics", "17650.00", DealStage.LOST, "Chose a competitor"));

    // Contact index, type, subject, days ago. The first user logs two of every three, the second user the rest.
    private static final List<ActivityRow> ACTIVITIES = List.of(
            new ActivityRow(0, ActivityType.CALL, "Discovery call", 52),
            new ActivityRow(0, ActivityType.MEETING, "Telematics demo on site", 40),
            new ActivityRow(0, ActivityType.EMAIL, "Sent contract draft", 24),
            new ActivityRow(2, ActivityType.CALL, "Finance review", 38),
            new ActivityRow(2, ActivityType.EMAIL, "Invoice automation quote", 30),
            new ActivityRow(4, ActivityType.MEETING, "Cold-chain site visit", 45),
            new ActivityRow(4, ActivityType.NOTE, "Wants sensors in all depots", 44),
            new ActivityRow(4, ActivityType.CALL, "Contract signed", 28),
            new ActivityRow(1, ActivityType.CALL, "Intro call", 21),
            new ActivityRow(1, ActivityType.EMAIL, "Pilot proposal sent", 14),
            new ActivityRow(3, ActivityType.MEETING, "Portal requirements workshop", 18),
            new ActivityRow(5, ActivityType.CALL, "Supplier data walkthrough", 16),
            new ActivityRow(5, ActivityType.EMAIL, "Proposal follow-up", 9),
            new ActivityRow(6, ActivityType.NOTE, "Budget frozen until Q2", 33),
            new ActivityRow(7, ActivityType.MEETING, "Route planning session", 12),
            new ActivityRow(7, ActivityType.EMAIL, "Negotiation terms", 6),
            new ActivityRow(8, ActivityType.CALL, "Dashboard feedback", 11),
            new ActivityRow(9, ActivityType.NOTE, "Needs approval from COO", 8),
            new ActivityRow(10, ActivityType.MEETING, "Scheduling suite demo", 15),
            new ActivityRow(10, ActivityType.EMAIL, "Pricing discussion", 5),
            new ActivityRow(11, ActivityType.CALL, "Inventory scoping", 20),
            new ActivityRow(12, ActivityType.EMAIL, "Compliance checklist", 10),
            new ActivityRow(13, ActivityType.MEETING, "Platform architecture review", 13),
            new ActivityRow(14, ActivityType.CALL, "Add-on renewal", 36),
            new ActivityRow(16, ActivityType.CALL, "Line monitoring intro", 7),
            new ActivityRow(17, ActivityType.EMAIL, "Spec sheet sent", 4),
            new ActivityRow(18, ActivityType.MEETING, "Loyalty kickoff", 26),
            new ActivityRow(18, ActivityType.NOTE, "Go-live in November", 22),
            new ActivityRow(19, ActivityType.CALL, "Lost to competitor", 19),
            new ActivityRow(15, ActivityType.EMAIL, "Product lead intro", 3));

    private SampleData() {}

    /** Adds the sample records; every list is saved in order so ids run 1..n. Needs at least one user. */
    public static void add(AccountRepository accountRepo, ContactRepository contactRepo, DealRepository dealRepo,
                           ActivityRepository activityRepo, List<User> users, Instant now) {
        List<Account> accounts = new ArrayList<>();
        for (AccountRow a : ACCOUNTS) {
            Account account = new Account();
            account.setName(a.name());
            account.setIndustry(a.industry());
            account.setCountry(a.country());
            account.setCreatedAt(daysAgo(now, 90));
            accounts.add(account);
        }
        accountRepo.saveAll(accounts);

        List<Contact> contacts = new ArrayList<>();
        for (ContactRow c : CONTACTS) {
            Contact contact = new Contact();
            contact.setAccount(accounts.get(c.account()));
            contact.setFirstName(c.first());
            contact.setLastName(c.last());
            String domain = ACCOUNTS.get(c.account()).name().replace(" ", "") + ".example";
            contact.setEmail((c.first() + "." + c.last() + "@" + domain).replace(" ", "").toLowerCase());
            contact.setJobTitle(c.job());
            contact.setStatus(ContactStatus.PROSPECT);
            contact.setCreatedAt(daysAgo(now, 80));
            contacts.add(contact);
        }
        contacts.get(6).setStatus(ContactStatus.CHURNED);

        for (DealRow d : DEALS) {
            if (d.stage() == DealStage.WON) {
                contacts.get(d.contact()).setStatus(ContactStatus.CUSTOMER);
            }
        }
        for (ActivityRow a : ACTIVITIES) {
            Contact contact = contacts.get(a.contact());
            Instant occurred = daysAgo(now, a.daysAgo());
            if (contact.getLastContactedAt() == null || contact.getLastContactedAt().isBefore(occurred)) {
                contact.setLastContactedAt(occurred);
            }
        }
        contactRepo.saveAll(contacts);

        List<Deal> deals = new ArrayList<>();
        for (DealRow d : DEALS) {
            boolean closed = d.stage().isClosed();
            Deal deal = new Deal();
            deal.setContact(contacts.get(d.contact()));
            deal.setTitle(d.title());
            deal.setValue(new BigDecimal(d.value()));
            deal.setStage(d.stage());
            deal.setExpectedCloseDate(date(now, closed ? -10 : 30));
            deal.setClosedDate(closed ? date(now, -10) : null);
            deal.setLostReason(d.lostReason());
            deal.setCreatedAt(daysAgo(now, 60));
            deal.setUpdatedAt(daysAgo(now, 10));
            deals.add(deal);
        }
        dealRepo.saveAll(deals);

        List<Activity> activities = new ArrayList<>();
        for (int i = 0; i < ACTIVITIES.size(); i++) {
            ActivityRow a = ACTIVITIES.get(i);
            Instant occurred = daysAgo(now, a.daysAgo());
            Activity activity = new Activity();
            activity.setContact(contacts.get(a.contact()));
            activity.setUser(users.get(i % 3 == 0 && users.size() > 1 ? 1 : 0));
            activity.setType(a.type());
            activity.setSubject(a.subject());
            activity.setOccurredAt(occurred);
            activity.setCreatedAt(occurred);
            activities.add(activity);
        }
        activityRepo.saveAll(activities);
    }

    private static Instant daysAgo(Instant now, int days) {
        return now.minus(days, ChronoUnit.DAYS);
    }

    private static LocalDate date(Instant now, int offsetDays) {
        return LocalDate.ofInstant(now, ZoneOffset.UTC).plusDays(offsetDays);
    }
}
