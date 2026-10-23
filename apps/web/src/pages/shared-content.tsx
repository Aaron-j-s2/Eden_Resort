import type { PublicSiteSettings } from '@eden/shared/core';
import { Reveal } from '@/components/ui/Reveal';
import { useSiteSettings } from '@/services/public';

/** Shown until settings load (and if they fail). Mirrors the seeded homepage copy. */
export const DEFAULT_HOMEPAGE: PublicSiteSettings['homepage'] = {
  heroEyebrow: 'Koodal · Thirparappu · Kanyakumari',
  heroHeadline: 'Find Your Quiet in the Heart of Nature.',
  heroIntro:
    'A private retreat where a clear stream runs through rubber plantations and bamboo, in the green interior of Kanyakumari District.',
  storyHeading: 'Where water meets the forest',
  storyBody: [
    'Eden Falls Resort sits in Koodal, near Nandhimangalam, close to Thirparappu and the Kerala border — far from the crowded coast, deep in the district’s green interior.',
  ],
  bookingInvitation:
    'Choose your dates and send a reservation request. The resort will confirm personally by phone — nothing is charged online.',
};

/** Nearby attractions as hairline rows. Unverified distances are labelled approximate. */
export function NearbyList() {
  const { data } = useSiteSettings();
  const items = data?.nearby?.items ?? [];
  if (items.length === 0) return null;
  return (
    <ul className="border-t border-forest/15">
      {items.map((item, i) => (
        <Reveal as="li" key={item.name} delay={i * 0.06} className="grid gap-3 border-b border-forest/15 py-7 sm:grid-cols-[1fr_9rem] sm:gap-8">
          <div>
            <h3 className="font-display text-3xl text-forest">{item.name}</h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">{item.description}</p>
          </div>
          <p className="sm:text-right">
            {item.distance ? (
              <>
                <span className="tabular font-display text-3xl text-laterite-deep">
                  {item.distanceVerified ? '' : '≈ '}
                  {item.distance.replace(/^about\s+/i, '')}
                </span>
                {!item.distanceVerified && <span className="eyebrow mt-1 block text-ink-soft">Approximate</span>}
              </>
            ) : (
              <span className="eyebrow text-ink-soft">Ask us for directions</span>
            )}
          </p>
        </Reveal>
      ))}
    </ul>
  );
}
