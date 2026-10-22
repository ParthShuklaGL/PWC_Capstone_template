# Backlog

Every piece of work for the Deals UI project. Pick tickets up in sprint order and respect the dependencies. Each ticket is done when its acceptance criteria are met and the definition of done in the [KT handover](../KT-HANDOVER.md#11-how-we-work-together) is satisfied.

## Sprint 1: A signed-in rep can find any customer and see the whole relationship.

| Ticket | Type | Epic | Priority | Points |
|---|---|---|---|---|
| [NIM-100 · Explore the API and write the specification](NIM-100-spike-api-and-spec.md) | Spike | Quality & release | Highest | 3 |
| [NIM-101 · Front-end project setup](NIM-101-project-setup.md) | Task | Quality & release | Highest | 2 |
| [NIM-102 · Sign in](NIM-102-sign-in.md) | Story | Access & identity | Highest | 3 |
| [NIM-103 · Session lifetime and sign-out](NIM-103-session-and-sign-out.md) | Story | Access & identity | High | 3 |
| [NIM-104 · Only show what my role allows](NIM-104-role-aware-access.md) | Story | Access & identity | High | 3 |
| [NIM-110 · Contact list](NIM-110-contact-list.md) | Story | Customers (contacts & accounts) | High | 3 |
| [NIM-111 · Find a contact](NIM-111-find-a-contact.md) | Story | Customers (contacts & accounts) | High | 2 |
| [NIM-112 · Contact profile](NIM-112-contact-profile.md) | Story | Customers (contacts & accounts) | High | 5 |
| [NIM-113 · Accounts and the people at them](NIM-113-accounts.md) | Story | Customers (contacts & accounts) | Medium | 3 |
| [NIM-114 · CRM-142: Contacts list is not in the order it claims to be](NIM-114-bug-crm-142-contact-order.md) | Bug | Customers (contacts & accounts) | High | 2 |

**Sprint 1 total: 29 points**

## Sprint 2: Reps run their own pipeline in the CRM, and Priya has her Monday number.

| Ticket | Type | Epic | Priority | Points |
|---|---|---|---|---|
| [NIM-120 · Deal list](NIM-120-deal-list.md) | Story | Deal pipeline | Highest | 5 |
| [NIM-121 · Deal details and history](NIM-121-deal-details.md) | Story | Deal pipeline | High | 3 |
| [NIM-122 · Move a deal through the pipeline](NIM-122-move-deal-stage.md) | Story | Deal pipeline | Highest | 5 |
| [NIM-123 · Pipeline board and the Monday number](NIM-123-pipeline-board.md) | Story | Deal pipeline | Highest | 5 |
| [NIM-124 · Deals and activity on the contact page](NIM-124-contact-deals-and-activity.md) | Story | Deal pipeline | High | 3 |
| [NIM-125 · Home page](NIM-125-home-dashboard.md) | Story | Deal pipeline | Medium | 3 |

**Sprint 2 total: 24 points**

## Sprint 3: Priya manages the data herself, the app is tested, and we release.

| Ticket | Type | Epic | Priority | Points |
|---|---|---|---|---|
| [NIM-130 · Create, edit and delete deals](NIM-130-manage-deals.md) | Story | Data management (admin) | Highest | 5 |
| [NIM-131 · Assign a deal owner](NIM-131-deal-owner.md) | Story | Data management (admin) | High | 2 |
| [NIM-132 · Add and edit accounts](NIM-132-manage-accounts.md) | Story | Data management (admin) | Medium | 3 |
| [NIM-133 · Add and edit contacts](NIM-133-manage-contacts.md) | Story | Data management (admin) | Medium | 3 |
| [NIM-134 · Import leads from the agency](NIM-134-import-leads.md) | Story | Data management (admin) | Low | 5 |
| [NIM-140 · Automated tests, then audit them](NIM-140-automated-tests.md) | Task | Quality & release | High | 5 |
| [NIM-141 · Review and harden](NIM-141-review-and-harden.md) | Task | Quality & release | High | 3 |
| [NIM-142 · Release](NIM-142-release.md) | Task | Quality & release | High | 2 |

**Sprint 3 total: 28 points**

## By epic

- **Access & identity:** [NIM-102](NIM-102-sign-in.md), [NIM-103](NIM-103-session-and-sign-out.md), [NIM-104](NIM-104-role-aware-access.md)
- **Customers (contacts & accounts):** [NIM-110](NIM-110-contact-list.md), [NIM-111](NIM-111-find-a-contact.md), [NIM-112](NIM-112-contact-profile.md), [NIM-113](NIM-113-accounts.md), [NIM-114](NIM-114-bug-crm-142-contact-order.md)
- **Deal pipeline:** [NIM-120](NIM-120-deal-list.md), [NIM-121](NIM-121-deal-details.md), [NIM-122](NIM-122-move-deal-stage.md), [NIM-123](NIM-123-pipeline-board.md), [NIM-124](NIM-124-contact-deals-and-activity.md), [NIM-125](NIM-125-home-dashboard.md)
- **Data management (admin):** [NIM-130](NIM-130-manage-deals.md), [NIM-131](NIM-131-deal-owner.md), [NIM-132](NIM-132-manage-accounts.md), [NIM-133](NIM-133-manage-contacts.md), [NIM-134](NIM-134-import-leads.md)
- **Quality & release:** [NIM-100](NIM-100-spike-api-and-spec.md), [NIM-101](NIM-101-project-setup.md), [NIM-140](NIM-140-automated-tests.md), [NIM-141](NIM-141-review-and-harden.md), [NIM-142](NIM-142-release.md)

*Ticket types: **Story**, user-facing value; **Task**, technical work; **Spike**, timeboxed investigation; **Bug**, a reported defect.*
