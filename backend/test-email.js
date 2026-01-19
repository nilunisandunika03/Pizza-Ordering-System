require('dotenv').config();
const { sendEmail } = require('./utils/email');

async function testEmail() {
    console.log('Using SMTP:', process.env.EMAIL_HOST);
    console.log('Using User:', process.env.EMAIL_USER);

    try {
        const info = await sendEmail(
            'nilunisandunika03@gmail.com',
            'Test Email from Pizza System',
            '<h1>It works!</h1><p>This is a test email using your Ethereal credentials.</p>'
        );
        console.log('Test email sequence complete.');
    } catch (err) {
        console.error('Test email failed:', err);
    }
}

testEmail();
