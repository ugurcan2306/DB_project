import { getDb } from "@/db/pool";

export type ChallengeRow = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  starts_at: string;
  ends_at: string;
  target_count: number;
  required_tag: string | null;
  reward_points: number;
  badge_name: string | null;
  badge_emoji: string | null;
  participants: number;
  days_left: number;
};

export type UserChallengeRow = ChallengeRow & {
  progress_count: number;
  joined_at: string | null;
  completed_at: string | null;
};

const CHALLENGE_BASE_SELECT = `
  SELECT c.id,
         c.title,
         c.description,
         c.emoji,
         c.starts_at,
         c.ends_at,
         c.target_count,
         c.required_tag,
         c.reward_points,
         b.badge_name,
         b.badge_emoji,
         (SELECT COUNT(*) FROM user_challenge_participation ucp WHERE ucp.challenge_id = c.id)::int AS participants,
         GREATEST(0, EXTRACT(DAY FROM (c.ends_at - NOW())))::int AS days_left
  FROM challenges c
  LEFT JOIN badges b ON b.id = c.reward_badge_id
`;

export async function listActiveChallenges(): Promise<ChallengeRow[]> {
  const result = await getDb().query<ChallengeRow>(
    `${CHALLENGE_BASE_SELECT}
     WHERE c.ends_at > NOW()
     ORDER BY c.ends_at ASC`,
  );
  return result.rows;
}

export async function listUserChallenges(userId: string): Promise<UserChallengeRow[]> {
  const clean = await getDb().query<UserChallengeRow>(
    `SELECT c.id, c.title, c.description, c.emoji, c.starts_at, c.ends_at,
            c.target_count, c.required_tag, c.reward_points,
            b.badge_name, b.badge_emoji,
            (SELECT COUNT(*) FROM user_challenge_participation ucp2 WHERE ucp2.challenge_id = c.id)::int AS participants,
            GREATEST(0, EXTRACT(DAY FROM (c.ends_at - NOW())))::int AS days_left,
            ucp.progress_count, ucp.joined_at, ucp.completed_at
     FROM challenges c
     INNER JOIN user_challenge_participation ucp ON ucp.challenge_id = c.id
     LEFT JOIN badges b ON b.id = c.reward_badge_id
     WHERE ucp.user_id = $1
     ORDER BY ucp.completed_at NULLS FIRST, c.ends_at ASC`,
    [userId],
  );
  return clean.rows;
}

export async function joinChallenge(userId: string, challengeId: string) {
  await getDb().query(
    `INSERT INTO user_challenge_participation (user_id, challenge_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, challenge_id) DO NOTHING`,
    [userId, challengeId],
  );
}

export async function leaveChallenge(userId: string, challengeId: string) {
  await getDb().query(
    `DELETE FROM user_challenge_participation
     WHERE user_id = $1 AND challenge_id = $2 AND completed_at IS NULL`,
    [userId, challengeId],
  );
}

