
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9) + ".pdf";

        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const isPdf =
        file.mimetype === "application/pdf" &&
        path.extname(file.originalname).toLowerCase() === ".pdf";

    if (isPdf) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF resumes are allowed"));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});

module.exports = upload;
