const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'livestock_db'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL Database!');
});

function getStatusFromWeight(weight, breed = '') {
    const w = Number(weight) || 0;
    const b = String(breed).toLowerCase();

    if (b.includes('chicken') || b.includes('manok') || b.includes('layer') || b.includes('broiler') || b.includes('kelso') || b.includes('lemon')) {
        if (w < 1) return 'Underweight';
        if (w > 2) return 'Overweight';
        return 'Healthy';
    }

    if (b.includes('duck') || b.includes('bibe')) {
        if (w < 2) return 'Underweight';
        if (w > 4) return 'Overweight';
        return 'Healthy';
    }

    if (w < 10) return 'Underweight';
    if (w > 20) return 'Overweight';
    return 'Healthy';
}

app.get('/api/livestock', (req, res) => {
    db.query('SELECT * FROM livestock', (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err });
        res.json({ success: true, data: results });
    });
});

app.post('/api/livestock', upload.single('image'), (req, res) => {
    const tagId = req.body.tagId || '';
    const breed = req.body.breed || '';
    const pen = req.body.pen || '';
    const weight = Number(req.body.weight) || 0;
    const status = getStatusFromWeight(weight, breed);
    const imageUrl = req.file ? req.file.filename : null;

    const query = 'INSERT INTO livestock (tag_id, breed, pen, weight, status, image_url) VALUES (?, ?, ?, ?, ?, ?)';

    db.query(query, [tagId, breed, pen, weight, status, imageUrl], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ success: false, error: err });
        }
        res.json({ success: true, message: 'Livestock added with image successfully!' });
    });
});

app.put('/api/livestock/:id', upload.single('image'), (req, res) => {
    console.log('--- PUT REQUEST RECEIVED ---');
    console.log('EDIT ID:', req.params.id);
    console.log('REQ.BODY:', req.body);
    console.log('REQ.FILE:', req.file);

    const id = req.params.id;
    const tagId = req.body.tagId || '';
    const breed = req.body.breed || '';
    const pen = req.body.pen || '';
    const weight = Number(req.body.weight) || 0;
    const status = getStatusFromWeight(weight, breed);

    if (req.file) {
        const imageUrl = req.file.filename;
        const query = 'UPDATE livestock SET tag_id = ?, breed = ?, pen = ?, weight = ?, status = ?, image_url = ? WHERE id = ?';
        db.query(query, [tagId, breed, pen, weight, status, imageUrl, id], (err, result) => {
            if (err) {
                console.error('Database Error (with image):', err);
                return res.status(500).json({ success: false, error: err });
            }
            res.json({ success: true, message: 'Livestock Updated Successfully!' });
        });
    } else {
        const query = 'UPDATE livestock SET tag_id = ?, breed = ?, pen = ?, weight = ?, status = ? WHERE id = ?';
        db.query(query, [tagId, breed, pen, weight, status, id], (err, result) => {
            if (err) {
                console.error('Database Error (text only):', err);
                return res.status(500).json({ success: false, error: err });
            }
            res.json({ success: true, message: 'Livestock details updated successfully!' });
        });
    }
});

app.delete('/api/livestock/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM livestock WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err });
        res.json({ success: true, message: 'Livestock deleted successfully!' });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});