require('dotenv').config();
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const BACKEND_URL = `http://localhost:${process.env.PORT || 5002}`;

if (!MONGO_URI) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('JWT_SECRET not set in .env');
  process.exit(1);
}

(async () => {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    const email = 'autotest+hf@example.com';
    let user = await users.findOne({ email });
    if (!user) {
      const res = await users.insertOne({ name: 'Auto Test', email, password: 'password123', chats: [] });
      user = await users.findOne({ _id: res.insertedId });
      console.log('Inserted test user with id', res.insertedId.toString());
    } else {
      console.log('Found existing test user with id', user._id.toString());
    }

    const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    console.log('Generated token (truncated):', token.substring(0, 50) + '...');

    // Call chat endpoint
    try {
      const resp = await axios.post(
        `${BACKEND_URL}/api/chat/new`,
        { message: 'Hello from automated test' },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 }
      );
      console.log('Chat response status:', resp.status);
      console.log('Chat response data:', resp.data);
    } catch (err) {
      // Print full axios error details for debugging
      try {
        if (err && err.response) {
          console.error('Chat call failed. Status:', err.response.status);
          console.error('Response headers:', err.response.headers);
          console.error('Response data:', JSON.stringify(err.response.data, null, 2));
        } else if (err && err.request) {
          console.error('No response received. Request info:', err.request);
        } else {
          console.error('Chat call error:', err && err.message ? err.message : err);
        }
        if (err && err.stack) console.error('Stack:', err.stack);
      } catch (innerErr) {
        console.error('Error while printing axios error details:', innerErr);
        console.error('Original error:', err);
      }
    }
  } catch (err) {
    console.error('Script error:', err);
  } finally {
    await client.close();
  }
})();
