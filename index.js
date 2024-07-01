const express = require('express');
const app = express();
const cors = require('cors'); 
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

// Middle Wares
app.use(cors());
app.use(express.json());

console.log("Username: ", process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jip67yo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const usersCollection = client.db('Shopery').collection('users');
    const categoriesCollection = client.db('Shopery').collection('categories');
    const productsCollection = client.db('Shopery').collection('products');
    const hotdealsCollection = client.db('Shopery').collection('hotdeals');
    const cartsCollection = client.db('Shopery').collection('carts');
    const wishListCollection = client.db('Shopery').collection('wishlist');
    const blogsCollection = client.db('Shopery').collection('blogs');
    const commentsCollection = client.db('Shopery').collection('comments');
    const ordersCollection = client.db('Shopery').collection('orders');
    const billingsCollection = client.db('Shopery').collection('billings');






      // jwt related api
      app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.send({ token });
      })


      const verifyToken = (req, res, next) => {
        // console.log('inside verify token', req.headers.authorization);
        if (!req.headers.authorization) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
          }
          req.decoded = decoded;
          next();
        })
      }


      // use verify admin after verifyToken
      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if (!isAdmin) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        next();
      }




    // Function to update user in the database
    const updateUserInDatabase = async (userInfo) => {
      const { displayName, photoURL, phone, email } = userInfo;
      const filter = { email: email };
      const updateDoc = {
        $set: {
          displayName: displayName,
          photoURL: photoURL,
          phone: phone,
        }
      };
      await usersCollection.updateOne(filter, updateDoc);
    };

    // Users related API
    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User Already Exists", insertedId: null });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);

      console.log(user);
    });

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });


    // New endpoint to update user
    app.patch('/users', async (req, res) => {
      const { displayName, photoURL, phone, email } = req.body;
      try {
        await updateUserInDatabase({ displayName, photoURL, phone, email });
        res.status(200).send({ message: 'Profile updated successfully' });
      } catch (error) {
        console.error("Error updating user in database:", error);
        res.status(500).send({ message: 'Error updating profile' });
      }
    });




    //get admin user
    app.get('/users/admin/:email', verifyToken, async(req, res) =>{
      const email = req.params.email;

      if(!email === req.decoded.email){
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = {email: email};
      const user =  await usersCollection.findOne(query);

      let admin = false;
      if(user){
        admin = user?.role === 'admin';
      }
      res.send({ admin })
      
    });



    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async(req, res) =>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
          $set: {
              role: 'admin'
          }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);

  })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.get('/categories', async (req, res) => {
      const result = await categoriesCollection.find().toArray();
      res.send(result);
    });


      // Menu Related API
      app.post('/products',verifyToken, verifyAdmin, async (req,res) =>{
        const item = req.body;
        const result = await productsCollection.insertOne(item);
        res.send(result);
      });


      app.get('/products', async (req, res) => {
        const result = await productsCollection.find().toArray();
        res.send(result);
      });


      app.patch('/products/:id', async (req, res) => {
        const item = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) }
        const updatedDoc = {
          $set: {
            name: item.name,
            category: item.category,
            price: item.price,
            sale: item.sale,
            rating: item.rating,
            availability: item.availability,
            description: item.description,
            images: item.images
          }
        }

        const result = await productsCollection.updateOne(filter, updatedDoc)
        res.send(result);
      })


    
      app.delete('/products/:id', verifyToken, verifyAdmin, async (req, res) => {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) }
          const result = await productsCollection.deleteOne(query);
          res.send(result);
      });

      app.get('/blogs', async (req, res) => {
        const result = await blogsCollection.find().toArray();
        res.send(result);
      });

      app.post("/blogs/:id/comments", async (req, res) => {
        const blogId = req.params.id;
        const comment = req.body;
        comment.blogId = new ObjectId(blogId);
        comment.createdAt = new Date();
        
        const result = await commentsCollection.insertOne(comment);
        const insertedComment = await commentsCollection.findOne({ _id: result.insertedId });

        res.status(201).json(insertedComment);
      });

      app.get("/blogs/:id/comments", async (req, res) => {
        const blogId = req.params.id;
        const query = { blogId: new ObjectId(blogId) };
        const comments = await commentsCollection.find(query).toArray();
        res.send(comments);
      });

      // Cart APIs
      app.post('/carts', async (req, res) => {
        const cartItem = req.body;
        const result = await cartsCollection.insertOne(cartItem);
        res.send(result);
      });

      app.get('/carts', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const result = await cartsCollection.find(query).toArray();
        res.send(result);
      });

      app.delete('/carts/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await cartsCollection.deleteOne(query);
        res.send(result);
      });

    // Wishlist APIs
      app.post('/wishlist', async (req, res) => {
        const wishItem = req.body;
        const result = await wishListCollection.insertOne(wishItem);
        res.send(result);
      });

      app.get('/wishlist', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const result = await wishListCollection.find(query).toArray();
        res.send(result);
      });

      app.delete('/wishlist/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await wishListCollection.deleteOne(query);
        res.send(result);
      });

      app.get('/hotdeals', async (req, res) => {
        const result = await hotdealsCollection.find().toArray();
        res.send(result);
      });

      app.delete('/carts', async (req, res) => {
        const email = req.query.email;
        if (!email) {
          return res.status(400).send({ message: 'Email is required to delete cart items.' });
        }
      
        const query = { email: email };
        const result = await cartsCollection.deleteMany(query);
      
        if (result.deletedCount === 0) {
          res.status(404).send({ message: 'No cart items found to delete.' });
        } else {
          res.send({ message: `Deleted ${result.deletedCount} cart items.` });
        }
      });

      app.post('/orders', async (req, res) => {
        const order = req.body;
        order.createdAt = new Date();
      
        try {
          const result = await ordersCollection.insertOne(order);
          const insertedOrder = await ordersCollection.findOne({ _id: result.insertedId });

          res.status(201).json({ message: 'Order placed successfully', order: insertedOrder });
        } catch (error) {
          console.error('Error placing order:', error);
          res.status(500).json({ message: 'Failed to place order. Please try again.' });
        }
      });

      app.get('/orders', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const result = await ordersCollection.find(query).toArray();
        res.send(result);
      });


      app.delete('/orders/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await ordersCollection.deleteOne(query);
        res.send(result);
      });


      app.post('/billings',  async (req,res) =>{
        const item = req.body;
        const result = await billingsCollection.insertOne(item);
        res.send(result);
      });


       app.get('/billings', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const result = await billingsCollection.find(query).toArray();
        res.send(result);
      });


    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB Database!");
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("Shopery Server is Running......")
});

app.listen(port, () => {
  console.log(`Shopery Server is running on port: ${port}`)
});
