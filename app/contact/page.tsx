import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-32 pb-20 container mx-auto px-4">
                <h1 className="text-4xl md:text-6xl font-serif text-center mb-16">Visit Us</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Info */}
                    <div className="space-y-10">
                        <div className="flex gap-4">
                            <MapPin className="h-6 w-6 text-primary shrink-0" />
                            <div>
                                <h3 className="font-serif text-xl mb-2">Location</h3>
                                <p className="text-muted-foreground">123 Luxury Blvd, Suite 100<br />Beverly Hills, CA 90210</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Phone className="h-6 w-6 text-primary shrink-0" />
                            <div>
                                <h3 className="font-serif text-xl mb-2">Phone</h3>
                                <p className="text-muted-foreground">+1 (310) 555-0123</p>
                                <Button variant="link" className="p-0 text-primary h-auto mt-1">Chat on WhatsApp</Button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Mail className="h-6 w-6 text-primary shrink-0" />
                            <div>
                                <h3 className="font-serif text-xl mb-2">Email</h3>
                                <p className="text-muted-foreground">hello@mostsalon.com</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Clock className="h-6 w-6 text-primary shrink-0" />
                            <div>
                                <h3 className="font-serif text-xl mb-2">Opening Hours</h3>
                                <div className="text-muted-foreground grid grid-cols-2 gap-x-8">
                                    <span>Mon - Fri</span>
                                    <span>9:00 AM - 8:00 PM</span>
                                    <span>Saturday</span>
                                    <span>10:00 AM - 6:00 PM</span>
                                    <span>Sunday</span>
                                    <span>Closed</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map Placeholder */}
                    <div className="bg-secondary/20 h-full min-h-[400px] w-full relative flex items-center justify-center">
                        <p className="text-muted-foreground font-serif text-xl tracking-widest">MAP VIEW</p>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}
