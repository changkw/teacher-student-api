# Teacher-Student API System
## Overview
This project provides a RESTful API built with **Node.js** and **MySQL** to enable teachers to manage their students efficiently. The system supports functionalities such as registering students, retrieving common students across teachers, suspending students, and sending notifications to eligible students.
## Technologies Used
- **Backend**: Node.js (Express.js)
- **Database**: MySQL
- **Testing**: Jest, Supertest
- **Environment Management**: dotenv
## Setup and Installation
**1. Prerequisites**
- Node.js
- MySQL

**2. Clone Repository**
```
git clone https://github.com/changkw/teacher-student-api.git
cd teacher-student-api
```

**3. Install Dependencies**
```
npm install
```

**4. Configure Environment Variables**

Create a `.env` file in the project root and add:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_DATABASE=teacher_student_db
PORT=3000
```

**5. Set Up Database**

Log in to MySQL and execute:
```
CREATE DATABASE teacher_student_db;
USE teacher_student_db;

CREATE TABLE Teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE Students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    suspended BOOLEAN DEFAULT FALSE
);

CREATE TABLE TeacherStudent (
    teacher_id INT,
    student_id INT,
    FOREIGN KEY (teacher_id) REFERENCES Teachers(id),
    FOREIGN KEY (student_id) REFERENCES Students(id),
    PRIMARY KEY (teacher_id, student_id)
);
```

**6. Start the Server**
