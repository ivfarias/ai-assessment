import { Db } from "mongodb";
import { UserProfile } from "../types/profile.js";

export async function updateUserProfileSection(userId: string, section: keyof UserProfile["profile"], data: any, db: Db) {
  await db.collection<UserProfile>("user_profiles").updateOne(
    { _id: userId },
    {
      $set: {
        [`profile.${String(section)}`]: data,
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
} 