export async function logChallengeRecipe(
  userId: string,
  challengeId: string,
  recipeTitle: string,
  tags: string,
  ingredients: string,
) {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");

    // Verify the user joined this challenge.
    const partRes = await client.query<{
      id: string;
      progress_count: number;
      completed_at: string | null;
    }>(
      `SELECT id, progress_count, completed_at
       FROM user_challenge_participation
       WHERE user_id = $1 AND challenge_id = $2
       FOR UPDATE`,
      [userId, challengeId],
    );

    if (partRes.rowCount === 0) {
      throw new Error("You must join this challenge before logging recipes.");
    }
    if (partRes.rows[0].completed_at) {
      throw new Error("You have already completed this challenge.");
    }

    const challengeRes = await client.query<{
      required_tag: string | null;
      ends_at: string;
    }>(
      `SELECT required_tag, ends_at FROM challenges WHERE id = $1`,
      [challengeId],
    );
    if (challengeRes.rowCount === 0) throw new Error("Challenge not found.");
    if (new Date(challengeRes.rows[0].ends_at) < new Date()) {
      throw new Error("This challenge has ended.");
    }

    const requiredTag = challengeRes.rows[0].required_tag?.toLowerCase().trim() ?? null;
    const tagList = tags.toLowerCase().split(",").map((t) => t.trim()).filter(Boolean);
    const qualifies = !requiredTag || tagList.includes(requiredTag);

    await client.query(
      `INSERT INTO challenge_recipe_logs (user_id, challenge_id, recipe_title, tags, ingredients)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, challengeId, recipeTitle.trim(), tags.trim(), ingredients.trim()],
    );

    if (qualifies) {
      // Bumping progress fires the trg_award_badge trigger which awards the badge
      // and sets completed_at when target is met.
      await client.query(
        `UPDATE user_challenge_participation
         SET progress_count = progress_count + 1
         WHERE id = $1`,
        [partRes.rows[0].id],
      );
    }

    await client.query("COMMIT");
    return { qualified: qualifies };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export type LeaderboardRow = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  challenges_completed: number;
  badges_earned: number;
  total_points: number;
};

export async function getLeaderboard(limit = 25): Promise<LeaderboardRow[]> {
  const result = await getDb().query<LeaderboardRow>(
    `SELECT user_id, full_name, avatar_url,
            challenges_completed::int,
            badges_earned::int,
            total_points::int
     FROM challenge_leaderboard
     WHERE challenges_completed > 0 OR badges_earned > 0
     ORDER BY total_points DESC, challenges_completed DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function getUserBadges(userId: string) {
  const result = await getDb().query<{
    badge_id: string;
    badge_name: string;
    badge_emoji: string;
    description: string | null;
    earned_at: string;
  }>(
    `SELECT b.id AS badge_id, b.badge_name, b.badge_emoji, b.description, ub.earned_at
     FROM user_badges ub
     INNER JOIN badges b ON b.id = ub.badge_id
     WHERE ub.user_id = $1
     ORDER BY ub.earned_at DESC`,
    [userId],
  );
  return result.rows;
}

export type RecipeLogRow = {
  id: string;
  recipe_title: string;
  tags: string | null;
  ingredients: string | null;
  logged_at: string;
  challenge_title: string;
  challenge_emoji: string;
  qualified: boolean;
};

export async function getUserRecipeHistory(userId: string): Promise<RecipeLogRow[]> {
  const result = await getDb().query<RecipeLogRow>(
    `SELECT
       rl.id,
       rl.recipe_title,
       rl.tags,
       rl.ingredients,
       rl.logged_at,
       c.title  AS challenge_title,
       c.emoji  AS challenge_emoji,
       (
         c.required_tag IS NULL
         OR LOWER(c.required_tag) = ANY(
           SELECT TRIM(t) FROM UNNEST(STRING_TO_ARRAY(LOWER(rl.tags), ',')) AS t
         )
       ) AS qualified
     FROM challenge_recipe_logs rl
     INNER JOIN challenges c ON c.id = rl.challenge_id
     WHERE rl.user_id = $1
     ORDER BY rl.logged_at DESC`,
    [userId],
  );
  return result.rows;
}

export type UserChallengeStats = {
  challenges_joined: number;
  challenges_completed: number;
  badges_earned: number;
  total_points: number;
  recipes_logged: number;
};

export async function getUserChallengeStats(userId: string): Promise<UserChallengeStats> {
  const result = await getDb().query<UserChallengeStats>(
    `SELECT
       COUNT(ucp.id)::int                                                          AS challenges_joined,
       COUNT(ucp.id) FILTER (WHERE ucp.completed_at IS NOT NULL)::int             AS challenges_completed,
       (SELECT COUNT(*) FROM user_badges WHERE user_id = $1)::int                 AS badges_earned,
       COALESCE(
         (SELECT SUM(c2.reward_points)
          FROM user_challenge_participation ucp2
          INNER JOIN challenges c2 ON c2.id = ucp2.challenge_id
          WHERE ucp2.user_id = $1 AND ucp2.completed_at IS NOT NULL), 0
       )::int                                                                      AS total_points,
       (SELECT COUNT(*) FROM challenge_recipe_logs WHERE user_id = $1)::int       AS recipes_logged
     FROM user_challenge_participation ucp
     WHERE ucp.user_id = $1`,
    [userId],
  );
  return (
    result.rows[0] ?? {
      challenges_joined: 0,
      challenges_completed: 0,
      badges_earned: 0,
      total_points: 0,
      recipes_logged: 0,
    }
  );
}
