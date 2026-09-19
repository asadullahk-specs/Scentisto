/**
 * src/models/productMediaModel.js
 *
 * Per-product media CRUD now lives directly on productModel.js
 * (addMedia/updateMedia/reorderMedia/removeMedia), since media is
 * an embedded array on the Product document rather than a joined
 * table. This file only keeps the aggregated, cross-product view
 * used by the Admin Media Library screen.
 */
const Product = require("./Product");

async function listAllAdmin({
  mediaType,
  search,
  limit = 40,
  offset = 0,
} = {}) {
  const pipeline = [{ $unwind: "$media" }];

  const match = {};
  if (mediaType) match["media.mediaType"] = mediaType;
  if (search) {
    match.$or = [
      { name: { $regex: search, $options: "i" } },
      { "media.altText": { $regex: search, $options: "i" } },
    ];
  }
  if (Object.keys(match).length > 0) pipeline.push({ $match: match });

  pipeline.push({ $sort: { "media.createdAt": -1 } });

  pipeline.push({
    $facet: {
      data: [
        { $skip: offset },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            id: { $toString: "$media._id" },
            mediaType: "$media.mediaType",
            url: "$media.url",
            source: "$media.source",
            altText: "$media.altText",
            displayOrder: "$media.displayOrder",
            createdAt: "$media.createdAt",
            productId: { $toString: "$_id" },
            productName: "$name",
            productSlug: "$slug",
          },
        },
      ],
      totalCount: [{ $count: "total" }],
    },
  });

  const [result] = await Product.aggregate(pipeline);
  return {
    rows: result?.data || [],
    total: result?.totalCount?.[0]?.total || 0,
  };
}

module.exports = { listAllAdmin };
