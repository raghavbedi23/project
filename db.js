const mongoose = require('mongoose');
console.log(mongoose.Types.ObjectId.isValid('53cb6b9b4f4ddef1ad47f943'));
// true
console.log(mongoose.Types.ObjectId.isValid('whatever'));
// false

const restaurantSchema = new mongoose.Schema({
  name: String,
  borough: String,
  cuisine: String,
  address: {
    building: String,
    coord: [Number],
    street: String,
    zipcode: String,
  },

  grades: [{
    date: Date,
    grade: String,
    score: Number,
  }],
  restaurant_id: String,

  reviews: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      rating: {
        type: Number,
        required: true,
      },
      comment: {
        type: String,
        required: true,
      },
    },
  ],
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports.initialize = (mongoConnectionString) => {
  mongoose.connect(`${mongoConnectionString}&useNewUrlParser=true&useUnifiedTopology=true`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection;

  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', () => {
    console.log('Connected to MongoDB Atlas');
  });
};

module.exports.addNewRestaurant = (data) => {
  const newRestaurant = new Restaurant(data);
  return newRestaurant.save();
};

module.exports.getAllRestaurants = (page, perPage, borough) => {
  // Fetch restaurants based on page, perPage, and optional borough
  const skip = perPage * (page - 1);
  let query = Restaurant.find().skip(skip).limit(perPage).sort({ restaurant_id: 1 });
  if (borough) {
    query = query.where('borough').equals(borough);
  }
  query = query.skip(skip).limit(perPage).sort({ restaurant_id: 1 });
  return query.exec();
};

module.exports.getRestaurantById = (Id) => {
  return Restaurant.findById(Id).exec();
};

module.exports.updateRestaurantById = (data, Id) => {
  return Restaurant.findByIdAndUpdate(Id, data, { new: true }).exec();
};

module.exports.deleteRestaurantById = (Id) => {
  return Restaurant.findByIdAndDelete(Id).exec();
};

