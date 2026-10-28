-- Sample rooms and their first messages, in every environment, like 0003_sample_content.
-- AI-written placeholders. Titles and descriptions live in the web app (src/data/rooms.ts).
--
-- Authors are created LOCKED ('!locked' never matches, no recovery method): nobody can sign in as
-- them. Existing accounts with these nicknames are left as they are (ON CONFLICT DO NOTHING).
INSERT INTO "accounts" ("nickname", "nickname_key", "password_hash", "avatar", "role", "therapist_kind", "created_at") VALUES
	($s$Huda$s$, $s$huda$s$, '!locked', 4, 'therapist', $s$psychologist$s$, '2026-08-01T10:00:00Z'),
	($s$Sara$s$, $s$sara$s$, '!locked', 5, 'therapist', $s$psychologist$s$, '2026-08-01T10:00:00Z'),
	($s$Dr. Karim$s$, $s$dr. karim$s$, '!locked', 7, 'therapist', $s$psychiatrist$s$, '2026-08-01T10:00:00Z'),
	($s$quiet_river$s$, $s$quiet_river$s$, '!locked', 0, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$sea_glass$s$, $s$sea_glass$s$, '!locked', 1, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$nour_42$s$, $s$nour_42$s$, '!locked', 6, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$moon_tea$s$, $s$moon_tea$s$, '!locked', 1, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$cedar_path$s$, $s$cedar_path$s$, '!locked', 8, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$yasmine_b$s$, $s$yasmine_b$s$, '!locked', 2, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$olive_light$s$, $s$olive_light$s$, '!locked', 5, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$amine_s$s$, $s$amine_s$s$, '!locked', 9, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$sun_bridge$s$, $s$sun_bridge$s$, '!locked', 6, 'member', NULL, '2026-08-01T10:00:00Z'),
	($s$lina_k$s$, $s$lina_k$s$, '!locked', 3, 'member', NULL, '2026-08-01T10:00:00Z')
ON CONFLICT ("nickname_key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "rooms" ("id", "kind", "community_id", "host_id", "schedule_day", "schedule_time", "duration_min") VALUES
	('grounding', 'guided', 'anxiety', (SELECT "id" FROM "accounts" WHERE "nickname_key" = 'huda'), 4, '20:00', 30),
	('night-owls', 'peer', 'loneliness', NULL, NULL, NULL, 60),
	('small-wins', 'peer', 'depression', NULL, NULL, NULL, 60),
	('after-a-loss', 'guided', 'grief', (SELECT "id" FROM "accounts" WHERE "nickname_key" = 'sara'), 0, '19:00', 60),
	('steady-days', 'guided', 'bipolar', (SELECT "id" FROM "accounts" WHERE "nickname_key" = 'dr. karim'), 2, '21:00', 60),
	('exam-season', 'peer', 'burnout', NULL, NULL, NULL, 60)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "room_messages" ("id", "room_id", "author_id", "text", "created_at")
SELECT m.id, m.room, a.id, m.body, m.at::timestamptz FROM (VALUES
	('g1', 'grounding', 'huda', $s$Welcome, everyone. We'll start with one slow breath together. In for four, out for six.$s$, '2026-10-22T19:01:00Z'),
	('g2', 'grounding', 'quiet_river', $s$أسجّل حضوري. يوم طويل، لكنني هنا.$s$, '2026-10-22T19:03:00Z'),
	('g3', 'grounding', 'sea_glass', $s$First time here. I'll mostly listen if that's okay.$s$, '2026-10-22T19:04:00Z'),
	('g4', 'grounding', 'huda', $s$That's more than okay, sea_glass. Listening is taking part.$s$, '2026-10-22T19:05:00Z'),
	('g5', 'grounding', 'nour_42', $s$J'ai remarqué que ma respiration se bloque dès que je pense au travail.$s$, '2026-10-22T19:07:00Z'),
	('n1', 'night-owls', 'moon_tea', $s$Can’t sleep again. Anyone else up?$s$, '2026-10-27T00:12:00Z'),
	('n2', 'night-owls', 'cedar_path', $s$Here. Making some tea and watching the rain.$s$, '2026-10-27T00:14:00Z'),
	('n3', 'night-owls', 'yasmine_b', $s$موجودة. الليل طويل لكنه أقل وحدة معكم.$s$, '2026-10-27T00:15:00Z'),
	('w1', 'small-wins', 'olive_light', $s$Opened the window this morning. Fresh air helped a little.$s$, '2026-10-27T08:40:00Z'),
	('w2', 'small-wins', 'amine_s', $s$Took a shower after three days. Proud of it.$s$, '2026-10-27T09:02:00Z'),
	('l1', 'after-a-loss', 'sara', $s$Last week we talked about anniversaries. This Sunday: the small objects that keep someone close.$s$, '2026-10-25T18:58:00Z'),
	('s1', 'steady-days', 'dr. karim', $s$Thanks for a good session. Next time: what a "good enough" week looks like for you.$s$, '2026-10-27T20:45:00Z'),
	('e1', 'exam-season', 'sun_bridge', $s$Pomodoro break. 25 minutes done, 5 to breathe.$s$, '2026-10-27T14:30:00Z'),
	('e2', 'exam-season', 'lina_k', $s$Courage pour le mémoire, on y est presque.$s$, '2026-10-27T14:31:00Z')
) AS m(id, room, author, body, at)
JOIN "accounts" a ON a."nickname_key" = m.author
ON CONFLICT ("id") DO NOTHING;
