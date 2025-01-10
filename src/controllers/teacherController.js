const db = require('../database/db');

exports.registerStudents = async (req, res) => {
    try {
        const { teacher, students } = req.body;
        const [teacherResult] = await db.query('INSERT IGNORE INTO Teachers (email) VALUES (?)', [teacher]);

        for (let student of students) {
            await db.query('INSERT IGNORE INTO Students (email) VALUES (?)', [student]);
            const [[teacherRow]] = await db.query('SELECT id FROM Teachers WHERE email = ?', [teacher]);
            const [[studentRow]] = await db.query('SELECT id FROM Students WHERE email = ?', [student]);
            await db.query('INSERT IGNORE INTO TeacherStudent (teacher_id, student_id) VALUES (?, ?)', [teacherRow.id, studentRow.id]);
        }

        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCommonStudents = async (req, res) => {
    try {
        const teachers = Array.isArray(req.query.teacher) ? req.query.teacher : [req.query.teacher];
        const placeholders = teachers.map(() => '?').join(',');
        
        const query = `
            SELECT s.email 
            FROM Students s
            JOIN TeacherStudent ts ON s.id = ts.student_id
            JOIN Teachers t ON ts.teacher_id = t.id
            WHERE t.email IN (${placeholders})
            GROUP BY s.email
            HAVING COUNT(DISTINCT t.email) = ?
        `;

        const [students] = await db.query(query, [...teachers, teachers.length]);
        res.json({ students: students.map(row => row.email) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.suspendStudent = async (req, res) => {
    try {
        const { student } = req.body;
        await db.query('UPDATE Students SET suspended = TRUE WHERE email = ?', [student]);
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.retrieveNotifications = async (req, res) => {
    try {
        const { teacher, notification } = req.body;

        // Ensure request body contains required fields
        if (!teacher || !notification) {
            return res.status(400).json({ message: 'Missing teacher or notification in request body.' });
        }

        // Step 1: Extract mentioned emails
        const mentionedEmails = (notification.match(/@[^\s]+/g) || []).map(email => email.slice(1));

        // Step 2: Get registered students for the teacher
        const [registeredStudents] = await db.query(
            `SELECT s.email
             FROM Students s
             JOIN TeacherStudent ts ON s.id = ts.student_id
             JOIN Teachers t ON ts.teacher_id = t.id
             WHERE t.email = ? AND s.suspended = FALSE`,
            [teacher]
        );

        const registeredEmails = registeredStudents.map(student => student.email);

        // Step 3: Combine registered and mentioned students
        const allRecipients = [...new Set([...registeredEmails, ...mentionedEmails])];

        // Step 4: Exclude suspended students
        const [suspendedStudents] = mentionedEmails.length > 0
            ? await db.query(
                  `SELECT email FROM Students WHERE email IN (?) AND suspended = TRUE`,
                  [mentionedEmails]
              )
            : [[], []]; // Empty result if no mentioned emails

        const suspendedEmails = suspendedStudents.map(student => student.email);

        const finalRecipients = allRecipients.filter(email => !suspendedEmails.includes(email));

        // Return recipients
        res.status(200).json({ recipients: finalRecipients });
    } catch (error) {
        console.error('Error in /api/retrievefornotifications:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

