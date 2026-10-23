import { Link } from 'react-router';
import { Caption, ChapterHeading, Container, PageHero } from '@/components/layout/Section';
import { ResortImage } from '@/components/ui/ResortImage';
import { Reveal } from '@/components/ui/Reveal';
import { Seo } from '@/lib/seo';
import { useSiteSettings } from '@/services/public';
import { DEFAULT_HOMEPAGE, NearbyList } from './shared-content';

export default function AboutPage() {
  const { data } = useSiteSettings();
  const story = data?.homepage?.storyBody ?? DEFAULT_HOMEPAGE.storyBody;
  const practices = data?.sustainability?.practices ?? [];

  return (
    <>
      <Seo
        title="About the resort"
        description="Eden Falls Resort is a nature-focused retreat in Koodal near Nandhimangalam and Thirparappu, Kanyakumari District — cottages and pavilions among rubber trees, lily ponds and a natural stream."
      />
      <PageHero
        slug="lily-pond-pavilion"
        eyebrow="About Eden Falls"
        title={
          <>
            A retreat shaped by <em className="italic text-sage-soft">water and trees</em>
          </>
        }
        intro="In Koodal, near Nandhimangalam and Thirparappu — in the quiet, green interior of Kanyakumari District."
      />

      <section className="bg-paper py-24 sm:py-32">
        <Container className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <ChapterHeading numeral="I." eyebrow="The setting" title="Away from the coast, into the green" />
          </div>
          <Reveal delay={0.1} className="space-y-6 text-lg leading-relaxed text-ink-soft lg:col-span-6 lg:col-start-7 lg:pt-14">
            {story.map((p, i) => (
              <p key={i} className={i === 0 ? 'drop-cap text-xl text-ink' : undefined}>
                {p}
              </p>
            ))}
          </Reveal>
        </Container>
      </section>

      <section className="bg-ivory py-24 sm:py-32">
        <Container>
          <div className="grid gap-6 sm:grid-cols-12">
            <Reveal as="figure" className="sm:col-span-7">
              <ResortImage slug="arched-hall-interior" sizes="(min-width: 640px) 58vw, 100vw" className="aspect-[4/3]" />
              <Caption>Inside one of the open halls — timber ceiling, scalloped arches</Caption>
            </Reveal>
            <Reveal as="figure" delay={0.15} className="sm:col-span-4 sm:col-start-9 sm:mt-32">
              <ResortImage slug="pond-pavilion-path" sizes="(min-width: 640px) 33vw, 100vw" className="aspect-[3/4]" />
              <Caption>The path to the lily-pond pavilion</Caption>
            </Reveal>
          </div>

          <div className="mt-24 grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <ChapterHeading numeral="II." eyebrow="How we host" title="Unhurried, personal, close to nature" />
            </div>
            <Reveal delay={0.1} className="space-y-5 leading-relaxed text-ink-soft lg:col-span-6 lg:col-start-7 lg:pt-14">
              <p>
                Eden Falls is a place to slow down. There are no crowds to navigate — just shaded paths, the sound of the
                stream and open pavilions where you can sit for as long as you like.
              </p>
              <p>
                Every reservation is confirmed personally. When you send a request through this website, the resort calls
                you to talk through your plans, answer questions and confirm the details — so you know exactly what to expect
                before you arrive.
              </p>
              <Link to="/book" className="eyebrow link-line inline-block pt-2 text-forest">
                Plan your stay
              </Link>
            </Reveal>
          </div>
        </Container>
      </section>

      {practices.length > 0 && (
        <section className="bg-forest py-24 text-ivory sm:py-32">
          <Container>
            <ChapterHeading numeral="III." eyebrow="Care for the land" tone="light" title="How we look after this place" />
            <ul className="mt-14 grid gap-px bg-ivory/10 sm:grid-cols-2 lg:grid-cols-3">
              {practices.map((p) => (
                <li key={p.title} className="bg-forest p-8">
                  <h3 className="font-display text-2xl">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory/75">{p.body}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="bg-paper py-24 sm:py-32">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ChapterHeading numeral={practices.length > 0 ? 'IV.' : 'III.'} eyebrow="The surroundings" title="Around Thirparappu" />
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <NearbyList />
          </div>
        </Container>
      </section>
    </>
  );
}
