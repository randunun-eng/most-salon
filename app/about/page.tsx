import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-32 pb-20 container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl md:text-6xl font-serif mb-8">Our Philosophy</h1>
                    <p className="text-lg leading-relaxed text-muted-foreground mb-12">
                        At MOST, we believe that beauty is an art form rooted in precision, hygiene, and personalization.
                        Founded on the principles of "calm luxury," our salon offers a sanctuary from the noise of the city.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 my-20">
                    <div className="bg-secondary/20 h-96 w-full relative">
                        {/* Image Placeholder */}
                    </div>
                    <div className="flex flex-col justify-center">
                        <h2 className="text-3xl font-serif mb-6">The Experience</h2>
                        <p className="text-muted-foreground mb-6">
                            Every visit begins with a consultation to understand your unique needs.
                            From our gold-accented interiors to our curated playlist, every detail is designed to induce deep relaxation.
                        </p>
                        <div className="border-l-2 border-primary pl-6 py-2">
                            <p className="italic text-lg text-foreground/80">"Luxury is not just about the price tag, it's about the feeling of being completely cared for."</p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}
