import { Router } from "express";

import { requireSupabase } from "../db.js";
import { requireArtisan } from "../middleware/auth.js";
import { groupRecommendation, scoreOpportunity } from "../services/opportunities.js";

const router = Router();

router.get("/recommended", requireArtisan, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("review_status", "approved")
      .eq("is_removed", false)
      .eq("status", "active")
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(200);
    if (error) throw error;

    const recommendations = data
      .map((opportunity) => {
        const match = scoreOpportunity(req.artisan, opportunity);
        return {
          ...opportunity,
          match_reasons: match.why,
          match_score: match.score,
          eligibility_status: match.eligibility,
          recommendation_group: groupRecommendation(match),
        };
      })
      .filter((opportunity) => opportunity.eligibility_status !== "criteria_mismatch")
      .sort((left, right) => right.match_score - left.match_score);

    res.json({
      categories: {
        GOVERNMENT_SCHEME: recommendations.filter((item) => item.category === "GOVERNMENT_SCHEME"),
        COURSE_OR_TRAINING: recommendations.filter((item) => item.category === "COURSE_OR_TRAINING"),
        MARKET_LINKAGE: recommendations.filter((item) => item.category === "MARKET_LINKAGE"),
      },
      highly_relevant: recommendations.filter(
        (item) => item.recommendation_group === "highly_relevant",
      ),
      potentially_relevant: recommendations.filter(
        (item) => item.recommendation_group === "potentially_relevant",
      ),
      eligibility_not_verified: recommendations.filter(
        (item) => item.recommendation_group === "eligibility_not_verified",
      ),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
