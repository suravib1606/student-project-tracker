import express from 'express';
const app = express();
app.use(express.static('public'));
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Open http://localhost:${port}`));
