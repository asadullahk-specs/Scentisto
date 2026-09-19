require("dotenv").config();
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
  .then(async () => {
    const col = mongoose.connection.db.collection("homepagesections");

    // Re-enable the original hero section (displayOrder 0, currently isEnabled: false)
    const r1 = await col.updateOne(
      { _id: new mongoose.Types.ObjectId("6a7b6d3b180f2b17fc4ff6cd") },
      { $set: { isEnabled: true, displayOrder: 0 } }
    );
    console.log("Hero Section (original) re-enabled:", r1.modifiedCount, "doc(s)");

    // Keep the duplicate hero (Hero Banner, displayOrder 6) disabled so there's only one hero
    const r2 = await col.updateOne(
      { _id: new mongoose.Types.ObjectId("6a81d65ab0ddbf7f7da12e86") },
      { $set: { isEnabled: false } }
    );
    console.log("Hero Banner (duplicate) disabled:", r2.modifiedCount, "doc(s)");

    const all = await col
      .find({}, { projection: { type: 1, title: 1, isEnabled: 1, displayOrder: 1 } })
      .sort({ displayOrder: 1 })
      .toArray();
    console.log("\nFinal section state:");
    all.forEach((s) =>
      console.log(`  [${s.isEnabled ? "ON " : "OFF"}] order=${s.displayOrder} ${s.type}: ${s.title}`)
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
