using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Data;

/// <summary>
/// The 150 people on the books, as exported from the spreadsheet the CRM replaced.
///
/// <para>ContactRef is assigned in import order, not surname order, because that is
/// the order the old spreadsheet happened to be in. The contacts list screen sorts by
/// surname, so the two orders disagree - which is what CRM-142 is about. Regenerate
/// this file rather than editing rows by hand: the ticket quotes the page a named
/// contact lands on.</para>
/// </summary>
public static class ContactSeedData
{
    private static readonly (string Ref, int Account, string First, string Last,
        string Email, string? Phone, string? JobTitle, ContactStatus Status,
        string? CreditRiskNote, string? LastContactedAt)[] Rows =
    [
        ("C-00001", 8, "Amara", "Beaumont", "amara.beaumont@sableridge.com", "+44 20 7495 4559", "Head of Procurement", ContactStatus.Prospect, null, "2026-06-06T11:59:00"),
        ("C-00002", 15, "Béatrice", "Ellingham", "beatrice.ellingham@ilexpharma.ch", "+44 20 7524 1892", "Finance Manager", ContactStatus.Prospect, null, "2026-08-11T13:33:00"),
        ("C-00003", 22, "Sinead", "Tremaine", "sinead.tremaine@vossinstruments.no", "+44 20 7425 9301", "Managing Director", ContactStatus.Customer, null, "2026-06-20T15:53:00"),
        ("C-00004", 29, "Sinead", "Pemberton", "sinead.pemberton@ferndaletrust.org", "+44 20 7434 1500", "IT Manager", ContactStatus.Prospect, null, "2026-07-06T17:34:00"),
        ("C-00005", 6, "Xavier", "Halloran", "xavier.halloran@nordwind-energie.de", "+44 20 7310 3829", "Facilities Lead", ContactStatus.Prospect, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-03-18T17:05:00"),
        ("C-00006", 13, "Alasdair", "Underwood", "alasdair.underwood@farrowdairy.ie", "+44 20 7668 8028", "Commercial Director", ContactStatus.Customer, "Credit limit capped at 5k pending review.", "2026-06-26T14:11:00"),
        ("C-00007", 20, "Freya", "Da Silva", "freya.dasilva@petrievance.co.uk", "+44 20 7918 9815", "Office Manager", ContactStatus.Prospect, "Parent company in administration 2023. Watch closely.", "2026-06-04T13:52:00"),
        ("C-00008", 27, "Grace", "O'Rourke", "grace.orourke@saltmarshbrewing.co.uk", "+44 20 7470 1286", "Head of Logistics", ContactStatus.Prospect, "Requires PO before any work starts. No exceptions.", "2026-02-11T16:16:00"),
        ("C-00009", 4, "Dermot", "Rasmussen", "dermot.rasmussen@pellier.fr", "+44 20 7411 8001", "Chief Operating Officer", ContactStatus.Customer, "Disputed invoice INV-8841 still unresolved with finance.", "2026-05-15T10:08:00"),
        ("C-00010", 11, "Katarina", "Yardley", "katarina.yardley@oakhurst.property", "+44 20 7882 8866", "Purchasing Lead", ContactStatus.Prospect, null, "2026-04-27T11:05:00"),
        ("C-00011", 18, "Stefan", "Achebe", "stefan.achebe@redwingaviation.aero", "+44 20 7852 5558", "Practice Manager", ContactStatus.Prospect, null, "2026-07-04T15:22:00"),
        ("C-00012", 25, "Joris", "Quigley", "joris.quigley@quillonmedia.com", "+44 20 7586 6196", "Head of Marketing", ContactStatus.Customer, null, "2026-01-27T10:51:00"),
        ("C-00013", 2, "Piotr", "Novotny", "piotr.novotny@brightmoor.dental", "+44 20 7823 3407", "Technical Director", ContactStatus.Prospect, null, "2026-01-08T15:01:00"),
        ("C-00014", 9, "Béatrice", "Halloran", "beatrice.halloran@kestrelmarine.nl", "+44 20 7150 6695", "Regional Manager", ContactStatus.Prospect, null, "2026-04-10T14:54:00"),
        ("C-00015", 16, "Samir", "Ferreira", "samir.ferreira@camberoutdoor.com", "+44 20 7173 5337", "Site Supervisor", ContactStatus.Customer, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-04-20T10:24:00"),
        ("C-00016", 23, "Bethan", "Trelawny", "bethan.trelawny@marchetti-ceramiche.it", "+44 20 7171 3061", "Operations Director", ContactStatus.Prospect, "Credit limit capped at 5k pending review.", "2026-01-01T17:34:00"),
        ("C-00017", 30, "Katarina", "Mainwaring", "katarina.mainwaring@orbistelecom.ie", "+44 20 7486 7661", "Head of Procurement", ContactStatus.Churned, "Parent company in administration 2023. Watch closely.", "2026-07-03T17:31:00"),
        ("C-00018", 7, "Rosalind", "Barlowe", "rosalind.barlowe@tuchet.co.uk", "+44 20 7502 4121", "Finance Manager", ContactStatus.Customer, "Requires PO before any work starts. No exceptions.", "2026-06-06T10:23:00"),
        ("C-00019", 14, "Meera", "Mbeki", "meera.mbeki@trenchard.security", "+44 20 7268 9306", "Managing Director", ContactStatus.Prospect, "Disputed invoice INV-8841 still unresolved with finance.", "2026-07-21T14:27:00"),
        ("C-00020", 21, "Bethan", "Yardley", "bethan.yardley@aldergate.gov.uk", "+44 20 7813 7782", "IT Manager", ContactStatus.Prospect, null, "2026-03-04T12:25:00"),
        ("C-00021", 28, "Nadia", "Draycott", "nadia.draycott@whitcombelogistics.com", "+44 20 7321 6849", "Facilities Lead", ContactStatus.Customer, null, "2026-08-27T17:00:00"),
        ("C-00022", 5, "Ruth", "Pemberton", "ruth.pemberton@ashgrovelegal.com", "+44 20 7336 3146", "Commercial Director", ContactStatus.Prospect, null, "2026-07-13T12:30:00"),
        ("C-00023", 12, "Samir", "Ng", "samir.ng@lumen-optics.de", "+44 20 7519 5991", "Office Manager", ContactStatus.Prospect, null, "2026-07-05T16:02:00"),
        ("C-00024", 19, "Sinead", "Okonkwo", "sinead.okonkwo@stellanfoods.se", "+44 20 7691 8597", "Head of Logistics", ContactStatus.Customer, null, "2026-08-27T16:36:00"),
        ("C-00025", 26, "Lars", "Fenwick", "lars.fenwick@ardentrobotics.com", "+44 20 7356 5500", "Chief Operating Officer", ContactStatus.Prospect, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-08-26T13:53:00"),
        ("C-00026", 3, "Nadia", "Achebe", "nadia.achebe@corvidanalytics.io", "+44 20 7210 3599", "Purchasing Lead", ContactStatus.Prospect, "Credit limit capped at 5k pending review.", "2026-06-26T17:57:00"),
        ("C-00027", 10, "Noor", "Sackville", "noor.sackville@veritytalent.com", "+44 20 7459 2563", "Practice Manager", ContactStatus.Customer, "Parent company in administration 2023. Watch closely.", "2026-05-21T10:21:00"),
        ("C-00028", 17, "Petra", "Delacroix", "petra.delacroix@delacroix-interiors.fr", "+44 20 7581 9189", "Head of Marketing", ContactStatus.Prospect, "Requires PO before any work starts. No exceptions.", "2026-04-20T13:27:00"),
        ("C-00029", 24, "Meera", "Underwood", "meera.underwood@bellhavenhotels.com", "+44 20 7660 2173", "Technical Director", ContactStatus.Prospect, "Disputed invoice INV-8841 still unresolved with finance.", "2026-02-05T12:04:00"),
        ("C-00030", 1, "Rafael", "Fenwick", "rafael.fenwick@halcyonfreight.co.uk", "+44 20 7918 8919", "Regional Manager", ContactStatus.Customer, null, "2026-04-09T11:23:00"),
        ("C-00031", 8, "Ingrid", "Castellanos", "ingrid.castellanos@sableridge.com", "+44 20 7197 1865", "Site Supervisor", ContactStatus.Prospect, null, "2026-07-27T10:38:00"),
        ("C-00032", 15, "Grace", "Aldington", "grace.aldington@ilexpharma.ch", "+44 20 7318 4019", "Operations Director", ContactStatus.Prospect, null, "2026-02-09T17:09:00"),
        ("C-00033", 22, "Nikolai", "Solberg", "nikolai.solberg@vossinstruments.no", "+44 20 7854 8426", "Head of Procurement", ContactStatus.Customer, null, "2026-02-24T12:51:00"),
        ("C-00034", 29, "Aisha", "Pemberton", "aisha.pemberton@ferndaletrust.org", "+44 20 7517 9804", "Finance Manager", ContactStatus.Churned, null, "2026-07-07T13:10:00"),
        ("C-00035", 6, "Gareth", "Rasmussen", "gareth.rasmussen@nordwind-energie.de", "+44 20 7805 7761", "Managing Director", ContactStatus.Prospect, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-07-17T10:43:00"),
        ("C-00036", 13, "Helena", "Rasmussen", "helena.rasmussen@farrowdairy.ie", "+44 20 7393 2315", "IT Manager", ContactStatus.Customer, "Credit limit capped at 5k pending review.", "2026-05-27T13:05:00"),
        ("C-00037", 20, "Lorcan", "Ferreira", "lorcan.ferreira@petrievance.co.uk", "+44 20 7627 4273", "Facilities Lead", ContactStatus.Prospect, "Parent company in administration 2023. Watch closely.", "2026-08-20T13:55:00"),
        ("C-00038", 27, "Rafael", "Ashworth", "rafael.ashworth@saltmarshbrewing.co.uk", "+44 20 7381 5808", "Commercial Director", ContactStatus.Prospect, "Requires PO before any work starts. No exceptions.", "2026-07-07T13:43:00"),
        ("C-00039", 4, "Yusuf", "Lindqvist", "yusuf.lindqvist@pellier.fr", "+44 20 7365 9406", "Office Manager", ContactStatus.Customer, "Disputed invoice INV-8841 still unresolved with finance.", "2026-05-12T11:15:00"),
        ("C-00040", 11, "Nadia", "Whitcombe", "nadia.whitcombe@oakhurst.property", "+44 20 7862 6450", "Head of Logistics", ContactStatus.Prospect, null, "2026-04-27T12:50:00"),
        ("C-00041", 18, "Tamsin", "Fenwick", "tamsin.fenwick@redwingaviation.aero", "+44 20 7667 8655", "Chief Operating Officer", ContactStatus.Prospect, null, "2026-02-15T11:53:00"),
        ("C-00042", 25, "Callum", "Okonkwo", "callum.okonkwo@quillonmedia.com", "+44 20 7760 8509", "Purchasing Lead", ContactStatus.Customer, null, "2026-08-03T17:08:00"),
        ("C-00043", 2, "Bethan", "Beaumont", "bethan.beaumont@brightmoor.dental", "+44 20 7126 3702", "Practice Manager", ContactStatus.Prospect, null, "2026-03-25T10:12:00"),
        ("C-00044", 9, "Idris", "Iqbal", "idris.iqbal@kestrelmarine.nl", "+44 20 7720 9303", "Head of Marketing", ContactStatus.Prospect, null, "2026-05-24T17:17:00"),
        ("C-00045", 16, "Elspeth", "Iqbal", "elspeth.iqbal@camberoutdoor.com", "+44 20 7742 1603", "Technical Director", ContactStatus.Customer, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-03-26T10:24:00"),
        ("C-00046", 23, "Anders", "Trelawny", "anders.trelawny@marchetti-ceramiche.it", "+44 20 7982 4544", "Regional Manager", ContactStatus.Prospect, "Credit limit capped at 5k pending review.", "2026-08-27T17:48:00"),
        ("C-00047", 30, "Rafael", "Cavanagh", "rafael.cavanagh@orbistelecom.ie", "+44 20 7490 2940", "Site Supervisor", ContactStatus.Prospect, "Parent company in administration 2023. Watch closely.", "2026-07-06T15:54:00"),
        ("C-00048", 7, "Callum", "Underwood", "callum.underwood@tuchet.co.uk", "+44 20 7587 4842", "Operations Director", ContactStatus.Customer, "Requires PO before any work starts. No exceptions.", "2026-03-01T13:16:00"),
        ("C-00049", 14, "Rosalind", "O'Rourke", "rosalind.orourke@trenchard.security", "+44 20 7498 1134", "Head of Procurement", ContactStatus.Prospect, "Disputed invoice INV-8841 still unresolved with finance.", "2026-03-08T12:50:00"),
        ("C-00050", 21, "Xavier", "Kowalski", "xavier.kowalski@aldergate.gov.uk", "+44 20 7136 4680", "Finance Manager", ContactStatus.Prospect, null, "2026-07-13T12:21:00"),
        ("C-00051", 28, "Tamsin", "Rasmussen", "tamsin.rasmussen@whitcombelogistics.com", "+44 20 7457 7440", "Managing Director", ContactStatus.Customer, null, "2026-04-12T12:54:00"),
        ("C-00052", 5, "Oscar", "Beaumont", "oscar.beaumont@ashgrovelegal.com", "+44 20 7401 8425", "IT Manager", ContactStatus.Prospect, null, "2026-04-28T15:43:00"),
        ("C-00053", 12, "Piotr", "Ravenscroft", "piotr.ravenscroft@lumen-optics.de", "+44 20 7685 1126", "Facilities Lead", ContactStatus.Prospect, null, "2026-02-16T13:43:00"),
        ("C-00054", 19, "Petra", "O'Rourke", "petra.orourke@stellanfoods.se", "+44 20 7228 2587", "Commercial Director", ContactStatus.Customer, null, "2026-03-04T14:42:00"),
        ("C-00055", 26, "Duncan", "Gallagher", "duncan.gallagher@ardentrobotics.com", "+44 20 7337 2518", "Office Manager", ContactStatus.Prospect, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-04-06T13:27:00"),
        ("C-00056", 3, "Piotr", "Ellingham", "piotr.ellingham@corvidanalytics.io", "+44 20 7495 8870", "Head of Logistics", ContactStatus.Prospect, "Credit limit capped at 5k pending review.", "2026-03-13T13:19:00"),
        ("C-00057", 10, "Duncan", "Marchetti", "duncan.marchetti@veritytalent.com", "+44 20 7578 8781", "Chief Operating Officer", ContactStatus.Customer, "Parent company in administration 2023. Watch closely.", "2026-08-05T12:23:00"),
        ("C-00058", 17, "Lars", "Tremaine", "lars.tremaine@delacroix-interiors.fr", "+44 20 7353 6182", "Purchasing Lead", ContactStatus.Prospect, "Requires PO before any work starts. No exceptions.", "2026-06-27T14:50:00"),
        ("C-00059", 24, "Freya", "Halloran", "freya.halloran@bellhavenhotels.com", "+44 20 7619 7433", "Practice Manager", ContactStatus.Prospect, "Disputed invoice INV-8841 still unresolved with finance.", "2026-06-14T14:48:00"),
        ("C-00060", 1, "Nadia", "Ravenscroft", "nadia.ravenscroft@halcyonfreight.co.uk", "+44 20 7534 3874", "Head of Marketing", ContactStatus.Customer, null, "2026-07-13T16:10:00"),
        ("C-00061", 8, "Nikolai", "Chatterjee", "nikolai.chatterjee@sableridge.com", "+44 20 7865 2689", "Technical Director", ContactStatus.Prospect, null, "2026-08-13T14:10:00"),
        ("C-00062", 15, "Rafael", "Okonkwo", "rafael.okonkwo@ilexpharma.ch", "+44 20 7459 9642", "Regional Manager", ContactStatus.Prospect, null, "2026-02-10T13:09:00"),
        ("C-00063", 22, "Joris", "Thorne", "joris.thorne@vossinstruments.no", "+44 20 7266 2455", "Site Supervisor", ContactStatus.Customer, null, "2026-01-07T12:12:00"),
        ("C-00064", 29, "Alasdair", "Achebe", "alasdair.achebe@ferndaletrust.org", "+44 20 7923 1923", "Operations Director", ContactStatus.Prospect, null, "2026-06-06T14:23:00"),
        ("C-00065", 6, "Callum", "Beaumont", "callum.beaumont@nordwind-energie.de", "+44 20 7657 4030", "Head of Procurement", ContactStatus.Prospect, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-05-14T13:56:00"),
        ("C-00066", 13, "Alasdair", "Marchetti", "alasdair.marchetti@farrowdairy.ie", "+44 20 7754 6362", "Finance Manager", ContactStatus.Customer, "Credit limit capped at 5k pending review.", "2026-01-18T14:27:00"),
        ("C-00067", 20, "Lars", "Kowalski", "lars.kowalski@petrievance.co.uk", "+44 20 7656 4555", "Managing Director", ContactStatus.Prospect, "Parent company in administration 2023. Watch closely.", "2026-01-13T10:09:00"),
        ("C-00068", 27, "Bridget", "Whitcombe", "bridget.whitcombe@saltmarshbrewing.co.uk", "+44 20 7506 3736", "IT Manager", ContactStatus.Churned, "Requires PO before any work starts. No exceptions.", "2026-07-12T12:17:00"),
        ("C-00069", 4, "Stefan", "Ellingham", "stefan.ellingham@pellier.fr", "+44 20 7675 3559", "Facilities Lead", ContactStatus.Customer, "Disputed invoice INV-8841 still unresolved with finance.", "2026-01-06T12:07:00"),
        ("C-00070", 11, "Owen", "Okonkwo", "owen.okonkwo@oakhurst.property", "+44 20 7403 6189", "Commercial Director", ContactStatus.Prospect, null, "2026-04-28T12:50:00"),
        ("C-00071", 18, "Clemency", "Thorne", "clemency.thorne@redwingaviation.aero", "+44 20 7425 1940", "Office Manager", ContactStatus.Prospect, null, "2026-02-01T11:58:00"),
        ("C-00072", 25, "Béatrice", "Yardley", "beatrice.yardley@quillonmedia.com", "+44 20 7649 7375", "Head of Logistics", ContactStatus.Customer, null, "2026-07-02T12:45:00"),
        ("C-00073", 2, "Lorcan", "Castellanos", "lorcan.castellanos@brightmoor.dental", "+44 20 7143 8397", "Chief Operating Officer", ContactStatus.Prospect, null, "2026-01-07T10:58:00"),
        ("C-00074", 9, "Kwame", "Zieliński", "kwame.zielinski@kestrelmarine.nl", "+44 20 7310 1733", "Purchasing Lead", ContactStatus.Prospect, null, "2026-01-03T13:25:00"),
        ("C-00075", 16, "Elspeth", "Fenwick", "elspeth.fenwick@camberoutdoor.com", "+44 20 7159 9939", "Practice Manager", ContactStatus.Customer, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-01-05T15:44:00"),
        ("C-00076", 23, "Freya", "Cavanagh", "freya.cavanagh@marchetti-ceramiche.it", "+44 20 7392 2467", "Head of Marketing", ContactStatus.Prospect, "Credit limit capped at 5k pending review.", "2026-03-02T16:47:00"),
        ("C-00077", 30, "Tomasz", "Gallagher", "tomasz.gallagher@orbistelecom.ie", "+44 20 7755 3509", "Technical Director", ContactStatus.Prospect, "Parent company in administration 2023. Watch closely.", "2026-01-18T10:43:00"),
        ("C-00078", 7, "Dermot", "Pemberton", "dermot.pemberton@tuchet.co.uk", "+44 20 7911 8905", "Regional Manager", ContactStatus.Customer, "Requires PO before any work starts. No exceptions.", "2026-05-14T12:14:00"),
        ("C-00079", 14, "Clemency", "Yardley", "clemency.yardley@trenchard.security", "+44 20 7500 5155", "Site Supervisor", ContactStatus.Prospect, "Disputed invoice INV-8841 still unresolved with finance.", "2026-05-01T12:07:00"),
        ("C-00080", 21, "Piotr", "Quigley", "piotr.quigley@aldergate.gov.uk", "+44 20 7626 6337", "Operations Director", ContactStatus.Prospect, null, "2026-04-04T12:43:00"),
        ("C-00081", 28, "Lars", "Da Silva", "lars.dasilva@whitcombelogistics.com", "+44 20 7243 8393", "Head of Procurement", ContactStatus.Customer, null, "2026-07-18T12:34:00"),
        ("C-00082", 5, "Meera", "Okonkwo", "meera.okonkwo@ashgrovelegal.com", "+44 20 7453 4179", "Finance Manager", ContactStatus.Prospect, null, "2026-08-11T17:56:00"),
        ("C-00083", 12, "Callum", "Delacroix", "callum.delacroix@lumen-optics.de", "+44 20 7100 5661", "Managing Director", ContactStatus.Prospect, null, "2026-06-20T12:54:00"),
        ("C-00084", 19, "Nadia", "O'Rourke", "nadia.orourke@stellanfoods.se", "+44 20 7878 5138", "IT Manager", ContactStatus.Customer, null, "2026-05-28T10:01:00"),
        ("C-00085", 26, "Dermot", "Marchetti", "dermot.marchetti@ardentrobotics.com", "+44 20 7568 3966", "Facilities Lead", ContactStatus.Churned, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-07-06T12:43:00"),
        ("C-00086", 3, "Callum", "Thorne", "callum.thorne@corvidanalytics.io", "+44 20 7156 7105", "Commercial Director", ContactStatus.Prospect, "Credit limit capped at 5k pending review.", "2026-04-14T16:49:00"),
        ("C-00087", 10, "Nikolai", "Kowalski", "nikolai.kowalski@veritytalent.com", "+44 20 7932 8795", "Office Manager", ContactStatus.Customer, "Parent company in administration 2023. Watch closely.", "2026-06-09T17:03:00"),
        ("C-00088", 17, "Xavier", "Osei", "xavier.osei@delacroix-interiors.fr", "+44 20 7440 1257", "Head of Logistics", ContactStatus.Prospect, "Requires PO before any work starts. No exceptions.", "2026-04-16T14:50:00"),
        ("C-00089", 24, "Nadia", "Fenwick", "nadia.fenwick@bellhavenhotels.com", "+44 20 7644 7637", "Chief Operating Officer", ContactStatus.Prospect, "Disputed invoice INV-8841 still unresolved with finance.", "2026-05-03T13:43:00"),
        ("C-00090", 1, "Callum", "Fenwick", "callum.fenwick@halcyonfreight.co.uk", "+44 20 7140 6302", "Purchasing Lead", ContactStatus.Customer, null, "2026-02-18T16:18:00"),
        ("C-00091", 8, "Grace", "Whitcombe", "grace.whitcombe@sableridge.com", "+44 20 7468 5733", "Practice Manager", ContactStatus.Prospect, null, "2026-08-05T11:24:00"),
        ("C-00092", 15, "Yusuf", "Whitcombe", "yusuf.whitcombe@ilexpharma.ch", "+44 20 7552 6214", "Head of Marketing", ContactStatus.Prospect, null, "2026-04-19T10:53:00"),
        ("C-00093", 22, "Owen", "Farthing", "owen.farthing@vossinstruments.no", "+44 20 7930 6499", "Technical Director", ContactStatus.Customer, null, "2026-05-15T13:02:00"),
        ("C-00094", 29, "Tomasz", "Cavanagh", "tomasz.cavanagh@ferndaletrust.org", "+44 20 7438 1571", "Regional Manager", ContactStatus.Prospect, null, "2026-06-19T12:31:00"),
        ("C-00095", 6, "Emeka", "Vandermeer", "emeka.vandermeer@nordwind-energie.de", "+44 20 7752 8152", "Site Supervisor", ContactStatus.Prospect, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-03-11T13:34:00"),
        ("C-00096", 13, "Ingrid", "Pemberton", "ingrid.pemberton@farrowdairy.ie", "+44 20 7339 4121", "Operations Director", ContactStatus.Customer, "Credit limit capped at 5k pending review.", "2026-04-18T13:33:00"),
        ("C-00097", 20, "Joris", "Gallagher", "joris.gallagher@petrievance.co.uk", "+44 20 7474 3406", "Head of Procurement", ContactStatus.Prospect, "Parent company in administration 2023. Watch closely.", "2026-01-24T14:10:00"),
        ("C-00098", 27, "Anita", "Lindqvist", "anita.lindqvist@saltmarshbrewing.co.uk", "+44 20 7981 3006", "Finance Manager", ContactStatus.Prospect, "Requires PO before any work starts. No exceptions.", "2026-01-01T17:18:00"),
        ("C-00099", 4, "Piotr", "Beaumont", "piotr.beaumont@pellier.fr", "+44 20 7892 7898", "Managing Director", ContactStatus.Customer, "Disputed invoice INV-8841 still unresolved with finance.", "2026-05-23T14:13:00"),
        ("C-00100", 11, "Katarina", "Kowalski", "katarina.kowalski@oakhurst.property", "+44 20 7291 8802", "IT Manager", ContactStatus.Prospect, null, "2026-07-06T17:21:00"),
        ("C-00101", 18, "Vikram", "Thorne", "vikram.thorne@redwingaviation.aero", "+44 20 7394 4006", "Facilities Lead", ContactStatus.Prospect, null, "2026-05-25T15:48:00"),
        ("C-00102", 25, "Elspeth", "Barlowe", "elspeth.barlowe@quillonmedia.com", "+44 20 7782 5704", "Commercial Director", ContactStatus.Customer, null, "2026-02-22T16:44:00"),
        ("C-00103", 2, "Kwame", "Kowalski", "kwame.kowalski@brightmoor.dental", "+44 20 7629 5069", "Office Manager", ContactStatus.Prospect, null, "2026-02-06T10:32:00"),
        ("C-00104", 9, "Elspeth", "Novotny", "elspeth.novotny@kestrelmarine.nl", "+44 20 7252 5626", "Head of Logistics", ContactStatus.Prospect, null, "2026-05-22T11:09:00"),
        ("C-00105", 16, "Grace", "Osei", "grace.osei@camberoutdoor.com", "+44 20 7604 1594", "Chief Operating Officer", ContactStatus.Customer, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-01-16T15:35:00"),
        ("C-00106", 23, "Callum", "Winterbourne", "callum.winterbourne@marchetti-ceramiche.it", "+44 20 7895 1721", "Purchasing Lead", ContactStatus.Prospect, "Credit limit capped at 5k pending review.", "2026-03-20T17:43:00"),
        ("C-00107", 30, "Hugo", "Mainwaring", "hugo.mainwaring@orbistelecom.ie", "+44 20 7467 9010", "Practice Manager", ContactStatus.Prospect, "Parent company in administration 2023. Watch closely.", "2026-04-11T16:32:00"),
        ("C-00108", 7, "Lorcan", "Gallagher", "lorcan.gallagher@tuchet.co.uk", "+44 20 7588 5754", "Head of Marketing", ContactStatus.Customer, "Requires PO before any work starts. No exceptions.", "2026-07-18T11:26:00"),
        ("C-00109", 14, "Samir", "Haverford", "samir.haverford@trenchard.security", "+44 20 7491 7813", "Technical Director", ContactStatus.Prospect, "Disputed invoice INV-8841 still unresolved with finance.", "2026-01-16T12:13:00"),
        ("C-00110", 21, "Duncan", "Ashworth", "duncan.ashworth@aldergate.gov.uk", "+44 20 7674 3144", "Regional Manager", ContactStatus.Prospect, null, "2026-06-17T17:04:00"),
        ("C-00111", 28, "Kwame", "Cavanagh", "kwame.cavanagh@whitcombelogistics.com", "+44 20 7881 9365", "Site Supervisor", ContactStatus.Customer, null, "2026-03-18T12:17:00"),
        ("C-00112", 5, "Nikolai", "Winterbourne", "nikolai.winterbourne@ashgrovelegal.com", "+44 20 7867 1779", "Operations Director", ContactStatus.Prospect, null, "2026-01-09T14:49:00"),
        ("C-00113", 12, "Joris", "Sackville", "joris.sackville@lumen-optics.de", "+44 20 7148 6981", "Head of Procurement", ContactStatus.Prospect, null, "2026-02-26T15:55:00"),
        ("C-00114", 19, "Marcus", "Halloran", "marcus.halloran@stellanfoods.se", "+44 20 7556 2858", "Finance Manager", ContactStatus.Customer, null, "2026-06-07T11:42:00"),
        ("C-00115", 26, "Hugo", "Farthing", "hugo.farthing@ardentrobotics.com", "+44 20 7375 6527", "Managing Director", ContactStatus.Prospect, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-04-21T14:28:00"),
        ("C-00116", 3, "Ruth", "Marchetti", "ruth.marchetti@corvidanalytics.io", "+44 20 7363 5385", "IT Manager", ContactStatus.Prospect, "Credit limit capped at 5k pending review.", "2026-03-23T17:35:00"),
        ("C-00117", 10, "Idris", "Rasmussen", "idris.rasmussen@veritytalent.com", "+44 20 7674 3699", "Facilities Lead", ContactStatus.Customer, "Parent company in administration 2023. Watch closely.", "2026-02-26T13:22:00"),
        ("C-00118", 17, "Duncan", "Cavanagh", "duncan.cavanagh@delacroix-interiors.fr", "+44 20 7105 7279", "Commercial Director", ContactStatus.Prospect, "Requires PO before any work starts. No exceptions.", "2026-06-17T13:58:00"),
        ("C-00119", 24, "Clemency", "Barlowe", "clemency.barlowe@bellhavenhotels.com", "+44 20 7780 3140", "Office Manager", ContactStatus.Churned, "Disputed invoice INV-8841 still unresolved with finance.", "2026-02-23T15:08:00"),
        ("C-00120", 1, "Helena", "Lindqvist", "helena.lindqvist@halcyonfreight.co.uk", "+44 20 7949 1375", "Head of Logistics", ContactStatus.Customer, null, "2026-07-24T15:10:00"),
        ("C-00121", 8, "Rafael", "Pemberton", "rafael.pemberton@sableridge.com", "+44 20 7120 2338", "Chief Operating Officer", ContactStatus.Prospect, null, "2026-02-12T13:50:00"),
        ("C-00122", 15, "Tamsin", "Nakamura", "tamsin.nakamura@ilexpharma.ch", "+44 20 7423 8800", "Purchasing Lead", ContactStatus.Prospect, null, "2026-01-26T16:59:00"),
        ("C-00123", 22, "Nadia", "Cavanagh", "nadia.cavanagh@vossinstruments.no", "+44 20 7584 2392", "Practice Manager", ContactStatus.Customer, null, "2026-02-17T17:45:00"),
        ("C-00124", 29, "Freya", "Mbeki", "freya.mbeki@ferndaletrust.org", "+44 20 7164 2438", "Head of Marketing", ContactStatus.Prospect, null, "2026-07-09T11:33:00"),
        ("C-00125", 6, "Owen", "Chatterjee", "owen.chatterjee@nordwind-energie.de", "+44 20 7231 6544", "Technical Director", ContactStatus.Prospect, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-05-12T13:11:00"),
        ("C-00126", 13, "Clemency", "Quigley", "clemency.quigley@farrowdairy.ie", "+44 20 7557 6475", "Regional Manager", ContactStatus.Customer, "Credit limit capped at 5k pending review.", "2026-03-08T15:00:00"),
        ("C-00127", 20, "Dermot", "Bakshi", "dermot.bakshi@petrievance.co.uk", "+44 20 7593 4286", "Site Supervisor", ContactStatus.Prospect, "Parent company in administration 2023. Watch closely.", "2026-05-12T13:26:00"),
        ("C-00128", 27, "Elspeth", "Osei", "elspeth.osei@saltmarshbrewing.co.uk", "+44 20 7104 8455", "Operations Director", ContactStatus.Prospect, "Requires PO before any work starts. No exceptions.", "2026-07-23T16:12:00"),
        ("C-00129", 4, "Anita", "Underwood", "anita.underwood@pellier.fr", "+44 20 7341 5215", "Head of Procurement", ContactStatus.Customer, "Disputed invoice INV-8841 still unresolved with finance.", "2026-08-26T16:38:00"),
        ("C-00130", 11, "Ingrid", "Zieliński", "ingrid.zielinski@oakhurst.property", "+44 20 7746 2921", "Finance Manager", ContactStatus.Prospect, null, "2026-03-03T11:44:00"),
        ("C-00131", 18, "Stefan", "Mbeki", "stefan.mbeki@redwingaviation.aero", "+44 20 7359 4525", "Managing Director", ContactStatus.Prospect, null, "2026-02-06T16:31:00"),
        ("C-00132", 25, "Oscar", "Marchetti", "oscar.marchetti@quillonmedia.com", "+44 20 7185 3843", "IT Manager", ContactStatus.Customer, null, "2026-03-07T15:09:00"),
        ("C-00133", 2, "Samir", "Farthing", "samir.farthing@brightmoor.dental", "+44 20 7534 3962", "Facilities Lead", ContactStatus.Prospect, null, "2026-04-15T17:19:00"),
        ("C-00134", 9, "Anita", "Gallagher", "anita.gallagher@kestrelmarine.nl", "+44 20 7840 5524", "Commercial Director", ContactStatus.Prospect, null, "2026-02-26T17:33:00"),
        ("C-00135", 16, "Tomasz", "Pemberton", "tomasz.pemberton@camberoutdoor.com", "+44 20 7908 6273", "Office Manager", ContactStatus.Customer, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-08-05T11:47:00"),
        ("C-00136", 23, "Aisha", "Cavanagh", "aisha.cavanagh@marchetti-ceramiche.it", "+44 20 7729 1309", "Head of Logistics", ContactStatus.Churned, "Credit limit capped at 5k pending review.", "2026-02-04T11:01:00"),
        ("C-00137", 30, "Leila", "Ravenscroft", "leila.ravenscroft@orbistelecom.ie", "+44 20 7332 8340", "Chief Operating Officer", ContactStatus.Prospect, "Parent company in administration 2023. Watch closely.", "2026-07-26T13:59:00"),
        ("C-00138", 7, "Meera", "Castellanos", "meera.castellanos@tuchet.co.uk", "+44 20 7559 7405", "Purchasing Lead", ContactStatus.Customer, "Requires PO before any work starts. No exceptions.", "2026-02-20T15:57:00"),
        ("C-00139", 14, "Lars", "Thorne", "lars.thorne@trenchard.security", "+44 20 7321 6450", "Practice Manager", ContactStatus.Prospect, "Disputed invoice INV-8841 still unresolved with finance.", "2026-02-24T13:49:00"),
        ("C-00140", 21, "Oscar", "Whitcombe", "oscar.whitcombe@aldergate.gov.uk", "+44 20 7153 6202", "Head of Marketing", ContactStatus.Prospect, null, "2026-06-02T15:10:00"),
        ("C-00141", 28, "Elspeth", "Chatterjee", "elspeth.chatterjee@whitcombelogistics.com", "+44 20 7885 7080", "Technical Director", ContactStatus.Customer, null, "2026-05-19T15:01:00"),
        ("C-00142", 5, "Oscar", "Kowalski", "oscar.kowalski@ashgrovelegal.com", "+44 20 7163 8392", "Regional Manager", ContactStatus.Prospect, null, "2026-07-03T12:40:00"),
        ("C-00143", 12, "Callum", "Halloran", "callum.halloran@lumen-optics.de", "+44 20 7975 1433", "Site Supervisor", ContactStatus.Prospect, null, "2026-05-09T11:42:00"),
        ("C-00144", 19, "Helena", "Da Silva", "helena.dasilva@stellanfoods.se", "+44 20 7140 1748", "Operations Director", ContactStatus.Customer, null, "2026-04-25T11:42:00"),
        ("C-00145", 26, "Joris", "Aldington", "joris.aldington@ardentrobotics.com", "+44 20 7454 4184", "Head of Procurement", ContactStatus.Prospect, "Late payer — 60+ days on last three invoices. Net-15 only.", "2026-08-12T17:43:00"),
        ("C-00146", 3, "Elspeth", "Lindqvist", "elspeth.lindqvist@corvidanalytics.io", "+44 20 7762 1148", "Finance Manager", ContactStatus.Prospect, "Credit limit capped at 5k pending review.", "2026-06-21T13:07:00"),
        ("C-00147", 10, "Lorcan", "Prendergast", "lorcan.prendergast@veritytalent.com", "+44 20 7473 9519", "Managing Director", ContactStatus.Customer, "Parent company in administration 2023. Watch closely.", "2026-01-24T12:12:00"),
        ("C-00148", 17, "Rosalind", "Nakamura", "rosalind.nakamura@delacroix-interiors.fr", "+44 20 7443 5592", "IT Manager", ContactStatus.Prospect, "Requires PO before any work starts. No exceptions.", "2026-03-11T12:26:00"),
        ("C-00149", 24, "Oscar", "Thorne", "oscar.thorne@bellhavenhotels.com", "+44 20 7132 5493", "Facilities Lead", ContactStatus.Prospect, "Disputed invoice INV-8841 still unresolved with finance.", "2026-06-04T15:03:00"),
        ("C-00150", 1, "Callum", "Chatterjee", "callum.chatterjee@halcyonfreight.co.uk", "+44 20 7381 6976", "Commercial Director", ContactStatus.Customer, null, "2026-07-21T13:49:00"),
    ];

    public static void Seed(CrmDbContext db)
    {
        if (db.Contacts.Any())
        {
            return;
        }

        var accountIds = db.Accounts.ToDictionary(a => a.AccountRef, a => a.Id);

        foreach (var row in Rows)
        {
            var contact = new Contact(
                row.Ref,
                accountIds[$"A-{row.Account:D4}"],
                row.First,
                row.Last,
                row.Email)
            {
                Phone = row.Phone,
                JobTitle = row.JobTitle,
                Status = row.Status,
                CreditRiskNote = row.CreditRiskNote,
                LastContactedAt = row.LastContactedAt is null
                    ? null
                    : DateTimeOffset.Parse(row.LastContactedAt)
            };

            db.Contacts.Add(contact);
        }

        db.SaveChanges();
    }
}
