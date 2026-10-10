-- Sample content: the six demo stories and their replies, in every environment (decided 2026-10-10).
-- AI-written placeholders, like the rest of the sample copy. Reaction counts start at 0: no invented numbers.
--
-- Their authors are created LOCKED: the password hash '!locked' can never match, and there is no
-- recovery method, so nobody can sign in as them. In development and staging, `db:seed` then gives
-- the demo accounts (amal_dawn…) the public demo password; it never runs in production.
-- Existing accounts with these nicknames are left as they are (ON CONFLICT DO NOTHING).
INSERT INTO "accounts" ("nickname", "nickname_key", "password_hash", "avatar", "role", "therapist_kind", "created_at") VALUES
	($s$quiet_river$s$, $s$quiet_river$s$, '!locked', 0, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$sea_glass$s$, $s$sea_glass$s$, '!locked', 1, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$salt_wind$s$, $s$salt_wind$s$, '!locked', 3, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$amal_dawn$s$, $s$amal_dawn$s$, '!locked', 2, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$blue_hour$s$, $s$blue_hour$s$, '!locked', 5, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$soft_morning$s$, $s$soft_morning$s$, '!locked', 4, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$Huda$s$, $s$huda$s$, '!locked', 4, 'therapist', $s$psychologist$s$, '2026-08-01T10:00:00Z')
ON CONFLICT ("nickname_key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "stories" ("id", "community_id", "author_id", "type", "title", "body", "visibility", "veil", "mood", "created_at") VALUES
	($s$s1$s$, $s$anxiety$s$, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$quiet_river$s$), 'story', $s$I thought I was the only one feeling this way$s$, $s$For two years, Tuesday mornings started with my heart racing before I even opened my eyes. I told no one. I thought if I said it out loud it would become real, or people would think I was being dramatic.

What changed wasn't one big thing. I started writing down what I was worried about the night before, so it was on paper instead of in my head. Some weeks that helped, some weeks it didn't.

Reading other people's stories here was the first time I realised the racing, the tight chest, the "something bad is about to happen" feeling had a name, and that other people woke up with it too. I'm not fixed. But I'm not alone with it any more, and that matters more than I expected.$s$, 'public', '{}'::text[], NULL, '2026-10-08T18:00:00Z'),
	($s$s2$s$, $s$panic$s$, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$sea_glass$s$), 'win', $s$بقيت في طابور المتجر$s$, $s$انتصار صغير، لكنه حقيقي. بدأت الموجة عند الصندوق. في الشهر الماضي كنت سأترك سلتي وأهرب.

هذه المرة تنفست ببطء، وعددت الأشياء الزرقاء حولي، وبقيت في مكاني. يداي كانتا ترتجفان وأنا أدفع، لكنني دفعت وخرجت ومعي أغراضي.

أكتب هذا لأتذكره في المرة القادمة.$s$, 'public', '{}'::text[], NULL, '2026-10-08T15:00:00Z'),
	($s$s3$s$, $s$grief$s$, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$salt_wind$s$), 'story', $s$Le premier Aïd sans ma mère$s$, $s$Tout le monde répétait qu'elle aurait voulu me voir sourire. J'ai mis son assiette sur la table sans réfléchir, et personne n'a rien dit.

J'ai passé la journée entre les visites et la cuisine, en souriant comme on me l'avait demandé. Le soir, j'ai pleuré dans la voiture pendant une heure.

Je ne sais pas si ça devient plus facile. J'avais juste besoin de l'écrire quelque part où on comprend.$s$, 'members', ARRAY[$s$loss$s$]::text[], NULL, '2026-10-07T20:00:00Z'),
	($s$s4$s$, $s$depression$s$, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$amal_dawn$s$), 'checkin', $s$Got out of bed, opened the curtains$s$, $s$That's it, that's the check-in. Some days the list is short and that has to be enough.$s$, 'public', '{}'::text[], $s$low$s$, '2026-10-08T09:30:00Z'),
	($s$s5$s$, $s$anxiety$s$, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$blue_hour$s$), 'win', $s$J'ai passé l'appel que je repoussais depuis un mois$s$, $s$Trois minutes au téléphone. J'avais écrit ce que je voulais dire sur un papier, et ça a suffi.$s$, 'public', '{}'::text[], NULL, '2026-10-06T11:00:00Z'),
	($s$s6$s$, $s$anxiety$s$, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$soft_morning$s$), 'checkin', $s$Slept better this week$s$, $s$Phone out of the bedroom at ten. Still waking at four sometimes, but falling back asleep now.$s$, 'members', '{}'::text[], $s$okay$s$, '2026-10-05T07:15:00Z')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "replies" ("id", "story_id", "parent_id", "author_id", "text", "created_at") VALUES
	($s$r1$s$, $s$s1$s$, NULL, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$sea_glass$s$), $s$Tuesday mornings. Same. Thank you for writing this.$s$, '2026-10-08T19:10:00Z'),
	($s$r2$s$, $s$s1$s$, $s$r1$s$, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$blue_hour$s$), $s$The writing-it-down thing works for me too, on the good weeks.$s$, '2026-10-08T20:00:00Z'),
	($s$r3$s$, $s$s1$s$, NULL, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$huda$s$), $s$Naming the feeling is a real skill, and you built it. This is a support note, not clinical advice.$s$, '2026-10-08T21:30:00Z'),
	($s$r4$s$, $s$s2$s$, NULL, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$quiet_river$s$), $s$هذا ليس صغيرًا أبدًا. مبروك.$s$, '2026-10-08T16:20:00Z'),
	($s$r5$s$, $s$s3$s$, NULL, (SELECT "id" FROM "accounts" WHERE "nickname_key" = $s$sea_glass$s$), $s$La voiture, c'est aussi là que je pleure. Je pense à vous.$s$, '2026-10-07T22:00:00Z')
ON CONFLICT ("id") DO NOTHING;
