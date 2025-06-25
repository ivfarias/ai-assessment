export async function updateUserProfileSection(userId, section, data, db) {
    await db.collection("user_profiles").updateOne({ _id: userId }, {
        $set: {
            [`profile.${String(section)}`]: data,
            updatedAt: new Date()
        }
    }, { upsert: true });
}
//# sourceMappingURL=profile.service.js.map