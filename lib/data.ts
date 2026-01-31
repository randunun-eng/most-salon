export type ServiceCategory = "Hair" | "Nails" | "Makeup" | "Face" | "Massage";

export interface Service {
    id: string;
    name: string;
    description: string;
    duration: string;
    price: string;
    category: ServiceCategory;
}

export const services: Service[] = [
    {
        id: "h1",
        name: "Signature Cut & Style",
        description: "Precision cut tailored to your face shape, including wash and blow-dry.",
        duration: "60 min",
        price: "$85",
        category: "Hair"
    },
    {
        id: "h2",
        name: "Balayage Transformation",
        description: "Custom hand-painted highlights for a natural, sun-kissed look.",
        duration: "180 min",
        price: "$220",
        category: "Hair"
    },
    {
        id: "n1",
        name: "Luxury Gel Manicure",
        description: "Nail shaping, cuticle care, and long-lasting gel polish application.",
        duration: "45 min",
        price: "$55",
        category: "Nails"
    },
    {
        id: "n2",
        name: "Spa Pedicure",
        description: "Relaxing soak, exfoliation, massage, and polish.",
        duration: "60 min",
        price: "$70",
        category: "Nails"
    },
    {
        id: "m1",
        name: "Bridal Makeup",
        description: "Long-wear, photogenic makeup application for your special day.",
        duration: "90 min",
        price: "$150",
        category: "Makeup"
    },
    {
        id: "f1",
        name: "Hydra-Glow Facial",
        description: "Deep cleansing and hydration for radiant, dewy skin.",
        duration: "60 min",
        price: "$120",
        category: "Face"
    }
];

export interface Branch {
    id: string;
    name: string;
    address: string;
}

export const branches: Branch[] = [
    { id: "b1", name: "MOST Beverly Hills", address: "123 Luxury Blvd, Beverly Hills" },
    { id: "b2", name: "MOST Santa Monica", address: "456 Ocean Ave, Santa Monica" },
    { id: "b3", name: "MOST Downtown", address: "789 Main St, Downtown LA" },
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
