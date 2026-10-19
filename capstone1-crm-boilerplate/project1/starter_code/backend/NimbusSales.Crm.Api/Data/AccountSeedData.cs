using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Data;

/// <summary>The companies Nimbus sells to.</summary>
public static class AccountSeedData
{
    private static readonly (string Ref, string Name, string Industry, string Country, string Website)[] Rows =
    [
        ("A-0001", "Halcyon Freight", "Logistics", "United Kingdom", "https://www.halcyonfreight.co.uk"),
        ("A-0002", "Brightmoor Dental Group", "Healthcare", "United Kingdom", "https://www.brightmoor.dental"),
        ("A-0003", "Corvid Analytics", "Software", "Ireland", "https://www.corvidanalytics.io"),
        ("A-0004", "Pellier Bakeries", "Food & Beverage", "France", "https://www.pellier.fr"),
        ("A-0005", "Ashgrove Legal", "Legal", "United Kingdom", "https://www.ashgrovelegal.com"),
        ("A-0006", "Nordwind Energie", "Energy", "Germany", "https://www.nordwind-energie.de"),
        ("A-0007", "Tuchet & Sons", "Manufacturing", "United Kingdom", "https://www.tuchet.co.uk"),
        ("A-0008", "Sable Ridge Insurance", "Insurance", "United States", "https://www.sableridge.com"),
        ("A-0009", "Kestrel Marine", "Marine", "Netherlands", "https://www.kestrelmarine.nl"),
        ("A-0010", "Verity Talent", "Recruitment", "United Kingdom", "https://www.veritytalent.com"),
        ("A-0011", "Oakhurst Property", "Real Estate", "United Kingdom", "https://www.oakhurst.property"),
        ("A-0012", "Lumen Optics", "Manufacturing", "Germany", "https://www.lumen-optics.de"),
        ("A-0013", "Farrow Dairy Co-op", "Agriculture", "Ireland", "https://www.farrowdairy.ie"),
        ("A-0014", "Trenchard Security", "Security", "United Kingdom", "https://www.trenchard.security"),
        ("A-0015", "Ilex Pharmaceuticals", "Pharmaceutical", "Switzerland", "https://www.ilexpharma.ch"),
        ("A-0016", "Camber Outdoor", "Retail", "United Kingdom", "https://www.camberoutdoor.com"),
        ("A-0017", "Delacroix Interiors", "Design", "France", "https://www.delacroix-interiors.fr"),
        ("A-0018", "Redwing Aviation", "Aviation", "United Kingdom", "https://www.redwingaviation.aero"),
        ("A-0019", "Stellan Foods", "Food & Beverage", "Sweden", "https://www.stellanfoods.se"),
        ("A-0020", "Petrie & Vance", "Accountancy", "United Kingdom", "https://www.petrievance.co.uk"),
        ("A-0021", "Aldergate Housing", "Public Sector", "United Kingdom", "https://www.aldergate.gov.uk"),
        ("A-0022", "Voss Instrumentation", "Manufacturing", "Norway", "https://www.vossinstruments.no"),
        ("A-0023", "Marchetti Ceramiche", "Manufacturing", "Italy", "https://www.marchetti-ceramiche.it"),
        ("A-0024", "Bellhaven Hotels", "Hospitality", "United Kingdom", "https://www.bellhavenhotels.com"),
        ("A-0025", "Quillon Media", "Media", "United Kingdom", "https://www.quillonmedia.com"),
        ("A-0026", "Ardent Robotics", "Software", "United States", "https://www.ardentrobotics.com"),
        ("A-0027", "Saltmarsh Brewing", "Food & Beverage", "United Kingdom", "https://www.saltmarshbrewing.co.uk"),
        ("A-0028", "Whitcombe Logistics", "Logistics", "United Kingdom", "https://www.whitcombelogistics.com"),
        ("A-0029", "Ferndale Schools Trust", "Education", "United Kingdom", "https://www.ferndaletrust.org"),
        ("A-0030", "Orbis Telecom", "Telecommunications", "Ireland", "https://www.orbistelecom.ie"),
    ];

    public static void Seed(CrmDbContext db)
    {
        if (db.Accounts.Any())
        {
            return;
        }

        foreach (var row in Rows)
        {
            db.Accounts.Add(new Account(
                row.Ref, row.Name, row.Industry, row.Country, row.Website));
        }

        db.SaveChanges();
    }
}
