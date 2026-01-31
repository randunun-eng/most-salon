'use client';

import Navbar from "@/components/Navbar";
import { services, ServiceCategory } from "@/lib/data";
import ServiceCard from "@/components/ServiceCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categories: ServiceCategory[] = ["Hair", "Nails", "Makeup", "Face"];

export default function ServicesPage() {
    return (
        <main className="min-h-screen bg-background pb-20">
            <Navbar />

            <div className="pt-32 container mx-auto px-4">
                <h1 className="text-4xl md:text-6xl font-serif text-center mb-12">Our Menu</h1>

                <Tabs defaultValue="Hair" className="w-full max-w-4xl mx-auto">
                    <TabsList className="grid w-full grid-cols-4 mb-8 bg-secondary/30">
                        {categories.map((cat) => (
                            <TabsTrigger key={cat} value={cat} className="uppercase tracking-widest font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                {cat}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {categories.map((cat) => (
                        <TabsContent key={cat} value={cat} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {services
                                .filter((s) => s.category === cat)
                                .map((service) => (
                                    <ServiceCard key={service.id} service={service} />
                                ))}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </main>
    );
}
