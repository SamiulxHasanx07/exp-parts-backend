const express = require('express');
const cors =  require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app =  express();


app.use(cors());
app.use(express.json());


async function run(){
   try{
    app.get('/test', async(req, res)=>{
        res.send('yeah its working')
    })
   }
   finally{

   }
}

run().catch(console.dir)

app.get('/', (req, res)=>{
    res.send('server is running')
})

app.listen(port, ()=>{
    console.log('Server running in port: ', port);
})