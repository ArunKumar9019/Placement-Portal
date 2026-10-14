const Company = require("../models/Company");

// Add a company
const createCompany = async (req, res) => {
    try {
        const { name, description, website, location, industry } = req.body;

        if (!name || !location) {
            return res.status(400).json({
                message: "Company name and location are required"
            });
        }

        const company = await Company.create({
            name,
            description,
            website,
            location,
            industry
        });

        res.status(201).json({
            message: "Company created successfully",
            company
        });
    } catch (error) {
        console.error("Create company error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// View all companies
const getCompanies = async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });

        res.status(200).json({
            count: companies.length,
            companies
        });
    } catch (error) {
        console.error("Get companies error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};






const updateCompany = async (req, res) => {
    try {
        const { name, description, website, location, industry } = req.body;

        const updates = {};

        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (website !== undefined) updates.website = website;
        if (location !== undefined) updates.location = location;
        if (industry !== undefined) updates.industry = industry;

        const company = await Company.findByIdAndUpdate(
            req.params.companyId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!company) {
            return res.status(404).json({
                message: "Company not found"
            });
        }

        res.status(200).json({
            message: "Company updated successfully",
            company
        });
    } catch (error) {
        console.error("Update company error:", error.message);
        res.status(500).json({
            message: "Server error while updating company"
        });
    }
};

const deleteCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.companyId);

        if (!company) {
            return res.status(404).json({
                message: "Company not found"
            });
        }

        const Job = require("../models/Job");
        const jobs = await Job.countDocuments({
            company: company._id
        });

        if (jobs > 0) {
            return res.status(409).json({
                message: "Cannot delete a company with existing job postings"
            });
        }

        await company.deleteOne();

        res.status(200).json({
            message: "Company deleted successfully"
        });
    } catch (error) {
        console.error("Delete company error:", error.message);
        res.status(500).json({
            message: "Server error while deleting company"
        });
    }
};


module.exports = { createCompany, getCompanies, updateCompany, deleteCompany};