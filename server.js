const express = require("express");
const sql = require("mssql");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS configuration
const corsOptions = {
    origin: "http://localhost:3000",  // Allow requests from React frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
};
app.use(cors(corsOptions));  // Use CORS middleware with the config

app.use(express.json());

// SQL Server connection config
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
};

// Use connection pool for better performance
let pool;

// Initialize SQL connection pool
sql.connect(dbConfig)
    .then(poolInstance => {
        pool = poolInstance;
        console.log("Connected to SQL Server");

        // Query the database name to ensure you're connected to the right one
        return pool.request().query("SELECT DB_NAME() AS CurrentDatabase");
    })
    .then(result => {
        console.log("Connected to database:", result.recordset[0].CurrentDatabase);
    })
    .catch(err => {
        console.error("Error connecting to SQL Server:", err);
    });

// GET inventory items
app.get("/api/inventory", async (req, res) => {
    try {
        const result = await pool.request().query("SELECT * FROM Inventory ORDER BY PartNumber");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// POST - Add new inventory item
app.post("/api/inventory", async (req, res) => {
    const { PartNumber, Description, Quantity, UnitPrice } = req.body;
    try {
        await pool.request()
            .input("PartNumber", sql.VarChar, PartNumber)
            .input("Description", sql.VarChar, Description)
            .input("Quantity", sql.Int, Quantity)
            .input("UnitPrice", sql.Decimal, UnitPrice)
            .query("INSERT INTO Inventory (PartNumber, Description, Quantity, UnitPrice) VALUES (@PartNumber, @Description, @Quantity, @UnitPrice)");

        res.send("Item added!");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// PUT - Update inventory quantity
app.put("/api/inventory/:id", async (req, res) => {
    const { Quantity } = req.body;
    const { id } = req.params;
    try {
        await pool.request()
            .input("Quantity", sql.Int, Quantity)
            .input("id", sql.Int, id)
            .query("UPDATE Inventory SET Quantity = @Quantity, LastUpdated = GETDATE() WHERE ItemID = @id");

        res.send("Item updated!");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// DELETE - Remove an item
app.delete("/api/inventory/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await pool.request()
            .input("id", sql.Int, id)
            .query("DELETE FROM Inventory WHERE ItemID = @id");

        res.send("Item deleted!");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Start server
app.listen(5000, () => console.log("Server running on port 5000"));
