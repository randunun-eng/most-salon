export type ServiceCategory = "Hair" | "Nails" | "Makeup" | "Facials" | "Massage";

export interface Service {
    id: string;
    name: string;
    description: string;
    duration: string;
    price: string;
    category: ServiceCategory;
}

export const services: Service[] = [
    // Hair
    {
        id: "h1",
        name: "Signature Haircut & Style",
        description: "Precision cut tailored to your face shape, including wash and blow-dry.",
        duration: "60 min",
        price: "LKR 5,500",
        category: "Hair"
    },
    {
        id: "h2",
        name: "Balayage Color",
        description: "Hand-painted highlights for a sun-kissed, natural look.",
        duration: "180 min",
        price: "LKR 25,000",
        category: "Hair"
    },
    {
        id: "h3",
        name: "Keratin Treatment",
        description: "Smoothing treatment to eliminate frizz and add shine.",
        duration: "120 min",
        price: "LKR 35,000",
        category: "Hair"
    },
    {
        id: "h4",
        name: "Root Touch-Up",
        description: "Color application to cover grey or regrowth at the roots.",
        duration: "90 min",
        price: "LKR 8,500",
        category: "Hair"
    },
    {
        id: "h5",
        name: "Ultimate Reconstruction Package",
        description: "Complete transformation: Cut, Color, and Deep Conditioning Treatment.",
        duration: "240 min",
        price: "LKR 45,000",
        category: "Hair"
    },

    // Nails
    {
        id: "n1",
        name: "Classic Manicure",
        description: "Nail shaping, cuticle care, and polish application.",
        duration: "45 min",
        price: "LKR 3,500",
        category: "Nails"
    },
    {
        id: "n2",
        name: "Gel Pedicure",
        description: "Long-lasting gel polish with relaxing foot soak and scrub.",
        duration: "60 min",
        price: "LKR 6,500",
        category: "Nails"
    },
    {
        id: "n3",
        name: "Acrylic Extensions (Full Set)",
        description: "Durable extensions with your choice of shape and length.",
        duration: "90 min",
        price: "LKR 12,000",
        category: "Nails"
    },
    {
        id: "n4",
        name: "Nail Art (Per Finger)",
        description: "Custom designs hand-painted by our artists.",
        duration: "15 min",
        price: "LKR 500",
        category: "Nails"
    },
    {
        id: "n5",
        name: "The MOST Signature Mani-Pedi",
        description: "Luxury combo package with paraffin wax and extended massage.",
        duration: "100 min",
        price: "LKR 9,500",
        category: "Nails"
    },

    // Makeup
    {
        id: "m1",
        name: "Bridal Makeup",
        description: "Flawless, long-lasting makeup for your special day.",
        duration: "120 min",
        price: "LKR 45,000",
        category: "Makeup"
    },
    {
        id: "m2",
        name: "Evening Glam",
        description: "Sophisticated full-face makeup for events and parties.",
        duration: "60 min",
        price: "LKR 15,000",
        category: "Makeup"
    },
    {
        id: "m3",
        name: "Natural Day Look",
        description: "Soft, glowing makeup enhancing your natural features.",
        duration: "45 min",
        price: "LKR 8,500",
        category: "Makeup"
    },
    {
        id: "m4",
        name: "Red Carpet Ready Package",
        description: "Full glam makeup plus mini-facial prep and lash application.",
        duration: "90 min",
        price: "LKR 22,000",
        category: "Makeup"
    },

    // Facials
    {
        id: "f1",
        name: "The MOST Signature Glow",
        description: "Deep cleansing, exfoliation, and hydration for radiant, dewy skin.",
        duration: "60 min",
        price: "LKR 12,500",
        category: "Facials"
    },
    {
        id: "f2",
        name: "Anti-Aging Gold Facial",
        description: "Luxurious treatment using 24k gold serum to firm and brighten.",
        duration: "90 min",
        price: "LKR 18,000",
        category: "Facials"
    },
    {
        id: "f3",
        name: "Deep Pore Cleansing",
        description: "Intensive deep clean to extract impurities and balance oil.",
        duration: "75 min",
        price: "LKR 10,000",
        category: "Facials"
    },
    {
        id: "f4",
        name: "Glass Skin Ritual",
        description: "Korean-inspired multi-step facial for ultimate translucency.",
        duration: "100 min",
        price: "LKR 22,000",
        category: "Facials"
    },

    // Massage
    {
        id: "ms1",
        name: "Full Body Aromatherapy",
        description: "Relaxing massage using essential oils to relieve stress.",
        duration: "60 min",
        price: "LKR 9,500",
        category: "Massage"
    },
    {
        id: "ms2",
        name: "Deep Tissue Massage",
        description: "Therapeutic massage targeting deep muscle tension.",
        duration: "60 min",
        price: "LKR 11,000",
        category: "Massage"
    },
    {
        id: "ms3",
        name: "Head, Neck & Shoulder",
        description: "Focused relief for upper body tension and headaches.",
        duration: "30 min",
        price: "LKR 5,500",
        category: "Massage"
    },
    {
        id: "ms4",
        name: "Foot Reflexology",
        description: "Pressure point massage to restore balance and energy.",
        duration: "45 min",
        price: "LKR 6,000",
        category: "Massage"
    },
    {
        id: "ms5",
        name: "Couples Retreat Package",
        description: "Side-by-side full body massage in a private suite.",
        duration: "90 min",
        price: "LKR 25,000",
        category: "Massage"
    }
];

export interface Branch {
    id: string;
    name: string;
    address: string;
}

export const branches: Branch[] = [
    { id: "b1", name: "The MOST Battaramulla", address: "Pannipitiya Road, Asiri Mawatha, Battaramulla" },
];

export interface Stylist {
    id: string;
    name: string;
    role: string;
}

export const stylists: Stylist[] = [
    { id: "s1", name: "Elena R.", role: "Master Stylist" },
    { id: "s2", name: "Marco D.", role: "Color Specialist" },
    { id: "s3", name: "Sarah M.", role: "Nail Artist" },
];
