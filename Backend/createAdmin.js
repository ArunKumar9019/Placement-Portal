
const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const email = "admin@placement.com";
        const existingAdmin = await User.findOne({ email });

        if (existingAdmin) {
            console.log("Admin account already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash("AdminPass123!", 10);

        await User.create({
            name: "Placement Admin",
            email,
            password: hashedPassword,
            role: "admin"
        });

        console.log("Admin created successfully.");
        console.log("Email:", email);
        console.log("Password: AdminPass123!");
    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();
