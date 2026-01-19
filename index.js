require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const sendStatusEmail = require("./utils/sendStatusEmail");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mojyanw.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let jobsCollection;
let applicationCollection;

async function connectDB() {
  try {
    const db = client.db('jobBoard');
    jobsCollection = db.collection('job');
    applicationCollection = db.collection('applications');
    console.log("✅ MongoDB Connected Successfully!");
  } catch (err) {
    console.error("DB Connection Error:", err);
  }
}
connectDB();


app.get('/', (req, res) => {
  res.send('Job Board Server is Cooking');
});

// get all jobs
app.get('/jobs', async (req, res) => {
  try {
    if (!jobsCollection) return res.status(500).json({ error: "Database not ready" });
    const { email, status } = req.query;
    let query = {};
    if (email) query.hr_email = email;
    if (status) query.status = status;
    
    const result = await jobsCollection.find(query).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get specific job
app.get('/jobs/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await jobsCollection.findOne({ _id: new ObjectId(id) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// job application
app.post("/applications", async (req, res) => {
  try {
    const application = req.body;
    application.status = "Pending";
    application.appliedAt = new Date();
    const result = await applicationCollection.insertOne(application);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get application list
app.get("/applications", async (req, res) => {
  try {
    const email = req.query.email;
    const result = await applicationCollection.find({ applicantEmail: email }).toArray();
    
    for (const appItem of result) {
      const job = await jobsCollection.findOne({ _id: new ObjectId(appItem.id) });
      if (job) {
        appItem.company = job.company;
        appItem.title = job.title;
        appItem.company_logo = job.company_logo;
      }
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/applications/:id", async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const query = { _id: new ObjectId(id) };
    const result = await applicationCollection.deleteOne(query);
    
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// View applications for a specific job
app.get("/applications/job/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await applicationCollection.find({ id: id }).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Status update for applications
app.patch("/applications/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const application = await applicationCollection.findOne({ _id: new ObjectId(id) });

    if (!application) return res.status(404).json({ message: "Not found" });

    const result = await applicationCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } }
    );
    if (result.modifiedCount && application.applicantEmail) {
      await sendStatusEmail(application.applicantEmail, status, application.applicant);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// job add
app.post('/jobs', async(req, res)=>{
  const jobData = req.body;
  jobData.status = (jobData.userRole !== 'admin') ? "Pending" : "Active";
  const result = await jobsCollection.insertOne(jobData);
  res.json(result);
});

// delete jobs
app.delete("/jobs/:id", async (req, res) => {
  const result = await jobsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.json(result);
});
// update
app.put('/jobs/update/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid Job ID format" });
    }
    const { _id, ...updateDoc } = updatedData;

    const db = client.db('jobBoard');
    const jobsCollection = db.collection('job');

    const filter = { _id: new ObjectId(id) };
    const result = await jobsCollection.updateOne(
      filter, 
      { $set: updateDoc }
    );
    res.send(result); 
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// job approve
app.patch('/jobs/:id/approve', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: { status: 'Active' },
    };
    const result = await jobsCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// job reject
app.patch('/jobs/:id/reject', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: { status: 'Rejected' },
    };
    const result = await jobsCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;