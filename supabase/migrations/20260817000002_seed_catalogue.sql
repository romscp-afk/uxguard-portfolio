-- Catalogue seed for mobile MVP. Safe to re-run on an empty project.

insert into public.content_categories (slug, name, kind, sort_order) values
  ('ux', 'UX', 'topic', 10),
  ('product', 'Product', 'topic', 20),
  ('research', 'Research', 'topic', 30),
  ('careers', 'Careers', 'topic', 40),
  ('education', 'Education', 'topic', 50),
  ('technology', 'Technology', 'topic', 60),
  ('design', 'Design', 'topic', 70)
on conflict (slug) do nothing;

insert into public.challenges (
  slug, title, summary, instructions, completion_criteria, points_award,
  allow_reveal_answers, max_attempts, status, starts_at
)
select
  'ux-research-foundations',
  'UX research foundations',
  'A short quiz on choosing methods and framing evidence.',
  'Answer every question. You need every answer correct to earn points. You can retry if you have attempts remaining, but points are awarded only once.',
  'Answer all questions correctly.',
  50,
  true,
  3,
  'published',
  now()
where not exists (select 1 from public.challenges where slug = 'ux-research-foundations');

insert into public.challenges (
  slug, title, summary, instructions, completion_criteria, points_award,
  allow_reveal_answers, max_attempts, status, starts_at
)
select
  'portfolio-storytelling',
  'Portfolio storytelling',
  'Check that you can structure a hiring-ready case study.',
  'Choose the strongest option for each prompt. Points are awarded once per challenge.',
  'Answer all questions correctly.',
  40,
  false,
  5,
  'published',
  now()
where not exists (select 1 from public.challenges where slug = 'portfolio-storytelling');

insert into public.challenge_questions (challenge_id, sort_order, prompt, choices, correct_choice_ids)
select c.id, q.sort_order, q.prompt, q.choices::jsonb, q.correct
from public.challenges c
join (
  values
    (
      'ux-research-foundations',
      1,
      'A team wants to know why enterprise buyers abandon checkout. Which method is the best first step?',
      '[{"id":"a","label":"A 5-second brand test with 200 consumers"},{"id":"b","label":"Moderated usability sessions with target admins"},{"id":"c","label":"A visual redesign contest"},{"id":"d","label":"Increasing ad spend on the checkout page"}]',
      array['b']
    ),
    (
      'ux-research-foundations',
      2,
      'What belongs in a case-study impact section?',
      '[{"id":"a","label":"A moodboard of unused concepts"},{"id":"b","label":"Job titles of everyone on Slack"},{"id":"c","label":"A measurable change tied to the research"},{"id":"d","label":"A list of every interview quote"}]',
      array['c']
    ),
    (
      'ux-research-foundations',
      3,
      'When should you run a diary study instead of a single usability session?',
      '[{"id":"a","label":"When you need to observe behaviour over days or weeks"},{"id":"b","label":"When you only have 20 minutes with one user"},{"id":"c","label":"When the question is about button colour preference"},{"id":"d","label":"When you already know the solution"}]',
      array['a']
    ),
    (
      'portfolio-storytelling',
      1,
      'Which narrative order is strongest for hiring managers?',
      '[{"id":"a","label":"Screens first, then a biography"},{"id":"b","label":"Problem, method, evidence, decision, outcome"},{"id":"c","label":"Tools used, then a Figma embed"},{"id":"d","label":"Awards, then a photo of the office"}]',
      array['b']
    ),
    (
      'portfolio-storytelling',
      2,
      'What should you avoid claiming in a case study?',
      '[{"id":"a","label":"A metric you can source"},{"id":"b","label":"The constraint that shaped the work"},{"id":"c","label":"That your work caused a result you cannot evidence"},{"id":"d","label":"What you would do differently"}]',
      array['c']
    )
) as q(slug, sort_order, prompt, choices, correct)
  on c.slug = q.slug
where not exists (
  select 1 from public.challenge_questions existing
  where existing.challenge_id = c.id and existing.sort_order = q.sort_order
);

insert into public.rewards (
  slug, title, description, kind, points_cost, inventory, eligibility, fulfilment, fulfilment_payload, is_active
)
select * from (
  values
    (
      'premium-templates',
      'Premium case-study templates',
      'Unlock UXGuard signature templates for evidence-led case studies. Fulfilment is confirmed by the studio team.',
      'premium_template',
      200,
      null,
      '{"one_per_user": true}'::jsonb,
      'pending_admin',
      '{"fulfilment":"We will enable premium templates on your UXGuard Studio web account."}'::jsonb,
      true
    ),
    (
      'ai-credits-10',
      '10 AI feature credits',
      'Add 10 credits toward UXGuard AI tools on the web platform. Not awarded for viewing ads.',
      'ai_credits',
      150,
      null,
      '{"one_per_user": false}'::jsonb,
      'pending_admin',
      '{"credits":10}'::jsonb,
      true
    ),
    (
      'portfolio-review',
      'Portfolio review access',
      'Request a portfolio review slot or discount. An admin confirms scheduling.',
      'portfolio_review',
      400,
      25,
      '{"one_per_user": true}'::jsonb,
      'pending_admin',
      '{"channel":"hello@uxguard.studio"}'::jsonb,
      true
    ),
    (
      'partner-discount',
      'Partner learning discount',
      'Redeem a partner education or tooling discount. Codes are issued after admin review.',
      'partner_discount',
      250,
      50,
      '{"one_per_user": true}'::jsonb,
      'pending_admin',
      '{"status":"partner_code_pending"}'::jsonb,
      true
    )
) as r(slug, title, description, kind, points_cost, inventory, eligibility, fulfilment, fulfilment_payload, is_active)
where not exists (select 1 from public.rewards existing where existing.slug = r.slug);

insert into public.sponsors (name, logo_url, website_url, is_active)
select 'UXGuard Learning Partners', null, 'https://uxguard.studio', true
where not exists (select 1 from public.sponsors where name = 'UXGuard Learning Partners');

insert into public.sponsored_campaigns (
  sponsor_id, title, summary, placement, cta_label, cta_url, starts_at, ends_at, status, relevance_topics
)
select
  s.id,
  'Design career resources',
  'Partner learning paths for UX, product, and research. Clearly labelled sponsored content — no points for opening this card.',
  'feed_card',
  'View resources',
  'https://uxguard.studio/articles',
  now() - interval '1 day',
  now() + interval '180 days',
  'active',
  array['ux', 'careers', 'education']
from public.sponsors s
where s.name = 'UXGuard Learning Partners'
  and not exists (select 1 from public.sponsored_campaigns where title = 'Design career resources');

