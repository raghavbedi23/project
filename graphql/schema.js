// graphql/schema.js
const { GraphQLObjectType, GraphQLSchema, GraphQLList, GraphQLString, GraphQLInt } = require('graphql');
const db = require('../db'); // Adjust the path based on your project structure

const ReviewType = new GraphQLObjectType({
  name: 'Review',
  fields: () => ({
    user: { type: GraphQLString },
    rating: { type: GraphQLInt },
    comment: { type: GraphQLString },
  }),
});

const RestaurantType = new GraphQLObjectType({
  name: 'Restaurant',
  fields: () => ({
    _id: { type: GraphQLString },
    name: { type: GraphQLString },
    cuisine: { type: GraphQLString },
    reviews: { type: new GraphQLList(ReviewType) },
  }),
});

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    restaurant: {
      type: RestaurantType,
      args: { id: { type: GraphQLString } },
      resolve(parent, args) {
        return db.getRestaurantById(args.id);
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
});
