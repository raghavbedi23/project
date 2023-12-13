const express = require('express');
const cors = require('cors');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { validationResult, query } = require('express-validator');
const dotenv = require('dotenv'); // Add dotenv for environment variables
const { graphqlHTTP } = require('express-graphql');
const schema = require('./graphql/schema'); // Import your GraphQL schema
const db = require('./db');
// const User = require('./models/User');


dotenv.config(); // Load environment variables from .env file

const app = express();

// Set up Handlebars view engine
app.engine(
  'hbs',
  exphbs.engine({
    extname: 'hbs',
    runtimeOptions: {
      allowProtoMethodsByDefault: true,
      allowProtoPropertiesByDefault: true,
    },
  })
);
app.set('view engine', 'hbs');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());
app.use(express.json());

const mongoConnectionString = process.env.DB_CONNECTION_STRING;

// MongoDB Connection
mongoose.connect(mongoConnectionString, { useNewUrlParser: true, useUnifiedTopology: true });
 // Initialize MongoDB

// Middleware to validate JWT for protected routes
const validateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Unauthorized' });
    req.userId = decoded.userId;
    next();
  });
};

// API routes
app.get('/api/test', async (req, res) => {
  try {
    res.status(200).send('Connected to MongoDB Atlas and Initialized Restaurant Model');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected route - requires authentication
app.post('/api/restaurants', validateToken, async (req, res) => {
  try {
    const newRestaurant = await db.addNewRestaurant(req.body);
    res.status(201).json(newRestaurant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public route with query parameter validation
app.get('/api/restaurants', [
  query('page').isNumeric().toInt(),
  query('perPage').isNumeric().toInt(),
  query('borough').optional(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { page = 1, perPage = 10, borough } = req.query;
    const restaurants = await db.getAllRestaurants(parseInt(page), parseInt(perPage), borough);
    res.status(200).json(restaurants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// View routes
app.get('/restaurant-search', (req, res) => {
  res.render('form');
});

app.get('/search', async (req, res) => {
  try {
    const { page, perPage, borough } = req.query;
    const restaurantsData = await db.getAllRestaurants();
    const skip = perPage * (page - 1);
    const restaurants = restaurantsData.slice((page - 1) * perPage, page * perPage);
    res.render('results', { restaurants });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});

// View route for a specific restaurant
app.get('/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await db.getRestaurantById(id).populate('reviews.user', 'username');
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    res.render('restaurantDetails', { restaurant });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use(
  '/graphql',
  graphqlHTTP({
    schema, // Use the GraphQL schema you imported
    graphiql: true, // Enable GraphiQL for development
  })
);


// Protected route - requires authentication
app.put('/api/restaurants/:id', validateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRestaurant = await db.updateRestaurantById(req.body, id);
    if (!updatedRestaurant) {
      res.status(404).json({ message: 'Restaurant not found' });
    } else {
      res.status(200).json(updatedRestaurant);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected route - requires authentication
app.delete('/api/restaurants/:id', validateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const deletedRestaurant = await db.deleteRestaurantById(id);
    if (!deletedRestaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    return res.status(204).end();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Protected route - requires authentication
app.post('/api/restaurants/:id/reviews', validateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    // Assuming you have a User model for storing user information
    const user = req.userId; // This is set by the validateToken middleware
    
    const updatedRestaurant = await db.addReviewToRestaurant(id, user, rating, comment);
    
    if (!updatedRestaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    res.status(200).json(updatedRestaurant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public route to serve the index.html page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Public route to serve the form for adding a new restaurant
app.get('/add', (req, res) => {
  res.sendFile(__dirname + '/add_form.html');
});

// Public route to serve the form for viewing restaurants
app.get('/view', (req, res) => {
  res.render('form');
});

// Public route to serve the form for updating a restaurant
app.get('/update', (req, res) => {
  res.sendFile(__dirname + '/update_form.html');
});

// Public route to serve the form for deleting a restaurant
app.get('/delete', (req, res) => {
  res.sendFile(__dirname + '/delete_form.html');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
