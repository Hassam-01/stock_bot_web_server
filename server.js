const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const supaBaseUrl = process.env.SUPABASE_URL;
const supaBaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supaBaseUrl, supaBaseKey);

const app = express();

app.use(cors({
  // origin: process.env.REACT_APP_FRONTEND_URL, // Allow requests from your frontend
  // allow all origin
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello World');
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(400).json({ message: 'User Does Not Exist' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      'secret',
      { expiresIn: '1h' }
    );

    return res.status(200).json({ token, username: user.username, id: user.user_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body;
  const hash = bcrypt.hashSync(password, 10);

  try {
    const { data, error } = await supabase
      .from('users')
      .insert({ username, password_hash: hash, email })
      .select('user_id, username');

    if (error) {
      throw error;
    }

    return res.status(201).json({
      message: 'User Registered Successfully',
      username: data[0].username,
      user_id: data[0].user_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
});

// Recommendation endpoint
app.post('/api/recommendation', async (req, res) => {
  try {
    const response = await axios.post('https://stock-bot-9kw6.onrender.com/api/signal/recommendation', req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error in forwarding request:', error);
    res.status(500).send('Error communicating with FastAPI');
  }
});

// Buy trade endpoint
app.post('/api/trade/:user_id/buy', async (req, res) => {
  const { price, quantity, date, ticker } = req.body.dataSend;
  const user_id = req.params.user_id;
  const transaction_type = 'buy';
  try {
    // Fetch user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single();
    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch or insert stock
    const { data: existingStock } = await supabase
      .from('stocks')
      .select('*')
      .eq('ticker', ticker)
      .single();

    let stock = existingStock;

    if (!stock) {
      const { data: newStock, error: newStockError } = await supabase
        .from('stocks')
        .insert({ ticker, company_name: ticker })
        .select('*')
        .single();

      if (newStockError) throw newStockError;
      stock = newStock;
    }

    // Insert stock price
    const { data: stockPrice, error: priceError } = await supabase
      .from('stock_prices')
      .insert({ stock_id: stock.stock_id, price, price_date: date })
      .select('*')
      .single();

    if (priceError) throw priceError;

    // Insert asset
    await supabase
      .from('assets')
      .insert({
        user_id,
        stock_id: stock.stock_id,
        price_id: stockPrice.price_id,
        quantity,
      });

    // Insert transaction
    await supabase
      .from('transactions')
      .insert({
        user_id,
        stock_id: stock.stock_id,
        transaction_type,
        quantity,
        price,
        transaction_date: date,
      });

    await supabase
      .from('users')
      .update({ total_investment: user.total_investment - quantity * price })
      .eq('user_id', user_id);

    return res.status(201).json({ message: 'Buy Trade Successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
});

// Sell trade endpoint
app.post('/api/trade/:user_id/sell', async (req, res) => {
  const { sellPrice: price, sellQuantity: quantity, sellDate: date, sellTicker: ticker, sellStockId: stock_id, sellPriceId: price_id } = req.body.dataSend[0];
  const user_id = req.params.user_id;
  console.log(req.body.dataSend[0], "dataSend")
  const transaction_type = 'sell';

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await supabase
      .from('transactions')
      .insert({
        user_id,
        stock_id,
        price,
        quantity,
        transaction_type,
        transaction_date: date,
      });

    // select the qunaity of the stock
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('quantity')
      .eq('price_id', price_id)
      .single();

    const newQuantity = asset.quantity - Number(quantity);
    // update the quantity of the stock
    await supabase
      .from('assets')
      .update({ quantity: newQuantity })
      .eq('price_id', price_id);

    return res.status(201).json({ message: 'Sell Trade Successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
});

// Dashboard endpoint
app.get("/api/dashboard/:user_id", async (req, res) => {
  const { user_id } = req.params;
  
  try {
    // Check if the user exists
    const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", user_id)
    .single();
    
    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Fetch assets and join with stocks and stock_prices
    const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select(`
        stock_id,
        quantity,
        price_id,
        stocks (company_name, ticker),
        stock_prices (price, price_date)
        `)
        .eq("user_id", user_id);
        
        if (assetsError) {
          throw assetsError;
        }
        
        // Transforming the assets to group them by ticker
        const transformedAssets = {};
        assets.forEach((asset) => {
          const { stocks, stock_prices, stock_id, price_id, quantity } = asset;
          const { ticker, company_name } = stocks || {};
          const { price, price_date } = stock_prices || {};
          
          if (!transformedAssets[ticker]) {
            transformedAssets[ticker] = [];
          }
          
          transformedAssets[ticker].push({
        price_id,
        price,
        stock_id,
        quantity,
        date: price_date,
        company_name,
      });
    });
    
    // Fetch transactions
    const { data: activities, error: activitiesError } = await supabase
    .from("transactions")
    .select("*")
      .eq("user_id", user_id);

    if (activitiesError) {
      throw activitiesError;
    }
    
    // Fetch user's join date
    const { data: joinedData, error: joinedError } = await supabase
    .from("users")
    .select("created_at")
    .eq("user_id", user_id)
    .single();
    
    if (joinedError) {
      throw joinedError;
    }
    
    // Fetch user's balance
    const { data: balance, error: balanceError } = await supabase
    .from("users")
    .select("total_investment, total_profit_loss")
    .eq("user_id", user_id)
    .single();
    
    if (balanceError) {
      throw balanceError;
    }
    
    // Transform assets into an array format for the client
    const transformedAssetsArray = Object.keys(transformedAssets).map((ticker) => ({
      ticker,
      assets: transformedAssets[ticker],
    }));
    
    // Return the user's data
    return res.status(200).json({
      transformedAssets: transformedAssetsArray,
      activities,
      balance,
      joined: joinedData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});


app.listen(3009, () => {
  console.log('Server is running on port 3009');
});
