/**
 * src/models/homepageSectionModel.js
 */
const HomepageSection = require("./HomepageSection");

async function listPublic() {
  return HomepageSection.find({ isEnabled: true }).sort({ displayOrder: 1 });
}

async function listAdmin() {
  return HomepageSection.find({}).sort({ displayOrder: 1 });
}

async function getById(id) {
  return HomepageSection.findById(id);
}

async function create(data) {
  const count = await HomepageSection.countDocuments({});
  const section = await HomepageSection.create({
    type: data.type,
    title: data.title,
    content: data.content || {},
    displayOrder: data.displayOrder ?? count,
    isEnabled: data.isEnabled !== undefined ? Boolean(data.isEnabled) : true,
  });
  return section.id;
}

async function update(id, data) {
  const set = {};
  if (data.title !== undefined) set.title = data.title;
  if (data.content !== undefined) set.content = data.content;
  if (data.isEnabled !== undefined) set.isEnabled = Boolean(data.isEnabled);
  if (data.displayOrder !== undefined) set.displayOrder = data.displayOrder;
  if (Object.keys(set).length === 0) return;
  await HomepageSection.updateOne({ _id: id }, { $set: set });
}

async function reorder(orderedIds) {
  await Promise.all(
    orderedIds.map((id, index) =>
      HomepageSection.updateOne({ _id: id }, { $set: { displayOrder: index } }),
    ),
  );
}

async function remove(id) {
  await HomepageSection.deleteOne({ _id: id });
}

module.exports = {
  listPublic,
  listAdmin,
  getById,
  create,
  update,
  reorder,
  remove,
};
