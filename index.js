const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;
const app = express();

app.use(
    cors({
        origin: true,
        optionsSuccessStatus: 200,
        credentials: true,
    })
);

// app.use(cors());
app.use(express.json());

// verify user token
function verifyJWT(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: 'You Cant Access Data' })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).send({ message: 'You Cant Access Data, Forbidden authorization' })
        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.owb2v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        await client.connect()
        const productsCollection = client.db("exoparts").collection("products");
        const userCollection = client.db("exoparts").collection("users");
        const ordersCollection = client.db("exoparts").collection("orders");
        const reviewsCollection = client.db("exoparts").collection("reviews");
        const paymentCollection = client.db("exoparts").collection("payments");


        const verifyAdmin = async (req, res, next) => {
            const isAdmin = req.decoded.email;
            const adminChk = await userCollection.findOne({ email: isAdmin });
            if (adminChk.role === 'admin') {
                next()
            } else {
                res.status(403).send({ message: 'forbidden access' })
            }
        }

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'paid',
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updateOrder = await ordersCollection.updateOne(filter, updatedDoc);
            res.send(updateOrder);
        })

        app.patch('/manageshipped/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'Shipped',
                }
            }
            const updateStatus = await ordersCollection.updateOne(filter, updateDoc);
            res.send(updateStatus)

        })

        // User Login
        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '2d'
            })
            res.send({ accessToken })
        })

        // Post Product API 
        app.post('/products', verifyJWT, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result)
        })

        // Get All Products API
        app.get('/products', async (req, res) => {
            const result = await productsCollection.find({}).toArray();
            res.send(result)
        })

        //get signle product by id
        app.get('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        })
        //delete signle product by id
        app.delete('/product/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        // update total available patch api 
        app.patch('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const availabe = req.body.available;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    available: availabe
                }
            }
            const result = await productsCollection.updateOne(filter, updateDoc);
            res.send(result)
        })


        // patch product edit api 
        app.patch('/pd/:id', verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const { name, price, minOrder, available, image, description } = data;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    name, price, minOrder, available, image, description
                }
            }
            const result = await productsCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.post('/orders', async (req, res) => {
            const data = (req.body);
            const result = await ordersCollection.insertOne(data);
            res.send(result)

        })

        app.get('/orders', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await ordersCollection.find({}).toArray();
            res.send(result)
        })

        // orders by user email
        app.get('/orders/:email', verifyJWT, async (req, res) => {
            const decEmail = req.decoded.email;
            const email = req.params.email;
            if (decEmail === email) {
                const filter = { email: email };
                const result = await ordersCollection.find(filter).toArray();
                res.send(result)
            } else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        })

        app.get('/order/:id', async (req, res) => {
            const id = (req.params.id);
            const filter = { _id: ObjectId(id) };
            const order = await ordersCollection.findOne(filter);
            res.send(order)
        })

        app.delete('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(filter);
            res.send(result)
        })
        app.get('/users', async (req, res) => {
            const result = await userCollection.find({}).toArray();
            res.send(result)
        })
        app.post('/users', verifyJWT, async (req, res) => {
            const data = req.body;
            console.log(data);
            const filter = await userCollection.findOne({ email: data?.email })
            if (filter == null) {
                const result = await userCollection.insertOne(data);
                res.send(result)
            } else {
                res.send('user already exists')
            }
        })

        app.get('/user/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await userCollection.findOne(filter);
            res.send(result)
        })

        app.patch('/user/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const data = req.body;
            const filter = { email: email };
            const { phone, education, address, github, photo } = data;

            console.log(data);
            const updateDoc = {
                $set: {
                    phone: phone, education: education, address: address, github: github, photo: photo
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)

        })

        app.patch('/make-admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.patch('/remove-admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    role: 'customer'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        // Reviews Api 
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find({}).toArray();
            res.send(result)
        })

        app.post('/reviews', verifyJWT, async (req, res) => {
            const data = req.body;
            const result = await reviewsCollection.insertOne(data);
            res.send(result)
        })

    }
    finally {

    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('server is running')
})

app.listen(port, () => {
    console.log('Server running in port: ', port);
})