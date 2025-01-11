const db = require('../database/db');

/**
 * Register students to a teacher.
 * This function adds a teacher and students to the database and establishes their relationship.
 * If a teacher or student already exists, the function ensures duplicates are avoided using INSERT IGNORE.
 */
exports.registerStudents = async (req, res) => {
    try {
        const { teacher, students } = req.body;
        // Step 1: Insert the teacher into the Teachers table, ignoring duplicates
        const [teacherResult] = await db.query('INSERT IGNORE INTO Teachers (email) VALUES (?)', [teacher]);
        // Step 2: Loop through each student and process their registration
        for (let student of students) {
            // Insert the student into the Students table, ignoring duplicates
            await db.query('INSERT IGNORE INTO Students (email) VALUES (?)', [student]);
            // Retrieve the teacher's ID from the Teachers table
            const [[teacherRow]] = await db.query('SELECT id FROM Teachers WHERE email = ?', [teacher]);
            // Retrieve the student's ID from the Students table
            const [[studentRow]] = await db.query('SELECT id FROM Students WHERE email = ?', [student]);
            // Establish the relationship between the teacher and the student
            await db.query('INSERT IGNORE INTO TeacherStudent (teacher_id, student_id) VALUES (?, ?)', [teacherRow.id, studentRow.id]);
        }
        // Step 3: Send a 204 No Content response to indicate success
        res.sendStatus(204);
    } catch (error) {
        // Step 4: Handle any errors and send a 500 Internal Server Error response
        res.status(500).json({ message: error.message });
    }
};

/**
 * Retrieve students common to a given list of teachers.
 * This function retrieves students who are registered with ALL specified teachers.
 */
exports.getCommonStudents = async (req, res) => {
    try {
        // Step 1: Ensure the teachers parameter is always an array
        const teachers = Array.isArray(req.query.teacher) ? req.query.teacher : [req.query.teacher];
        // Step 2: Create placeholders for the SQL query based on the number of teachers
        const placeholders = teachers.map(() => '?').join(',');
        // Step 3: Construct the query to find students registered with all given teachers
        const query = `
            SELECT s.email 
            FROM Students s
            JOIN TeacherStudent ts ON s.id = ts.student_id
            JOIN Teachers t ON ts.teacher_id = t.id
            WHERE t.email IN (${placeholders})
            GROUP BY s.email
            HAVING COUNT(DISTINCT t.email) = ?
        `;
        // Step 4: Execute the query, passing the teachers and their count as parameters
        const [students] = await db.query(query, [...teachers, teachers.length]);
        // Step 5: Send the list of students as the response
        res.status(200).json({ students: students.map(row => row.email) });
    } catch (error) {
        // Step 6: Handle any errors and send a 500 Internal Server Error response
        res.status(500).json({ message: error.message });
    }
};

/**
 * Suspend a student.
 * This function updates the Students table to mark a student as suspended.
 */
exports.suspendStudent = async (req, res) => {
    try {
        const { student } = req.body;
        // Step 1: Update the student's suspended status to TRUE in the Students table
        await db.query('UPDATE Students SET suspended = TRUE WHERE email = ?', [student]);
        // Step 2: Send a 204 No Content response to indicate success
        res.sendStatus(204);
    } catch (error) {
        // Step 3: Handle any errors and send a 500 Internal Server Error response
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

