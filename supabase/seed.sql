-- Eden Falls Resort — development seed
--
-- !! The two room types below are SAMPLE DATA (is_sample = true). Names, prices,
-- !! occupancy and inventory are placeholders so the booking flow can be
-- !! exercised locally. Replace them in Admin → Rooms with the resort's confirmed
-- !! details before going live. See docs/admin-guide.md.
--
-- Site settings contain only facts supplied by the owner or verified publicly.
-- `null` values render as "please confirm with the resort" on the website.
-- Gallery rows are generated into seed.gallery.sql by `npm run images`.

insert into public.site_settings (setting_key, setting_value, is_public) values
('contact', $json${
  "resortName": "Eden Falls Resort",
  "phone": "+91 95974 45838",
  "whatsappNumber": "919597445838",
  "email": null,
  "addressLines": ["Koodal, near Nandhimangalam, Thirparappu", "Kulasekharam Post, Kanyakumari District", "Tamil Nadu, India"],
  "postalCode": "629161",
  "mapsQuery": "Eden Falls Resort, Koodal, Nandhimangalam, Kulasekharam, Kanyakumari, Tamil Nadu 629161"
}$json$, true),

('booking_policy', $json${
  "checkInTime": null,
  "checkOutTime": null,
  "cancellationPolicy": null,
  "childPolicy": null,
  "idPolicy": null,
  "houseRules": [],
  "pendingHoldsInventory": true,
  "taxRatePercent": 0,
  "taxLabel": "GST",
  "paymentInstructions": "No payment is collected online. The resort will call you to confirm your request and explain how to pay."
}$json$, true),

('homepage', $json${
  "heroEyebrow": "Koodal · Thirparappu · Kanyakumari",
  "heroHeadline": "Find Your Quiet in the Heart of Nature.",
  "heroIntro": "A private retreat where a clear stream runs through rubber plantations and bamboo, in the green interior of Kanyakumari District.",
  "storyHeading": "Where water meets the forest",
  "storyBody": [
    "Eden Falls Resort sits in Koodal, near Nandhimangalam, close to Thirparappu and the Kerala border — far from the crowded coast, deep in the district's green interior.",
    "Cottages and open pavilions in warm laterite tones are scattered between tall rubber trees, lily ponds and the banks of a natural stream. The days here are measured by light through the canopy and the sound of moving water."
  ],
  "bookingInvitation": "Choose your dates and send a reservation request. The resort will confirm personally by phone — nothing is charged online."
}$json$, true),

('social', $json${ "instagram": null, "facebook": null, "youtube": null, "googleBusiness": null }$json$, true),

('experiences', $json${ "items": [
  { "key": "stream", "title": "The stream", "confirmed": true,
    "summary": "A natural stream flows through the property, shallow and clear over smooth rock.",
    "body": "Follow the water from the covered footbridge to the rocky stretches where it quickens. Bring sandals and an unhurried afternoon. Please ask the resort about water levels, especially in the monsoon.",
    "image": "/images/resort/stream/stream-wide", "imageAlt": "The stream running wide and shallow between rubber plantations and bamboo" },
  { "key": "greenery", "title": "Plantation & greenery", "confirmed": true,
    "summary": "Rubber trees, bamboo, palms and lily ponds surround every cottage and pavilion.",
    "body": "Shaded paths connect the cottages, the lily-pond pavilion and open-sided halls set among the rubber trees — places to sit, read and listen.",
    "image": "/images/resort/grounds/lily-pond-pavilion", "imageAlt": "An octagonal pavilion reached by a stepping-stone path across a lily pond" },
  { "key": "pool", "title": "Swimming pool", "confirmed": true,
    "summary": "A swimming pool is listed among the resort's facilities.",
    "body": "Ask the resort about pool timings and guidelines when you book.",
    "image": null, "imageAlt": null },
  { "key": "dining", "title": "Dining", "confirmed": true,
    "summary": "Dining facilities are available at the resort.",
    "body": "Meal options, timings and menus are arranged with the resort — mention any dietary needs in your booking request.",
    "image": null, "imageAlt": null },
  { "key": "campfire", "title": "Campfire evenings", "confirmed": true,
    "summary": "Campfires can be arranged for guests.",
    "body": "Ask the resort to arrange a campfire for your evening. Availability may depend on weather and season.",
    "image": "/images/resort/life/evening-pond-deck", "imageAlt": "Evening lights reflected in the pond beside a wooden deck" },
  { "key": "gatherings", "title": "Gatherings & celebrations", "confirmed": true,
    "summary": "Open pavilions and outdoor space for small gatherings and events.",
    "body": "The arched halls and plantation pavilions suit family get-togethers, team outings and small celebrations. Send an event enquiry with your date and group size.",
    "image": "/images/resort/grounds/arched-hall-interior", "imageAlt": "An open hall with arched windows framing the greenery" }
] }$json$, true),

