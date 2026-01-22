export interface RatingProfile {
  // Sensorische Dimensionen (1-10)
  taste_bitterness?: number;
  taste_sweetness?: number;
  taste_body?: number; // Wässrig (1) → Vollmundig (10)
  taste_carbonation?: number; // Flach (1) → Spritzig (10)
  taste_acidity?: number; // Mild (1) → Sauer (10)

  // Flavor Tags
  flavor_tags?: string[]; // ['citrus', 'roasted', 'caramel', ...]

  // Appearance
  appearance_color?: "pale" | "amber" | "dark";
  appearance_clarity?: "clear" | "hazy" | "opaque";

  // Aroma
  aroma_intensity?: number;
}

export interface RatingSubmission extends RatingProfile {
  rating: number; // 1-5 stars
  author_name: string;
  comment?: string;
  brew_id: string; // Ensure we have the brew_id in the submission type
}

export interface Rating extends RatingSubmission {
  id: string;
  created_at: string;
  user_id?: string | null;
  moderation_status: "pending" | "approved" | "rejected" | "auto_approved";
}
