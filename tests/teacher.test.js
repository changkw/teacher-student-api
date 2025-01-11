const request = require('supertest');
const app = require('../index');
const db = require('../src/database/db');

// Set up and clean up database and resources
beforeAll(async () => {
    // Optionally prepare any test-specific data here
    console.log('Starting test suite...');
});

// Clean up global resources
afterAll(async () => {
    console.log('Closing database connection...');
    await db.end(); // Close the database connection
});

// Clear the database before each test
beforeEach(async () => {
    await db.query('DELETE FROM TeacherStudent');
    await db.query('DELETE FROM Students');
    await db.query('DELETE FROM Teachers');
});

describe('API Endpoints', () => {
    /**
     * Test 1: Register Students
     */
    test('Register students', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({
                teacher: "teacherken@gmail.com",
                students: ["studentjon@gmail.com", "studenthon@gmail.com"]
            });
        expect(res.statusCode).toBe(204);
    });

    /**
     * Test 2: Retrieve Common Students
     */
    test('Retrieve common students', async () => {
        // Step 1: Register students for teacherken
        await request(app)
            .post('/api/register')
            .send({
                teacher: "teacherken@gmail.com",
                students: [
                    "commonstudent1@gmail.com",
                    "commonstudent2@gmail.com",
                    "student_only_under_teacher_ken@gmail.com"
                ]
            });
        
        // Step 2: Register students for teacherjoe
        await request(app)
            .post('/api/register')
            .send({
                teacher: "teacherjoe@gmail.com",
                students: [
                    "commonstudent1@gmail.com",
                    "commonstudent2@gmail.com"
                ]
            });

        // Test 1: Retrieve students registered only to teacherken
        const res1 = await request(app)
            .get('/api/commonstudents?teacher=teacherken%40gmail.com');
        expect(res1.status).toBe(200);
        expect(res1.body).toHaveProperty('students');
        expect(res1.body.students).toEqual([
            "commonstudent1@gmail.com",
            "commonstudent2@gmail.com",
            "student_only_under_teacher_ken@gmail.com"
        ]);

        // Test 2: Retrieve students common to teacherken and teacherjoe
        const res2 = await request(app)
            .get('/api/commonstudents?teacher=teacherken%40gmail.com&teacher=teacherjoe%40gmail.com');

        expect(res2.status).toBe(200); // Expect HTTP 200 OK
        expect(res2.body).toHaveProperty('students');
        expect(res2.body.students).toEqual([
            "commonstudent1@gmail.com",
            "commonstudent2@gmail.com"
        ]);
    });

    /**
     * Test 3: Suspend A Student
     */
    test('Suspend a student', async () => {
        // Step 1: Register a student to a teacher
        await request(app)
            .post('/api/register')
            .send({
                teacher: "teacherken@gmail.com",
                students: ["studentmary@gmail.com"]
            });
    
        // Step 2: Suspend the student
        const suspendRes = await request(app)
            .post('/api/suspend')
            .send({ student: "studentmary@gmail.com" });
    
        expect(suspendRes.status).toBe(204); // Expect HTTP 204 No Content
    
        // Step 3: Verify that the suspended student does not receive notifications
        const notificationRes = await request(app)
            .post('/api/retrievefornotifications')
            .send({
                teacher: "teacherken@gmail.com",
                notification: "Hello @studentmary@gmail.com"
            });
    
        expect(notificationRes.status).toBe(200); // Expect HTTP 200 OK
        expect(notificationRes.body.recipients).not.toContain("studentmary@gmail.com"); // Ensure the suspended student is not included
    });
    
    /**
     * Test 4: Retrieve Notifications
     */
    test('Retrieve notifications for eligible students', async () => {
        // Step 1: Register students for teacherken
        await request(app)
            .post('/api/register')
            .send({
                teacher: "teacherken@gmail.com",
                students: ["studentbob@gmail.com"]
            });

        // First Request Example
        // Notification mentions registered and unregistered students
        const res1 = await request(app)
            .post('/api/retrievefornotifications')
            .send({
                teacher: "teacherken@gmail.com",
                notification: "Hello students! @studentagnes@gmail.com @studentmiche@gmail.com"
            });

        // Assertions for the first request
        expect(res1.status).toBe(200); // Expect HTTP 200 OK
        expect(res1.body).toHaveProperty('recipients');
        expect(res1.body.recipients).toEqual(
            expect.arrayContaining([
                "studentbob@gmail.com", // Registered student
                "studentagnes@gmail.com", // Registered and mentioned
                "studentmiche@gmail.com" // Mentioned only
            ])
        );

        // Second Request Example
        // Notification without any mentions
        const res2 = await request(app)
            .post('/api/retrievefornotifications')
            .send({
                teacher: "teacherken@gmail.com",
                notification: "Hey everybody"
            });

        // Assertions for the second request
        expect(res2.status).toBe(200); // Expect HTTP 200 OK
        expect(res2.body).toHaveProperty('recipients');
        expect(res2.body.recipients).toEqual(
            expect.arrayContaining([
                "studentbob@gmail.com" // Registered student
            ])
        );
    });

});
