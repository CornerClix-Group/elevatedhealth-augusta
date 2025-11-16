import { Card, CardContent } from "@/components/ui/card";

const ClinicVideo = () => {
  return (
    <section className="py-16 px-4 bg-background">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-light text-primary mb-4">
            What to Expect
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience our private treatment suites and calming environment where your healing journey begins
          </p>
        </div>

        <Card className="overflow-hidden shadow-2xl border-2 border-accent/20 hover:shadow-3xl transition-all duration-500 animate-fade-in-up">
          <CardContent className="p-0">
            <div className="aspect-video w-full bg-muted">
              <video
                controls
                className="w-full h-full object-cover"
                preload="metadata"
                poster="/videos/clinic-experience-poster.jpg"
                style={{ 
                  objectFit: 'cover',
                  filter: 'contrast(1.05) saturate(1.1)'
                }}
              >
                <source src="/videos/clinic-experience.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="p-6 md:p-8 bg-card">
              <h3 className="text-2xl md:text-3xl font-light text-primary mb-3">
                Tour Our Clinic
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                See our private treatment suites, meet our compassionate team, and experience the calming 
                environment designed for your comfort and healing. Every detail is crafted to support your journey to wellness.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ClinicVideo;
