import { Service } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Clock } from "lucide-react";

interface ServiceCardProps {
    service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
    return (
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardHeader>
                <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl font-serif">{service.name}</CardTitle>
                    <span className="font-medium text-lg">{service.price}</span>
                </div>
                <CardDescription className="text-foreground/70">{service.description}</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {service.duration}
                </div>
                <Button asChild size="sm" variant="outline" className="uppercase tracking-wide border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Link href={`/booking?service=${service.id}`}>Book Now</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