('nearby', $json${ "items": [
  { "name": "Thirparappu Falls", "distance": "about 6 km", "distanceVerified": false,
    "description": "A broad waterfall on the Kodayar river, with the old Mahadevar temple on its bank — one of the best-known sights in the district." },
  { "name": "Mathur Aqueduct (Hanging Trough Bridge)", "distance": null, "distanceVerified": false,
    "description": "A tall concrete trough bridge carrying an irrigation canal across the river valley, with a walkway along the top." },
  { "name": "Pechiparai Reservoir", "distance": null, "distanceVerified": false,
    "description": "A reservoir on the Kodayar river set against the foothills of the Western Ghats." }
] }$json$, true),

('sustainability', $json${ "practices": [] }$json$, true),

('gallery_categories', $json${ "items": [
  { "key": "stream", "label": "The Stream" },
  { "key": "stay", "label": "Cottages & Rooms" },
  { "key": "grounds", "label": "Pavilions & Gardens" },
  { "key": "life", "label": "Life at Eden" }
] }$json$, true),

('faq', $json${ "items": [
  { "question": "How do I book a stay?",
    "answer": "Choose your dates and room on the Book page and send a reservation request. You'll get a booking reference straight away, and the resort will call to confirm. You can also call or WhatsApp us directly." },
  { "question": "Do I pay online?",
    "answer": "No. Requests made on this website are pay-later — nothing is charged online. The resort will explain payment options when they confirm your booking." },
  { "question": "Where exactly is the resort?",
    "answer": "In Koodal, near Nandhimangalam, close to Thirparappu in Kanyakumari District (Kulasekharam Post, 629161). Use the map link on this page for directions, or call us and we'll guide you in." },
  { "question": "Can we hold a gathering or celebration?",
    "answer": "The resort has open pavilions and outdoor space for gatherings. Send an event enquiry with your preferred date and group size." }
] }$json$, true),

('notifications', $json${ "emailOnNewBooking": false, "emailOnNewEnquiry": false, "staffEmail": null, "whatsappAlerts": false }$json$, false)
on conflict (setting_key) do nothing;

-- ---------------------------------------------------------------------------
-- SAMPLE room types (development only — replace before production)
-- ---------------------------------------------------------------------------
insert into public.room_types
  (id, name, slug, short_description, description, base_price, max_adults, max_children, max_occupancy,
   inventory_count, bed_type, amenities, booking_rules, is_active, is_sample, display_order)
values
  ('a1f3c1d2-0000-4000-8000-000000000001', 'Cottage (sample listing)', 'sample-cottage',
   'Sample listing — replace with the resort''s confirmed cottage details before launch.',
   'This is placeholder content for local development. The photographs are the resort''s own, but the name, price, capacity and number of rooms shown here are not confirmed. Update them in Admin → Rooms.',
   4500.00, 2, 1, 3, 3, null, array['Air conditioning', 'Ceiling fan'], '', true, true, 10),
  ('a1f3c1d2-0000-4000-8000-000000000002', 'Room (sample listing)', 'sample-room',
   'Sample listing — replace with the resort''s confirmed room details before launch.',
   'This is placeholder content for local development. The photographs are the resort''s own, but the name, price, capacity and number of rooms shown here are not confirmed. Update them in Admin → Rooms.',
   3500.00, 2, 1, 3, 2, null, array['Ceiling fan'], '', true, true, 20)
on conflict (id) do nothing;

insert into public.room_images (room_type_id, image_path, alt_text, display_order) values
  ('a1f3c1d2-0000-4000-8000-000000000001', '/images/resort/stay/cottage-evening', 'A cottage glowing with warm light at dusk, its veranda shaded by palms', 0),
  ('a1f3c1d2-0000-4000-8000-000000000001', '/images/resort/stay/room-carved-bed', 'Bedroom with warm orange walls, a carved wooden bed and wooden chairs', 10),
  ('a1f3c1d2-0000-4000-8000-000000000001', '/images/resort/stay/cottage-plantation', 'A laterite-orange cottage with a tiled roof among tall rubber trees', 20),
  ('a1f3c1d2-0000-4000-8000-000000000002', '/images/resort/stay/room-tall-ceiling', 'Tall-ceilinged bedroom with wooden floors, a ceiling fan and a carved bed', 0),
  ('a1f3c1d2-0000-4000-8000-000000000002', '/images/resort/stay/room-window-view', 'Simple guest room with a bed and a wide window looking out onto trees', 10);
