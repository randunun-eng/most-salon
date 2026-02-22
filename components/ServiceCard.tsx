import { Service } from "@/lib/db-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Clock } from "lucide-react";

interface ServiceCardProps {
    service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
    const formattedPrice = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(service.price);

    return (
        <Card className="border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 bg-card hover:-translate-y-1">
            <CardHeader>
                <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl font-serif">{service.name}</CardTitle>
                    <span className="font-medium text-lg text-yellow-500">{formattedPrice}</span>
                </div>
                {/* DB doesn't have description yet, so we omit or stick in a placeholder if needed. For now omitting to match DB. */}
            </CardHeader>
            <CardFooter className="flex justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {service.duration_minutes} mins
                </div>
                <Button asChild size="sm" variant="outline" className="uppercase tracking-wide border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Link href={`/booking?service=${service.id}`}>Book Now</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
