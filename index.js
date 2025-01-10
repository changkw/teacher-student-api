const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./src/routes/api');

const app = express();
app.use(bodyParser.json());

app.use('/api', routes);

if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;