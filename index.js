const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.owb2v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//     // perform actions on the collection object
//     client.close();
// });




async function run() {
    await client.connect()
    const productsCollection = client.db("exoparts").collection("products");


    try {
        // Post Product API
        app.post('/products', async (req, res) => {
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
        app.get('/product/:id', async(req, res)=>{
            const id =  req.params.id;
            const query =  {_id:ObjectId(id)};
            const result =  await productsCollection.findOne(query);
            res.send(result);  
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