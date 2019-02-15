const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const slug = require("slugs");

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: "Please enter a store name!"
    },
    slug: String,
    description: {
      type: String,
      trim: true
    },
    tags: [String],
    created: {
      type: Date,
      defautl: Date.now
    },
    location: {
      type: {
        type: String,
        default: "Point"
      },
      coordinates: [
        {
          type: Number,
          required: "You must supply coordinates!"
        }
      ],
      address: {
        type: String,
        required: "You must supply an address"
      }
    },
    photo: String,
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: "You must supply an author"
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// define indexes
storeSchema.index({
  name: "text",
  description: "text"
});

storeSchema.index({
  location: "2dsphere"
});

storeSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    next(); // skip it.
    return; // stop this function from running.
  }
  this.slug = slug(this.name);

  // find other stores that have a slug of passed in, some-store-1, some-store-2
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, "i");

  const stroeWithSlug = await this.constructor.find({ slug: slugRegEx });

  if (stroeWithSlug.length) {
    this.slug = `${this.slug}-${stroeWithSlug.length + 1}`;
  }

  next();
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // Lookup stores and populate their reviews
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "store",
        as: "reviews"
      }
    },
    // Filter for only items that have 2 on more reviews
    {
      $match: {
        "reviews.1": { $exists: true }
      }
    },
    // Add the average reviews field
    {
      $project: {
        photo: "$$ROOT.photo",
        name: "$$ROOT.name",
        reviews: "$$ROOT.reviews",
        slug: "$$ROOT.slug",
        averageRating: { $avg: "$reviews.rating" }
      }
    },
    // Sort it by wur new field, highes reviews first
    {
      $sort: {
        averageRating: -1
      }
    },
    // Limit to at most 10
    {
      $limit: 10
    }
  ]);
};

storeSchema.virtual("reviews", {
  ref: "Review", // what model to link
  localField: "_id", // which field on the store
  foreignField: "store" // which field on the review
});

function autopopulate(next) {
  this.populate("reviews");
  next();
}

storeSchema.pre("find", autopopulate);
storeSchema.pre("findOne", autopopulate);

module.exports = mongoose.model("Store", storeSchema);
